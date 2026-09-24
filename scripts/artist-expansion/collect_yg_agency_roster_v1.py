from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "yg_agency_roster_adapter_v1"
DEFAULT_URL = "https://ygfamily.com/en/artists/list"
NON_ARTIST_SLUGS = {"yg-family"}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def artist_slug(href: str) -> str:
    path = urlparse(href).path.rstrip("/")
    parts = [part for part in path.split("/") if part]
    # /en/artists/<slug>/profile or /ko/artists/<slug>/main
    if len(parts) < 4:
        return ""
    if parts[1] != "artists":
        return ""
    slug = parts[2].strip().lower()
    if slug in NON_ARTIST_SLUGS:
        return ""
    return slug


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        absolute = urljoin(source_url, href)
        slug = artist_slug(absolute)
        if not slug:
            continue

        text = normalize_spaces(anchor.get_text(" ", strip=True))
        if not text:
            continue

        selected.setdefault(
            slug,
            {
                "displayArtist": text,
                "aliases": [],
                "evidence": [
                    {
                        "label": "YG Entertainment official artist profile",
                        "url": absolute,
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
            "id": "yg-entertainment-official-artist-roster",
            "type": "agency_roster",
            "name": "YG Entertainment Official Artist Roster",
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--html")
    parser.add_argument("--observed-at")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    html = Path(args.html).read_text(encoding="utf-8") if args.html else fetch(args.url)
    rows = parse_roster(html, args.url)
    if not rows:
        raise RuntimeError("YG roster adapter returned no artists")

    observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
    snapshot = build_snapshot(rows, args.url, observed_at)
    snapshot["collectionStatus"] = "live_parse"

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
