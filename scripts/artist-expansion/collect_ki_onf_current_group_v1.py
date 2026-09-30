from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ki_onf_current_group_adapter_v1"
AGENCY_URL = "https://x.com/KIENT_offcl"
GROUP_URL = "https://x.com/ONF_offcl"
EXPECTED_ARTISTS = ["ONF"]
MEMBERS = ["HYOJIN", "E-TION", "SEUNGJUN", "WYATT", "MINKYUN", "YUTO"]


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


def has(text: str, token: str) -> bool:
    return token.casefold() in text.casefold()


def parse_live_pages(agency_html: str, group_html: str) -> list[dict]:
    agency = text_blob(agency_html)
    group = text_blob(group_html)

    if not has(agency, "KI ENTERTAINMENT") or not has(agency, "ONF"):
        return []
    if not has(group, "ONF"):
        return []
    if not (has(group, "Open The Door") or has(group, "ONF_MY_SELF") or has(group, "ONF:MY SELF")):
        return []

    return [{
        "displayArtist": "ONF",
        "aliases": ["온앤오프"],
        "evidence": [
            {
                "label": "KI Entertainment official ONF exclusive-contract announcement channel",
                "url": AGENCY_URL,
            },
            {
                "label": "ONF official current activity channel",
                "url": GROUP_URL,
            },
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ki-entertainment-official-onf-current-group-identity",
            "type": "agency_roster",
            "name": "KI Entertainment Official ONF Current Group Identity",
            "observedAt": observed_at,
            "url": AGENCY_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "ONF": {
                "agency": "KI Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": MEMBERS,
                "memberCount": 6,
                "current2026MusicEvidence": {
                    "release": "ONF:MY SELF",
                    "releaseDate": "2026-06-17",
                    "titleTrack": "Open The Door",
                },
            }
        },
        "contract": {
            "officialKIExclusiveContractRequired": True,
            "exactSixMemberIdentityRequired": True,
            "current2026MusicActivityRequired": True,
            "currentAgencyMustBeKI": True,
            "historicalWMNotCurrentAgency": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ki-entertainment-official-onf-current-group-identity":
        raise RuntimeError("KI ONF fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("KI ONF fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("KI ONF fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("ONF", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "KI Entertainment":
        raise RuntimeError("KI ONF fallback current agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("KI ONF fallback active verified state required")
    if entry.get("entityType") != "group":
        raise RuntimeError("KI ONF fallback group identity required")
    if entry.get("members") != MEMBERS or entry.get("memberCount") != 6:
        raise RuntimeError("KI ONF fallback exact six-member identity required")

    recent = entry.get("current2026MusicEvidence", {})
    if (
        recent.get("release") != "ONF:MY SELF"
        or recent.get("releaseDate") != "2026-06-17"
        or recent.get("titleTrack") != "Open The Door"
    ):
        raise RuntimeError("KI ONF fallback current music evidence mismatch")

    contract = snapshot.get("contract", {})
    if contract.get("historicalWMNotCurrentAgency") is not True:
        raise RuntimeError("KI ONF fallback historical/current agency separation required")

    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(AGENCY_URL), fetch(GROUP_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"KI ONF current group identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
