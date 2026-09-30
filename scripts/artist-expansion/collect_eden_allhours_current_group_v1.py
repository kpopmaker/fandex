from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "eden_allhours_current_group_adapter_v1"
INTRO_URL = "https://all-h-ours.com/contents/section/65892d155660697e81e136ea"
UNBOUND_URL = "https://all-h-ours.com/community/board/65669da51cb04d2dda946a8f/post/6a8bddf7ce53f323ff5867b0"
BROADCAST_URL = "https://all-h-ours.com/surveys/6a9e9e7ff96937336a415e50"

EXPECTED_ARTISTS = ["ALL(H)OURS"]
MEMBERS = ["KUNHO", "ON:N", "MINJE", "YOUMIN", "HYUNBIN", "MASAMI", "XAYDEN"]


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


def parse_live_pages(intro_html: str, unbound_html: str, broadcast_html: str) -> list[dict]:
    intro = text_blob(intro_html)
    unbound = text_blob(unbound_html)
    broadcast = text_blob(broadcast_html)

    if not has(intro, "ALL(H)OURS"):
        return []
    for member in MEMBERS:
        if not has(intro, member):
            return []

    for token in ["ALL(H)OURS", "SIXTH MINI ALBUM", "UNBOUND", "2026", "이든엔터테인먼트"]:
        if not has(unbound, token):
            return []

    for token in ["ALL(H)OURS", "SIXTH MINI ALBUM", "UNBOUND", "2026"]:
        if not has(broadcast, token):
            return []

    return [{
        "displayArtist": "ALL(H)OURS",
        "aliases": ["올아워즈", "ALLHOURS"],
        "evidence": [
            {"label": "ALL(H)OURS official current INTRO member roster", "url": INTRO_URL},
            {"label": "EDEN Entertainment official sixth mini album UNBOUND notice", "url": UNBOUND_URL},
            {"label": "ALL(H)OURS official current music-broadcast participation notice", "url": BROADCAST_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "eden-official-allhours-current-group-identity",
            "type": "agency_roster",
            "name": "EDEN Entertainment Official ALL(H)OURS Current Group Identity",
            "observedAt": observed_at,
            "url": INTRO_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "ALL(H)OURS": {
                "agency": "Eden Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": MEMBERS,
                "memberCount": 7,
                "current2026MusicEvidence": {
                    "release": "UNBOUND",
                    "releaseDate": "2026-09-10",
                    "releaseType": "sixth_mini_album",
                },
            }
        },
        "contract": {
            "officialCurrentIntroRequired": True,
            "exactSevenMemberIdentityRequired": True,
            "edenOfficialCurrentReleaseNoticeRequired": True,
            "current2026MusicActivityRequired": True,
            "memberNameAloneDoesNotCreateSoloCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "eden-official-allhours-current-group-identity":
        raise RuntimeError("EDEN ALL(H)OURS fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("EDEN ALL(H)OURS fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("EDEN ALL(H)OURS fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("ALL(H)OURS", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "Eden Entertainment":
        raise RuntimeError("EDEN ALL(H)OURS fallback agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("EDEN ALL(H)OURS fallback active verified state required")
    if entry.get("entityType") != "group":
        raise RuntimeError("EDEN ALL(H)OURS fallback group identity required")
    if entry.get("members") != MEMBERS or entry.get("memberCount") != 7:
        raise RuntimeError("EDEN ALL(H)OURS fallback exact seven-member identity required")

    recent = entry.get("current2026MusicEvidence", {})
    if recent.get("release") != "UNBOUND" or recent.get("releaseDate") != "2026-09-10":
        raise RuntimeError("EDEN ALL(H)OURS fallback current music evidence mismatch")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(INTRO_URL), fetch(UNBOUND_URL), fetch(BROADCAST_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"EDEN ALL(H)OURS current group identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
