from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "fnf_current_debuted_groups_adapter_v1"
UNIS_PROFILE_URL = "https://www.fnfent.com/sub/artist/artist_view.html?artist_idx=29"
UNIS_ACTIVITY_URL = "https://www.fnfent.com/sub/news/view.html?idx=486"
AHOF_DISCOGRAPHY_URL = "https://www.fnfent.com/sub/artist/discography_view.html?idx=25"
AHOF_ACTIVITY_URL = "https://www.fnfent.com/sub/news/view.html?idx=462"
UNIVERSE_TICKET_URL = "https://www.fnfent.com/sub/artist/artist_view.html?artist_idx=26"
UNIVERSE_LEAGUE_URL = "https://www.fnfent.com/sub/artist/artist_view.html?artist_idx=39"

EXPECTED_ARTISTS = ["UNIS", "AHOF"]
UNIS_MEMBERS = ["HYEONJU", "NANA", "GEHLEE", "KOTOKO", "YUNHA", "ELISIA", "YOONA", "SEOWON"]
AHOF_MEMBERS = ["스티븐", "서정우", "차웅기", "장슈아이보", "박한", "제이엘", "박주원", "즈언", "다이스케"]


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
    unis_profile_html: str,
    unis_activity_html: str,
    ahof_discography_html: str,
    ahof_activity_html: str,
    universe_ticket_html: str,
    universe_league_html: str,
) -> list[dict]:
    unis_profile = text_blob(unis_profile_html)
    unis_activity = text_blob(unis_activity_html)
    ahof_discography = text_blob(ahof_discography_html)
    ahof_activity = text_blob(ahof_activity_html)
    universe_ticket = text_blob(universe_ticket_html)
    universe_league = text_blob(universe_league_html)

    if not all(has(unis_profile, token) for token in ["UNIS", "유니스", "MEMBER"]):
        return []
    for member in UNIS_MEMBERS:
        if not has(unis_profile, member):
            return []
    if not all(has(unis_activity, token) for token in ["유니스", "하늘땅 별땅", "2026"]):
        return []

    if not all(has(ahof_discography, token) for token in ["AHOF", "아홉", "WHO WE ARE"]):
        return []
    for member in AHOF_MEMBERS:
        if not has(ahof_discography, member):
            return []
    if not all(has(ahof_activity, token) for token in ["AHOF", "아홉", "RUN TO YOU", "2026"]):
        return []

    if not has(universe_ticket, "UNIVERSE TICKET") or not has(universe_ticket, "유니버스 티켓"):
        return []
    if not has(universe_league, "UNIVERSE LEAGUE") or not has(universe_league, "유니버스 리그"):
        return []

    return [
        {
            "displayArtist": "UNIS",
            "aliases": ["유니스"],
            "evidence": [
                {"label": "F&F Entertainment official UNIS profile", "url": UNIS_PROFILE_URL},
                {"label": "F&F Entertainment official 2026 UNIS activity", "url": UNIS_ACTIVITY_URL},
            ],
        },
        {
            "displayArtist": "AHOF",
            "aliases": ["아홉"],
            "evidence": [
                {"label": "F&F Entertainment official AHOF debut discography", "url": AHOF_DISCOGRAPHY_URL},
                {"label": "F&F Entertainment official 2026 AHOF activity", "url": AHOF_ACTIVITY_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "fnf-entertainment-official-current-debuted-groups",
            "type": "provider_catalog",
            "name": "F&F Entertainment Official Current Debuted Group Catalog",
            "observedAt": observed_at,
            "url": "https://www.fnfent.com/sub/artist/list.html",
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "UNIS": {
                "agency": "F&F Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": UNIS_MEMBERS,
                "memberCount": 8,
            },
            "AHOF": {
                "agency": "F&F Entertainment",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "group",
                "members": AHOF_MEMBERS,
                "memberCount": 9,
            },
        },
        "excludedProjectIdentities": [
            {
                "displayArtist": "UNIVERSE TICKET",
                "reason": "survival_program_project_identity_not_current_debuted_group",
                "url": UNIVERSE_TICKET_URL,
            },
            {
                "displayArtist": "UNIVERSE LEAGUE",
                "reason": "survival_program_project_identity_not_current_debuted_group",
                "url": UNIVERSE_LEAGUE_URL,
            },
        ],
        "contract": {
            "officialFirstPartyEvidenceRequired": True,
            "currentDebutedGroupActivityRequired": True,
            "exactUNISMemberSetRequired": True,
            "exactAHOFMemberSetRequired": True,
            "survivalProgramProjectIdentityExcluded": True,
            "programParticipantDoesNotCreateSoloCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "fnf-entertainment-official-current-debuted-groups":
        raise RuntimeError("F&F fallback source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("F&F fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("F&F fallback exact debuted group catalog required")

    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("F&F fallback current roster required")
    if roster.get("UNIS", {}).get("members") != UNIS_MEMBERS:
        raise RuntimeError("F&F fallback exact UNIS member set required")
    if roster.get("AHOF", {}).get("members") != AHOF_MEMBERS:
        raise RuntimeError("F&F fallback exact AHOF member set required")
    for artist in EXPECTED_ARTISTS:
        entry = roster.get(artist, {})
        if entry.get("agency") != "F&F Entertainment":
            raise RuntimeError(f"F&F fallback agency mismatch for {artist}")
        if entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"F&F fallback active lifecycle required for {artist}")

    excluded = snapshot.get("excludedProjectIdentities")
    excluded_names = [row.get("displayArtist") for row in excluded if isinstance(row, dict)] if isinstance(excluded, list) else []
    if excluded_names != ["UNIVERSE TICKET", "UNIVERSE LEAGUE"]:
        raise RuntimeError("F&F fallback project exclusion contract mismatch")

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
            fetch(UNIS_PROFILE_URL),
            fetch(UNIS_ACTIVITY_URL),
            fetch(AHOF_DISCOGRAPHY_URL),
            fetch(AHOF_ACTIVITY_URL),
            fetch(UNIVERSE_TICKET_URL),
            fetch(UNIVERSE_LEAGUE_URL),
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
        raise RuntimeError(f"F&F current debuted group catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
