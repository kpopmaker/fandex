from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "starship_agency_roster_adapter_v1"
DEFAULT_URL = "https://www.starship-ent.com/musician"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def artist_slug(href: str) -> str:
    path = urlparse(href).path.rstrip("/")
    parts = [part for part in path.split("/") if part]
    if len(parts) != 2 or parts[0] != "musician":
        return ""
    return parts[1].strip().lower()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        slug = artist_slug(urljoin(source_url, href))
        if not slug:
            continue

        text = normalize_spaces(anchor.get_text(" ", strip=True))
        if not text:
            continue

        # The roster page may render English/Korean names together. Keep the
        # official visible label intact and preserve the canonical profile URL.
        row = {
            "displayArtist": text,
            "aliases": [],
            "evidence": [
                {
                    "label": "STARSHIP official artist profile",
                    "url": urljoin(source_url, href),
                }
            ],
        }
        selected.setdefault(slug, row)

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
            "id": "starship-official-musician-roster",
            "type": "agency_roster",
            "name": "STARSHIP Entertainment Official Artist Roster",
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
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    html = Path(args.html).read_text(encoding="utf-8") if args.html else fetch(args.url)
    rows = parse_roster(html, args.url)

    if rows:
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, args.url, observed_at)
        snapshot["collectionStatus"] = "live_parse"
    elif args.fallback_snapshot:
        fallback_path = Path(args.fallback_snapshot)
        snapshot = json.loads(fallback_path.read_text(encoding="utf-8-sig"))
        source = snapshot.get("source") if isinstance(snapshot, dict) else None
        if not isinstance(source, dict):
            raise RuntimeError("STARSHIP fallback snapshot source object required")
        if source.get("id") != "starship-official-musician-roster":
            raise RuntimeError("STARSHIP fallback snapshot source id mismatch")
        if source.get("type") != "agency_roster":
            raise RuntimeError("STARSHIP fallback snapshot source type mismatch")
        candidates = snapshot.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise RuntimeError("STARSHIP fallback snapshot candidates required")
        snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
        snapshot["liveFetchParsed"] = False
    else:
        raise RuntimeError("STARSHIP roster adapter returned no artists")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
