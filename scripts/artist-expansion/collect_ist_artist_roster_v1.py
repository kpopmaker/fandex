from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "ist_current_artist_roster_adapter_v1"
DEFAULT_URL = "https://istent.co.kr/artist"
EXPECTED_ARTISTS = ["TUNEXX"]
EXPECTED_MEMBERS = ["Arctic", "Sihwan", "Zeon", "Sungjun", "Taira", "Inhu", "Donggyu"]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]
    raw_text = normalize_spaces(html)

    has_artist = any("TUNEXX" in value for value in strings) or "TUNEXX" in raw_text
    has_all_members = all(
        any(member == value or member in value for value in strings)
        or member in raw_text
        for member in EXPECTED_MEMBERS
    )
    has_album_identity = (
        any("Set By Us Only" in value for value in strings)
        or "Set By Us Only" in raw_text
    )

    if not (has_artist and has_all_members and has_album_identity):
        return []

    return [
        {
            "displayArtist": "TUNEXX",
            "aliases": ["튜넥스"],
            "evidence": [
                {
                    "label": "IST Entertainment current official artist directory",
                    "url": "https://istent.co.kr/artist/tunexx",
                }
            ],
        }
    ]


def fetch(url: str) -> tuple[str, str]:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
        allow_redirects=True,
    )
    response.raise_for_status()
    return response.text, response.url


def build_snapshot(rows: list[dict], source_url: str, observed_at: str, resolved_url: str | None = None) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ist-current-official-artist-directory",
            "type": "agency_roster",
            "name": "IST Entertainment Current Official Artist Directory",
            "observedAt": observed_at,
            "url": source_url,
            "resolvedUrl": resolved_url or source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "currentDirectoryOnly": True,
            "directoryRedirectMustResolveToArtistProfile": True,
            "formerHistoricActsAreNotCurrentRoster": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("IST fallback snapshot source object required")
    if source.get("id") != "ist-current-official-artist-directory":
        raise RuntimeError("IST fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("IST fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("IST fallback snapshot exact current directory roster required")
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

    resolved_url = args.url
    try:
        if args.html:
            html = Path(args.html).read_text(encoding="utf-8")
        else:
            html, resolved_url = fetch(args.url)
        rows = parse_roster(html, resolved_url)
    except requests.RequestException:
        rows = []

    resolved_ok = resolved_url.rstrip("/").endswith("/artist/tunexx")
    if len(rows) == 1 and (args.html or resolved_ok):
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at, resolved_url)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"IST current artist directory expected TUNEXX profile, got {len(rows)} candidates and resolved URL {resolved_url}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
