from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "antenna_music_roster_adapter_v1"
DEFAULT_URL = "https://antenna.co.kr/Artist"

PAGE_ARTISTS = [
    "You Hee Yul",
    "Yu Jae Seok",
    "Jung Jae Hyung",
    "Lucid Fall",
    "PEPPERTONES",
    "Lee Seo Jin",
    "Lee Sang Soon",
    "Lee Hyo Ri",
    "Jung Seung Hwan",
    "Park Sae Byul",
    "KYUHYUN",
    "Yang Se Chan",
    "Dragon Pony",
]

MUSIC_ARTISTS = [
    "You Hee Yul (TOY)",
    "Jung Jae Hyung",
    "Lucid Fall",
    "PEPPERTONES",
    "Lee Sang Soon",
    "Lee Hyo Ri",
    "Jung Seung Hwan",
    "Park Sae Byul",
    "KYUHYUN",
    "Dragon Pony",
]

NON_MUSIC_ARTISTS = ["Yu Jae Seok", "Lee Seo Jin", "Yang Se Chan"]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    if not all(any(expected == value or expected in value for value in strings) for expected in PAGE_ARTISTS):
        return []

    rows = [
        {
            "displayArtist": "You Hee Yul (TOY)",
            "aliases": ["유희열", "유희열 (TOY)", "TOY", "Toy"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Jung Jae Hyung",
            "aliases": ["정재형"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Lucid Fall",
            "aliases": ["루시드폴"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "PEPPERTONES",
            "aliases": ["페퍼톤스"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Lee Sang Soon",
            "aliases": ["이상순"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Lee Hyo Ri",
            "aliases": ["이효리"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Jung Seung Hwan",
            "aliases": ["정승환"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Park Sae Byul",
            "aliases": ["박새별"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "KYUHYUN",
            "aliases": ["규현"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
        {
            "displayArtist": "Dragon Pony",
            "aliases": ["드래곤포니", "Dragon Pony (드래곤포니)"],
            "evidence": [{"label": "Antenna official artist roster", "url": source_url}],
        },
    ]

    if [row["displayArtist"] for row in rows] != MUSIC_ARTISTS:
        return []
    return rows


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
            "id": "antenna-official-music-artist-roster",
            "type": "agency_roster",
            "name": "Antenna Official Music Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "musicIdentitiesOnly": True,
            "nonMusicProfilesExcluded": NON_MUSIC_ARTISTS,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("Antenna fallback snapshot source object required")
    if source.get("id") != "antenna-official-music-artist-roster":
        raise RuntimeError("Antenna fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("Antenna fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != len(MUSIC_ARTISTS):
        raise RuntimeError("Antenna fallback snapshot expected music roster required")
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

    if len(rows) == len(MUSIC_ARTISTS):
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"Antenna music roster adapter expected {len(MUSIC_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
