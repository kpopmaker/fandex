from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "allhours_official_current_provider_catalog_adapter_v1"
INTRO_URL = "https://all-h-ours.com/contents/section/65892d155660697e81e136ea"
JAPAN_PROFILE_URL = "https://all-h-ours.fanpla.jp/news/2/"
CURRENT_ACTIVITY_URL = "https://all-h-ours.com/surveys/6aaa4a3142c05b4a22e229fa"
SECOND_ACTIVITY_URL = "https://all-h-ours.com/surveys/6aa240c24d9bf56d90b20a79"
EXPECTED_ARTISTS = ["ALL(H)OURS"]
EXPECTED_MEMBERS = ["KUNHO", "YOUMIN", "XAYDEN", "MINJE", "MASAMI", "HYUNBIN", "ON:N"]

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
    intro_html: str,
    japan_profile_html: str,
    current_activity_html: str,
    second_activity_html: str,
) -> list[dict]:
    intro = text_blob(intro_html).lower()
    japan = text_blob(japan_profile_html).lower()
    current_activity = text_blob(current_activity_html).lower()
    second_activity = text_blob(second_activity_html).lower()

    member_tokens = ["kunho", "youmin", "xayden", "minje", "masami", "hyunbin", "on:n"]
    if any(token not in intro for token in member_tokens):
        return []
    if any(token not in japan for token in member_tokens):
        return []

    if "eden" not in japan or "7" not in japan:
        return []
    if "2024" not in japan or "1" not in japan or "10" not in japan:
        return []

    if "eden" not in current_activity:
        return []
    if "all(h)ours" not in current_activity and "올아워즈" not in current_activity:
        return []
    if "unbound" not in current_activity or "2026" not in current_activity:
        return []

    if "all(h)ours" not in second_activity and "올아워즈" not in second_activity:
        return []
    if "2026" not in second_activity:
        return []

    return [{
        "displayArtist": "ALL(H)OURS",
        "aliases": ["올아워즈", "ALL HOURS", "ALLHOURS"],
        "evidence": [
            {"label": "ALL(H)OURS current official seven-member intro", "url": INTRO_URL},
            {"label": "ALL(H)OURS Japan official profile", "url": JAPAN_PROFILE_URL},
            {"label": "EDEN Entertainment current UNBOUND activity notice", "url": CURRENT_ACTIVITY_URL},
            {"label": "EDEN Entertainment September 2026 broadcast notice", "url": SECOND_ACTIVITY_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "allhours-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "ALL(H)OURS Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": INTRO_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentManagementEvidenceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "currentActivityEvidenceRequired": True,
            "koreanAndJapanOfficialProfilesMustAgree": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "currentPromotionsDoNotCreateUnitCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "allhours-official-current-provider-catalog":
        raise RuntimeError("ALL(H)OURS fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("ALL(H)OURS fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ALL(H)OURS fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("ALL(H)OURS fallback exact current member contract required")
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
            fetch(INTRO_URL),
            fetch(JAPAN_PROFILE_URL),
            fetch(CURRENT_ACTIVITY_URL),
            fetch(SECOND_ACTIVITY_URL),
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
        raise RuntimeError(f"ALL(H)OURS provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
