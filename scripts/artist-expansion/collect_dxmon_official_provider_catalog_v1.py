from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "dxmon_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://weverse.io/dxmon/highlight?hl=ko"
AGENCY_NOTICE_URL = "https://weverse.io/dxmon/notice/25096?hl=ko"
ACTIVITY_URL = "https://weverse.io/dxmon/notice/36204"
EXPECTED_ARTISTS = ["DXMON"]
EXPECTED_MEMBERS = ["SEITA", "MINJAE", "HEE", "TK", "REX"]


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


def contains_any(blob: str, terms: list[str]) -> bool:
    lower = blob.lower()
    return any(term.lower() in lower for term in terms)


def parse_live_pages(profile_html: str, agency_html: str, activity_html: str) -> list[dict]:
    profile = text_blob(profile_html)
    agency = text_blob(agency_html)
    activity = text_blob(activity_html)

    if not contains_any(profile, ["DXMON", "다이몬"]):
        return []
    if not all(contains_any(profile, [member]) for member in EXPECTED_MEMBERS):
        return []
    if not contains_any(agency, ["H music ENTERTAINMENT", "에이치뮤직엔터테인먼트"]):
        return []
    if not contains_any(agency, ["DXMON", "다이몬"]):
        return []
    if not contains_any(activity, ["2026 DXMON FANMEETING", "2026 다이몬"]):
        return []

    return [{
        "displayArtist": "DXMON",
        "aliases": ["다이몬"],
        "evidence": [
            {"label": "DXMON current official Weverse profile", "url": PROFILE_URL},
            {"label": "H Music official DXMON agency notice", "url": AGENCY_NOTICE_URL},
            {"label": "DXMON official 2026 activity notice", "url": ACTIVITY_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "dxmon-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "DXMON Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentFiveMemberLineupRequired": True,
            "currentActivityEvidenceRequired": True,
            "formerMemberExcludedFromCurrentLineup": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "dxmon-official-current-provider-catalog":
        raise RuntimeError("DXMON fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("DXMON fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("DXMON fallback exact provider catalog required")
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
            fetch(AGENCY_NOTICE_URL),
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
        raise RuntimeError(f"DXMON provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
