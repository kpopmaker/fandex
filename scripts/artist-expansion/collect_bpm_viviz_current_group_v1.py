from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "bpm_viviz_current_group_adapter_v1"
GROUP_URL = "https://www.bpment.co.kr/artist/gallery.php?idx=289"
VIDEO_URL = "https://www.bpment.co.kr/artist/video.php?idx=289&page=2&pageidx=289"
ALBUM_URL = "https://www.bpment.co.kr/page/discography_detail.php?idx=374"
EUNHA_URL = "https://bpment.co.kr/artist/profile.php?idx=295"
SINB_URL = "https://www.bpment.co.kr/artist/profile.php?idx=296"
UMJI_URL = "https://www.bpment.co.kr/artist/profile.php?idx=297"

EXPECTED_ARTISTS = ["VIVIZ"]
MEMBERS = ["EUNHA", "SINB", "UMJI"]
MEMBER_TOKENS = {
    "EUNHA": ["은하", "EUNHA"],
    "SINB": ["신비", "SINB"],
    "UMJI": ["엄지", "UMJI"],
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)


def has(text: str, token: str) -> bool:
    return token.casefold() in text.casefold()


def parse_live_pages(
    group_html: str,
    video_html: str,
    album_html: str,
    eunha_html: str,
    sinb_html: str,
    umji_html: str,
) -> list[dict]:
    group = text_blob(group_html)
    video = text_blob(video_html)
    album = text_blob(album_html)
    member_pages = {
        "EUNHA": text_blob(eunha_html),
        "SINB": text_blob(sinb_html),
        "UMJI": text_blob(umji_html),
    }

    for token in ["VIVIZ", "비비지", "PROFILE", "DISCOGRAPHY", "VIDEO", "GALLERY"]:
        if not has(group, token):
            return []

    for token in ["VIVIZ", "비비지", "La La Love Me", "2025.07.08"]:
        if not has(video, token):
            return []

    for token in ["VIVIZ", "비비지", "A Montage of", "La La Love Me", "2025.07.08", "9곡"]:
        if not has(album, token):
            return []

    for member, tokens in MEMBER_TOKENS.items():
        page = member_pages[member]
        if not all(has(page, token) for token in tokens):
            return []

    return [
        {
            "displayArtist": "VIVIZ",
            "aliases": ["비비지"],
            "evidence": [
                {"label": "Big Planet Made official VIVIZ artist page", "url": GROUP_URL},
                {"label": "Big Planet Made official VIVIZ current video", "url": VIDEO_URL},
                {"label": "Big Planet Made official VIVIZ first full album", "url": ALBUM_URL},
                {"label": "Big Planet Made official EUNHA profile", "url": EUNHA_URL},
                {"label": "Big Planet Made official SINB profile", "url": SINB_URL},
                {"label": "Big Planet Made official UMJI profile", "url": UMJI_URL},
            ],
        }
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "bpm-official-viviz-current-group-identity",
            "type": "agency_roster",
            "name": "Big Planet Made Official VIVIZ Current Group Identity",
            "observedAt": observed_at,
            "url": GROUP_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "VIVIZ": {
                "agency": "BPM Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": MEMBERS,
                "memberCount": 3,
                "recentMusicEvidence": {
                    "title": "A Montage of ( )",
                    "releaseDate": "2025-07-08",
                    "titleTrack": "La La Love Me",
                    "trackCount": 9,
                },
            }
        },
        "contract": {
            "officialCurrentGroupPageRequired": True,
            "officialCurrentMemberProfilesRequired": True,
            "officialRecentGroupReleaseRequired": True,
            "exactThreeMemberIdentityRequired": True,
            "memberProfileAloneDoesNotCreateSoloCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "notExhaustiveLabelRoster": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "bpm-official-viviz-current-group-identity":
        raise RuntimeError("BPM VIVIZ fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("BPM VIVIZ fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BPM VIVIZ fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("VIVIZ", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "BPM Entertainment":
        raise RuntimeError("BPM VIVIZ fallback agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("BPM VIVIZ fallback active verified state required")
    if entry.get("entityType") != "group":
        raise RuntimeError("BPM VIVIZ fallback group identity required")
    if entry.get("members") != MEMBERS or entry.get("memberCount") != 3:
        raise RuntimeError("BPM VIVIZ fallback exact three-member identity required")
    recent = entry.get("recentMusicEvidence", {})
    if recent.get("title") != "A Montage of ( )" or recent.get("releaseDate") != "2025-07-08":
        raise RuntimeError("BPM VIVIZ fallback recent music evidence mismatch")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(
            fetch(GROUP_URL),
            fetch(VIDEO_URL),
            fetch(ALBUM_URL),
            fetch(EUNHA_URL),
            fetch(SINB_URL),
            fetch(UMJI_URL),
        )
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"BPM VIVIZ current group identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
