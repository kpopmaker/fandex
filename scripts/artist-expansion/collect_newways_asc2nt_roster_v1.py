from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "newways_current_asc2nt_roster_adapter_v1"
ARTIST_URL = "https://www.newways.co.kr/artists"
ACTIVITY_URL = "https://www.newways.co.kr/new/?bmode=view&idx=170176714"
EXPECTED_ARTISTS = ["ASC2NT"]
EXPECTED_MEMBERS = ["KARAM", "REON", "JAY", "KYLE", "HYOWON"]


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


def parse_live_pages(artist_html: str, activity_html: str) -> list[dict]:
    if not contains_all(artist_html, ["ASC2NT"] + EXPECTED_MEMBERS):
        return []
    if not contains_all(activity_html, ["ASC2NT", "STILL : I"]):
        return []

    return [{
        "displayArtist": "ASC2NT",
        "aliases": ["어센트"],
        "evidence": [
            {"label": "NEW WAYS COMPANY current official artist page", "url": ARTIST_URL},
            {"label": "NEW WAYS COMPANY official 2026 activity", "url": ACTIVITY_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "newways-current-asc2nt-roster",
            "type": "agency_roster",
            "name": "NEW WAYS COMPANY Current ASC2NT Roster",
            "observedAt": observed_at,
            "url": ARTIST_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "currentOfficialLineupOnly": True,
            "currentActivityEvidenceRequired": True,
            "historicalLineupDoesNotOverrideCurrentProfile": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "newways-current-asc2nt-roster":
        raise RuntimeError("NEW WAYS fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("NEW WAYS fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("NEW WAYS fallback exact current roster required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(ARTIST_URL), fetch(ACTIVITY_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"NEW WAYS ASC2NT roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
