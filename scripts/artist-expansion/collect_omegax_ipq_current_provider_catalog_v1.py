from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "omegax_ipq_current_provider_catalog_adapter_v1"
CURRENT_URL = "https://www.einpresswire.com/article/920787896/omega-x-makes-a-comeback-with-their-4th-mini-album-uncapped"
DEPARTURE_URL = "https://v.daum.net/v/20260602084104178"
DEBUT_URL = "https://music.apple.com/us/album/1st-mini-album-vamos-ep/1632712469"
EXPECTED_ARTISTS = ["OMEGA X"]
EXPECTED_MEMBERS = ["JAEHAN", "HWICHAN", "SEBIN", "HANGYEOM", "TAEDONG", "XEN", "JEHYUN", "KEVIN", "HYUK", "YECHAN"]
PROMOTION_MEMBERS = ["JAEHAN", "HWICHAN", "SEBIN", "XEN", "JEHYUN", "KEVIN", "YECHAN"]

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

def parse_live_pages(current_html: str, departure_html: str, debut_html: str) -> list[dict]:
    current = text_blob(current_html)
    departure = text_blob(departure_html)
    debut = text_blob(debut_html)

    if not contains_any(current, "currently a 10-member K-pop group under IPQ", "10-member K-pop group under IPQ"):
        return []

    current_member_tokens = [
        ("JAEHAN", "Jaehan"),
        ("HWICHAN", "Hwichan"),
        ("SEBIN", "Sebin"),
        ("HANGYEOM", "Hangyeom"),
        ("TAEDONG", "Taedong"),
        ("XEN", "Xen"),
        ("JEHYUN", "Jehyun"),
        ("KEVIN", "Kevin"),
        ("HYUK", "Hyuk"),
        ("YECHAN", "Yechan"),
    ]
    if any(not contains_any(current, *tokens) for tokens in current_member_tokens):
        return []

    if not contains_any(current, "seven members", "7-member", "members JAEHAN, YECHAN, XEN, KEVIN, SEBIN, JEHYUN, and HWICHAN"):
        return []
    for member in PROMOTION_MEMBERS:
        if member.lower() not in current.lower():
            return []
    if not contains_any(current, "UNCAPPED"):
        return []
    if not contains_any(current, "June 19, 2026"):
        return []

    if not contains_any(departure, "IPQ", "아이피큐"):
        return []
    if not contains_any(departure, "정훈", "JUNGHOON", "Junghoon"):
        return []
    if not contains_any(departure, "2026년 6월 1일", "June 1, 2026", "6월 1일"):
        return []
    if not contains_any(departure, "공식적인 활동을 마무리", "conclude his activities", "팀 탈퇴"):
        return []

    if not contains_any(debut, "OMEGA X"):
        return []
    if not contains_any(debut, "VAMOS"):
        return []
    if not contains_any(debut, "June 30, 2021", "2021-06-30"):
        return []

    return [{
        "displayArtist": "OMEGA X",
        "aliases": ["오메가엑스", "OMEGAX"],
        "evidence": [
            {"label": "IPQ-supplied current 10-member OMEGA X release", "url": CURRENT_URL},
            {"label": "IPQ JUNGHOON explicit departure statement", "url": DEPARTURE_URL},
            {"label": "Apple Music VAMOS debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "omegax-ipq-current-provider-catalog",
            "type": "provider_catalog",
            "name": "OMEGA X IPQ Current Provider Catalog",
            "observedAt": observed_at,
            "url": CURRENT_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "currentAgencyEvidenceRequired": True,
            "currentTenMemberRosterRequired": True,
            "activitySubsetDoesNotChangeCanonicalRoster": True,
            "sevenMemberAlbumLineupIsPromotionSubset": True,
            "militaryServiceDoesNotTerminateMembership": True,
            "individualScheduleDoesNotTerminateMembership": True,
            "healthNonparticipationDoesNotTerminateMembership": True,
            "explicitDepartureRequiredForMemberRemoval": True,
            "priorExplicitDepartureExcludedFromCurrentRoster": True,
            "licensedProviderDebutCatalogAllowed": True,
            "currentAgencyVerifiedFromIPQSuppliedRelease": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "lifecycleStatus": "active",
            "agencyStatus": "verified",
            "agency": "IPQ",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 10,
            "priorExitedMembers": [
                {"member": "JUNGHOON", "effectiveDate": "2026-06-01", "resolution": "explicit_member_activity_conclusion_and_team_departure"},
            ],
            "currentPromotionSubset": {
                "project": "UNCAPPED",
                "releaseDate": "2026-06-19",
                "members": PROMOTION_MEMBERS,
                "memberCount": 7,
                "resolution": "promotion_subset_not_canonical_roster",
            },
            "debutDate": "2021-06-30",
            "debutRelease": "VAMOS",
            "fandomName": "FOR X",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "omegax-ipq-current-provider-catalog":
        raise RuntimeError("OMEGA X fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("OMEGA X fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("currentTenMemberRosterRequired") is not True:
        raise RuntimeError("OMEGA X fallback ten-member contract required")
    if contract.get("activitySubsetDoesNotChangeCanonicalRoster") is not True:
        raise RuntimeError("OMEGA X fallback activity-subset contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("OMEGA X fallback exact current roster required")
    if roster.get("currentMemberCount") != 10:
        raise RuntimeError("OMEGA X fallback member count mismatch")
    if roster.get("lifecycleStatus") != "active" or roster.get("agencyStatus") != "verified":
        raise RuntimeError("OMEGA X fallback active verified state mismatch")
    subset = roster.get("currentPromotionSubset")
    if not isinstance(subset, dict) or subset.get("members") != PROMOTION_MEMBERS or subset.get("memberCount") != 7:
        raise RuntimeError("OMEGA X fallback promotion subset mismatch")
    if roster.get("priorExitedMembers") != [{"member": "JUNGHOON", "effectiveDate": "2026-06-01", "resolution": "explicit_member_activity_conclusion_and_team_departure"}]:
        raise RuntimeError("OMEGA X fallback prior departure mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(CURRENT_URL), fetch(DEPARTURE_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"OMEGA X current provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
