from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ichillin_official_current_provider_catalog_adapter_v1"
GROUP_PROFILE_URL = "https://kment.kr/?page_id=2054"
UNIT_MV_URL = "https://www.youtube.com/watch?v=C1ILOsm8Zmc"
EXPECTED_ARTISTS = ["ICHILLIN'", "ICHILLIN' J"]
GROUP_MEMBERS = ["JIYOON", "E.JI", "JACKIE", "JOONIE", "CHAERIN", "YEJU", "CHOWON"]

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

def contains_any(html: str, terms: list[str]) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(v) for v in soup.stripped_strings]
    raw = normalize_spaces(html)
    return any(
        any(term.lower() in value.lower() for value in strings)
        or term.lower() in raw.lower()
        for term in terms
    )

def parse_live_pages(group_html: str, unit_html: str) -> list[dict]:
    if not contains_any(group_html, ["ICHILLIN", "아이칠린"]):
        return []
    member_hits = sum(1 for member in GROUP_MEMBERS if contains_any(group_html, [member]))
    if member_hits < 5:
        return []
    if not contains_any(unit_html, ["ICHILLIN' J", "ICHILLIN J", "아이칠린 제이", "아이칠린 J"]):
        return []
    if not contains_any(unit_html, ["Look At Me", "BANANA"]):
        return []
    return [
        {
            "displayArtist": "ICHILLIN'",
            "aliases": ["아이칠린", "ICHILLIN"],
            "evidence": [{"label": "KM Entertainment official ICHILLIN profile", "url": GROUP_PROFILE_URL}],
        },
        {
            "displayArtist": "ICHILLIN' J",
            "aliases": ["아이칠린 제이", "아이칠린J", "ICHILLIN J"],
            "evidence": [{"label": "ICHILLIN official unit release", "url": UNIT_MV_URL}],
        },
    ]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ichillin-official-current-music-identity-catalog",
            "type": "provider_catalog",
            "name": "ICHILLIN Official Current Music Identity Catalog",
            "observedAt": observed_at,
            "url": GROUP_PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "parentGroupAndOfficialUnitOnly": True,
            "unitMembersDoNotCreateSoloCanonicals": True,
            "unitIdentityDoesNotReplaceParentGroup": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ichillin-official-current-music-identity-catalog":
        raise RuntimeError("ICHILLIN fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("ICHILLIN fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ICHILLIN fallback exact identity catalog required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(GROUP_PROFILE_URL), fetch(UNIT_MV_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"ICHILLIN identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
