from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "seoul_music_awards_group_roster_adapter_v1"
DEFAULT_URL = "https://seoulmusicawards.com/en/vote-status?round=2&tab=world-choice-group"


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    seen = set()

    # The official page exposes candidate names through image alt text in
    # server-rendered/crawler-visible output. Keep this parser intentionally
    # narrow; if the live HTML no longer exposes candidates, caller must use
    # the verified official snapshot fallback rather than guessing.
    for image in soup.find_all("img"):
        name = str(image.get("alt") or "").strip()
        key = name.casefold()
        if not name or key in seen:
            continue
        if len(name) > 80:
            continue
        seen.add(key)
        rows.append(
            {
                "displayArtist": name,
                "aliases": [],
                "evidence": [
                    {
                        "label": "Seoul Music Awards official vote roster",
                        "url": source_url,
                    }
                ],
            }
        )
    return rows


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def validate_fallback(payload: dict) -> dict:
    source = payload.get("source")
    candidates = payload.get("candidates")
    if not isinstance(source, dict):
        raise RuntimeError("Seoul Music Awards fallback source object required")
    if source.get("id") != "seoul-music-awards-world-choice-group-2026":
        raise RuntimeError("Seoul Music Awards fallback source id mismatch")
    if source.get("type") != "broadcast_or_award_roster":
        raise RuntimeError("Seoul Music Awards fallback source type mismatch")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("Seoul Music Awards fallback candidates required")
    return payload


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "seoul-music-awards-world-choice-group-2026",
            "type": "broadcast_or_award_roster",
            "name": "Seoul Music Awards Official K-POP World Choice Group Vote Roster",
            "observedAt": observed_at,
            "url": DEFAULT_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
            "voteRankIsNotEligibilityThreshold": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--html")
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--observed-at")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    html = Path(args.html).read_text(encoding="utf-8") if args.html else fetch(args.url)
    rows = parse_roster(html, args.url)

    if rows:
        snapshot = build_snapshot(
            rows,
            args.observed_at or datetime.now(timezone.utc).isoformat(),
        )
        snapshot["collectionStatus"] = "live_parse"
    elif args.fallback_snapshot:
        snapshot = validate_fallback(
            json.loads(Path(args.fallback_snapshot).read_text(encoding="utf-8-sig"))
        )
        snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
        snapshot["liveFetchParsed"] = False
    else:
        raise RuntimeError("Seoul Music Awards roster adapter returned no artists")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
