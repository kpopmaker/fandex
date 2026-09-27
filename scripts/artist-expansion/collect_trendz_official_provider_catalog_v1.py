from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "trendz_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://avex.jp/trendz/profile/"
MANAGEMENT_URL = "https://trendz.kr/community/board/63719da2c82cfb7148f768d3/post/69608adfb83ac17fd034cb3c"
ACTIVITY_URL = "https://trendz.kr/notice/6a3e5f9e13a113154417dfeb"
FANDOM_URL = "https://trendz.kr/notice/664ad4a3d55cbe6fce2fbcb3"
DEBUT_URL = "https://trendz.kr/contents/6475eeb5f5f8936722ef890e"
EXPECTED_ARTISTS = ["TRENDZ"]
EXPECTED_MEMBERS = ["HANKOOK", "HAVIT", "LEON", "YOONWOO", "ra.L", "EUNIL", "YECHAN"]

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

def parse_live_pages(
    profile_html: str,
    management_html: str,
    activity_html: str,
    fandom_html: str,
    debut_html: str,
) -> list[dict]:
    profile = text_blob(profile_html).lower()
    management = text_blob(management_html).lower()
    activity = text_blob(activity_html).lower()
    fandom = text_blob(fandom_html).lower()
    debut = text_blob(debut_html).lower()

    if any(member.lower() not in profile for member in EXPECTED_MEMBERS):
        return []
    if "7" not in profile:
        return []
    if "trendz" not in profile:
        return []
    if "2026" not in profile:
        return []

    if "글로벌에이치미디어" not in management and "global h media" not in management:
        return []
    if "trendz" not in management and "트렌드지" not in management:
        return []
    if "2026" not in management:
        return []

    if "on my knees" not in activity:
        return []
    if "2026" not in activity:
        return []
    if "6th single album" not in activity and "여섯 번째 싱글 앨범" not in activity:
        return []

    if "friendz" not in fandom:
        return []

    exact_debut = (
        "2022.01.05" in debut
        or "2022-01-05" in debut
        or ("22년" in debut and "1월 5일" in debut)
    )
    if not exact_debut:
        return []

    return [{
        "displayArtist": "TRENDZ",
        "aliases": ["트렌드지"],
        "evidence": [
            {"label": "TRENDZ Avex current official seven-member profile", "url": PROFILE_URL},
            {"label": "Global H Media current TRENDZ management notice", "url": MANAGEMENT_URL},
            {"label": "TRENDZ current Korean On My Knees activity notice", "url": ACTIVITY_URL},
            {"label": "TRENDZ official FRIENDZ membership notice", "url": FANDOM_URL},
            {"label": "TRENDZ official debut-date member content", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "trendz-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "TRENDZ Official Current Provider Catalog",
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
            "koreanAndJapanOfficialSurfacesMustAgree": True,
            "officialDebutDateEvidenceRequired": True,
            "fandomEvidenceRequired": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "agency": "Global H Media",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 7,
            "debutDate": "2022-01-05",
            "fandomName": "FRIENDZ",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "trendz-official-current-provider-catalog":
        raise RuntimeError("TRENDZ fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("TRENDZ fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("TRENDZ fallback exact current member contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("TRENDZ fallback exact current roster required")
    if roster.get("agency") != "Global H Media" or roster.get("currentMemberCount") != 7:
        raise RuntimeError("TRENDZ fallback current management or count mismatch")
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
            fetch(FANDOM_URL),
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
        raise RuntimeError(f"TRENDZ provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
