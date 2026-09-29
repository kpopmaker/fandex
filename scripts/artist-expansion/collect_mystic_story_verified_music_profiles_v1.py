from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "mystic_story_verified_music_profiles_v1"
BILL_URL = "https://www.mystic89.net/artist/Billlie"
LUCY_URL = "https://www.mystic89.net/artist/lucy"
SON_URL = "https://www.mystic89.net/artist/tae-jin-Son"
EXPECTED_ARTISTS = ["Billlie", "LUCY", "SON TAEJIN"]
BILL_MEMBER_TOKENS = ["시윤", "션", "츠키", "문수아", "하람", "수현", "하루나"]
BILL_MEMBERS = [
    "SIYOON",
    "SHEON",
    "TSUKI",
    "MOON SUA",
    "HARAM",
    "SUHYEON",
    "HARUNA"
]
LUCY_MEMBER_TOKENS = ["신예찬", "최상엽", "조원상", "신광일"]
LUCY_MEMBERS = [
    "SHIN YECHAN",
    "CHOI SANGYEOP",
    "CHO WONSANG",
    "SHIN GWANGIL"
]


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


def parse_live_pages(bill_html: str, lucy_html: str, son_html: str) -> list[dict]:
    bill = text_blob(bill_html)
    lucy = text_blob(lucy_html)
    son = text_blob(son_html)

    if not all(has(bill, token) for token in ["Billlie", "MYSTIC STORY"]):
        return []
    if not all(has(bill, token) for token in BILL_MEMBER_TOKENS):
        return []
    if not has(bill, "2021"):
        return []

    if not all(has(lucy, token) for token in ["LUCY", "MYSTIC STORY"]):
        return []
    if not all(has(lucy, token) for token in LUCY_MEMBER_TOKENS):
        return []
    if not has(lucy, "2020"):
        return []

    if not all(has(son, token) for token in ["SON TAEJIN", "손태진", "MYSTIC STORY"]):
        return []
    if not has(son, "SHINE"):
        return []
    if not has(son, "솔로"):
        return []

    return [
        {
            "displayArtist": "Billlie",
            "aliases": ["빌리"],
            "evidence": [{"label": "MYSTIC STORY official Billlie profile", "url": BILL_URL}],
        },
        {
            "displayArtist": "LUCY",
            "aliases": ["루시"],
            "evidence": [{"label": "MYSTIC STORY official LUCY profile", "url": LUCY_URL}],
        },
        {
            "displayArtist": "SON TAEJIN",
            "aliases": ["Son Taejin", "손태진"],
            "evidence": [{"label": "MYSTIC STORY official Son Taejin profile", "url": SON_URL}],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "mystic-story-verified-music-profile-supplement",
            "type": "provider_catalog",
            "name": "MYSTIC STORY Verified Music Profile Supplement",
            "observedAt": observed_at,
            "url": "https://www.mystic89.net/",
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "verifiedProfiles": {
            "Billlie": {
                "agency": "MYSTIC STORY",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": BILL_MEMBERS,
                "memberCount": len(BILL_MEMBERS),
            },
            "LUCY": {
                "agency": "MYSTIC STORY",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": LUCY_MEMBERS,
                "memberCount": len(LUCY_MEMBERS),
            },
            "SON TAEJIN": {
                "agency": "MYSTIC STORY",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
        },
        "contract": {
            "officialProfileOnly": True,
            "thisIsNotClaimedAsCompleteMysticRoster": True,
            "exactVerifiedProfileSetRequired": True,
            "exactBilllieMemberSetRequired": True,
            "exactLucyMemberSetRequired": True,
            "sonTaejinDedicatedSoloProfileRequired": True,
            "actorProfilesExcluded": True,
            "creatorProfilesExcluded": True,
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
    if not isinstance(source, dict) or source.get("id") != "mystic-story-verified-music-profile-supplement":
        raise RuntimeError("MYSTIC fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("MYSTIC fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("MYSTIC fallback exact verified profile set required")
    profiles = snapshot.get("verifiedProfiles", {})
    if profiles.get("Billlie", {}).get("members") != BILL_MEMBERS:
        raise RuntimeError("MYSTIC fallback Billlie member set mismatch")
    if profiles.get("LUCY", {}).get("members") != LUCY_MEMBERS:
        raise RuntimeError("MYSTIC fallback LUCY member set mismatch")
    if profiles.get("SON TAEJIN", {}).get("entityType") != "solo":
        raise RuntimeError("MYSTIC fallback Son Taejin solo identity required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(BILL_URL), fetch(LUCY_URL), fetch(SON_URL))
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
            f"MYSTIC verified profile supplement expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
