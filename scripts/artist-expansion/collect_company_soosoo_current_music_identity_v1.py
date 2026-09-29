from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "company_soosoo_current_music_identity_adapter_v1"
ARTIST_URL = "https://companysoosoo.com/contents/curation"
NOTICE_URL = "https://companysoosoo.com/notice"
BLISS_URL = "https://companysoosoo.com/notice/686b98a5c1ce9352856f7436"
SNOWFALL_URL = "https://companysoosoo.com/notice/678a2b74e4b4d4285e162885"

EXPECTED_ARTISTS = ["DOH KYUNG SOO"]


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


def parse_live_pages(
    artist_html: str,
    notice_html: str,
    bliss_html: str,
    snowfall_html: str,
) -> list[dict]:
    artist = text_blob(artist_html)
    notice = text_blob(notice_html)
    bliss = text_blob(bliss_html)
    snowfall = text_blob(snowfall_html)

    for token in ["도경수", "Mars"]:
        if not has(artist, token):
            return []

    for token in ["도경수", "BLISS", "Snowfall"]:
        if not has(notice, token):
            return []

    for token in ["도경수", "첫 번째 정규 앨범", "BLISS", "SING ALONG", "10곡"]:
        if not has(bliss, token):
            return []

    for token in ["도경수", "Digital Single", "Snowfall at Night"]:
        if not has(snowfall, token):
            return []

    return [
        {
            "displayArtist": "DOH KYUNG SOO",
            "aliases": ["도경수", "D.O.", "D.O"],
            "evidence": [
                {"label": "Company Soosoo official current ARTIST page", "url": ARTIST_URL},
                {"label": "Company Soosoo official first full album BLISS release notice", "url": BLISS_URL},
                {"label": "Company Soosoo official Snowfall at Night digital single release notice", "url": SNOWFALL_URL},
            ],
        }
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "company-soosoo-official-current-music-identity",
            "type": "agency_roster",
            "name": "Company Soosoo Official Current Music Identity",
            "observedAt": observed_at,
            "url": ARTIST_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "DOH KYUNG SOO": {
                "agency": "Company Soosoo",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "currentArtistPage": True,
                "recentMusicEvidence": [
                    {"type": "full_album", "title": "BLISS", "releaseDate": "2025-07-07"},
                    {"type": "digital_single", "title": "Snowfall at Night", "releaseDate": "2025-01-17"},
                ],
            }
        },
        "contract": {
            "officialCurrentArtistPageRequired": True,
            "officialRecentMusicReleaseRequired": True,
            "currentAgencyEvidenceRequired": True,
            "actingActivityDoesNotDisqualifyMusicCanonical": True,
            "groupMembershipAloneDoesNotCreateSoloCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "company-soosoo-official-current-music-identity":
        raise RuntimeError("Company Soosoo fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("Company Soosoo fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("Company Soosoo fallback exact current music identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("DOH KYUNG SOO", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "Company Soosoo":
        raise RuntimeError("Company Soosoo fallback agency mismatch")
    if entry.get("agencyStatus") != "verified":
        raise RuntimeError("Company Soosoo fallback verified agency required")
    if entry.get("lifecycleStatus") != "active" or entry.get("entityType") != "solo":
        raise RuntimeError("Company Soosoo fallback active solo identity required")
    if entry.get("currentArtistPage") is not True:
        raise RuntimeError("Company Soosoo fallback current artist page required")

    evidence = entry.get("recentMusicEvidence")
    titles = [row.get("title") for row in evidence if isinstance(row, dict)] if isinstance(evidence, list) else []
    if titles != ["BLISS", "Snowfall at Night"]:
        raise RuntimeError("Company Soosoo fallback recent music evidence mismatch")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(
            fetch(ARTIST_URL),
            fetch(NOTICE_URL),
            fetch(BLISS_URL),
            fetch(SNOWFALL_URL),
        )
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"Company Soosoo current music identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
