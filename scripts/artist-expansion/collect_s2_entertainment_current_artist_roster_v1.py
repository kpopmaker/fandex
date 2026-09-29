from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "s2_entertainment_current_artist_roster_adapter_v1"
ROSTER_URL = "https://s2ent.co.kr/17"
PROFILE_URL = "https://s2ent.co.kr/34"
ACTIVITY_URL = "https://s2ent.co.kr/47"
EXPECTED_ARTISTS = ["KISS OF LIFE"]
EXPECTED_MEMBERS = ["JULIE", "NATTY", "BELLE", "HANEUL"]


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


def parse_live_pages(roster_html: str, profile_html: str, activity_html: str) -> list[dict]:
    roster = text_blob(roster_html)
    profile = text_blob(profile_html)
    activity = text_blob(activity_html)

    if not has(roster, "ARTIST") or not has(roster, "KISS OF LIFE"):
        return []
    if not has_any(roster, ["S2 ENTERTAINMENT", "S2엔터테인먼트", "S2 ENT"]):
        return []

    if not has(profile, "KISS OF LIFE"):
        return []
    for member in EXPECTED_MEMBERS:
        if not has(profile, member):
            return []

    if not has(activity, "KISS OF LIFE"):
        return []
    if not has_any(activity, ["2026.09.16", "2026.08.04", "2026.04.06"]):
        return []
    if not has_any(activity, ["SWEAT", "Who is she"]):
        return []

    return [
        {
            "displayArtist": "KISS OF LIFE",
            "aliases": ["키스오브라이프", "KIOF"],
            "evidence": [
                {"label": "S2 Entertainment official ARTIST directory", "url": ROSTER_URL},
                {"label": "S2 Entertainment official KISS OF LIFE profile", "url": PROFILE_URL},
                {"label": "S2 Entertainment official KISS OF LIFE 2026 album activity", "url": ACTIVITY_URL},
            ],
        }
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "s2-entertainment-official-current-artist-roster",
            "type": "agency_roster",
            "name": "S2 Entertainment Official Current Artist Roster",
            "observedAt": observed_at,
            "url": ROSTER_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "KISS OF LIFE": {
                "agency": "S2 Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": EXPECTED_MEMBERS,
                "memberCount": 4,
            }
        },
        "contract": {
            "officialFirstPartyRosterRequired": True,
            "exactCurrentArtistDirectoryRequired": True,
            "exactCurrentMemberSetRequired": True,
            "current2026MusicActivityRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "s2-entertainment-official-current-artist-roster":
        raise RuntimeError("S2 fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("S2 fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("S2 fallback exact current artist roster required")

    roster = snapshot.get("currentRoster")
    entry = roster.get("KISS OF LIFE", {}) if isinstance(roster, dict) else {}
    if entry.get("agency") != "S2 Entertainment":
        raise RuntimeError("S2 fallback agency mismatch")
    if entry.get("lifecycleStatus") != "active":
        raise RuntimeError("S2 fallback active lifecycle required")
    if entry.get("entityType") != "group":
        raise RuntimeError("S2 fallback group identity required")
    if entry.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("S2 fallback exact current member set required")
    if entry.get("memberCount") != 4:
        raise RuntimeError("S2 fallback member count mismatch")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(ROSTER_URL), fetch(PROFILE_URL), fetch(ACTIVITY_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"S2 current artist roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
