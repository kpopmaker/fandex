from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "para_music_current_roster_adapter_v1"
INDEX_URL = "https://www.paramusic.co.kr/subPage/artist/index"
PARK_PROFILE_URL = "https://www.paramusic.co.kr/subPage/artist/member/?no=15"
PARK_CONTRACT_URL = "https://www.paramusic.co.kr/board/notice/read?no=4"
YOUNITE_PROFILE_URL = "https://www.paramusic.co.kr/subPage/artist/member/?no=1"
YOUNITE_ACTIVITY_URL = "https://www.paramusic.co.kr/board/notice/read?no=3"
YOUNITE_ROSTER_NOTICE_URL = "https://www.paramusic.co.kr/board/notice/read?no=5"

EXPECTED_ARTISTS = ["PARK WOO JIN", "YOUNITE"]
YOUNITE_MEMBERS = ["EUNHO", "STEVE", "HYUNGSEOK", "WOONO", "DEY", "KYUNGMUN", "SION"]
YOUNITE_PROFILE_MEMBER_TOKENS = ["은호", "스티브", "형석", "우노", "DEY", "경문", "시온"]


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
    index_html: str,
    park_profile_html: str,
    park_contract_html: str,
    younite_profile_html: str,
    younite_activity_html: str,
    younite_roster_notice_html: str,
) -> list[dict]:
    index = text_blob(index_html)
    park_profile = text_blob(park_profile_html)
    park_contract = text_blob(park_contract_html)
    younite_profile = text_blob(younite_profile_html)
    younite_activity = text_blob(younite_activity_html)
    younite_roster_notice = text_blob(younite_roster_notice_html)

    for token in ["ARTISTS", "PARK WOO JIN", "박우진", "YOUNITE", "유나이트"]:
        if not has(index, token):
            return []

    for token in ["PARK WOO JIN", "박우진", "AB6IX", "2019"]:
        if not has(park_profile, token):
            return []
    for token in ["박우진", "파라뮤직", "전속 계약", "2026", "Cool & Hot"]:
        if not has(park_contract, token):
            return []

    for token in ["YOUNITE", "유나이트", "MEMBER"]:
        if not has(younite_profile, token):
            return []
    for token in YOUNITE_PROFILE_MEMBER_TOKENS:
        if not has(younite_profile, token):
            return []
    for token in ["유나이트", "파라뮤직", "이적 후 첫 컴백", "2026", "INYUN"]:
        if not has(younite_activity, token):
            return []
    for token in ["YOUNITE", "은상", "7인 체제", "솔로 아티스트", "2026"]:
        if not has(younite_roster_notice, token):
            return []

    return [
        {
            "displayArtist": "PARK WOO JIN",
            "aliases": ["박우진", "Park Woo Jin"],
            "evidence": [
                {"label": "PARA MUSIC official current artist profile", "url": PARK_PROFILE_URL},
                {"label": "PARA MUSIC 2026 exclusive-contract notice", "url": PARK_CONTRACT_URL},
            ],
        },
        {
            "displayArtist": "YOUNITE",
            "aliases": ["유나이트"],
            "evidence": [
                {"label": "PARA MUSIC official current YOUNITE profile", "url": YOUNITE_PROFILE_URL},
                {"label": "PARA MUSIC official 2026 transfer comeback notice", "url": YOUNITE_ACTIVITY_URL},
                {"label": "PARA MUSIC official 7-member continuation notice", "url": YOUNITE_ROSTER_NOTICE_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "para-music-official-current-artist-roster",
            "type": "agency_roster",
            "name": "PARA MUSIC Official Current Artist Roster",
            "observedAt": observed_at,
            "url": INDEX_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "PARK WOO JIN": {
                "agency": "PARA MUSIC",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "YOUNITE": {
                "agency": "PARA MUSIC",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": YOUNITE_MEMBERS,
                "memberCount": 7,
            },
        },
        "groupMembershipChanges": {
            "YOUNITE": {
                "departedFromCurrentGroupRoster": ["EUNSANG"],
                "evidence": "PARA MUSIC 2026-06-30 official notice",
                "soloPreparationStatus": "preparing_solo_activity_not_current_artist_directory_identity",
            }
        },
        "contract": {
            "officialCurrentArtistDirectoryRequired": True,
            "currentAgencyEvidenceRequired": True,
            "exactYOUNITESevenMemberRosterRequired": True,
            "groupDepartureMustNotBeTreatedAsGroupInactivity": True,
            "memberNameAloneDoesNotCreateSoloCanonical": True,
            "dedicatedSoloArtistProfileRequiredForNewSoloCanonical": True,
            "eunsangPreparationDoesNotAutoCreateCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "para-music-official-current-artist-roster":
        raise RuntimeError("PARA MUSIC fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("PARA MUSIC fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("PARA MUSIC fallback exact current artist directory required")

    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("PARA MUSIC fallback current roster required")
    park = roster.get("PARK WOO JIN", {})
    younite = roster.get("YOUNITE", {})
    if park.get("agency") != "PARA MUSIC" or park.get("entityType") != "solo":
        raise RuntimeError("PARA MUSIC fallback Park Woo Jin identity mismatch")
    if younite.get("agency") != "PARA MUSIC" or younite.get("lifecycleStatus") != "active":
        raise RuntimeError("PARA MUSIC fallback YOUNITE state mismatch")
    if younite.get("members") != YOUNITE_MEMBERS or younite.get("memberCount") != 7:
        raise RuntimeError("PARA MUSIC fallback exact YOUNITE seven-member roster required")

    changes = snapshot.get("groupMembershipChanges")
    ychange = changes.get("YOUNITE", {}) if isinstance(changes, dict) else {}
    if ychange.get("departedFromCurrentGroupRoster") != ["EUNSANG"]:
        raise RuntimeError("PARA MUSIC fallback YOUNITE membership change mismatch")
    if ychange.get("soloPreparationStatus") != "preparing_solo_activity_not_current_artist_directory_identity":
        raise RuntimeError("PARA MUSIC fallback EUNSANG solo-preparation guard mismatch")

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
            fetch(INDEX_URL),
            fetch(PARK_PROFILE_URL),
            fetch(PARK_CONTRACT_URL),
            fetch(YOUNITE_PROFILE_URL),
            fetch(YOUNITE_ACTIVITY_URL),
            fetch(YOUNITE_ROSTER_NOTICE_URL),
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
        raise RuntimeError(f"PARA MUSIC current artist roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
