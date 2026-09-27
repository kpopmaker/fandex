from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "tiot_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://weverse.io/tiot/highlight?hl=ko"
MANAGEMENT_URL = "https://weverse.io/tiot/notice/21020?hl=ko"
ACTIVITY_URL = "https://weverse.io/tiot/notice/36378?hl=ko"
DEBUT_URL = "https://weverse.io/tiot/fanpost/4-170239066?hl=ko"
FANDOM_URL = "https://weverse.io/tiot/notice/20696"
EXPECTED_ARTISTS = ["TIOT"]
EXPECTED_MEMBERS = ["KIM MIN SEOUNG", "KUM JUN HYEON", "HONG KEON HEE", "CHOI WOO JIN", "SHIN YE CHAN"]

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
    management_html: str,
    activity_html: str,
    debut_html: str,
    fandom_html: str,
) -> list[dict]:
    profile = text_blob(profile_html)
    management = text_blob(management_html)
    activity = text_blob(activity_html)
    debut = text_blob(debut_html)
    fandom = text_blob(fandom_html)

    member_tokens = [
        ("KIM MIN SEOUNG", "김민성"),
        ("KUM JUN HYEON", "금준현"),
        ("HONG KEON HEE", "홍건희"),
        ("CHOI WOO JIN", "최우진"),
        ("SHIN YE CHAN", "신예찬"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in member_tokens):
        return []

    if not contains_any(management, "RedstartENM", "Redstart ENM", "레드스타트이엔엠"):
        return []
    if not contains_any(management, "TIOT", "티아이오티"):
        return []

    if "2026" not in activity:
        return []
    if not contains_any(activity, "TIOT", "티아이오티"):
        return []
    if "1:5" not in activity:
        return []

    if not contains_any(debut, "2024년 4월 22일", "April 22"):
        return []
    if any(not contains_any(debut, *tokens) for tokens in member_tokens):
        return []

    if "LOTI" not in fandom:
        return []

    return [{
        "displayArtist": "TIOT",
        "aliases": ["티아이오티"],
        "evidence": [
            {"label": "TIOT current official five-member Weverse profile", "url": PROFILE_URL},
            {"label": "Redstart ENM official TIOT community management rules", "url": MANAGEMENT_URL},
            {"label": "TIOT official 2026 Hong Kong fan meeting notice", "url": ACTIVITY_URL},
            {"label": "TIOT official debut and five-member introduction", "url": DEBUT_URL},
            {"label": "TIOT official LOTI community event", "url": FANDOM_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "tiot-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "TIOT Official Current Provider Catalog",
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
            "currentOfficialMemberSectionControlsRoster": True,
            "scheduleParticipationDoesNotDefineMembership": True,
            "explicitTerminalDepartureEvidenceRequiredForMemberRemoval": True,
            "officialDebutDateEvidenceRequired": True,
            "fandomEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "Redstart ENM",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 5,
            "debutDate": "2024-04-22",
            "fandomName": "LOTI",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "tiot-official-current-provider-catalog":
        raise RuntimeError("TIOT fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("TIOT fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("TIOT fallback exact current member contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("TIOT fallback exact current roster required")
    if roster.get("agency") != "Redstart ENM" or roster.get("currentMemberCount") != 5:
        raise RuntimeError("TIOT fallback current management or count mismatch")
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
            fetch(MANAGEMENT_URL),
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
        raise RuntimeError(f"TIOT provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
