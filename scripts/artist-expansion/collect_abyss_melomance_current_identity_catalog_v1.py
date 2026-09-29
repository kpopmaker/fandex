from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "abyss_melomance_current_identity_catalog_v1"
CONTENTS_URL = "https://melomance.bstage.in/contents/section/64cc7b04c66af87ec06c6f26"
ABYSS_EVENT_URL = "https://melomance.bstage.in/surveys/680f6f3b1c3e0d4337d8107e"
EXPECTED_ARTISTS = ["MeloMance", "Kim Min-seok"]


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


def has_any(text: str, tokens: list[str]) -> bool:
    return any(has(text, token) for token in tokens)


def parse_live_pages(contents_html: str, event_html: str) -> list[dict]:
    contents = text_blob(contents_html)
    event = text_blob(event_html)

    if not has_any(contents, ["멜로망스(MeloMance)", "MeloMance", "멜로망스"]):
        return []
    if not has_any(contents, ["2026 서울신문 봄날음악회", "MeloMance 2026", "2026 봄날음악회"]):
        return []
    if not has(contents, "김민석"):
        return []
    if not has_any(contents, ["2026 김민석 소극장 콘서트", "여름집 상", "여름집 하"]):
        return []
    if not has(contents, "정동환"):
        return []

    if not has_any(event, ["어비스컴퍼니", "ABYSS COMPANY"]):
        return []
    if not has_any(event, ["Romance Express", "멜로망스 8th EP"]):
        return []

    return [
        {
            "displayArtist": "MeloMance",
            "aliases": ["멜로망스", "MELOMANCE"],
            "evidence": [
                {"label": "MeloMance official b.stage 2026 current content", "url": CONTENTS_URL},
                {"label": "ABYSS COMPANY official Romance Express notice", "url": ABYSS_EVENT_URL},
            ],
        },
        {
            "displayArtist": "Kim Min-seok",
            "aliases": ["김민석", "Kim Minseok", "Kim Min Seok"],
            "evidence": [
                {"label": "MeloMance official b.stage 2026 Kim Min-seok solo content", "url": CONTENTS_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "abyss-melomance-official-current-identity-catalog",
            "type": "provider_catalog",
            "name": "ABYSS COMPANY Official MeloMance Current Identity Catalog",
            "observedAt": observed_at,
            "url": CONTENTS_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentIdentity": {
            "MeloMance": {
                "agency": "ABYSS COMPANY",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
            },
            "Kim Min-seok": {
                "agency": "ABYSS COMPANY",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
            },
        },
        "contract": {
            "firstPartyBstageContinuityRequired": True,
            "current2026GroupActivityRequired": True,
            "current2026SoloActivityRequired": True,
            "abyssOperatorEvidenceRequired": True,
            "licensedAbyssSoloCatalogRequired": True,
            "groupMembershipAloneDoesNotCreateSoloCanonical": True,
            "soloIdentityDoesNotDetachMemberFromGroup": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "noMemberRosterMutationFromContentIndex": True,
            "autoPromote": False,
            "identityReviewRequired": False,
            "scopeVerificationRequired": False,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "abyss-melomance-official-current-identity-catalog":
        raise RuntimeError("ABYSS fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("ABYSS fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ABYSS fallback exact identity set required")
    current = snapshot.get("currentIdentity")
    if not isinstance(current, dict):
        raise RuntimeError("ABYSS fallback current identity map required")
    for artist in EXPECTED_ARTISTS:
        entry = current.get(artist, {})
        if entry.get("agency") != "ABYSS COMPANY":
            raise RuntimeError(f"ABYSS fallback agency mismatch for {artist}")
        if entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"ABYSS fallback active lifecycle required for {artist}")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(CONTENTS_URL), fetch(ABYSS_EVENT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(
            f"ABYSS MeloMance identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
