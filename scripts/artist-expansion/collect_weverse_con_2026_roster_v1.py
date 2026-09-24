from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "weverse_con_2026_event_roster_adapter_v1"
DEFAULT_URL = "https://weverseconfestival.weverse.io/ko/lineup/"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for image in soup.find_all("img"):
        alt = normalize_spaces(image.get("alt") or "")
        if not alt:
            continue

        match = re.fullmatch(r"(.+?)\s+아티스트\s+프로필\s+이미지", alt)
        if not match:
            match = re.fullmatch(r"(.+?)\s+artist\s+profile\s+image", alt, re.I)
        if not match:
            continue

        artist = normalize_spaces(match.group(1))
        if not artist:
            continue

        key = artist.casefold()
        selected.setdefault(
            key,
            {
                "displayArtist": artist,
                "aliases": [],
                "evidence": [
                    {
                        "label": "2026 Weverse Con Festival official lineup",
                        "url": source_url,
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
            "id": "weverse-con-festival-2026-lineup",
            "type": "festival_or_event_roster",
            "name": "2026 Weverse Con Festival Official Lineup",
            "observedAt": observed_at,
            "url": source_url,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "eventAppearanceDoesNotImplyAgencyRelation": True,
            "eventAppearanceDoesNotImplyKpopScope": True,
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
        raise RuntimeError("Weverse Con roster adapter returned no artists")

    observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
    snapshot = build_snapshot(rows, args.url, observed_at)
    snapshot["collectionStatus"] = "live_parse"

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
