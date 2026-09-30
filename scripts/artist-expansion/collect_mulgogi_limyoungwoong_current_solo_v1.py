from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "mulgogi_limyoungwoong_current_solo_adapter_v1"
OFFICIAL_URL = "https://www.mulgogimusic.com/"

EXPECTED_ARTISTS = ["Lim Young-woong"]


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


def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)


def has(text: str, token: str) -> bool:
    return token.casefold() in text.casefold()


def parse_live_page(html: str) -> list[dict]:
    text = text_blob(html)

    identity_ok = has(text, "Lim Young Woong") and (has(text, "임 영 웅") or has(text, "임영웅"))
    if not identity_ok:
        return []

    for token in ["2016년 8월 8일", "IM HERO 10", "2026. 09. 08", "Mulgogimusic"]:
        if not has(text, token):
            return []

    return [{
        "displayArtist": "Lim Young-woong",
        "aliases": ["임영웅", "Lim Young Woong"],
        "evidence": [
            {
                "label": "Mulgogi Music official Lim Young Woong artist profile and discography",
                "url": OFFICIAL_URL,
            }
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "mulgogi-official-limyoungwoong-current-solo-identity",
            "type": "agency_roster",
            "name": "Mulgogi Music Official Lim Young-woong Current Solo Identity",
            "observedAt": observed_at,
            "url": OFFICIAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "Lim Young-woong": {
                "agency": "Mulgogi Music",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "debutDate": "2016-08-08",
                "current2026MusicEvidence": {
                    "release": "IM HERO 10",
                    "releaseDate": "2026-09-08",
                },
            }
        },
        "contract": {
            "officialArtistProfileRequired": True,
            "soloIdentityRequired": True,
            "mulgogiAgencyRequired": True,
            "current2026MusicActivityRequired": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "mulgogi-official-limyoungwoong-current-solo-identity":
        raise RuntimeError("Mulgogi Lim Young-woong fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("Mulgogi Lim Young-woong fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("Mulgogi Lim Young-woong fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("Lim Young-woong", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "Mulgogi Music":
        raise RuntimeError("Mulgogi Lim Young-woong fallback agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("Mulgogi Lim Young-woong fallback active verified state required")
    if entry.get("entityType") != "solo":
        raise RuntimeError("Mulgogi Lim Young-woong fallback solo identity required")
    if entry.get("debutDate") != "2016-08-08":
        raise RuntimeError("Mulgogi Lim Young-woong fallback debut date mismatch")

    recent = entry.get("current2026MusicEvidence", {})
    if recent.get("release") != "IM HERO 10" or recent.get("releaseDate") != "2026-09-08":
        raise RuntimeError("Mulgogi Lim Young-woong fallback current music evidence mismatch")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_page(fetch(OFFICIAL_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"Mulgogi Lim Young-woong current solo identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
