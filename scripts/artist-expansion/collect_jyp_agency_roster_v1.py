from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "jyp_agency_roster_adapter_v1"
DEFAULT_URL = "https://www.jype.com/ko/Artist"
EXTERNAL_ARTIST_HOSTS = {
    "niziu.com",
    "www.niziu.com",
    "kick-flip.com",
    "www.kick-flip.com",
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def is_artist_profile_url(href: str, source_url: str = DEFAULT_URL) -> bool:
    absolute = urljoin(source_url, href)
    parsed = urlparse(absolute)
    host = parsed.hostname.casefold() if parsed.hostname else ""

    if host in EXTERNAL_ARTIST_HOSTS:
        return True

    if host.endswith(".jype.com") and host not in {"www.jype.com", "jype.com"}:
        return True

    return False


def parse_roster(html: str, source_url: str = DEFAULT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}

    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        if not is_artist_profile_url(href, source_url):
            continue

        display_artist = normalize_spaces(anchor.get_text(" ", strip=True))
        if not display_artist:
            continue

        absolute = urljoin(source_url, href)
        key = re.sub(r"[^0-9a-z가-힣]+", "", display_artist.casefold())
        if not key:
            continue

        selected.setdefault(
            key,
            {
                "displayArtist": display_artist,
                "aliases": [],
                "evidence": [
                    {
                        "label": "JYP Entertainment official artist roster/profile",
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
            "id": "jyp-entertainment-official-artist-roster",
            "type": "agency_roster",
            "name": "JYP Entertainment Official Artist Roster",
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
        raise RuntimeError("JYP fallback snapshot source object required")
    if source.get("id") != "jyp-entertainment-official-artist-roster":
        raise RuntimeError("JYP fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("JYP fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("JYP fallback snapshot candidates required")
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
        raise RuntimeError("JYP roster adapter returned no artists")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
