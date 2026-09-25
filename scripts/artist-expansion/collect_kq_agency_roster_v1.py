from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


VERSION = "kq_agency_roster_adapter_v1"
KQ_ENT_URL = "https://kqent.com/kq-artist"
KQ_PD_URL = "https://kqent.com/kq-artist/kq-artist-pd"


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact_identity(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", normalize_spaces(value).casefold())


def parse_kq_ent(html: str, source_url: str = KQ_ENT_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}
    for anchor in soup.find_all("a", href=True):
        text = normalize_spaces(anchor.get_text(" ", strip=True))
        if text not in {"ATEEZ", "xikers"}:
            continue
        key = compact_identity(text)
        selected.setdefault(
            key,
            {
                "displayArtist": text,
                "aliases": [],
                "evidence": [{
                    "label": "KQ Entertainment official KQ Ent. artist roster",
                    "url": urljoin(source_url, str(anchor.get("href") or "")),
                }],
            },
        )
    return list(selected.values())


def parse_kq_pd(html: str, source_url: str = KQ_PD_URL) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    selected: dict[str, dict] = {}
    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        absolute = urljoin(source_url, href)
        parsed = urlparse(absolute)
        if parsed.hostname not in {"kqent.com", "www.kqent.com"}:
            continue
        if not re.fullmatch(r"/producer/\d+/?", parsed.path):
            continue

        text = normalize_spaces(anchor.get_text(" ", strip=True))
        # Card links include descriptions and VIEW DETAIL. Keep only the
        # canonical leading artist name exposed by the official page.
        match = re.match(r"^(BABYLON|EDEN|MADDOX)\b", text, flags=re.I)
        if not match:
            continue
        display = match.group(1).upper()
        key = compact_identity(display)
        selected.setdefault(
            key,
            {
                "displayArtist": display,
                "aliases": [],
                "evidence": [{
                    "label": "KQ Entertainment official KQ PD artist profile",
                    "url": absolute,
                }],
            },
        )
    return list(selected.values())


def merge_rows(*groups: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    for group in groups:
        for row in group:
            key = compact_identity(row.get("displayArtist"))
            if key and key not in merged:
                merged[key] = row
    return list(merged.values())


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "kq-entertainment-official-artist-roster",
            "type": "agency_roster",
            "name": "KQ Entertainment Official Artist Roster",
            "observedAt": observed_at,
            "url": KQ_ENT_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "kqEntAndKqPdSectionsCombined": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict):
        raise RuntimeError("KQ fallback snapshot source object required")
    if source.get("id") != "kq-entertainment-official-artist-roster":
        raise RuntimeError("KQ fallback snapshot source id mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("KQ fallback snapshot source type mismatch")
    candidates = snapshot.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("KQ fallback snapshot candidates required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ent-url", default=KQ_ENT_URL)
    parser.add_argument("--pd-url", default=KQ_PD_URL)
    parser.add_argument("--ent-html")
    parser.add_argument("--pd-html")
    parser.add_argument("--observed-at")
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        ent_html = Path(args.ent_html).read_text(encoding="utf-8") if args.ent_html else fetch(args.ent_url)
        pd_html = Path(args.pd_html).read_text(encoding="utf-8") if args.pd_html else fetch(args.pd_url)
        rows = merge_rows(
            parse_kq_ent(ent_html, args.ent_url),
            parse_kq_pd(pd_html, args.pd_url),
        )
    except requests.RequestException:
        rows = []

    if len(rows) == 5:
        observed_at = args.observed_at or datetime.now(timezone.utc).isoformat()
        snapshot = build_snapshot(rows, observed_at)
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"KQ roster adapter expected 5 artists, got {len(rows)}")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
