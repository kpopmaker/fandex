from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "bighit_bts_txt_music_identity_catalog_adapter_v1"
BTS_NOTICE_URL = "https://weverse.io/bts/notice/32916"
TXT_NOTICE_URL = "https://weverse.io/txt/notice/29620"
BTS_GROUP_URL = "https://bts.ibighit.com/eng/discography/detail/be.html"
RM_URL = "https://bts.ibighit.com/eng/discography/rm/detail/rpwp/"
JIN_URL = "https://bts.ibighit.com/eng/discography/jin/detail/echo/"
SUGA_URL = "https://bts.ibighit.com/eng/discography/suga/detail/d-day/"
JHOPE_URL = "https://bts.ibighit.com/eng/discography/j-hope/"
JIMIN_URL = "https://bts.ibighit.com/eng/discography/jimin/detail/muse/"
V_URL = "https://bts.ibighit.com/eng/discography/v/detail/winter-ahead/"
JUNGKOOK_URL = "https://bts.ibighit.com/eng/discography/jung-kook/detail/golden/"

EXPECTED_ARTISTS = [
    "BTS",
    "TOMORROW X TOGETHER",
    "RM",
    "Jin",
    "SUGA",
    "j-hope",
    "Jimin",
    "V",
    "Jung Kook",
]
BTS_MEMBERS = ["RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"]
TXT_MEMBERS = ["SOOBIN", "YEONJUN", "BEOMGYU", "TAEHYUN", "HUENINGKAI"]


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


def contains_all(text: str, tokens: list[str]) -> bool:
    value = text.casefold()
    return all(token.casefold() in value for token in tokens)


def contains_any(text: str, tokens: list[str]) -> bool:
    value = text.casefold()
    return any(token.casefold() in value for token in tokens)


