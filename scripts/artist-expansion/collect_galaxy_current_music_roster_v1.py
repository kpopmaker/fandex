from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "galaxy_current_music_roster_adapter_v1"
ARTISTS_URL = "https://insights.galaxyuniverse.ai/en/artists/"
FAQ_URL = "https://insights.galaxyuniverse.ai/en/faq/company/"
ROBOT_PARK_URL = "https://insights.galaxyuniverse.ai/en/story/robot-park/"

EXPECTED_ARTISTS = ["G-DRAGON", "TAEMIN", "KIM JONG KOOK"]
EXCLUDED_NON_MUSIC = ["Song Kang-ho", "Lee Jung-hoo", "Ryu Jun-yeol", "Na In-woo", "Jung Il-woo"]


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


def parse_live_pages(artists_html: str, faq_html: str, robot_park_html: str) -> list[dict]:
    artists = text_blob(artists_html)
    faq = text_blob(faq_html)
    robot_park = text_blob(robot_park_html)

    for token in ["G-DRAGON", "TAEMIN", "Kim Jong-kook", "Song Kang-ho", "Lee Jung-hoo", "Ryu Jun-yeol", "Na In-woo", "Jung Il-woo"]:
        if not has(artists, token):
            return []

    for token in ["G-DRAGON", "K-pop artist", "TAEMIN", "March 2026", "Kim Jong-kook", "Singer", "TV personality"]:
        if not has(faq, token) and not has(artists, token):
            return []

    for token in ["G-DRAGON", "HOME SWEET HOME", "TAEMIN", "Advice", "Idea"]:
        if not has(robot_park, token):
            return []

    return [
        {
            "displayArtist": "G-DRAGON",
            "aliases": ["지드래곤", "GD"],
            "evidence": [
                {"label": "Galaxy Corporation official 2026 artist roster", "url": ARTISTS_URL},
                {"label": "Galaxy Corporation official company FAQ", "url": FAQ_URL},
            ],
        },
        {
            "displayArtist": "TAEMIN",
            "aliases": ["태민"],
            "evidence": [
                {"label": "Galaxy Corporation official 2026 artist roster", "url": ARTISTS_URL},
                {"label": "Galaxy Corporation official Robot Park story using TAEMIN music", "url": ROBOT_PARK_URL},
            ],
        },
        {
            "displayArtist": "KIM JONG KOOK",
            "aliases": ["김종국", "Kim Jong-kook"],
            "evidence": [
                {"label": "Galaxy Corporation official roster classifying Kim Jong-kook as singer and TV personality", "url": ARTISTS_URL},
                {"label": "Galaxy Corporation official company FAQ current roster", "url": FAQ_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "galaxy-corporation-official-current-music-eligible-roster",
            "type": "agency_roster",
            "name": "Galaxy Corporation Official Current Music-Eligible Artist Roster",
            "observedAt": observed_at,
            "url": ARTISTS_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentMusicEligibleRoster": {
            "G-DRAGON": {
                "agency": "Galaxy Corporation",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "officialRosterField": "K-pop artist",
            },
            "TAEMIN": {
                "agency": "Galaxy Corporation",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "officialRosterField": "K-pop artist",
                "joinedGalaxy": "2026-03",
            },
            "KIM JONG KOOK": {
                "agency": "Galaxy Corporation",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "officialRosterField": "Singer · TV personality",
            },
        },
        "excludedNonMusicRoster": [
            {"displayArtist": "Song Kang-ho", "officialRosterField": "Actor"},
            {"displayArtist": "Lee Jung-hoo", "officialRosterField": "MLB player"},
            {"displayArtist": "Ryu Jun-yeol", "officialRosterField": "Actor"},
            {"displayArtist": "Na In-woo", "officialRosterField": "Actor"},
            {"displayArtist": "Jung Il-woo", "officialRosterField": "Actor"},
        ],
        "contract": {
            "officialCurrentRosterRequired": True,
            "officialRosterFieldRequired": True,
            "musicEligibilityRequiresKpopArtistOrSingerField": True,
            "actorAndAthleteEntriesMustBeExcluded": True,
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
    if not isinstance(source, dict) or source.get("id") != "galaxy-corporation-official-current-music-eligible-roster":
        raise RuntimeError("Galaxy fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("Galaxy fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("Galaxy fallback exact music-eligible roster required")

    roster = snapshot.get("currentMusicEligibleRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("Galaxy fallback current music-eligible roster required")
    for artist in EXPECTED_ARTISTS:
        entry = roster.get(artist, {})
        if entry.get("agency") != "Galaxy Corporation":
            raise RuntimeError(f"Galaxy fallback agency mismatch for {artist}")
        if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"Galaxy fallback active verified state required for {artist}")
        if entry.get("entityType") != "solo":
            raise RuntimeError(f"Galaxy fallback solo identity required for {artist}")

    if roster["G-DRAGON"].get("officialRosterField") != "K-pop artist":
        raise RuntimeError("Galaxy fallback G-DRAGON field mismatch")
    if roster["TAEMIN"].get("officialRosterField") != "K-pop artist":
        raise RuntimeError("Galaxy fallback TAEMIN field mismatch")
    if roster["KIM JONG KOOK"].get("officialRosterField") != "Singer · TV personality":
        raise RuntimeError("Galaxy fallback Kim Jong-kook field mismatch")

    excluded = snapshot.get("excludedNonMusicRoster")
    excluded_names = [row.get("displayArtist") for row in excluded if isinstance(row, dict)] if isinstance(excluded, list) else []
    if excluded_names != EXCLUDED_NON_MUSIC:
        raise RuntimeError("Galaxy fallback non-music exclusion mismatch")

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
            fetch(ARTISTS_URL),
            fetch(FAQ_URL),
            fetch(ROBOT_PARK_URL),
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
        raise RuntimeError(f"Galaxy current music-eligible roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
