from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "themuze_rescene_current_group_adapter_v1"
GROUP_URL = "https://themuze.kr/rescene"
DISCOGRAPHY_URL = "https://themuze.kr/discography"
RUNAWAY_URL = "https://themuze.kr/Runaway_"
PRETTY_GIRL_URL = "https://themuze.kr/prettygirl_"

EXPECTED_ARTISTS = ["RESCENE"]
MEMBERS = ["WONI", "MINAMI", "LIV", "MAY", "ZENA"]
MEMBER_ALIASES = {
    "WONI": ["원이"],
    "MINAMI": ["미나미"],
    "LIV": ["리브"],
    "MAY": ["메이"],
    "ZENA": ["제나"],
}


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


def parse_live_pages(
    group_html: str,
    discography_html: str,
    runaway_html: str,
    pretty_girl_html: str,
) -> list[dict]:
    group = text_blob(group_html)
    discography = text_blob(discography_html)
    runaway = text_blob(runaway_html)
    pretty_girl = text_blob(pretty_girl_html)

    for token in ["RESCENE", "리센느"]:
        if not has(group, token):
            return []

    for aliases in MEMBER_ALIASES.values():
        if not any(has(group, alias) for alias in aliases):
            return []

    for token in ["Pretty Girl", "Runaway", "lip bomb", "Dearest", "Glow Up", "SCENEDROME"]:
        if not has(discography, token):
            return []

    for token in ["Runaway", "RESCENE", "리센느"]:
        if not has(runaway, token):
            return []

    for token in ["Pretty Girl", "RESCENE", "리센느"]:
        if not has(pretty_girl, token):
            return []

    return [
        {
            "displayArtist": "RESCENE",
            "aliases": ["리센느"],
            "evidence": [
                {"label": "THE MUZE Entertainment official RESCENE current group page", "url": GROUP_URL},
                {"label": "THE MUZE Entertainment official current discography", "url": DISCOGRAPHY_URL},
                {"label": "THE MUZE Entertainment official Runaway release page", "url": RUNAWAY_URL},
                {"label": "THE MUZE Entertainment official Pretty Girl release page", "url": PRETTY_GIRL_URL},
            ],
        }
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "the-muze-official-rescene-current-group-identity",
            "type": "agency_roster",
            "name": "THE MUZE Entertainment Official RESCENE Current Group Identity",
            "observedAt": observed_at,
            "url": GROUP_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentityState": {
            "RESCENE": {
                "agency": "THE MUZE Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": MEMBERS,
                "memberCount": 5,
                "currentDiscographyEvidence": [
                    "Runaway",
                    "Pretty Girl",
                    "lip bomb",
                    "Dearest",
                    "Glow Up",
                    "SCENEDROME",
                ],
            }
        },
        "contract": {
            "officialCurrentGroupPageRequired": True,
            "officialCurrentDiscographyRequired": True,
            "exactFiveMemberIdentityRequired": True,
            "memberNameAloneDoesNotCreateSoloCanonical": True,
            "currentReleaseEvidenceRequired": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "the-muze-official-rescene-current-group-identity":
        raise RuntimeError("THE MUZE RESCENE fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("THE MUZE RESCENE fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("THE MUZE RESCENE fallback exact identity required")

    state = snapshot.get("currentIdentityState")
    entry = state.get("RESCENE", {}) if isinstance(state, dict) else {}
    if entry.get("agency") != "THE MUZE Entertainment":
        raise RuntimeError("THE MUZE RESCENE fallback agency mismatch")
    if entry.get("agencyStatus") != "verified" or entry.get("lifecycleStatus") != "active":
        raise RuntimeError("THE MUZE RESCENE fallback active verified state required")
    if entry.get("entityType") != "group":
        raise RuntimeError("THE MUZE RESCENE fallback group identity required")
    if entry.get("members") != MEMBERS or entry.get("memberCount") != 5:
        raise RuntimeError("THE MUZE RESCENE fallback exact five-member identity required")
    discography = entry.get("currentDiscographyEvidence")
    if discography != ["Runaway", "Pretty Girl", "lip bomb", "Dearest", "Glow Up", "SCENEDROME"]:
        raise RuntimeError("THE MUZE RESCENE fallback current discography mismatch")

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
            fetch(GROUP_URL),
            fetch(DISCOGRAPHY_URL),
            fetch(RUNAWAY_URL),
            fetch(PRETTY_GIRL_URL),
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
        raise RuntimeError(f"THE MUZE RESCENE current group identity expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
