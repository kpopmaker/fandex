from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "inb100_current_roster_adapter_v1"
INDEX_URL = "https://inb100.com/36"
BAEKHYUN_PROFILE_URL = "https://inb100.com/40"
XIUMIN_PROFILE_URL = "https://www.inb100.com/41"
CHEN_PROFILE_URL = "https://www.inb100.com/42"

EXPECTED_ARTISTS = ["BAEKHYUN", "XIUMIN", "CHEN"]
SOLO_EVIDENCE = {
    "BAEKHYUN": {"alias": "백현", "profile": BAEKHYUN_PROFILE_URL, "release": "City Lights", "soloDebutDate": "2019-07-10"},
    "XIUMIN": {"alias": "시우민", "profile": XIUMIN_PROFILE_URL, "release": "Brand New", "soloDebutDate": "2022-09-26"},
    "CHEN": {"alias": "첸", "profile": CHEN_PROFILE_URL, "release": "사월, 그리고 꽃", "soloDebutDate": "2019-04-01"},
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


def parse_live_pages(index_html: str, baekhyun_html: str, xiumin_html: str, chen_html: str) -> list[dict]:
    index = text_blob(index_html)
    profiles = {
        "BAEKHYUN": text_blob(baekhyun_html),
        "XIUMIN": text_blob(xiumin_html),
        "CHEN": text_blob(chen_html),
    }

    if not has(index, "ARTIST"):
        return []
    for artist in EXPECTED_ARTISTS:
        if not has(index, artist):
            return []

    rows = []
    for artist in EXPECTED_ARTISTS:
        profile = profiles[artist]
        evidence = SOLO_EVIDENCE[artist]
        for token in [artist, evidence["alias"], "SOLO", evidence["release"]]:
            if not has(profile, token):
                return []
        rows.append(
            {
                "displayArtist": artist,
                "aliases": [evidence["alias"]],
                "evidence": [
                    {"label": "INB100 official current ARTIST directory", "url": INDEX_URL},
                    {"label": f"INB100 official {artist} solo profile", "url": evidence["profile"]},
                ],
            }
        )
    return rows


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "inb100-official-current-artist-roster",
            "type": "agency_roster",
            "name": "INB100 Official Current Artist Roster",
            "observedAt": observed_at,
            "url": INDEX_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            artist: {
                "agency": "INB100",
                "agencyStatus": "verified",
                "lifecycleStatus": "active",
                "entityType": "solo",
                "soloDebutDate": SOLO_EVIDENCE[artist]["soloDebutDate"],
            }
            for artist in EXPECTED_ARTISTS
        },
        "contract": {
            "officialCurrentArtistDirectoryRequired": True,
            "exactCurrentArtistSetRequired": True,
            "dedicatedSoloProfileRequired": True,
            "officialSoloDebutEvidenceRequired": True,
            "groupMembershipAloneDoesNotCreateSoloCanonical": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "inb100-official-current-artist-roster":
        raise RuntimeError("INB100 fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("INB100 fallback source type mismatch")

    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("INB100 fallback exact current artist roster required")

    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("INB100 fallback current roster required")
    for artist in EXPECTED_ARTISTS:
        entry = roster.get(artist, {})
        if entry.get("agency") != "INB100":
            raise RuntimeError(f"INB100 fallback agency mismatch for {artist}")
        if entry.get("agencyStatus") != "verified":
            raise RuntimeError(f"INB100 fallback verified agency required for {artist}")
        if entry.get("lifecycleStatus") != "active" or entry.get("entityType") != "solo":
            raise RuntimeError(f"INB100 fallback solo active identity required for {artist}")
        if entry.get("soloDebutDate") != SOLO_EVIDENCE[artist]["soloDebutDate"]:
            raise RuntimeError(f"INB100 fallback solo debut mismatch for {artist}")

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
            fetch(INDEX_URL),
            fetch(BAEKHYUN_PROFILE_URL),
            fetch(XIUMIN_PROFILE_URL),
            fetch(CHEN_PROFILE_URL),
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
        raise RuntimeError(f"INB100 current artist roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
