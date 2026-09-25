from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "wakeone_notice_aware_roster_adapter_v1"
DEFAULT_URL = "https://wake-one.com/artists/"
TERMINATION_NOTICE_URL = "https://wake-one.com/notice/"
PAGE_ARTISTS = [
    "YICHEN",
    "KANG WOO JIN",
    "ALPHA DRIVE ONE",
    "KIM FEEL",
    "ZEROBASEONE",
    "izna",
    "Kep1er",
    "JO YURI",
    "KIM JAE HWAN",
    "HA HYUN SANG",
    "LEE DAE HWI",
]
TERMINATED_ARTISTS = {"HA HYUN SANG"}
EFFECTIVE_ARTISTS = [name for name in PAGE_ARTISTS if name not in TERMINATED_ARTISTS]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def page_contains_artist(strings: list[str], artist: str) -> bool:
    target = re.sub(r"[^0-9a-z]+", "", artist.casefold())
    for value in strings:
        compact = re.sub(r"[^0-9a-z]+", "", value.casefold())
        if target and target in compact:
            return True
    return False


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    if not all(page_contains_artist(strings, name) for name in PAGE_ARTISTS):
        return []

    return [
        {
            "displayArtist": name,
            "aliases": [],
            "evidence": [
                {
                    "label": "WAKEONE official artists page",
                    "url": source_url,
                }
            ],
        }
        for name in EFFECTIVE_ARTISTS
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
            "id": "wakeone-official-artist-roster-notice-aware",
            "type": "agency_roster",
            "name": "WAKEONE Official Artist Roster (Notice-Aware)",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "officialNoticeOverridesRosterPage": True,
            "terminatedArtistsExcluded": sorted(TERMINATED_ARTISTS),
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("WAKEONE fallback snapshot source object required")
    if source.get("id") != "wakeone-official-artist-roster-notice-aware":
        raise RuntimeError("WAKEONE fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("WAKEONE fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != len(EFFECTIVE_ARTISTS):
        raise RuntimeError("WAKEONE fallback snapshot expected roster required")
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

    if len(rows) == len(EFFECTIVE_ARTISTS):
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"WAKEONE notice-aware roster expected {len(EFFECTIVE_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
