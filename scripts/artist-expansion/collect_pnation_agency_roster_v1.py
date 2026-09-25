from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "pnation_agency_roster_adapter_v1"
DEFAULT_URL = "https://pnation.com/artists"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def artist_id_from_href(href: str, source_url: str = DEFAULT_URL) -> str:
    absolute = urljoin(source_url, href)
    parsed = urlparse(absolute)
    if parsed.hostname not in {"pnation.com", "www.pnation.com"}:
        return ""
    match = re.fullmatch(r"/artists/(\d+)/?", parsed.path)
    return match.group(1) if match else ""


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        artist_id = artist_id_from_href(href, source_url)
        if not artist_id:
            continue

        display_artist = normalize_spaces(anchor.get_text(" ", strip=True))
        display_artist = re.sub(r"^view detail\s+", "", display_artist, flags=re.I)
        if not display_artist:
            continue

        selected.setdefault(
            artist_id,
            {
                "displayArtist": display_artist,
                "aliases": [],
                "evidence": [
                    {
                        "label": "P NATION official artist profile",
                        "url": urljoin(source_url, href),
                    }
                ],
            },
        )

    return list(selected.values())


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
            "id": "pnation-official-artist-roster",
            "type": "agency_roster",
            "name": "P NATION Official Artist Roster",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("P NATION fallback snapshot source object required")
    if source.get("id") != "pnation-official-artist-roster":
        raise RuntimeError("P NATION fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("P NATION fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("P NATION fallback snapshot candidates required")
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
        raise RuntimeError("P NATION roster adapter returned no artists")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
