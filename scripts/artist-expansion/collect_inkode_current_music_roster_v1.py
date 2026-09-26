from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "inkode_current_music_roster_adapter_v1"
DIRECTORY_URL = "https://www.in-kode.com/artist.html"
DETAIL_URLS = {
    "NICOLE": "https://www.in-kode.com/nicole.html",
    "SAY MY NAME": "https://www.in-kode.com/say_my_name.html",
    "KEYVITUP": "https://www.in-kode.com/keyvitup.html",
    "VAYONN": "https://www.in-kode.com/vayonn.html",
}
EXPECTED_ARTISTS = ["KIM JAEJOONG", "NICOLE", "SAY MY NAME", "KEYVITUP", "VAYONN"]


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


def parse_live_pages(directory_html: str, detail_pages: dict[str, str]) -> list[dict]:
    if not contains_all(directory_html, EXPECTED_ARTISTS):
        return []

    required = {
        "NICOLE": ["NICOLE", "KOREAN DISCOGRAPHY", "JAPANESE DISCOGRAPHY"],
        "SAY MY NAME": ["SAY MY NAME", "October 16, 2024", "SHUIE"],
        "KEYVITUP": ["KEYVITUP", "April 08, 2026", "TAEHWAN", "HYUNMIN", "SENA", "JAEIN", "RUKIA"],
        "VAYONN": ["VAYONN", "July 06, 2026", "MASATO", "SEN", "AYANG", "JINYU", "TERU", "MANO"],
    }
    for artist, terms in required.items():
        html = detail_pages.get(artist, "")
        if not contains_all(html, terms):
            return []

    aliases = {
        "KIM JAEJOONG": ["김재중", "JAEJOONG"],
        "NICOLE": ["니콜"],
        "SAY MY NAME": ["세이마이네임"],
        "KEYVITUP": ["키빗업"],
        "VAYONN": ["베이온"],
    }
    rows = []
    for name in EXPECTED_ARTISTS:
        evidence = [{"label": "iNKODE current official artist directory", "url": DIRECTORY_URL}]
        if name in DETAIL_URLS:
            evidence.append({"label": "iNKODE official artist detail", "url": DETAIL_URLS[name]})
        rows.append({
            "displayArtist": name,
            "aliases": aliases.get(name, []),
            "evidence": evidence,
        })
    return rows


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "inkode-current-official-music-roster",
            "type": "agency_roster",
            "name": "iNKODE Current Official Music Roster",
            "observedAt": observed_at,
            "url": DIRECTORY_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "musicIdentitiesOnly": True,
            "exactCurrentDirectoryRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "careerDebutDoesNotAutomaticallyEqualSoloDebut": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "inkode-current-official-music-roster":
        raise RuntimeError("iNKODE fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("iNKODE fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("iNKODE fallback exact current roster required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        directory_html = fetch(DIRECTORY_URL)
        detail_pages = {name: fetch(url) for name, url in DETAIL_URLS.items()}
        rows = parse_live_pages(directory_html, detail_pages)
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"iNKODE current roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
