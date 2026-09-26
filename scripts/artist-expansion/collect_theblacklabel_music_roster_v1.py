from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "theblacklabel_music_roster_adapter_v1"
DEFAULT_URL = "https://theblacklabel.com/"

PAGE_ARTISTS = [
    "YIM SI WAN",
    "KWAK DONG YEON",
    "MEOVV",
    "TAEYANG",
    "PARK BO GUM",
    "ALLDAY PROJECT",
    "Vince",
    "JEON SOMI",
    "LEEJUNG LEE",
    "ROSÉ",
    "LEE JONG WON",
]

MUSIC_ARTISTS = [
    "MEOVV",
    "TAEYANG",
    "ALLDAY PROJECT",
    "Vince",
    "JEON SOMI",
    "ROSÉ",
]

NON_MUSIC_ARTISTS = [
    "YIM SI WAN",
    "KWAK DONG YEON",
    "PARK BO GUM",
    "LEEJUNG LEE",
    "LEE JONG WON",
]

ALIASES = {
    "MEOVV": ["미야오"],
    "TAEYANG": ["태양"],
    "ALLDAY PROJECT": ["올데이 프로젝트"],
    "Vince": ["빈스"],
    "JEON SOMI": ["전소미", "SOMI"],
    "ROSÉ": ["로제", "ROSE"],
}


def normalize_spaces(value: str) -> str:
    value = unicodedata.normalize("NFC", str(value or ""))
    return re.sub(r"\s+", " ", value).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    if not all(any(expected == value or expected in value for value in strings) for expected in PAGE_ARTISTS):
        return []

    rows = [
        {
            "displayArtist": name,
            "aliases": ALIASES.get(name, []),
            "evidence": [
                {
                    "label": "THEBLACKLABEL official artist roster",
                    "url": source_url,
                }
            ],
        }
        for name in MUSIC_ARTISTS
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
            "id": "theblacklabel-official-music-artist-roster",
            "type": "agency_roster",
            "name": "THEBLACKLABEL Official Music Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "musicIdentitiesOnly": True,
            "nonMusicProfilesExcluded": NON_MUSIC_ARTISTS,
            "rosterPresenceDoesNotCreateMemberSoloIdentity": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("THEBLACKLABEL fallback snapshot source object required")
    if source.get("id") != "theblacklabel-official-music-artist-roster":
        raise RuntimeError("THEBLACKLABEL fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("THEBLACKLABEL fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != MUSIC_ARTISTS:
        raise RuntimeError("THEBLACKLABEL fallback snapshot exact music roster required")
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
            f"THEBLACKLABEL music roster adapter expected {len(MUSIC_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
