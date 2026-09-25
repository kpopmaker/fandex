from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "rbw_agency_roster_adapter_v1"
DEFAULT_URL = "https://www.rbbridge.com/?page_id=17131"
EXPECTED_ARTISTS = ["MAMAMOO+", "ONEWE", "PURPLE KISS", "NXD"]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def canonical_roster_name(value: str) -> str:
    value = normalize_spaces(value)
    return re.sub(r"^\[PRE-DEBUT\]\s*", "", value, flags=re.I)


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    observed: dict[str, str] = {}
    for value in strings:
        canonical = canonical_roster_name(value)
        if canonical in EXPECTED_ARTISTS:
            observed.setdefault(canonical, value)

    if list(observed) != EXPECTED_ARTISTS:
        return []

    rows = []
    for name in EXPECTED_ARTISTS:
        raw = observed[name]
        aliases = [raw] if raw != name else []
        rows.append(
            {
                "displayArtist": name,
                "aliases": aliases,
                "evidence": [
                    {
                        "label": "RBW official exclusive artist roster",
                        "url": source_url,
                    }
                ],
            }
        )
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
            "id": "rbw-official-exclusive-artist-roster",
            "type": "agency_roster",
            "name": "RBW Official Exclusive Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "preDebutStatusPreserved": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("RBW fallback snapshot source object required")
    if source.get("id") != "rbw-official-exclusive-artist-roster":
        raise RuntimeError("RBW fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("RBW fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != len(EXPECTED_ARTISTS):
        raise RuntimeError("RBW fallback snapshot expected roster required")
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
            f"RBW roster adapter expected {len(EXPECTED_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
