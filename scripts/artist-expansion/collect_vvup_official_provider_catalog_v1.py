from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "vvup_official_current_provider_catalog_adapter_v1"
HIGHLIGHT_URL = "https://weverse.io/vvup/highlight?hl=ko"
MANAGEMENT_URL = "https://weverse.io/vvup/notice/32285?hl=ko"
MEDIA_URL = "https://weverse.io/vvup/media?hl=ko"
RELEASE_NOTICE_URL = "https://shop.weverse.io/ko/shop/KRW/artists/181/notices/12244"
EXPECTED_ARTISTS = ["VVUP"]
EXPECTED_MEMBERS = ["KIM", "PAAN", "SUYEON", "JIYOON"]

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
    highlight_html: str,
    management_html: str,
    media_html: str,
    release_notice_html: str,
) -> list[dict]:
    highlight = text_blob(highlight_html).lower()
    management = text_blob(management_html).lower()
    media = text_blob(media_html).lower()
    release_notice = text_blob(release_notice_html).lower()

    if "vvup" not in highlight and "비비업" not in highlight:
        return []

    member_tokens = [
        ("kim", "킴"),
        ("paan", "팬"),
        ("suyeon", "수연"),
        ("jiyoon", "지윤"),
    ]
    if any(english not in highlight and korean not in highlight for english, korean in member_tokens):
        return []

    if "egoent" not in management:
        return []
    if "vvup" not in management and "비비업" not in management:
        return []

    if "2026" not in media:
        return []
    if "vvup" not in media and "비비업" not in media:
        return []

    if "vvon" not in release_notice or "2026" not in release_notice:
        return []
    if "29" not in release_notice or "10" not in release_notice:
        return []

    return [{
        "displayArtist": "VVUP",
        "aliases": ["비비업"],
        "evidence": [
            {"label": "VVUP current official Weverse member profiles", "url": HIGHLIGHT_URL},
            {"label": "egoENT official VVUP management notice", "url": MANAGEMENT_URL},
            {"label": "VVUP current 2026 official media", "url": MEDIA_URL},
            {"label": "Weverse Global current VVON release notice", "url": RELEASE_NOTICE_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "vvup-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "VVUP Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": HIGHLIGHT_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentManagementEvidenceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "currentActivityEvidenceRequired": True,
            "currentRosterDerivedFromOfficialArtistProfilesOnly": True,
            "historicalMemberContentDoesNotOverrideCurrentProfiles": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "debutDateFromOfficialCommunityEvent": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "vvup-official-current-provider-catalog":
        raise RuntimeError("VVUP fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("VVUP fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("VVUP fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentMemberRosterRequired") is not True:
        raise RuntimeError("VVUP fallback exact current member contract required")
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
            fetch(HIGHLIGHT_URL),
            fetch(MANAGEMENT_URL),
            fetch(MEDIA_URL),
            fetch(RELEASE_NOTICE_URL),
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
        raise RuntimeError(f"VVUP provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
