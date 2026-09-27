from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "blitzers_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://weverse.io/blitzers/highlight?hl=ko"
DEPARTURE_URL = "https://weverse.io/blitzers/notice/17469"
MANAGEMENT_URL = "https://weverse.io/blitzers/notice/36399"
ACTIVITY_URL = "https://weverse.io/blitzers/notice/35604"
EXPECTED_ARTISTS = ["BLITZERS"]
EXPECTED_MEMBERS = ["JINHWA", "JUHAN", "SYA", "CHRIS", "LUTAN", "WOOJU"]

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
    departure_html: str,
    management_html: str,
    activity_html: str,
) -> list[dict]:
    profile = text_blob(profile_html)
    departure = text_blob(departure_html)
    management = text_blob(management_html)
    activity = text_blob(activity_html)

    member_tokens = [
        ("JINHWA", "진화"),
        ("JUHAN", "주한"),
        ("SYA", "샤"),
        ("CHRIS", "크리스"),
        ("LUTAN", "루탄"),
        ("WOOJU", "우주"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in member_tokens):
        return []
    if contains_any(profile, "Who is BLITZERS GO_U?", "BLITZERS 고유 최신 프로필"):
        return []

    if not contains_any(departure, "WUZO Entertainment", "우조엔터테인먼트"):
        return []
    if not contains_any(departure, "GO_U", "고유"):
        return []
    if not contains_any(departure, "6-member", "6인"):
        return []

    if not contains_any(management, "WUZO Entertainment", "우조엔터테인먼트"):
        return []
    if "2026" not in management:
        return []

    if "2026" not in activity:
        return []
    if not contains_any(activity, "5th ANNIVERSARY", "5살"):
        return []
    if "6:1" not in activity:
        return []
    if not contains_any(activity, "6종", "six"):
        return []

    if not contains_any(profile, "BLEE", "블리"):
        return []
    if not (
        "2021-05-11T15:00" in profile
        or "2021-05-12" in profile
        or "2021년 5월 12일" in profile
    ):
        return []

    return [{
        "displayArtist": "BLITZERS",
        "aliases": ["블리처스"],
        "evidence": [
            {"label": "BLITZERS current official six-member Weverse profile", "url": PROFILE_URL},
            {"label": "WUZO official GO_U terminal membership notice", "url": DEPARTURE_URL},
            {"label": "WUZO current 2026 BLITZERS management notice", "url": MANAGEMENT_URL},
            {"label": "BLITZERS official 2026 fifth-anniversary six-member event", "url": ACTIVITY_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "blitzers-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "BLITZERS Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentManagementEvidenceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "currentActivityEvidenceRequired": True,
            "explicitDepartureNoticeControlsFormerMemberExclusion": True,
            "currentOfficialMemberSectionControlsRoster": True,
            "sixMemberContinuationRequired": True,
            "formerMemberDoesNotRemainInCurrentRoster": True,
            "officialDebutDateEvidenceRequired": True,
            "fandomEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "WUZO Entertainment",
            "members": EXPECTED_MEMBERS,
            "departedMember": "GO_U",
            "currentMemberCount": 6,
            "debutDate": "2021-05-12",
            "fandomName": "BLEE",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "blitzers-official-current-provider-catalog":
        raise RuntimeError("BLITZERS fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BLITZERS fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("BLITZERS fallback exact current member contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("BLITZERS fallback exact current roster required")
    if roster.get("agency") != "WUZO Entertainment" or roster.get("currentMemberCount") != 6:
        raise RuntimeError("BLITZERS fallback current management or count mismatch")
    if roster.get("departedMember") != "GO_U":
        raise RuntimeError("BLITZERS fallback former-member exclusion required")
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
            fetch(DEPARTURE_URL),
            fetch(MANAGEMENT_URL),
            fetch(ACTIVITY_URL),
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
        raise RuntimeError(f"BLITZERS provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
