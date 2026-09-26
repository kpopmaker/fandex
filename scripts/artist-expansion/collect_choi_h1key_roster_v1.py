from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup


VERSION = "choi_creative_lab_current_h1key_roster_adapter_v1"
COMPANY_ARTISTS_URL = "https://www.choicreativelab.com/Entertainers"
GROUP_OFFICIAL_URL = "https://h1key-official.com/"
COMPANY_HOME_URL = "https://www.choicreativelab.com/"
EXPECTED_ARTISTS = ["H1-KEY"]
EXPECTED_MEMBERS = ["SEOI", "RIINA", "HWISEO", "YEL"]


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


def contains_all(html: str, terms: list[str]) -> bool:
    soup = BeautifulSoup(html, "html.parser")
    strings = [normalize_spaces(v) for v in soup.stripped_strings]
    raw = normalize_spaces(html)
    return all(
        any(term.lower() in value.lower() for value in strings)
        or term.lower() in raw.lower()
        for term in terms
    )


def parse_live_pages(company_artists_html: str, group_html: str, company_home_html: str) -> list[dict]:
    if not contains_all(company_artists_html, ["H1-KEY", "SEOI", "RIINA", "HWISEO", "YEL"]):
        return []
    if not contains_all(group_html, ["H1-KEY", "CHOI CREATIVE LAB"]):
        return []
    if not contains_all(company_home_html, ["H1-KEY", "LOVECHAPTER"]):
        return []

    return [{
        "displayArtist": "H1-KEY",
        "aliases": ["하이키", "H1KEY"],
        "evidence": [
            {"label": "CHOI CREATIVE LAB current official artist directory", "url": COMPANY_ARTISTS_URL},
            {"label": "H1-KEY current official platform", "url": GROUP_OFFICIAL_URL},
            {"label": "CHOI CREATIVE LAB current official activity", "url": COMPANY_HOME_URL},
        ],
    }]


def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "choi-creative-lab-current-h1key-identity",
            "type": "agency_roster",
            "name": "CHOI CREATIVE LAB Current H1-KEY Identity",
            "observedAt": observed_at,
            "url": COMPANY_ARTISTS_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "notExhaustiveLabelRoster": True,
            "currentGroupActivityEvidenceRequired": True,
            "memberDirectoryDoesNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }


def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "choi-creative-lab-current-h1key-identity":
        raise RuntimeError("CHOI H1-KEY fallback snapshot source mismatch")
    if source.get("type") != "agency_roster":
        raise RuntimeError("CHOI H1-KEY fallback source type mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("CHOI H1-KEY fallback exact identity required")
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
            fetch(COMPANY_ARTISTS_URL),
            fetch(GROUP_OFFICIAL_URL),
            fetch(COMPANY_HOME_URL),
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
        raise RuntimeError(f"CHOI H1-KEY roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