def parse_live_pages(
    bts_notice_html: str,
    txt_notice_html: str,
    bts_group_html: str,
    rm_html: str,
    jin_html: str,
    suga_html: str,
    jhope_html: str,
    jimin_html: str,
    v_html: str,
    jungkook_html: str,
) -> list[dict]:
    bts_notice = text_blob(bts_notice_html)
    txt_notice = text_blob(txt_notice_html)
    bts_group = text_blob(bts_group_html)
    solo_pages = {
        "RM": text_blob(rm_html),
        "Jin": text_blob(jin_html),
        "SUGA": text_blob(suga_html),
        "j-hope": text_blob(jhope_html),
        "Jimin": text_blob(jimin_html),
        "V": text_blob(v_html),
        "Jung Kook": text_blob(jungkook_html),
    }

    if not contains_all(bts_notice, ["BIGHIT MUSIC", "BTS"]):
        return []
    if not contains_any(bts_notice, ["5th Album", "fifth album", "World Tour"]):
        return []
    if not contains_all(bts_group, BTS_MEMBERS):
        return []

    if not contains_all(txt_notice, ["BIGHIT MUSIC", "TOMORROW X TOGETHER"]):
        return []
    if not contains_all(txt_notice, TXT_MEMBERS):
        return []
    if not contains_any(txt_notice, ["re-sign", "re-signed", "재계약"]):
        return []

    for artist, page in solo_pages.items():
        if not contains_any(page, [artist, artist.replace(" ", "")]):
            return []
        if "bighit music" not in page.casefold():
            return []

    if not contains_any(solo_pages["SUGA"], ["Agust D", "D-DAY"]):
        return []
    if not contains_any(solo_pages["Jimin"], ["MUSE", "FACE"]):
        return []
    if not contains_any(solo_pages["Jin"], ["Echo", "Happy"]):
        return []
    if not contains_any(solo_pages["j-hope"], ["HOPE ON THE STREET", "Jack In The Box", "Killin' It Girl"]):
        return []
    if not contains_any(solo_pages["V"], ["Winter Ahead", "Layover", "FRI(END)S"]):
        return []
    if not contains_any(solo_pages["Jung Kook"], ["GOLDEN", "Golden"]):
        return []
    if not contains_any(solo_pages["RM"], ["Right Place, Wrong Person", "Indigo"]):
        return []

    return [
        {
            "displayArtist": "BTS",
            "aliases": ["방탄소년단"],
            "evidence": [
                {"label": "BIGHIT MUSIC 2026 BTS album and world tour notice", "url": BTS_NOTICE_URL},
                {"label": "BIGHIT MUSIC BTS official discography", "url": BTS_GROUP_URL},
            ],
        },
        {
            "displayArtist": "TOMORROW X TOGETHER",
            "aliases": ["TXT", "투모로우바이투게더"],
            "evidence": [
                {"label": "BIGHIT MUSIC five-member TXT contract renewal notice", "url": TXT_NOTICE_URL},
            ],
        },
        {"displayArtist": "RM", "aliases": ["김남준"], "evidence": [{"label": "RM official BIGHIT MUSIC discography", "url": RM_URL}]},
        {"displayArtist": "Jin", "aliases": ["JIN", "김석진"], "evidence": [{"label": "Jin official BIGHIT MUSIC discography", "url": JIN_URL}]},
        {"displayArtist": "SUGA", "aliases": ["Agust D", "민윤기"], "evidence": [{"label": "SUGA official BIGHIT MUSIC D-DAY catalog", "url": SUGA_URL}]},
        {"displayArtist": "j-hope", "aliases": ["J-Hope", "제이홉"], "evidence": [{"label": "j-hope official BIGHIT MUSIC discography", "url": JHOPE_URL}]},
        {"displayArtist": "Jimin", "aliases": ["JIMIN", "지민"], "evidence": [{"label": "Jimin official BIGHIT MUSIC MUSE catalog", "url": JIMIN_URL}]},
        {"displayArtist": "V", "aliases": ["Kim Taehyung", "뷔"], "evidence": [{"label": "V official BIGHIT MUSIC catalog", "url": V_URL}]},
        {"displayArtist": "Jung Kook", "aliases": ["Jungkook", "정국"], "evidence": [{"label": "Jung Kook official BIGHIT MUSIC GOLDEN catalog", "url": JUNGKOOK_URL}]},
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "bighit-bts-txt-official-music-identity-catalog",
            "type": "provider_catalog",
            "name": "BIGHIT MUSIC Official BTS/TXT Music Identity Catalog",
            "observedAt": observed_at,
            "url": BTS_GROUP_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "BTS": {
                "agency": "BIGHIT MUSIC",
                "lifecycleStatus": "active",
                "members": BTS_MEMBERS,
                "memberCount": len(BTS_MEMBERS),
                "currentGroupActivityEvidence": BTS_NOTICE_URL,
            },
            "TOMORROW X TOGETHER": {
                "agency": "BIGHIT MUSIC",
                "lifecycleStatus": "active",
                "members": TXT_MEMBERS,
                "memberCount": len(TXT_MEMBERS),
                "currentGroupActivityEvidence": TXT_NOTICE_URL,
            },
        },
        "contract": {
            "officialFirstPartySourceOnly": True,
            "currentGroupStatusEvidenceRequired": True,
            "exactCurrentTxtRosterRequired": True,
            "exactBtsMemberIdentityRequired": True,
            "soloCatalogEvidenceRequired": True,
            "groupMembershipAloneDoesNotCreateSoloCanonical": True,
            "soloCatalogIdentityDoesNotDetachMemberFromGroup": True,
            "agustDAliasMustResolveToSugaCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "bighit-bts-txt-official-music-identity-catalog":
        raise RuntimeError("BIGHIT fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("BIGHIT fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BIGHIT fallback exact identity catalog required")
    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("BIGHIT fallback current roster required")
    if roster.get("BTS", {}).get("members") != BTS_MEMBERS:
        raise RuntimeError("BIGHIT fallback BTS roster mismatch")
    if roster.get("TOMORROW X TOGETHER", {}).get("members") != TXT_MEMBERS:
        raise RuntimeError("BIGHIT fallback TXT roster mismatch")
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
            fetch(BTS_NOTICE_URL),
            fetch(TXT_NOTICE_URL),
            fetch(BTS_GROUP_URL),
            fetch(RM_URL),
            fetch(JIN_URL),
            fetch(SUGA_URL),
            fetch(JHOPE_URL),
            fetch(JIMIN_URL),
            fetch(V_URL),
            fetch(JUNGKOOK_URL),
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
            f"BIGHIT identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
