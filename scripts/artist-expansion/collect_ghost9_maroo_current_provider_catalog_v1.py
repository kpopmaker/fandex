from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ghost9_maroo_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://maroocorp.com/artist_view.php?pk=8"
CURRENT_COMPANY_URL = "https://www.maroocorp.com/bbs/board.php?bo_table=notice&page=2&wr_id=25"
DEPARTURE_URL = "https://www.soompi.com/article/1487219wpp/ghost9s-lee-tae-seung-and-hwang-dong-jun-announced-to-leave-the-group?mobile-app=true&theme=false"
DEBUT_URL = "https://www.soompi.com/article/1421908wpp/maroo-entertainment-announces-plans-to-debut-new-boy-group-including-teen-teen-members"
EXPECTED_ARTISTS = ["GHOST9"]
EXPECTED_MEMBERS = ["SHIN", "SON JUNHYUNG", "LEE KANGSUNG", "CHOI JUNSEONG", "PRINCE", "LEE WOOJIN", "LEE JINWOO"]

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

def contains_any(text: str, *tokens: str) -> bool:
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(
    profile_html: str,
    current_company_html: str,
    departure_html: str,
    debut_html: str,
) -> list[dict]:
    profile = text_blob(profile_html)
    current_company = text_blob(current_company_html)
    departure = text_blob(departure_html)
    debut = text_blob(debut_html)

    profile_tokens = [
        ("이신", "SHIN"),
        ("손준형", "SON JUNHYUNG", "SON JOON HYUNG"),
        ("이강성", "LEE KANGSUNG", "LEE KANG SUNG"),
        ("최준성", "CHOI JUNSEONG", "CHOI JUN SEONG"),
        ("프린스", "PRINCE"),
        ("이우진", "LEE WOOJIN", "LEE WOO JIN"),
        ("이진우", "LEE JINWOO", "LEE JIN WOO"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in profile_tokens):
        return []
    if not contains_any(profile, "GHOST9", "고스트나인"):
        return []
    if not contains_any(profile, "PRE EPISODE 1 : DOOR", "PRE EPISODE 1: DOOR"):
        return []

    if "2026" not in current_company:
        return []
    if not contains_any(current_company, "마루기획", "MAROO"):
        return []

    if not contains_any(departure, "Hwang Dong Jun", "황동준"):
        return []
    if not contains_any(departure, "Lee Tae Seung", "이태승"):
        return []
    if not contains_any(departure, "leaving", "wrapping up", "탈퇴", "활동을 마감"):
        return []
    if not contains_any(departure, "seven", "7"):
        return []

    if not contains_any(debut, "September 23", "9월 23일"):
        return []
    if "2020" not in debut:
        return []
    if not contains_any(debut, "GHOST9", "고스트나인"):
        return []

    return [{
        "displayArtist": "GHOST9",
        "aliases": ["고스트나인"],
        "evidence": [
            {"label": "Maroo current exact seven-member GHOST9 profile", "url": PROFILE_URL},
            {"label": "Maroo 2026 current corporate website evidence", "url": CURRENT_COMPANY_URL},
            {"label": "Maroo two-member departure statement preserved by Soompi", "url": DEPARTURE_URL},
            {"label": "Maroo GHOST9 debut announcement preserved by Soompi", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ghost9-maroo-current-provider-catalog",
            "type": "provider_catalog",
            "name": "GHOST9 Maroo Current Provider Catalog",
            "observedAt": observed_at,
            "url": PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "currentOfficialArtistDirectoryRequired": True,
            "currentOfficialCompanySurfaceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "explicitDepartureEvidenceRequiredForFormerMemberExclusion": True,
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "secondaryEditorialInferenceForbidden": True,
            "currentDirectoryPresenceSupportsActiveLifecycle": True,
            "currentAgencyEvidenceRequired": True,
            "officialDebutDateEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "Maroo Entertainment",
            "agencyStatus": "verified",
            "members": EXPECTED_MEMBERS,
            "formerMembers": ["HWANG DONG JUN", "LEE TAE SEUNG"],
            "currentMemberCount": 7,
            "lifecycleStatus": "active",
            "debutDate": "2020-09-23",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ghost9-maroo-current-provider-catalog":
        raise RuntimeError("GHOST9 fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("GHOST9 fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("GHOST9 fallback exact roster contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("GHOST9 fallback exact current roster required")
    if roster.get("agency") != "Maroo Entertainment" or roster.get("agencyStatus") != "verified":
        raise RuntimeError("GHOST9 fallback current agency mismatch")
    if roster.get("lifecycleStatus") != "active" or roster.get("currentMemberCount") != 7:
        raise RuntimeError("GHOST9 fallback active seven-member lifecycle mismatch")
    if roster.get("formerMembers") != ["HWANG DONG JUN", "LEE TAE SEUNG"]:
        raise RuntimeError("GHOST9 fallback former-member exclusion mismatch")
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
            fetch(PROFILE_URL),
            fetch(CURRENT_COMPANY_URL),
            fetch(DEPARTURE_URL),
            fetch(DEBUT_URL),
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
        raise RuntimeError(f"GHOST9 current catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
