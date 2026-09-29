from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "cam_with_us_current_music_roster_adapter_v1"
HOME_URL = "https://camwus.com/"
ARCHIVE_URL = "https://camwus.com/archive/"

PAGE_ROSTER = [
    "Lee Kang Seung",
    "Kim Suyoung",
    "DAVICHI",
    "Balming Tiger",
    "Silica Gel",
    "PARKMOONCHI",
    "Jeong Sewoon",
    "O3ohn",
    "Car, the garden",
    "sunwoojunga",
    "10CM",
    "IDIOTAPE",
    "Joo Woojae",
    "So Soo Bin",
    "SANAGO",
    "Lee Seungkook"
]
MUSIC_ARTISTS = [
    "Lee Kang Seung",
    "Kim Suyoung",
    "DAVICHI",
    "Balming Tiger",
    "Silica Gel",
    "PARKMOONCHI",
    "Jeong Sewoon",
    "O3ohn",
    "Car, the garden",
    "sunwoojunga",
    "10CM",
    "IDIOTAPE",
    "So Soo Bin"
]
EXCLUDED_ROSTER_PROFILES = [
    {
        "displayArtist": "Joo Woojae",
        "reason": "current_CAM_roster_present_but_no_album_identity_established_by_CAM_archive"
    },
    {
        "displayArtist": "SANAGO",
        "reason": "current_CAM_roster_present_but_no_album_identity_established_by_CAM_archive"
    },
    {
        "displayArtist": "Lee Seungkook",
        "reason": "current_CAM_roster_present_but_no_album_identity_established_by_CAM_archive"
    }
]
ALBUM_ANCHORS = {
    "Lee Kang Seung": "Your love is mine",
    "Kim Suyoung": "Spark!",
    "DAVICHI": "TIME CAPSULE",
    "Balming Tiger": "Gongbu",
    "Silica Gel": "Ballad of You",
    "PARKMOONCHI": "BABO ZIPPER",
    "Jeong Sewoon": "Too much",
    "O3ohn": "40 Something",
    "Car, the garden": "BLUE HEART",
    "sunwoojunga": "Peacock",
    "10CM": "The Darkest Night",
    "IDIOTAPE": "PUBG: BLINDSPOT",
    "So Soo Bin": "As Always"
}

ALIASES = {
    "Lee Kang Seung": ["이강승"],
    "Kim Suyoung": ["김수영"],
    "DAVICHI": ["Davichi", "다비치"],
    "Balming Tiger": ["바밍타이거"],
    "Silica Gel": ["실리카겔"],
    "PARKMOONCHI": ["Park Moonchi", "박문치"],
    "Jeong Sewoon": ["정세운"],
    "O3ohn": ["오존"],
    "Car, the garden": ["Car the garden", "카더가든"],
    "sunwoojunga": ["Sunwoo Jung-a", "선우정아"],
    "10CM": ["10cm", "십센치"],
    "IDIOTAPE": ["이디오테잎"],
    "So Soo Bin": ["소수빈"],
}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)


def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text


def has(text: str, token: str) -> bool:
    return token.casefold() in text.casefold()


def parse_live_pages(home_html: str, archive_html: str) -> list[dict]:
    home = text_blob(home_html)
    archive = text_blob(archive_html)

    if not all(has(home, artist) for artist in PAGE_ROSTER):
        return []

    for artist in MUSIC_ARTISTS:
        if not has(archive, artist):
            return []
        if not has(archive, ALBUM_ANCHORS[artist]):
            return []

    return [
        {
            "displayArtist": artist,
            "aliases": ALIASES.get(artist, []),
            "evidence": [
                {"label": "CAM WITH US official current artist roster", "url": HOME_URL},
                {
                    "label": f"CAM WITH US official album archive ({ALBUM_ANCHORS[artist]})",
                    "url": ARCHIVE_URL,
                },
            ],
        }
        for artist in MUSIC_ARTISTS
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "cam-with-us-official-current-music-roster",
            "type": "agency_roster",
            "name": "CAM WITH US Official Current Music Roster",
            "observedAt": observed_at,
            "url": HOME_URL,
        },
        "pageRoster": PAGE_ROSTER,
        "candidateCount": len(rows),
        "candidates": rows,
        "excludedRosterProfiles": EXCLUDED_ROSTER_PROFILES,
        "contract": {
            "officialSourceOnly": True,
            "fullCurrentRosterPresenceRequired": True,
            "musicIdentityRequiresOfficialAlbumArchiveEvidence": True,
            "rosterPresenceAloneDoesNotCreateMusicCanonical": True,
            "nonMusicOrUnverifiedProfilesNotAutoIncluded": True,
            "memberRosterNotInferredFromAgencyListing": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "cam-with-us-official-current-music-roster":
        raise RuntimeError("CAM WITH US fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("CAM WITH US fallback source type mismatch")
    if snapshot.get("pageRoster") != PAGE_ROSTER:
        raise RuntimeError("CAM WITH US fallback exact page roster required")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != MUSIC_ARTISTS:
        raise RuntimeError("CAM WITH US fallback exact music roster required")
    if snapshot.get("excludedRosterProfiles") != EXCLUDED_ROSTER_PROFILES:
        raise RuntimeError("CAM WITH US fallback excluded roster contract mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(HOME_URL), fetch(ARCHIVE_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == MUSIC_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"CAM WITH US current music roster expected {len(MUSIC_ARTISTS)} artists, got {len(rows)}"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
