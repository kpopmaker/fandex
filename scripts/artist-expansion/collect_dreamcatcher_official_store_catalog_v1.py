from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "dreamcatcher_official_store_catalog_adapter_v1"
STORE_URL = "https://dreamcatcher.kr/"
MEMBER_URL = "https://dreamcatcher.kr/shopinfo/memberprofile.html"
UAU_DEBUT_URL = "https://dreamcatcher.kr/product/detail.html?cate_no=1&display_group=2&product_no=133"
UAU_2026_MERCH_URL = "https://en.dreamcatcher.kr/product/exclusive-special-event-uau-2026-seasons-greetings-the-night-bloom/144/?cate_no=1&display_group=2"
UAU_2026_ALBUM_URL = "https://en.dreamcatcher.kr/product/uau-2nd-mini-album-playlist-your-youth-photobook-ver/167/"
CHROCKTIKAL_URL = "https://dreamcatcher.kr/product/detail.html?cate_no=24&display_group=1&product_no=148"

EXPECTED_ARTISTS = ["Dreamcatcher", "UAU"]
DREAMCATCHER_MEMBERS = ["JIU", "SUA", "SIYEON", "HANDONG", "YOOHYEON", "DAMI", "GAHYEON"]


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
    member_html: str,
    uau_debut_html: str,
    uau_2026_merch_html: str,
    uau_2026_album_html: str,
    chrocktikal_html: str,
) -> list[dict]:
    member = text_blob(member_html)
    uau_debut = text_blob(uau_debut_html)
    uau_2026_merch = text_blob(uau_2026_merch_html)
    uau_2026_album = text_blob(uau_2026_album_html)
    chrocktikal = text_blob(chrocktikal_html)

    for token in DREAMCATCHER_MEMBERS:
        if not has(member, token):
            return []

    for token in ["UAU", "Playlist #You Are You", "DREAMCATCHER COMPANY", "2025.05.28"]:
        if not has(uau_debut, token):
            return []
    for token in ["UAU", "2026", "THE NIGHT BLOOM", "DREAMCATCHER COMPANY"]:
        if not has(uau_2026_merch, token):
            return []
    for token in ["UAU", "2nd Mini Album", "Playlist #Your Youth"]:
        if not has(uau_2026_album, token):
            return []

    if not has(chrocktikal, "ChRocktikal") and not has(chrocktikal, "크록티칼"):
        return []
    if not has(chrocktikal, "LEEGEUM ENT"):
        return []

    return [
        {
            "displayArtist": "Dreamcatcher",
            "aliases": ["드림캐쳐", "DREAMCATCHER"],
            "evidence": [
                {"label": "DREAMCATCHER OFFICIAL STORE current member profile", "url": MEMBER_URL},
            ],
        },
        {
            "displayArtist": "UAU",
            "aliases": ["유아유"],
            "evidence": [
                {"label": "DREAMCATCHER OFFICIAL STORE UAU debut album", "url": UAU_DEBUT_URL},
                {"label": "DREAMCATCHER OFFICIAL STORE UAU 2026 Season's Greetings", "url": UAU_2026_MERCH_URL},
                {"label": "DREAMCATCHER OFFICIAL STORE UAU 2026 second mini-album", "url": UAU_2026_ALBUM_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "dreamcatcher-official-store-current-music-identity-catalog",
            "type": "provider_catalog",
            "name": "Dreamcatcher Official Store Current Music Identity Catalog",
            "observedAt": observed_at,
            "url": STORE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "Dreamcatcher": {
                "agency": "Dreamcatcher Company",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": DREAMCATCHER_MEMBERS,
                "memberCount": 7,
            },
            "UAU": {
                "agency": "Dreamcatcher Company",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "unit",
                "debutDate": "2025-05-28",
            },
        },
        "excludedExternalProviderIdentities": [
            {
                "displayArtist": "ChRocktikal",
                "aliases": ["크록티칼"],
                "reason": "sold_on_dreamcatcher_official_store_but_album_manufacturer_is_LEEGEUM_ENT_not_Dreamcatcher_Company",
                "url": CHROCKTIKAL_URL,
            }
        ],
        "contract": {
            "officialStoreIdentityEvidenceRequired": True,
            "dreamcatcherExactCurrentMemberProfileRequired": True,
            "uauOfficialDebutAlbumRequired": True,
            "uauDreamcatcherCompanyManufacturerEvidenceRequired": True,
            "uauCurrent2026ActivityRequired": True,
            "secondaryClassificationMustRemainDistinctFromFirstPartyIdentityEvidence": True,
            "externalProviderProductMustNotBeAutoPromotedAsDreamcatcherCompanyIdentity": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "dreamcatcher-official-store-current-music-identity-catalog":
        raise RuntimeError("Dreamcatcher official-store fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("Dreamcatcher official-store fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("Dreamcatcher official-store fallback exact identity catalog required")

    state = snapshot.get("currentIdentityState")
    if not isinstance(state, dict):
        raise RuntimeError("Dreamcatcher official-store fallback identity state required")
    dreamcatcher = state.get("Dreamcatcher", {})
    uau = state.get("UAU", {})
    if dreamcatcher.get("members") != DREAMCATCHER_MEMBERS or dreamcatcher.get("memberCount") != 7:
        raise RuntimeError("Dreamcatcher fallback exact seven-member profile required")
    if uau.get("agency") != "Dreamcatcher Company" or uau.get("entityType") != "unit":
        raise RuntimeError("UAU fallback identity classification mismatch")
    if uau.get("lifecycleStatus") != "active" or uau.get("debutDate") != "2025-05-28":
        raise RuntimeError("UAU fallback active debut state mismatch")

    excluded = snapshot.get("excludedExternalProviderIdentities")
    excluded_names = [row.get("displayArtist") for row in excluded if isinstance(row, dict)] if isinstance(excluded, list) else []
    if excluded_names != ["ChRocktikal"]:
        raise RuntimeError("Dreamcatcher fallback external-provider boundary mismatch")

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
            fetch(MEMBER_URL),
            fetch(UAU_DEBUT_URL),
            fetch(UAU_2026_MERCH_URL),
            fetch(UAU_2026_ALBUM_URL),
            fetch(CHROCKTIKAL_URL),
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
        raise RuntimeError(f"Dreamcatcher official-store catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
