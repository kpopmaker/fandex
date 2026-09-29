from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "yh_entertainment_current_music_roster_adapter_v1"
MUSIC_URL = "https://yhent.co.kr/artists/music/"
YENA_URL = "https://www.yhent.co.kr/artist/yena/"
TEMPEST_URL = "https://yhent.co.kr/artist/tempest/"
DAFF_URL = "https://www.yhent.co.kr/artist/daff/"
AND2BLE_URL = "https://yhent.co.kr/en/artist/and2ble/"
EXPECTED_ARTISTS = ["YENA", "TEMPEST", "DáFF", "AND2BLE"]
TEMPEST_MEMBERS = [
    "LEW",
    "HANBIN",
    "HYEONGSEOP",
    "HYUK",
    "EUNCHAN",
    "TAERAE"
]
AND2BLE_MEMBER_TOKENS = ["장하오", "유승언", "리키", "김규빈", "한유진"]
AND2BLE_MEMBERS = [
    "JANG HAO",
    "YOO SEUNGEON",
    "RICKY",
    "KIM GYUVIN",
    "HAN YUJIN"
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


def parse_live_pages(
    music_html: str,
    yena_html: str,
    tempest_html: str,
    daff_html: str,
    and2ble_html: str,
) -> list[dict]:
    music = text_blob(music_html)
    yena = text_blob(yena_html)
    tempest = text_blob(tempest_html)
    daff = text_blob(daff_html)
    and2ble = text_blob(and2ble_html)

    for artist in EXPECTED_ARTISTS:
        if not has(music, artist):
            return []

    if not all(has(yena, token) for token in ["YENA", "2022. 01. 17", "SMiLEY"]):
        return []

    if not all(has(tempest, token) for token in ["TEMPEST", "2022. 03. 02"]):
        return []
    if not all(has(tempest, member) for member in TEMPEST_MEMBERS):
        return []

    if not all(has(daff, token) for token in ["DáFF", "다프", "2024. 12. 11", "ZOMBIE", "Glow up"]):
        return []

    if not all(has(and2ble, token) for token in ["AND2BLE", "2026.05.26"]):
        return []
    if not all(has(and2ble, member) for member in AND2BLE_MEMBER_TOKENS):
        return []

    return [
        {
            "displayArtist": "YENA",
            "aliases": ["예나", "최예나", "Choi Yena", "Choi Ye-na"],
            "evidence": [
                {"label": "YH ENTERTAINMENT official Music roster", "url": MUSIC_URL},
                {"label": "YH ENTERTAINMENT official YENA profile", "url": YENA_URL},
            ],
        },
        {
            "displayArtist": "TEMPEST",
            "aliases": ["템페스트"],
            "evidence": [
                {"label": "YH ENTERTAINMENT official Music roster", "url": MUSIC_URL},
                {"label": "YH ENTERTAINMENT official TEMPEST profile", "url": TEMPEST_URL},
            ],
        },
        {
            "displayArtist": "DáFF",
            "aliases": ["다프", "DAFF", "Daff"],
            "evidence": [
                {"label": "YH ENTERTAINMENT official Music roster", "url": MUSIC_URL},
                {"label": "YH ENTERTAINMENT official DáFF profile and discography", "url": DAFF_URL},
            ],
        },
        {
            "displayArtist": "AND2BLE",
            "aliases": ["앤더블"],
            "evidence": [
                {"label": "YH ENTERTAINMENT official Music roster", "url": MUSIC_URL},
                {"label": "YH ENTERTAINMENT official AND2BLE profile", "url": AND2BLE_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "yh-entertainment-official-current-music-roster",
            "type": "agency_roster",
            "name": "YH ENTERTAINMENT Official Current Music Roster",
            "observedAt": observed_at,
            "url": MUSIC_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "YENA": {
                "agency": "YH ENTERTAINMENT",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "debutDate": "2022-01-17",
            },
            "TEMPEST": {
                "agency": "YH ENTERTAINMENT",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "debutDate": "2022-03-02",
                "members": TEMPEST_MEMBERS,
                "memberCount": len(TEMPEST_MEMBERS),
            },
            "DáFF": {
                "agency": "YH ENTERTAINMENT",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "debutDate": "2024-12-11",
            },
            "AND2BLE": {
                "agency": "YH ENTERTAINMENT",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "debutDate": "2026-05-26",
                "members": AND2BLE_MEMBERS,
                "memberCount": len(AND2BLE_MEMBERS),
            },
        },
        "contract": {
            "officialFirstPartySourceOnly": True,
            "fullCurrentMusicRosterRequired": True,
            "dedicatedProfileRequiredForNewCanonical": True,
            "exactTempestCurrentRosterRequired": True,
            "exactAnd2bleCurrentRosterRequired": True,
            "groupMemberSoloActivityDoesNotCreateCanonicalWithoutDedicatedProfile": True,
            "agencyNameNormalizedToCurrentOfficialYH": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "yh-entertainment-official-current-music-roster":
        raise RuntimeError("YH fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("YH fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("YH fallback exact Music roster required")
    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("YH fallback current roster required")
    if roster.get("TEMPEST", {}).get("members") != TEMPEST_MEMBERS:
        raise RuntimeError("YH fallback TEMPEST roster mismatch")
    if roster.get("AND2BLE", {}).get("members") != AND2BLE_MEMBERS:
        raise RuntimeError("YH fallback AND2BLE roster mismatch")
    if roster.get("DáFF", {}).get("debutDate") != "2024-12-11":
        raise RuntimeError("YH fallback DáFF debut mismatch")
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
            fetch(MUSIC_URL),
            fetch(YENA_URL),
            fetch(TEMPEST_URL),
            fetch(DAFF_URL),
            fetch(AND2BLE_URL),
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
        raise RuntimeError(
            f"YH current music roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
