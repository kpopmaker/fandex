from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "newbeat_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://newbeat-official.jp/profiles"
HOME_URL = "https://newbeat-official.jp/"
EXPECTED_ARTISTS = ["NEWBEAT"]
EXPECTED_MEMBERS = [
    "Minseok Park",
    "Minsung Hong",
    "Yeoyeojeong Jeon",
    "Seohyun Choi",
    "Taeyang Kim",
    "Yunhu Jo",
    "Riwoo Kim",
]


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


def parse_live_pages(profile_html: str, home_html: str) -> list[dict]:
    profile_terms = ["NEWBEAT", "2025年3月24日"] + EXPECTED_MEMBERS
    if not contains_all(profile_html, profile_terms):
        return []
    if not contains_all(home_html, ["NEWBEAT", "2026.09.25"]):
        return []

    return [{
        "displayArtist": "NEWBEAT",
        "aliases": ["뉴비트"],
        "evidence": [
            {"label": "NEWBEAT Japan official profile", "url": PROFILE_URL},
            {"label": "NEWBEAT Japan current official site", "url": HOME_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "newbeat-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "NEWBEAT Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleActOfficialCatalog": True,
            "currentActivityEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "catalogPresenceDoesNotImplyBroaderBeatInteractiveRoster": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "newbeat-official-current-provider-catalog":
        raise RuntimeError("NEWBEAT fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("NEWBEAT fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("NEWBEAT fallback exact provider catalog required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(PROFILE_URL), fetch(HOME_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"NEWBEAT provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
