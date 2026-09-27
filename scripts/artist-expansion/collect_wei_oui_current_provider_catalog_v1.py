from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "wei_oui_current_provider_catalog_adapter_v1"
ROSTER_URL = "https://ouient.com/27"
SCHEDULE_URL = "https://ouient.com/SCHEDULE"
NOTICE_URL = "https://ouient.com/35"
PROFILE_URL = "https://ouient.com/48"
EXPECTED_ARTISTS = ["WEi"]
EXPECTED_MEMBERS = ["JANG DAE HYEON", "KIM DONG HAN", "YOO YONG HA", "KIM YO HAN", "KANG SEOK HWA", "KIM JUN SEO"]

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

def parse_live_pages(roster_html: str, schedule_html: str, notice_html: str, profile_html: str) -> list[dict]:
    roster = text_blob(roster_html)
    schedule = text_blob(schedule_html)
    notice = text_blob(notice_html)
    profile = text_blob(profile_html)

    roster_tokens = [
        ("장대현", "JANG DAE HYEON"),
        ("김동한", "KIM DONG HAN"),
        ("유용하", "YOO YONG HA"),
        ("김요한", "KIM YO HAN"),
        ("강석화", "KANG SEOK HWA"),
        ("김준서", "KIM JUN SEO"),
    ]
    if any(not contains_any(roster, *tokens) for tokens in roster_tokens):
        return []
    if not contains_any(roster, "SINGERS", "ARTIST"):
        return []

    if not contains_any(schedule, "위아이", "WEi"):
        return []
    if not contains_any(schedule, "매주 월요일", "updated"):
        return []

    if not contains_any(notice, "위엔터테인먼트", "OUI ENTERTAINMENT"):
        return []
    if not contains_any(notice, "WEi 멤버 강석화", "WEi member Kang Seok Hwa", "WEi 멤버"):
        return []
    if not contains_any(notice, "2026-05-06", "5월 6일"):
        return []

    if not contains_any(profile, "2020.10.05", "2020-10-05"):
        return []
    if not contains_any(profile, "IDENTITY : First Sight", "IDENTITY:First Sight"):
        return []
    if not contains_any(profile, "2025.10.29", "2025-10-29"):
        return []
    if not contains_any(profile, "Wonderland"):
        return []

    return [{
        "displayArtist": "WEi",
        "aliases": ["위아이", "WEI"],
        "evidence": [
            {"label": "OUI current six-singer directory", "url": ROSTER_URL},
            {"label": "OUI current WEi schedule surface", "url": SCHEDULE_URL},
            {"label": "OUI 2026 WEi member continuity notice", "url": NOTICE_URL},
            {"label": "OUI member profile with WEi debut and current discography", "url": PROFILE_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "wei-oui-current-provider-catalog",
            "type": "provider_catalog",
            "name": "WEi OUI Current Provider Catalog",
            "observedAt": observed_at,
            "url": ROSTER_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentAgencySingerDirectoryRequired": True,
            "currentGroupSurfaceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "currentOfficialMemberContinuityEvidenceRequired": True,
            "currentDirectoryPresenceSupportsActiveLifecycle": True,
            "individualSchedulesDoNotTerminateMembership": True,
            "activitySubsetDoesNotChangeCanonicalMembership": True,
            "explicitTerminalDepartureEvidenceRequiredForMemberRemoval": True,
            "officialDebutDateEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "OUI Entertainment",
            "agencyStatus": "verified",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 6,
            "lifecycleStatus": "active",
            "debutDate": "2020-10-05",
            "latestVerifiedGroupReleaseDate": "2025-10-29",
            "currentContinuityNoticeDate": "2026-05-06",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "wei-oui-current-provider-catalog":
        raise RuntimeError("WEi fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("WEi fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("WEi fallback exact roster contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("WEi fallback exact current roster required")
    if roster.get("agency") != "OUI Entertainment" or roster.get("agencyStatus") != "verified":
        raise RuntimeError("WEi fallback current agency mismatch")
    if roster.get("lifecycleStatus") != "active" or roster.get("currentMemberCount") != 6:
        raise RuntimeError("WEi fallback active six-member lifecycle mismatch")
    if roster.get("debutDate") != "2020-10-05":
        raise RuntimeError("WEi fallback debut mismatch")
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
            fetch(ROSTER_URL),
            fetch(SCHEDULE_URL),
            fetch(NOTICE_URL),
            fetch(PROFILE_URL),
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
        raise RuntimeError(f"WEi current catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
