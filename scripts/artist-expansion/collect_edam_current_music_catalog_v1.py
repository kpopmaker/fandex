from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "edam_current_music_identity_catalog_v1"
IU_URL = "https://www.madeedam.com/us/board/view.php?bdId=usnotice&sno=132"
WOODZ_URL = "https://madeedam.com/us/board/view.php?bdId=usnotice&sno=135"
EXPECTED_ARTISTS = ["IU", "WOODZ"]


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


def parse_live_pages(iu_html: str, woodz_html: str) -> list[dict]:
    iu = text_blob(iu_html)
    woodz = text_blob(woodz_html)

    if not has(iu, "EDAM Entertainment"):
        return []
    if not has(iu, "IU 2026"):
        return []
    if not has(iu, "SEASON"):
        return []

    if not has(woodz, "EDAM Entertainment"):
        return []
    if not has(woodz, "WOODZ"):
        return []
    if not has(woodz, "2026 WOODZ WORLD TOUR"):
        return []

    return [
        {
            "displayArtist": "IU",
            "aliases": ["아이유", "이지은", "Lee Jieun"],
            "evidence": [
                {
                    "label": "made EDAM IU 2026 official notice",
                    "url": IU_URL,
                }
            ],
        },
        {
            "displayArtist": "WOODZ",
            "aliases": ["우즈", "조승연", "Woodz"],
            "evidence": [
                {
                    "label": "made EDAM 2026 WOODZ WORLD TOUR official notice",
                    "url": WOODZ_URL,
                }
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "edam-official-current-music-identity-catalog",
            "type": "provider_catalog",
            "name": "EDAM Entertainment Official Current Music Identity Catalog",
            "observedAt": observed_at,
            "url": "https://www.madeedam.com/us/board/list.php?bdId=usnotice",
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentity": {
            "IU": {
                "agency": "EDAM Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "WOODZ": {
                "agency": "EDAM Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
        },
        "contract": {
            "officialFirstPartyEdamEvidenceRequired": True,
            "current2026EvidenceRequired": True,
            "exactIdentitySetRequired": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "merchandiseEvidenceDoesNotSubstituteForMusicIdentityAlone": True,
            "currentMusicActivityCrossCheckRequired": True,
            "noNewCanonicalFromMerchandiseOnly": True,
            "autoPromote": False,
            "identityReviewRequired": False,
            "scopeVerificationRequired": False,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "edam-official-current-music-identity-catalog":
        raise RuntimeError("EDAM fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("EDAM fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("EDAM fallback exact identity set required")
    current = snapshot.get("currentIdentity")
    if not isinstance(current, dict):
        raise RuntimeError("EDAM fallback current identity map required")
    for artist in EXPECTED_ARTISTS:
        entry = current.get(artist, {})
        if entry.get("agency") != "EDAM Entertainment":
            raise RuntimeError(f"EDAM fallback agency mismatch for {artist}")
        if entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"EDAM fallback active lifecycle required for {artist}")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(IU_URL), fetch(WOODZ_URL))
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
            f"EDAM current identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
