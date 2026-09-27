from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "fantasyboys_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://fantasyboys.jp/profiles"
FANCON_URL = "https://fantasyboys.jp/contents/920939"
DISCOGRAPHY_URL = "https://fantasyboys.jp/discography"
COLUMBIA_PROFILE_URL = "https://columbia.jp/artist-info/fantasyboys/prof.html"
NEWS_URL = "https://fantasyboys.jp/contents/news"
EXPECTED_ARTISTS = ["FANTASY BOYS"]
EXPECTED_MEMBERS = [
    "KANG MINSEO",
    "LEE HANBIN",
    "HIKARI",
    "LING QI",
    "HIKARU",
    "KIM WOOSEOK",
    "HONG SUNGMIN",
    "OH HYEONTAE",
    "KIM GYURAE",
    "KAEDAN",
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

def parse_live_pages(
    profile_html: str,
    fancon_html: str,
    discography_html: str,
    columbia_profile_html: str,
    news_html: str,
) -> list[dict]:
    profile = text_blob(profile_html).lower()
    fancon = text_blob(fancon_html).lower()
    discography = text_blob(discography_html).lower()
    columbia = text_blob(columbia_profile_html).lower()
    news = text_blob(news_html).lower()

    profile_tokens = [
        "kang minseo",
        "lee hanbin",
        "hikari",
        "ling qi",
        "hikaru",
        "kim wooseok",
        "hong sungmin",
        "oh hyeontae",
        "kim gyurae",
        "kaedan",
    ]
    if any(token not in profile for token in profile_tokens):
        return []
    if "k-soul" in profile or "k soul" in profile:
        return []

    if "pocketdol studio" not in fancon:
        return []
    if "fantasy boys" not in fancon or "2025" not in fancon:
        return []

    if "new tomorrow" not in discography or "2023.09.21" not in discography:
        return []
    if "undeniable" not in discography or "2025.03.20" not in discography:
        return []

    if "fantasy boys" not in columbia:
        return []
    columbia_tokens = [
        "カン・ミンソ",
        "イ・ハンビン",
        "ヒカリ",
        "リンチ",
        "ヒカル",
        "キム・ウソク",
        "ホン・ソンミン",
        "オ・ヒョンテ",
        "キム・ギュレ",
        "ケイダン",
    ]
    if any(token not in columbia for token in columbia_tokens):
        return []

    if "2026. 08.27" not in news and "2026.08.27" not in news:
        return []

    return [{
        "displayArtist": "FANTASY BOYS",
        "aliases": ["판타지 보이즈"],
        "evidence": [
            {"label": "FANTASY BOYS current official Japan profile", "url": PROFILE_URL},
            {"label": "FANTASY BOYS official PocketDol-hosted 2025 FAN-CON notice", "url": FANCON_URL},
            {"label": "FANTASY BOYS official discography", "url": DISCOGRAPHY_URL},
            {"label": "Nippon Columbia official ten-member profile", "url": COLUMBIA_PROFILE_URL},
            {"label": "FANTASY BOYS current official news index", "url": NEWS_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "fantasyboys-official-current-provider-catalog",
            "type": "provider_catalog",
            "name": "FANTASY BOYS Official Current Provider Catalog",
            "observedAt": observed_at,
            "url": PROFILE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "currentManagementEvidenceRequired": True,
            "exactCurrentProfileRosterRequired": True,
            "currentOfficialProfileControlsRoster": True,
            "staleKoreanArtistPageDoesNotOverrideCurrentProfile": True,
            "historicalHiatusNoticeDoesNotOverrideCurrentProfile": True,
            "absenceOfScheduleDoesNotImplyInactiveLifecycle": True,
            "memberProfilesDoNotCreateSoloCanonicals": True,
            "debutDateFromOfficialDiscography": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "fantasyboys-official-current-provider-catalog":
        raise RuntimeError("FANTASY BOYS fallback snapshot source mismatch")
    if source.get("type") != "provider_catalog":
        raise RuntimeError("FANTASY BOYS fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("FANTASY BOYS fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exactCurrentProfileRosterRequired") is not True:
        raise RuntimeError("FANTASY BOYS fallback exact profile roster contract required")
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
            fetch(FANCON_URL),
            fetch(DISCOGRAPHY_URL),
            fetch(COLUMBIA_PROFILE_URL),
            fetch(NEWS_URL),
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
        raise RuntimeError(f"FANTASY BOYS provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
