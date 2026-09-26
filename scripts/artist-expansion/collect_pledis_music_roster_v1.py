from __future__ import annotations

import argparse
import html as html_lib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "pledis_music_identity_roster_adapter_v1"
DEFAULT_URL = "https://www.pledis.co.kr/artist/all/"
EXPECTED_ARTISTS = [
    "AFTER SCHOOL",
    "ORANGE CARAMEL",
    "BUMZU",
    "NU'EST",
    "HWANG MIN HYUN",
    "SEVENTEEN",
    "TWS",
]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact(value: str) -> str:
    text = normalize_spaces(value).upper()
    text = text.replace("’", "'").replace(chr(96), "'")
    return re.sub(r"[^0-9A-Z]+", "", text)


def page_contains_artist(strings: list[str], artist: str) -> bool:
    target = compact(artist)
    return any(target and target in compact(value) for value in strings)


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    visible_match = all(page_contains_artist(strings, name) for name in EXPECTED_ARTISTS)

    # The current PLEDIS site can serialize artist-card data into client-rendered
    # page state rather than ordinary text nodes. Accept the live page only when
    # every expected music identity and the PLEDIS brand marker are present in
    # the raw official HTML; otherwise fail closed to the verified snapshot.
    raw = compact(html_lib.unescape(html))
    raw_match = (
        compact("PLEDIS Entertainment") in raw
        and all(compact(name) in raw for name in EXPECTED_ARTISTS)
    )

    if not (visible_match or raw_match):
        return []

    aliases = {
        "AFTER SCHOOL": ["애프터스쿨"],
        "ORANGE CARAMEL": ["오렌지캬라멜"],
        "BUMZU": ["범주"],
        "NU'EST": ["NU’EST", "뉴이스트"],
        "HWANG MIN HYUN": ["황민현"],
        "SEVENTEEN": ["세븐틴"],
        "TWS": ["투어스"],
    }
    return [
        {
            "displayArtist": name,
            "aliases": aliases.get(name, []),
            "evidence": [
                {
                    "label": "PLEDIS Entertainment official artist identity roster",
                    "url": source_url,
                }
            ],
        }
        for name in EXPECTED_ARTISTS
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
            "id": "pledis-official-music-identity-roster",
            "type": "agency_roster",
            "name": "PLEDIS Entertainment Official Music Identity Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "identityRosterIsNotLifecycleTruth": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("PLEDIS fallback snapshot source object required")
    if source.get("id") != "pledis-official-music-identity-roster":
        raise RuntimeError("PLEDIS fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("PLEDIS fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != len(EXPECTED_ARTISTS):
        raise RuntimeError("PLEDIS fallback snapshot expected roster required")
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
            f"PLEDIS roster adapter expected {len(EXPECTED_ARTISTS)} identities, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
