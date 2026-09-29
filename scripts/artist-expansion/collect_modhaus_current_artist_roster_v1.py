from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "modhaus_current_artist_roster_adapter_v1"
COMPANY_URL = "https://www.mod-haus.com/"
SHOP_URL = "https://shopus.mod-haus.com/"
TRIPLES_PROFILE_URL = "https://www.triples-official.jp/profile/"
TRIPLES_DEBUT_URL = "https://music.apple.com/us/album/assemble/1737936304"
ARTMS_MEMBER_URL = "https://merch.modhaus-us.com/products/artms-official-light-stick"
ARTMS_DEBUT_URL = "https://music.apple.com/us/album/dall/1737175222"

EXPECTED_ARTISTS = ["ARTMS", "tripleS"]
ARTMS_MEMBERS = ["HeeJin", "HaSeul", "Kim Lip", "JinSoul", "Choerry"]
TRIPLES_MEMBERS = [
    "SeoYeon", "HyeRin", "JiWoo", "ChaeYeon", "YooYeon", "SooMin",
    "NaKyoung", "YuBin", "Kaede", "DaHyun", "Kotone", "YeonJi",
    "Nien", "SoHyun", "Xinyu", "Mayu", "Lynn", "JooBin",
    "HaYeon", "ShiOn", "ChaeWon", "Sullin", "SeoAh", "JiYeon",
]


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


def contains_any(text: str, *tokens: str) -> bool:
    value = text.casefold()
    return any(token.casefold() in value for token in tokens)


def contains_all(text: str, tokens: list[str]) -> bool:
    value = text.casefold()
    return all(token.casefold() in value for token in tokens)


def parse_live_pages(
    company_html: str,
    shop_html: str,
    triples_profile_html: str,
    triples_debut_html: str,
    artms_member_html: str,
    artms_debut_html: str,
) -> list[dict]:
    company = text_blob(company_html)
    shop = text_blob(shop_html)
    triples_profile = text_blob(triples_profile_html)
    triples_debut = text_blob(triples_debut_html)
    artms_member = text_blob(artms_member_html)
    artms_debut = text_blob(artms_debut_html)

    if not contains_any(company, "K-Pop agency", "K-pop agency"):
        return []
    if not contains_any(company, "Modhaus"):
        return []
    if not contains_all(shop, ["ARTMS", "tripleS"]):
        return []

    if not contains_all(triples_profile, TRIPLES_MEMBERS):
        return []
    if not contains_any(triples_debut, "ASSEMBLE"):
        return []
    if not contains_any(triples_debut, "February 13, 2023", "2023-02-13"):
        return []
    if not contains_any(triples_debut, "MODHAUS"):
        return []

    if not contains_all(artms_member, ARTMS_MEMBERS):
        return []
    if not contains_any(artms_debut, "<Dall>", "Dall"):
        return []
    if not contains_any(artms_debut, "May 31, 2024", "2024-05-31"):
        return []
    if not contains_any(artms_debut, "MODHAUS"):
        return []

    return [
        {
            "displayArtist": "ARTMS",
            "aliases": ["아르테미스"],
            "evidence": [
                {"label": "MODHAUS official current artist store", "url": SHOP_URL},
                {"label": "MODHAUS official ARTMS member merchandise", "url": ARTMS_MEMBER_URL},
                {"label": "Apple Music <Dall> licensed debut catalog", "url": ARTMS_DEBUT_URL},
            ],
        },
        {
            "displayArtist": "tripleS",
            "aliases": ["트리플에스", "TripleS"],
            "evidence": [
                {"label": "MODHAUS official current artist store", "url": SHOP_URL},
                {"label": "tripleS official 24-member profile", "url": TRIPLES_PROFILE_URL},
                {"label": "Apple Music ASSEMBLE licensed debut catalog", "url": TRIPLES_DEBUT_URL},
            ],
        },
    ]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "modhaus-official-current-artist-roster",
            "type": "agency_roster",
            "name": "MODHAUS Official Current Artist Roster",
            "observedAt": observed_at,
            "url": SHOP_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "currentAgencyRosterRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "licensedProviderDebutCatalogAllowed": True,
            "existingCanonicalMustSuppressDuplicateDiscovery": True,
            "subunitOrPriorGroupMembershipDoesNotCollapseParentIdentity": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "ARTMS": {
                "agency": "MODHAUS",
                "lifecycleStatus": "active",
                "members": ARTMS_MEMBERS,
                "memberCount": len(ARTMS_MEMBERS),
                "debutDate": "2024-05-31",
                "debutRelease": "<Dall>",
            },
            "tripleS": {
                "agency": "MODHAUS",
                "lifecycleStatus": "active",
                "members": TRIPLES_MEMBERS,
                "memberCount": len(TRIPLES_MEMBERS),
                "debutDate": "2023-02-13",
                "debutRelease": "ASSEMBLE",
            },
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "modhaus-official-current-artist-roster":
        raise RuntimeError("MODHAUS fallback source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("MODHAUS fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [
        row.get("displayArtist")
        for row in candidates
        if isinstance(row, dict)
    ] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("MODHAUS fallback exact artist roster required")
    roster = snapshot.get("currentRoster")
    if not isinstance(roster, dict):
        raise RuntimeError("MODHAUS fallback current roster required")
    if roster.get("ARTMS", {}).get("members") != ARTMS_MEMBERS:
        raise RuntimeError("MODHAUS fallback ARTMS roster mismatch")
    if roster.get("ARTMS", {}).get("debutDate") != "2024-05-31":
        raise RuntimeError("MODHAUS fallback ARTMS debut date mismatch")
    if roster.get("tripleS", {}).get("members") != TRIPLES_MEMBERS:
        raise RuntimeError("MODHAUS fallback tripleS roster mismatch")
    if roster.get("tripleS", {}).get("debutDate") != "2023-02-13":
        raise RuntimeError("MODHAUS fallback tripleS debut date mismatch")
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
            fetch(COMPANY_URL),
            fetch(SHOP_URL),
            fetch(TRIPLES_PROFILE_URL),
            fetch(TRIPLES_DEBUT_URL),
            fetch(ARTMS_MEMBER_URL),
            fetch(ARTMS_DEBUT_URL),
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
        raise RuntimeError(
            f"MODHAUS current roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates"
        )

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
