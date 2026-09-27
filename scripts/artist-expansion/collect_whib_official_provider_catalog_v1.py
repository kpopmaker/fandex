from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "whib_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://weverse.io/whib/highlight?hl=ko"
DEPARTURE_URL = "https://weverse.io/whib/notice/30852"
RENAME_URL = "https://weverse.io/whib/notice/30588?hl=ko"
CURRENT_ACTIVITY_URL = "https://weverse.io/whib/notice/38208"
DEBUT_URL = "https://weverse.io/whib/fanpost/3-137292337?hl=ko"
EXPECTED_ARTISTS = ["WHIB"]
EXPECTED_MEMBERS = ["KIM JUN MIN", "HASEUNG", "JINBEOM", "UGEON", "LEEJEONG", "JAEHA", "WONJUN"]

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

def contains_member(text: str, *tokens: str) -> bool:
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(
    profile_html: str,
    departure_html: str,
    rename_html: str,
    current_activity_html: str,
    debut_html: str,
) -> list[dict]:
    profile = text_blob(profile_html)
    departure = text_blob(departure_html)
    rename = text_blob(rename_html)
    current_activity = text_blob(current_activity_html)
    debut = text_blob(debut_html)

    member_tokens = [
        ("KIM JUN MIN", "김준민", "KIMJUNMIN"),
        ("HASEUNG", "하승"),
        ("JINBEOM", "진범"),
        ("UGEON", "UGeon", "유건"),
        ("LEEJEONG", "이정"),
        ("JAEHA", "재하"),
        ("WONJUN", "원준"),
    ]
    if any(not contains_member(profile, *tokens) for tokens in member_tokens):
        return []
    if contains_member(profile, "INHONG", "인홍"):
        return []
    if contains_member(profile, "JAYDER", "제이더"):
        return []

    if not contains_member(departure, "C-JeS", "CJeS", "씨제스"):
        return []
    if not contains_member(departure, "INHONG", "인홍"):
        return []
    if "7-member" not in departure.lower() and "7인" not in departure:
        return []

    if not contains_member(rename, "JAYDER", "제이더"):
        return []
    if not contains_member(rename, "KIMJUNMIN", "김준민"):
        return []
    if "2025" not in rename or "10" not in rename or "2" not in rename:
        return []

    if not contains_member(current_activity, "C-JeS", "CJeS", "씨제스"):
        return []
    if "WHIB" not in current_activity and "휘브" not in current_activity:
        return []
    if "2026" not in current_activity:
        return []

    if "2023.11.08" not in debut and "2023-11-08" not in debut and "November 8, 2023" not in debut:
        return []

    return [{
        "displayArtist": "WHIB",
        "aliases": ["휘브"],
        "evidence": [
            {"label": "WHIB current official seven-member Weverse profile", "url": PROFILE_URL},
            {"label": "C-JeS official Inhong departure and seven-member continuation notice", "url": DEPARTURE_URL},
            {"label": "C-JeS official JAYDER to KIMJUNMIN rename notice", "url": RENAME_URL},
            {"label": "C-JeS current 2026 WHIB fan concert notice", "url": CURRENT_ACTIVITY_URL},
            {"label": "WHIB official Weverse debut-date post", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "whib-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "WHIB Official Current Provider Catalog",
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
            "formerMemberExcludedByOfficialDepartureNotice": True,
            "renameContinuityRequired": True,
            "renamedMemberDoesNotCreateNewCanonical": True,
            "temporaryScheduleAbsenceDoesNotChangeMembership": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "identityContinuity": {
            "renamedMember": {
                "formerStageName": "JAYDER",
                "currentName": "KIM JUN MIN",
                "effectiveDate": "2025-10-02",
            },
            "departedMember": "INHONG",
            "currentMemberCount": 7,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "whib-official-current-provider-catalog":
        raise RuntimeError("WHIB fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("WHIB fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("WHIB fallback exact current member contract required")
    continuity = snapshot.get("identityContinuity") if isinstance(snapshot, dict) else None
    if not isinstance(continuity, dict) or continuity.get("currentMemberCount") != 7:
        raise RuntimeError("WHIB fallback seven-member continuity required")
    renamed = continuity.get("renamedMember")
    if not isinstance(renamed, dict) or renamed.get("currentName") != "KIM JUN MIN":
        raise RuntimeError("WHIB fallback rename continuity required")
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
            fetch(RENAME_URL),
            fetch(CURRENT_ACTIVITY_URL),
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
        raise RuntimeError(f"WHIB provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
