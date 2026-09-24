from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "bugs_yg_provider_catalog_adapter_v1"
DEFAULT_URL = "https://music.bugs.co.kr/label/3897"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def split_artist_label(value: str) -> tuple[str, list[str]]:
    text = normalize_spaces(value)
    match = re.fullmatch(r"(.+?)\s*\(([^()]+)\)\s*", text)
    if not match:
        return text, []
    primary = normalize_spaces(match.group(1))
    alias = normalize_spaces(match.group(2))
    aliases = [alias] if alias and alias != primary else []
    return primary, aliases


def artist_id_from_url(href: str) -> str:
    path = urlparse(href).path.rstrip("/")
    parts = [part for part in path.split("/") if part]
    if len(parts) != 2 or parts[0] != "artist":
        return ""
    return parts[1].strip()


def split_display_and_aliases(value: str) -> tuple[str, list[str]]:
    text = normalize_spaces(value)
    match = re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", text)
    if not match:
        return text, []

    outside = normalize_spaces(match.group(1))
    inside = normalize_spaces(match.group(2))
    if not outside or not inside:
        return text, []

    aliases = [inside] if inside.casefold() != outside.casefold() else []
    return outside, aliases


def parse_catalog(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        absolute = urljoin(source_url, href)
        artist_id = artist_id_from_url(absolute)
        if not artist_id:
            continue

        text = normalize_spaces(anchor.get_text(" ", strip=True))
        if not text:
            continue

        display_artist, aliases = split_display_and_aliases(text)

        selected.setdefault(
            artist_id,
            {
                "displayArtist": display_artist,
                "aliases": aliases,
                "evidence": [
                    {
                        "label": "Bugs provider artist page from YG label catalog",
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
            "id": "bugs-yg-label-catalog",
            "type": "provider_catalog",
            "name": "Bugs YG Entertainment Label Catalog",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "providerCatalogIsNotAgencyRoster": True,
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
    rows = parse_catalog(html, args.url)
    if not rows:
        raise RuntimeError("Bugs YG provider catalog adapter returned no artists")

    observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
    snapshot = build_snapshot(rows, args.url, observed_at)
    snapshot["collectionStatus"] = "live_parse"

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
