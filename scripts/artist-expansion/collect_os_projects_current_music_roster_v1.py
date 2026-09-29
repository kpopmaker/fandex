from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "os_projects_current_music_roster_adapter_v1"
ARTISTS_URL = "https://www.osprojects.kr/artists"
HOME_URL = "https://www.osprojects.kr/"
KIM_URL = "https://www.osprojects.kr/?bmode=view&idx=173992094&t=board"
EXPECTED_ARTISTS = ["Huh Gak", "Lim Han Byul", "KIM YECHAN", "HYB"]
HYB_MEMBERS = [
    "Huh Gak",
    "Shin Yong Jae",
    "Lim Han Byul"
]


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


def has_any(text: str, tokens: list[str]) -> bool:
    return any(has(text, token) for token in tokens)


def parse_live_pages(artists_html: str, home_html: str, kim_html: str) -> list[dict]:
    artists = text_blob(artists_html)
    home = text_blob(home_html)
    kim = text_blob(kim_html)

    for token in ["허각", "임한별", "김예찬", "허용별"]:
        if not has(artists, token):
            return []

    if not has_any(artists, ["허용별 (허각, 신용재, 임한별)", "허용별"]):
        return []
    if not all(has(artists, token) for token in ["허각", "신용재", "임한별"]):
        return []
    if not has_any(artists, ["이게 뭐냔 말이야", "별의 순간"]):
        return []

    if not has(home, "2026"):
        return []
    if not has(home, "허각") or not has(home, "임한별"):
        return []
    if not has_any(home, ["다시, 별 아래", "미친 사랑의 노래", "각별한 콘서트"]):
        return []

    if not all(has(kim, token) for token in ["김예찬", "OS프로젝트", "전속계약"]):
        return []
    if not has_any(kim, ["솔로 가수", "신곡 발매", "음악 활동"]):
        return []

    return [
        {
            "displayArtist": "Huh Gak",
            "aliases": ["허각", "HUH GAK"],
            "evidence": [
                {"label": "OS Projects official artist roster", "url": ARTISTS_URL},
                {"label": "OS Projects 2026 current news", "url": HOME_URL},
            ],
        },
        {
            "displayArtist": "Lim Han Byul",
            "aliases": ["임한별", "Onestar"],
            "evidence": [
                {"label": "OS Projects official artist roster", "url": ARTISTS_URL},
                {"label": "OS Projects 2026 current news", "url": HOME_URL},
            ],
        },
        {
            "displayArtist": "KIM YECHAN",
            "aliases": ["Kim Yechan", "김예찬"],
            "evidence": [
                {"label": "OS Projects official artist roster", "url": ARTISTS_URL},
                {"label": "OS Projects September 2026 exclusive-contract notice", "url": KIM_URL},
            ],
        },
        {
            "displayArtist": "HYB",
            "aliases": ["허용별", "HuhYongByul"],
            "evidence": [
                {"label": "OS Projects official artist roster with HYB music-video entries", "url": ARTISTS_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "os-projects-official-current-music-roster",
            "type": "agency_roster",
            "name": "OS Projects Official Current Music Roster",
            "observedAt": observed_at,
            "url": ARTISTS_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "Huh Gak": {
                "agency": "OS Projects",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "Lim Han Byul": {
                "agency": "OS Projects",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "KIM YECHAN": {
                "agency": "OS Projects",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "HYB": {
                "agency": "OS Projects",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "project",
                "members": HYB_MEMBERS,
                "memberCount": len(HYB_MEMBERS),
            },
        },
        "contract": {
            "officialSourceOnly": True,
            "fullOfficialArtistPageRequired": True,
            "current2026ActivityRequiredForExistingSoloists": True,
            "kimYechanOfficialContractRequired": True,
            "hybOfficialMusicVideoIdentityRequired": True,
            "hybExactMemberCompositionRequired": True,
            "projectMemberDoesNotCreateSoloCanonical": True,
            "projectIdentityDoesNotCollapseMemberSoloIdentity": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "os-projects-official-current-music-roster":
        raise RuntimeError("OS Projects fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("OS Projects fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("OS Projects fallback exact artist roster required")
    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("OS Projects fallback current roster required")
    for artist in ["Huh Gak", "Lim Han Byul", "KIM YECHAN"]:
        if roster.get(artist, {}).get("agency") != "OS Projects":
            raise RuntimeError(f"OS Projects fallback agency mismatch for {artist}")
        if roster.get(artist, {}).get("lifecycleStatus") != "active":
            raise RuntimeError(f"OS Projects fallback active lifecycle required for {artist}")
    if roster.get("HYB", {}).get("members") != HYB_MEMBERS:
        raise RuntimeError("OS Projects fallback HYB member composition mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(ARTISTS_URL), fetch(HOME_URL), fetch(KIM_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"OS Projects current music roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
