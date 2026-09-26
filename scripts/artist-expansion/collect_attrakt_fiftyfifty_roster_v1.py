from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "attrakt_current_fiftyfifty_roster_adapter_v1"
DIRECTORY_URL = "https://www.theattrakt.com/en/artist/list.php"
PROFILE_URL = "https://weverse.io/fiftyfifty/highlight"
ACTIVITY_URL = "https://weverse.io/fiftyfifty/notice/37103?hl=ko"
EXPECTED_ARTISTS = ["FIFTY FIFTY"]
EXPECTED_MEMBERS = ["KEENA", "CHANELLE MOON", "YEWON", "HANA", "ATHENA"]


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


def contains_all(html: str, terms: list[str]) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(v) for v in soup.stripped_strings]
    raw = normalize_spaces(html)
    return all(
        any(term.lower() in value.lower() for value in strings)
        or term.lower() in raw.lower()
        for term in terms
    )


def parse_live_pages(directory_html: str, profile_html: str, activity_html: str) -> list[dict]:
    if not contains_all(directory_html, ["FIFTY FIFTY"]):
        return []
    if not contains_all(profile_html, EXPECTED_MEMBERS):
        return []
    if not contains_all(activity_html, ["FIFTY FIFTY", "2026"]):
        return []

    return [{
        "displayArtist": "FIFTY FIFTY",
        "aliases": ["피프티피프티", "피프티 피프티", "FIFTYFIFTY"],
        "evidence": [
            {"label": "ATTRAKT current official artist directory", "url": DIRECTORY_URL},
            {"label": "FIFTY FIFTY current official profile", "url": PROFILE_URL},
            {"label": "ATTRAKT current 2026 FIFTY FIFTY activity", "url": ACTIVITY_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "attrakt-current-fiftyfifty-roster",
            "type": "agency_roster",
            "name": "ATTRAKT Current FIFTY FIFTY Roster",
            "observedAt": observed_at,
            "url": DIRECTORY_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "exactCurrentDirectoryRequired": True,
            "currentLineupEvidenceRequired": True,
            "memberHiatusDoesNotOverrideGroupLifecycle": True,
            "formerMemberIdentityDoesNotReplaceCurrentGroupIdentity": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "attrakt-current-fiftyfifty-roster":
        raise RuntimeError("ATTRAKT fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("ATTRAKT fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ATTRAKT fallback exact current roster required")
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
            fetch(DIRECTORY_URL),
            fetch(PROFILE_URL),
            fetch(ACTIVITY_URL),
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
        raise RuntimeError(f"ATTRAKT current roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
