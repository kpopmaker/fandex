from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "strangelab_current_verified_music_roster_adapter_v1"
HOME_URL = "https://strangelab.co.kr/"
LU_URL = "https://strangelab.co.kr/product/item.php?it_id=1776925385"
XLOV_NOTICE_URL = "https://xlov.bstage.in/community/board/6936950ed5ea7d083d8908f5/post/6a7aac6a4d3d9a091d38f7eb"
EXPECTED_ARTISTS = ["XLOV", "LU"]


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


def contains(html: str, terms: list[str]) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(v) for v in soup.stripped_strings]
    raw = normalize_spaces(html)
    return all(
        any(term.lower() in value.lower() for value in strings)
        or term.lower() in raw.lower()
        for term in terms
    )


def parse_live_pages(home_html: str, lu_html: str, notice_html: str) -> list[dict]:
    if not contains(home_html, ["XLOV", "LU"]):
        return []
    if not contains(lu_html, ["LU", "UNFOLD", "2026.03.28"]):
        return []
    if not contains(notice_html, ["StrangeLab", "XLOV", "LU"]):
        return []

    return [
        {
            "displayArtist": "XLOV",
            "aliases": ["엑스러브"],
            "evidence": [
                {"label": "StrangeLab current official artist directory", "url": HOME_URL},
                {"label": "XLOV official agency restructuring notice", "url": XLOV_NOTICE_URL},
            ],
        },
        {
            "displayArtist": "LU",
            "aliases": ["강하윤"],
            "evidence": [
                {"label": "StrangeLab current official artist profile", "url": LU_URL},
                {"label": "XLOV official agency restructuring notice", "url": XLOV_NOTICE_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "strangelab-current-verified-music-identities",
            "type": "agency_roster",
            "name": "StrangeLab Current Verified Music Identities",
            "observedAt": observed_at,
            "url": HOME_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "currentManagementEvidenceRequired": True,
            "homepageDirectoryAloneIsNotLifecycleTruth": True,
            "transferredArtistExcluded": ["OH MY GIRL"],
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "strangelab-current-verified-music-identities":
        raise RuntimeError("StrangeLab fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("StrangeLab fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("StrangeLab fallback exact verified identities required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(HOME_URL), fetch(LU_URL), fetch(XLOV_NOTICE_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"StrangeLab current roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
