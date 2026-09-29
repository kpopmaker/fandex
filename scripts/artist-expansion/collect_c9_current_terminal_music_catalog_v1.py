from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "c9_current_terminal_music_identity_catalog_v1"
EPEX_CURRENT_URL = "https://www.koreajoongangdaily.com/entertainment/boy-band-epex-to-appear-at-weibo-event-in-bangkok-next-month/12763970"
EPEX_DEPARTURE_URL = "https://www.soompi.com/article/1799819wpp/epex-announces-keums-departure-from-the-group"
YOUNHA_CURRENT_URL = "https://www.melon.com/album/detail.htm?albumId=12831104&snsGate=Y"
LEE_CURRENT_URL = "https://sports.khan.co.kr/en/article/202607021531007"
NAZE_CURRENT_URL = "https://www.koreajoongangdaily.com/entertainment/multinational-boy-band-naze-to-debut-with-ep-naze-in-may/12589408"
CIX_TERMINAL_URL = "https://www.soompi.com/article/1836886wpp/cix-to-conclude-group-activities-yonghee-to-enlist-in-military"

EXPECTED_ARTISTS = ["EPEX", "YOUNHA", "Lee Seok Hoon", "NAZE", "CIX"]
EPEX_MEMBERS = [
    "WISH",
    "MU",
    "A-MIN",
    "BAEKSEUNG",
    "AYDEN",
    "YEWANG",
    "JEFF"
]
NAZE_MEMBERS = [
    "KAISEI",
    "YOUNKI",
    "ATO",
    "TURN",
    "YUYA",
    "KIMKUN",
    "DOHYEOK"
]
CIX_TERMINAL_MEMBERS = [
    "BX",
    "SEUNGHUN",
    "YONGHEE",
    "HYUNSUK"
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


def has_all(text: str, tokens: list[str]) -> bool:
    return all(has(text, token) for token in tokens)


def has_any(text: str, tokens: list[str]) -> bool:
    return any(has(text, token) for token in tokens)


def parse_live_pages(
    epex_current_html: str,
    epex_departure_html: str,
    younha_current_html: str,
    lee_current_html: str,
    naze_current_html: str,
    cix_terminal_html: str,
) -> list[dict]:
    epex_current = text_blob(epex_current_html)
    epex_departure = text_blob(epex_departure_html)
    younha_current = text_blob(younha_current_html)
    lee_current = text_blob(lee_current_html)
    naze_current = text_blob(naze_current_html)
    cix_terminal = text_blob(cix_terminal_html)

    if not has_all(epex_current, ["EPEX", "C9 Entertainment"]):
        return []
    if not has_all(epex_current, EPEX_MEMBERS):
        return []
    if not has_all(epex_departure, ["C9 Entertainment", "Keum"]):
        return []
    if not has_any(epex_departure, ["seven-member group", "seven members", "7-member", "7 members"]):
        return []

    if not has_all(younha_current, ["YOUNHA", "C9 Entertainment"]):
        return []
    if not has_any(younha_current, ["2026.03.09", "2026-03-09", "March 9, 2026"]):
        return []

    if not has_any(lee_current, ["Lee Seok-hoon", "Lee Seok Hoon"]):
        return []
    if not has(lee_current, "C9 Entertainment"):
        return []

    if not has_all(naze_current, ["C9 Entertainment", "Naze"]):
        return []
    if not has_all(naze_current, NAZE_MEMBERS):
        return []
    if not has_any(naze_current, ["May 4", "2026-05-04"]):
        return []

    if not has_all(cix_terminal, ["C9 Entertainment", "CIX"]):
        return []
    if not has_all(cix_terminal, CIX_TERMINAL_MEMBERS):
        return []
    if not has_any(cix_terminal, ["halting group activities", "bringing its team activities to a close", "stop its team activities"]):
        return []

    return [
        {
            "displayArtist": "EPEX",
            "aliases": ["이펙스"],
            "evidence": [
                {"label": "2026 EPEX activity attributed to C9 Entertainment", "url": EPEX_CURRENT_URL},
                {"label": "C9 official Keum departure and seven-member continuation", "url": EPEX_DEPARTURE_URL},
            ],
        },
        {
            "displayArtist": "YOUNHA",
            "aliases": ["윤하", "고윤하"],
            "evidence": [
                {"label": "2026 Melon release catalog listing C9 Entertainment", "url": YOUNHA_CURRENT_URL},
            ],
        },
        {
            "displayArtist": "Lee Seok Hoon",
            "aliases": ["LEE SEOK HOON", "이석훈"],
            "evidence": [
                {"label": "2026 activity coverage supplied by C9 Entertainment", "url": LEE_CURRENT_URL},
            ],
        },
        {
            "displayArtist": "NAZE",
            "aliases": ["네이즈"],
            "evidence": [
                {"label": "C9 May 4 2026 debut statement", "url": NAZE_CURRENT_URL},
            ],
        },
        {
            "displayArtist": "CIX",
            "aliases": ["씨아이엑스"],
            "evidence": [
                {"label": "C9 terminal group-activity statement", "url": CIX_TERMINAL_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "c9-current-terminal-music-identity-catalog",
            "type": "provider_catalog",
            "name": "C9 Entertainment Current + Terminal Music Identity Catalog",
            "observedAt": observed_at,
            "url": "https://www.c9ent.co.kr/",
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "EPEX": {
                "agency": "C9 Entertainment",
                "lifecycleStatus": "active",
                "members": EPEX_MEMBERS,
                "memberCount": len(EPEX_MEMBERS),
            },
            "YOUNHA": {
                "agency": "C9 Entertainment",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "Lee Seok Hoon": {
                "agency": "C9 Entertainment",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
            "NAZE": {
                "agency": "C9 Entertainment",
                "lifecycleStatus": "active",
                "members": NAZE_MEMBERS,
                "memberCount": len(NAZE_MEMBERS),
                "debutDate": "2026-05-04",
            },
        },
        "terminalIdentity": {
            "CIX": {
                "agency": "C9 Entertainment",
                "agencyStatus": "historical",
                "lifecycleStatus": "inactive",
                "members": CIX_TERMINAL_MEMBERS,
                "memberCount": len(CIX_TERMINAL_MEMBERS),
                "officialGroupActivitiesEnded": True,
                "allMembersLeaveAgency": True,
            }
        },
        "contract": {
            "preservedOfficialAgencyStatementsAllowed": True,
            "activeIdentityRequires2026Evidence": True,
            "currentSevenMemberEpexRosterRequired": True,
            "explicitDepartureRequiredForMemberRemoval": True,
            "temporaryHiatusDoesNotEqualDeparture": True,
            "explicitTerminalGroupActivityEndRequired": True,
            "terminalCixMustRemainInactiveHistorical": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "groupMembershipDoesNotCollapseSoloIdentity": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "c9-current-terminal-music-identity-catalog":
        raise RuntimeError("C9 fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("C9 fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("C9 fallback exact identity catalog required")
    if snapshot.get("currentRoster", {}).get("EPEX", {}).get("members") != EPEX_MEMBERS:
        raise RuntimeError("C9 fallback EPEX roster mismatch")
    if snapshot.get("currentRoster", {}).get("NAZE", {}).get("members") != NAZE_MEMBERS:
        raise RuntimeError("C9 fallback NAZE roster mismatch")
    terminal = snapshot.get("terminalIdentity", {}).get("CIX", {})
    if terminal.get("members") != CIX_TERMINAL_MEMBERS:
        raise RuntimeError("C9 fallback CIX terminal roster mismatch")
    if terminal.get("lifecycleStatus") != "inactive":
        raise RuntimeError("C9 fallback CIX inactive lifecycle required")
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
            fetch(EPEX_CURRENT_URL),
            fetch(EPEX_DEPARTURE_URL),
            fetch(YOUNHA_CURRENT_URL),
            fetch(LEE_CURRENT_URL),
            fetch(NAZE_CURRENT_URL),
            fetch(CIX_TERMINAL_URL),
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
            f"C9 identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
