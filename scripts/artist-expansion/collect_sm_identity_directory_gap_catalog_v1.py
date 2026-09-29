from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "sm_official_identity_directory_gap_catalog_v1"
DIRECTORY_URL = "https://www.smentertainment.com/artist/"
EXPECTED_ARTISTS = ["TAEYEON", "KAI", "NCT U"]

ALIASES = {
    "TAEYEON": ["태연", "김태연"],
    "KAI": ["Kai", "카이", "김종인"],
    "NCT U": ["엔시티 유"],
}


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


def parse_directory(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(value) for value in soup.stripped_strings]
    strings = [value for value in strings if value]

    try:
        directory_start = strings.index("2Spade")
    except ValueError:
        return []

    directory = strings[directory_start:]
    if not all(target in directory for target in EXPECTED_ARTISTS):
        return []

    return [
        {
            "displayArtist": artist,
            "aliases": ALIASES.get(artist, []),
            "evidence": [
                {
                    "label": "SM Entertainment official artist directory",
                    "url": DIRECTORY_URL,
                }
            ],
        }
        for artist in EXPECTED_ARTISTS
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "sm-official-identity-directory-gap-catalog",
            "type": "provider_catalog",
            "name": "SM Entertainment Official Identity Directory Gap Catalog",
            "observedAt": observed_at,
            "url": DIRECTORY_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialFirstPartySourceOnly": True,
            "existingCanonicalCoverageGapOnly": True,
            "exactGapTargetsRequired": True,
            "directoryPresenceDoesNotInferExclusiveManagementContract": True,
            "directoryPresenceDoesNotInferCurrentReleaseActivity": True,
            "rotationalUnitMembershipNotMaterialized": True,
            "noNewCanonicalFromDirectoryOnly": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": False,
            "scopeVerificationRequired": False,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "sm-official-identity-directory-gap-catalog":
        raise RuntimeError("SM directory fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("SM directory fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("SM directory fallback exact gap targets required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_directory(fetch(DIRECTORY_URL))
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
            f"SM directory gap catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
