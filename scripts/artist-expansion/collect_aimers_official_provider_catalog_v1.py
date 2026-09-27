from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "aimers_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://aimers-official.jp/"
FAQ_URL = "https://aimers-official.jp/pages/faq"
DISCOGRAPHY_URL = "https://aimers-official.jp/pages/discography"
ENLISTMENT_URL = "https://aimers-official.jp/blogs/news/0019"
EVENT_URL = "https://aimers-official.jp/blogs/news/0023"
EXPECTED_ARTISTS = ["AIMERS"]
EXPECTED_MEMBERS = ["SEUNGHYUN", "EUNJUN", "DORYUN", "YOEL", "SEUNGHWAN", "WOOYOUNG"]

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
    faq_html: str,
    discography_html: str,
    enlistment_html: str,
    event_html: str,
) -> list[dict]:
    profile = text_blob(profile_html).lower()
    faq = text_blob(faq_html).lower()
    discography = text_blob(discography_html).lower()
    enlistment = text_blob(enlistment_html).lower()
    event = text_blob(event_html).lower()

    if any(member.lower() not in profile for member in EXPECTED_MEMBERS):
        return []

    if "hyper rhythm" not in faq and "하이퍼리듬" not in faq:
        return []
    if "aimers" not in faq and "에이머스" not in faq:
        return []

    if "betting starts" not in discography:
        return []
    if "2022.11.17" not in discography and "2022-11-17" not in discography:
        return []

    if "seunghyun" not in enlistment:
        return []
    if "hyper rhythm" not in enlistment and "하이퍼리듬" not in enlistment:
        return []
    if "2026" not in enlistment:
        return []

    if "seunghyun" not in event or "eunjun" not in event:
        return []
    if "2026" not in event:
        return []

    if "2026" not in profile:
        return []

    return [{
        "displayArtist": "AIMERS",
        "aliases": ["에이머스"],
        "evidence": [
            {"label": "AIMERS current official six-member profile", "url": PROFILE_URL},
            {"label": "AIMERS official HYPER RHYTHM fan-letter address", "url": FAQ_URL},
            {"label": "AIMERS official debut discography", "url": DISCOGRAPHY_URL},
            {"label": "AIMERS official SEUNGHYUN enlistment notice", "url": ENLISTMENT_URL},
            {"label": "AIMERS official temporary performance absence notice", "url": EVENT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "aimers-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "AIMERS Official Current Provider Catalog",
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
            "militaryServiceDoesNotImplyMembershipTermination": True,
            "temporaryEventAbsenceDoesNotChangeMembership": True,
            "currentOfficialMemberSectionControlsRoster": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "membershipContinuity": {
            "currentMembers": EXPECTED_MEMBERS,
            "militaryServiceMember": "SEUNGHYUN",
            "temporaryEventAbsenceMembers": ["SEUNGHYUN", "EUNJUN"],
            "currentMemberCount": 6,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "aimers-official-current-provider-catalog":
        raise RuntimeError("AIMERS fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("AIMERS fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("AIMERS fallback exact current member contract required")
    continuity = snapshot.get("membershipContinuity") if isinstance(snapshot, dict) else None
    if not isinstance(continuity, dict) or continuity.get("currentMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("AIMERS fallback exact current roster continuity required")
    if continuity.get("currentMemberCount") != 6:
        raise RuntimeError("AIMERS fallback six-member continuity required")
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
            fetch(FAQ_URL),
            fetch(DISCOGRAPHY_URL),
            fetch(ENLISTMENT_URL),
            fetch(EVENT_URL),
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
        raise RuntimeError(f"AIMERS provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
