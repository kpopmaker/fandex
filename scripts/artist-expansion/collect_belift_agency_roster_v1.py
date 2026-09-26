from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "belift_official_music_roster_adapter_v1"
DEFAULT_URL = "https://beliftlab.com/"
EXPECTED_ARTISTS = ["ENHYPEN", "ILLIT", "EVAN"]
PROFILE_URLS = {
    "ENHYPEN": "https://beliftlab.com/artist/profile/ENHYPEN",
    "ILLIT": "https://beliftlab.com/artist/profile/ILLIT",
    "EVAN": "https://beliftlab.com/artist/profile/EVAN",
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    found: list[str] = []
    for expected in EXPECTED_ARTISTS:
        if expected in strings and expected not in found:
            found.append(expected)

    if found != EXPECTED_ARTISTS:
        return []

    return [
        {
            "displayArtist": name,
            "aliases": [],
            "evidence": [
                {
                    "label": "BELIFT LAB official artist profile",
                    "url": PROFILE_URLS[name],
                }
            ],
        }
        for name in found
    ]


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def build_snapshot(rows: list[dict], source_url: str, observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "belift-official-music-roster",
            "type": "agency_roster",
            "name": "BELIFT LAB Official Music Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "identityRosterIsNotLifecycleTruth": True,
            "memberCreditIsNotIndependentSoloIdentity": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("BELIFT LAB fallback snapshot source object required")
    if source.get("id") != "belift-official-music-roster":
        raise RuntimeError("BELIFT LAB fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("BELIFT LAB fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BELIFT LAB fallback snapshot exact roster required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--html")
    parser.add_argument("--observed-at")
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        html = Path(args.html).read_text(encoding="utf-8") if args.html else fetch(args.url)
        rows = parse_roster(html, args.url)
    except requests.RequestException:
        rows = []

    if len(rows) == len(EXPECTED_ARTISTS):
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"BELIFT LAB roster adapter expected {len(EXPECTED_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
