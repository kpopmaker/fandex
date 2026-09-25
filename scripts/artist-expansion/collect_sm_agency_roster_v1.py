from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "sm_agency_roster_adapter_v1"
DEFAULT_URL = "https://www.smentertainment.com/artist/"
START_MARKER = "KANGTA"
DIRECTORY_MARKER = "2Spade"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact_identity(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣æ]+", "", normalize_spaces(value).casefold())


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    try:
        start = strings.index(START_MARKER)
        end = strings.index(DIRECTORY_MARKER, start + 1)
    except ValueError:
        return []

    raw = strings[start:end]
    selected: dict[str, dict] = {}
    for value in raw:
        if value in {"ARTIST", "아티스트 검색..."}:
            continue
        if "아티스트 검색" in value:
            continue
        key = compact_identity(value)
        if not key:
            continue
        selected.setdefault(
            key,
            {
                "displayArtist": value,
                "aliases": [],
                "evidence": [
                    {
                        "label": "SM Entertainment official featured artist roster",
                        "url": source_url,
                    }
                ],
            },
        )

    rows = list(selected.values())
    # Fail closed if the page structure changes materially. The verified
    # snapshot fallback remains provenance-explicit.
    if len(rows) < 10 or len(rows) > 30:
        return []
    return rows


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"
        },
    )
    response.raise_for_status()
    return response.text


def build_snapshot(rows: list[dict], source_url: str, observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "sm-entertainment-official-featured-artist-roster",
            "type": "agency_roster",
            "name": "SM Entertainment Official Featured Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "featuredRosterOnly": True,
            "memberDirectoryExcluded": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("SM fallback snapshot source object required")
    if source.get("id") != "sm-entertainment-official-featured-artist-roster":
        raise RuntimeError("SM fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("SM fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("SM fallback snapshot candidates required")
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

    if rows:
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError("SM featured artist roster adapter returned no artists")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
