from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "justb_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://weverse.io/justb/highlight"
HIATUS_URL = "https://weverse.io/justb/notice/34389"
ACTIVITY_URL = "https://weverse.io/justb/notice/34712"
DEBUT_URL = "https://weverse.io/justb/notice/29977"
FANDOM_URL = "https://weverse.io/justb/notice/12657"
EXPECTED_ARTISTS = ["JUST B"]
EXPECTED_MEMBERS = ["LIM JIMIN", "GEONU", "BAIN", "SIWOO", "DY", "SANGWOO"]

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
    hiatus_html: str,
    activity_html: str,
    debut_html: str,
    fandom_html: str,
) -> list[dict]:
    profile = text_blob(profile_html)
    hiatus = text_blob(hiatus_html)
    activity = text_blob(activity_html)
    debut = text_blob(debut_html)
    fandom = text_blob(fandom_html)

    member_tokens = [
        ("LIM JIMIN", "임지민"),
        ("GEONU", "건우"),
        ("Bain", "배인"),
        ("SIWOO", "시우"),
        ("DY", "도염"),
        ("SANGWOO", "상우"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in member_tokens):
        return []

    if not contains_any(hiatus, "블루닷엔터테인먼트", "BLUEDOT Entertainment"):
        return []
    if not contains_any(hiatus, "지민", "LIM JIMIN"):
        return []
    if not contains_any(hiatus, "일시적으로", "temporarily"):
        return []
    if not contains_any(hiatus, "5인 체제", "five-member"):
        return []
    if not contains_any(hiatus, "복귀", "return"):
        return []

    if not contains_any(activity, "블루닷엔터테인먼트", "BLUEDOT Entertainment"):
        return []
    if "2026" not in activity:
        return []
    if not contains_any(activity, "JUSTB LIVE IN JAPAN 2026", "JUST B LIVE IN JAPAN 2026"):
        return []

    if not contains_any(debut, "six-member", "6인"):
        return []
    if not contains_any(debut, "June 30, 2021", "2021년 6월 30일"):
        return []
    if any(not contains_any(debut, *tokens) for tokens in member_tokens):
        return []

    if not contains_any(fandom, "ONLY B", "ONLYB"):
        return []
    if not contains_any(fandom, "BLUEDOT Entertainment", "블루닷엔터테인먼트"):
        return []

    return [{
        "displayArtist": "JUST B",
        "aliases": ["저스트비", "JUSTB"],
        "evidence": [
            {"label": "JUST B current official six-member Weverse profile", "url": PROFILE_URL},
            {"label": "BLUEDOT official LIM JIMIN temporary medical hiatus notice", "url": HIATUS_URL},
            {"label": "BLUEDOT official 2026 JUST B Japan activity notice", "url": ACTIVITY_URL},
            {"label": "BLUEDOT official six-member identity and debut notice", "url": DEBUT_URL},
            {"label": "BLUEDOT official ONLY B fanclub notice", "url": FANDOM_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "justb-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "JUST B Official Current Provider Catalog",
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
            "currentOfficialMemberSectionControlsMembership": True,
            "temporaryMedicalHiatusDoesNotTerminateMembership": True,
            "activityLineupMayBeSubsetOfCanonicalMembership": True,
            "explicitTerminalDepartureEvidenceRequiredForMemberRemoval": True,
            "officialDebutDateEvidenceRequired": True,
            "fandomEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "BLUEDOT Entertainment",
            "members": EXPECTED_MEMBERS,
            "temporaryHiatusMember": "LIM JIMIN",
            "temporaryActivityLineup": ["GEONU", "BAIN", "SIWOO", "DY", "SANGWOO"],
            "currentMemberCount": 6,
            "temporaryActivityMemberCount": 5,
            "debutDate": "2021-06-30",
            "fandomName": "ONLY B",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "justb-official-current-provider-catalog":
        raise RuntimeError("JUST B fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("JUST B fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("JUST B fallback exact current member contract required")
    if contract.get("temporaryMedicalHiatusDoesNotTerminateMembership") is not True:
        raise RuntimeError("JUST B fallback temporary hiatus contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("JUST B fallback exact current roster required")
    if roster.get("agency") != "BLUEDOT Entertainment" or roster.get("currentMemberCount") != 6:
        raise RuntimeError("JUST B fallback current management or count mismatch")
    if roster.get("temporaryHiatusMember") != "LIM JIMIN" or roster.get("temporaryActivityMemberCount") != 5:
        raise RuntimeError("JUST B fallback hiatus/activity-lineup continuity mismatch")
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
            fetch(HIATUS_URL),
            fetch(ACTIVITY_URL),
            fetch(DEBUT_URL),
            fetch(FANDOM_URL),
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
        raise RuntimeError(f"JUST B provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
