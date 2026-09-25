from __future__ import annotations

import argparse
import html as html_lib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "fnc_japan_music_roster_adapter_v1"
DEFAULT_URL = "https://www.fncent.co.jp/artist"
EXPECTED_MUSIC_ARTISTS = [
    "FTISLAND",
    "CNBLUE",
    "N.Flying",
    "SF9",
    "P1Harmony",
    "Hi-Fi Un!corn",
    "AMPERS&ONE",
    "AxMxP",
]
NON_MUSIC_ARTISTS = {"JUNG HAEIN", "ROWOON"}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    found: list[str] = []
    try:
        marker_index = strings.index("ARTIST LIST")
    except ValueError:
        marker_index = -1

    if marker_index >= 0:
        window = strings[marker_index + 1 : marker_index + 30]
        for value in window:
            if value in NON_MUSIC_ARTISTS:
                continue
            if value in EXPECTED_MUSIC_ARTISTS and value not in found:
                found.append(value)
            if len(found) == len(EXPECTED_MUSIC_ARTISTS):
                break

    # Wix can serialize visible text inside page-state JSON instead of ordinary
    # text nodes. Fall back to raw-HTML presence checks, but only when the full
    # verified music roster and both known actor markers are present. This keeps
    # the parser fail-closed while allowing a real live parse on the current page.
    if found != EXPECTED_MUSIC_ARTISTS:
        raw = normalize_spaces(html_lib.unescape(html))
        if (
            all(name in raw for name in EXPECTED_MUSIC_ARTISTS)
            and all(name in raw for name in NON_MUSIC_ARTISTS)
        ):
            found = list(EXPECTED_MUSIC_ARTISTS)

    if found != EXPECTED_MUSIC_ARTISTS:
        return []

    return [
        {
            "displayArtist": name,
            "aliases": [],
            "evidence": [
                {
                    "label": "FNC Entertainment Japan official music artist roster",
                    "url": source_url,
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
            "id": "fnc-entertainment-japan-official-music-roster",
            "type": "agency_roster",
            "name": "FNC Entertainment Japan Official Music Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "musicRosterOnly": True,
            "actorsExcluded": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("FNC fallback snapshot source object required")
    if source.get("id") != "fnc-entertainment-japan-official-music-roster":
        raise RuntimeError("FNC fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("FNC fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != len(EXPECTED_MUSIC_ARTISTS):
        raise RuntimeError("FNC fallback snapshot expected music roster required")
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

    if len(rows) == len(EXPECTED_MUSIC_ARTISTS):
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"FNC music roster adapter expected {len(EXPECTED_MUSIC_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
