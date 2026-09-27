from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "pow_official_current_provider_catalog_adapter_v1"
GRID_PROFILE_URL = "https://grident.net/product/pow/28/"
JAPAN_PROFILE_URL = "https://powofficial.jp/profile"
DISCOGRAPHY_URL = "https://powofficial.jp/discography"
NEWS_URL = "https://www.powofficial.jp/news?page=1"
EXPECTED_ARTISTS = ["POW"]
EXPECTED_MEMBERS = ["YORCH", "HYUNBIN", "JUNGBIN", "DONGYEON", "HONG"]

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

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def parse_live_pages(
    grid_profile_html: str,
    japan_profile_html: str,
    discography_html: str,
    news_html: str,
) -> list[dict]:
    grid = text_blob(grid_profile_html).lower()
    japan = text_blob(japan_profile_html).lower()
    discography = text_blob(discography_html).lower()
    news = text_blob(news_html).lower()

    for member in EXPECTED_MEMBERS:
        if member.lower() not in grid:
            return []
        if member.lower() not in japan:
            return []

    if "grid entertainment" not in grid and "그리드 엔터테인먼트" not in grid:
        return []
    if "5" not in grid and "5인" not in grid:
        return []
    if "2023.10.11" not in grid and "2023-10-11" not in grid:
        return []

    if "grid" not in japan:
        return []
    if "5" not in japan:
        return []

    if "flavor" not in discography or "2026.07.28" not in discography:
        return []
    if "come true" not in discography or "2026.01.28" not in discography:
        return []

    if "2026.07.22" not in news and "2026-07-22" not in news:
        return []
    if "grid" not in news:
        return []

    return [{
        "displayArtist": "POW",
        "aliases": ["파우"],
        "evidence": [
            {"label": "GRID Entertainment official POW profile", "url": GRID_PROFILE_URL},
            {"label": "POW current official Japan five-member profile", "url": JAPAN_PROFILE_URL},
            {"label": "POW official Japan discography through 2026", "url": DISCOGRAPHY_URL},
            {"label": "POW official Japan current news index", "url": NEWS_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "pow-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "POW Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": GRID_PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentManagementEvidenceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "currentActivityEvidenceRequired": True,
            "gridAndJapanOfficialProfilesMustAgree": True,
            "officialDebutDateFromGridProfile": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "releaseEntriesDoNotCreateSeparateArtistCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "pow-official-current-provider-catalog":
        raise RuntimeError("POW fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("POW fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("POW fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("POW fallback exact current member contract required")
    if contract.get("gridAndJapanOfficialProfilesMustAgree") is not True:
        raise RuntimeError("POW fallback official profile agreement required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(
            fetch(GRID_PROFILE_URL),
            fetch(JAPAN_PROFILE_URL),
            fetch(DISCOGRAPHY_URL),
            fetch(NEWS_URL),
        )
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"POW provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
