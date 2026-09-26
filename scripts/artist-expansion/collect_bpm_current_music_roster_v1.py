from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "bpm_current_verified_music_roster_adapter_v1"
SOURCE_URL = "https://www.bpment.co.kr/"
EXPECTED_ARTISTS = ["HA SUNG WOON", "BADVILLAIN"]
URLS = {
    "HA SUNG WOON": [
        "https://www.bpment.co.kr/artist/profile.php?idx=291",
        "https://www.bpment.co.kr/artist/video.php?idx=291",
    ],
    "BADVILLAIN": [
        "https://www.bpment.co.kr/artist/profile.php?idx=290",
        "https://www.bpment.co.kr/artist/discography.php?idx=290",
    ],
}
ALIASES = {
    "HA SUNG WOON": ["하성운"],
    "BADVILLAIN": ["배드빌런"],
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def contains_identity(html: str, display_artist: str) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(v) for v in soup.stripped_strings]
    raw = normalize_spaces(html)
    if display_artist == "HA SUNG WOON":
        return (
            any("HA SUNG WOON" in v or "하성운" in v for v in strings)
            or "HA SUNG WOON" in raw
            or "하성운" in raw
        )
    return (
        any("BADVILLAIN" in v or "배드빌런" in v for v in strings)
        or "BADVILLAIN" in raw
        or "배드빌런" in raw
    )


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def parse_live_pages(pages: dict[str, list[str]]) -> list[dict]:
    rows: list[dict] = []
    for display_artist in EXPECTED_ARTISTS:
        html_pages = pages.get(display_artist, [])
        if len(html_pages) != len(URLS[display_artist]):
            return []
        if not all(contains_identity(html, display_artist) for html in html_pages):
            return []
        if display_artist == "HA SUNG WOON":
            activity_text = normalize_spaces(" ".join(html_pages))
            if "Tell The World" not in activity_text and "2026.01.09" not in activity_text:
                return []
        elif display_artist == "BADVILLAIN":
            activity_text = normalize_spaces(" ".join(html_pages))
            if "THRILLER" not in activity_text and "OVERSTEP" not in activity_text:
                return []
        rows.append({
            "displayArtist": display_artist,
            "aliases": ALIASES[display_artist],
            "evidence": [
                {
                    "label": "Big Planet Made current official identity and activity",
                    "url": url,
                }
                for url in URLS[display_artist]
            ],
        })
    return rows


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "bpm-current-verified-music-identities",
            "type": "agency_roster",
            "name": "Big Planet Made Current Verified Music Identities",
            "observedAt": observed_at,
            "url": SOURCE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "notExhaustiveLabelRoster": True,
            "currentActivityEvidenceRequired": True,
            "historicalOrStaleProfilesExcludedByDefault": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "bpm-current-verified-music-identities":
        raise RuntimeError("BPM fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("BPM fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BPM fallback snapshot exact verified identities required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    pages: dict[str, list[str]] = {}
    try:
        for artist, urls in URLS.items():
            pages[artist] = [fetch(url) for url in urls]
        rows = parse_live_pages(pages)
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"BPM current verified music roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
