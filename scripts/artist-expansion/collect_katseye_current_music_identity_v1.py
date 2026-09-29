from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "katseye_current_music_identity_adapter_v1"
HYBE_ARTIST_URL = "https://hybecorp.com/en/company/artist"
RELEASES_URL = "https://www.katseye.world/releases-archive/"
VIDEOS_URL = "https://www.katseye.world/videos/"
SIGNUP_URL = "https://www.katseye.world/sign-up/"

EXPECTED_ARTISTS = ["KATSEYE"]


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
    hybe_artist_html: str,
    releases_html: str,
    videos_html: str,
    signup_html: str,
) -> list[dict]:
    hybe = text_blob(hybe_artist_html)
    releases = text_blob(releases_html)
    videos = text_blob(videos_html)
    signup = text_blob(signup_html)

    for token in ["KATSEYE", "2024-06-28"]:
        if not has(hybe, token):
            return []

    for token in ["KATSEYE", "Internet Girl", "Pinky Up", "WILD", "Animal", "2026"]:
        if not has(releases, token):
            return []

    for token in ["KATSEYE", "Animal", "PINKY UP", "Internet Girl"]:
        if not has(videos, token):
            return []

    for token in ["KATSEYE", "HYBE x Geffen"]:
        if not has(signup, token):
            return []

    return [
        {
            "displayArtist": "KATSEYE",
            "aliases": ["캣츠아이"],
            "evidence": [
                {"label": "HYBE official current artist directory", "url": HYBE_ARTIST_URL},
                {"label": "KATSEYE official 2026 releases archive", "url": RELEASES_URL},
                {"label": "KATSEYE official current videos archive", "url": VIDEOS_URL},
                {"label": "KATSEYE official site HYBE x Geffen attribution", "url": SIGNUP_URL},
            ],
        }
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "hybe-geffen-official-katseye-current-music-identity",
            "type": "provider_catalog",
            "name": "HYBE x Geffen Official KATSEYE Current Music Identity",
            "observedAt": observed_at,
            "url": RELEASES_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "KATSEYE": {
                "agency": "HYBE x Geffen",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "debutDate": "2024-06-28",
                "current2026MusicEvidence": [
                    {"title": "Internet Girl", "releaseDate": "2026-01-02"},
                    {"title": "PINKY UP", "releaseDate": "2026-04-09"},
                    {"title": "WILD", "releaseDate": "2026-04-15"},
                    {"title": "Animal", "releaseDate": "2026-07-24"},
                ],
            }
        },
        "contract": {
            "hybeCurrentArtistDirectoryRequired": True,
            "officialKatseyeSiteRequired": True,
            "hybeGeffenAttributionRequired": True,
            "current2026MusicReleaseRequired": True,
            "historicalDebutEvidenceAloneInsufficient": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "hybe-geffen-official-katseye-current-music-identity":
        raise RuntimeError("KATSEYE fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("KATSEYE fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("KATSEYE fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("KATSEYE", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "HYBE x Geffen":
        raise RuntimeError("KATSEYE fallback agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("KATSEYE fallback active verified state required")
    if entry.get("entityType") != "group" or entry.get("debutDate") != "2024-06-28":
        raise RuntimeError("KATSEYE fallback group identity mismatch")

    evidence = entry.get("current2026MusicEvidence")
    titles = [row.get("title") for row in evidence if isinstance(row, dict)] if isinstance(evidence, list) else []
    if titles != ["Internet Girl", "PINKY UP", "WILD", "Animal"]:
        raise RuntimeError("KATSEYE fallback current 2026 music evidence mismatch")

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
            fetch(HYBE_ARTIST_URL),
            fetch(RELEASES_URL),
            fetch(VIDEOS_URL),
            fetch(SIGNUP_URL),
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
        raise RuntimeError(f"KATSEYE current music identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
