from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "feel_ghood_current_artist_roster_adapter_v1"
ROSTER_URL = "https://feelghoods.com/product/list.html"
DUET_URL = "https://music.bugs.co.kr/album/4153775?wl_ref=list_ab_03_ar"
BIBI_URL = "https://www.wmg.com/news/korean-star-bibi-backed-by-strategic-global-partnership-of-wm-korea-and-feelghood-music"
EXPECTED_ARTISTS = ["Tiger JK", "Yoonmirae", "BIBI"]


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


def parse_live_pages(roster_html: str, duet_html: str, bibi_html: str) -> list[dict]:
    roster = text_blob(roster_html)
    duet = text_blob(duet_html)
    bibi = text_blob(bibi_html)

    if not has(roster, "ARTIST"):
        return []
    for token in ["Tiger JK", "yoonmirae", "BIBI"]:
        if not has(roster, token):
            return []
    if not has_any(roster, ["FEEL GHOOD MUSIC", "FeelGHoodMusic", "필굿뮤직"]):
        return []

    if not all(has(duet, token) for token in ["Tiger JK", "윤미래", "Let Me Love You", "2026.08.20"]):
        return []
    if not has_any(duet, ["FeelGhoodMusic", "Feel Ghood Music"]):
        return []

    if not all(has(bibi, token) for token in ["BIBI", "FeelGHood Music", "Warner Music"]):
        return []
    if not has_any(bibi, ["management company", "management"]):
        return []
    if not has_any(bibi, ["May 19", "2026"]):
        return []

    return [
        {"displayArtist":"Tiger JK","aliases":["타이거JK","타이거 JK"],"evidence":[
            {"label":"Feel Ghood Music official current ARTIST menu","url":ROSTER_URL},
            {"label":"Bugs licensed 2026 FeelGhoodMusic Let Me Love You catalog","url":DUET_URL}
        ]},
        {"displayArtist":"Yoonmirae","aliases":["Yoon Mirae","윤미래"],"evidence":[
            {"label":"Feel Ghood Music official current ARTIST menu","url":ROSTER_URL},
            {"label":"Bugs licensed 2026 FeelGhoodMusic Let Me Love You catalog","url":DUET_URL}
        ]},
        {"displayArtist":"BIBI","aliases":["비비","김형서"],"evidence":[
            {"label":"Feel Ghood Music official current ARTIST menu","url":ROSTER_URL},
            {"label":"Warner Music Group 2026 partnership preserving Feel Ghood management continuity","url":BIBI_URL}
        ]},
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "feel-ghood-music-official-current-artist-roster",
            "type": "agency_roster",
            "name": "Feel Ghood Music Official Current Artist Roster",
            "observedAt": observed_at,
            "url": ROSTER_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "currentRoster": {
            "Tiger JK":{"agency":"Feel Ghood Music","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
            "Yoonmirae":{"agency":"Feel Ghood Music","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
            "BIBI":{"agency":"Feel Ghood Music","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
        },
        "contract": {
            "officialFirstPartyRosterRequired": True,
            "exactCurrentArtistMenuRequired": True,
            "current2026TigerYoonMusicActivityRequired": True,
            "bibi2026ManagementContinuityRequired": True,
            "licensedCurrentReleaseCrossCheckRequired": True,
            "historicalGroupIdentityNotAutoCreated": True,
            "duetDoesNotCreateUnitCanonical": True,
            "currentRosterDoesNotInferUnlistedFormerArtists": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "feel-ghood-music-official-current-artist-roster":
        raise RuntimeError("Feel Ghood fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("Feel Ghood fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("Feel Ghood fallback exact current artist roster required")
    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("Feel Ghood fallback current roster required")
    for artist in EXPECTED_ARTISTS:
        entry = roster.get(artist, {})
        if entry.get("agency") != "Feel Ghood Music":
            raise RuntimeError(f"Feel Ghood fallback agency mismatch for {artist}")
        if entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"Feel Ghood fallback active lifecycle required for {artist}")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(ROSTER_URL), fetch(DUET_URL), fetch(BIBI_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"Feel Ghood current artist roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
