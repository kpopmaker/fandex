from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "arrc_official_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://weverse.io/arrc/notice/36951"
DEBUT_URL = "https://weverse.io/arrc/notice/21665"
SEVEN_MEMBER_URL = "https://weverse.io/arrc/notice/24934?hl=ko"
FANDOM_URL = "https://weverse.io/arrc/notice/24431"
EXPECTED_ARTISTS = ["ARrC"]
EXPECTED_MEMBERS = ["ANDY", "CHOI HAN", "DOHA", "HYUNMIN", "JIBEEN", "KIEN", "RIOTO"]

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
    terminal_html: str,
    debut_html: str,
    seven_member_html: str,
    fandom_html: str,
) -> list[dict]:
    terminal = text_blob(terminal_html).lower()
    debut = text_blob(debut_html).lower()
    seven_member = text_blob(seven_member_html).lower()
    fandom = text_blob(fandom_html).lower()

    if "mystic story" not in terminal and "미스틱스토리" not in terminal:
        return []
    if "2026" not in terminal or ("june 22" not in terminal and "6월 22" not in terminal and "06-22" not in terminal):
        return []
    if "conclude" not in terminal and "종료" not in terminal:
        return []

    for member in EXPECTED_MEMBERS:
        if member.lower() not in terminal:
            return []

    if "arrc" not in debut.lower():
        return []
    if "2024" not in debut or "19" not in debut:
        return []
    if "debut showcase" not in debut and "데뷔 쇼케이스" not in debut:
        return []

    if "andy" not in seven_member and "앤디" not in seven_member:
        return []
    if "7" not in seven_member and "7인" not in seven_member:
        return []

    if "arrcer" not in fandom.lower():
        return []

    return [{
        "displayArtist": "ARrC",
        "aliases": ["아크", "ARRC"],
        "evidence": [
            {"label": "MYSTIC STORY official ARrC terminal activity notice", "url": TERMINAL_URL},
            {"label": "MYSTIC STORY official ARrC debut showcase notice", "url": DEBUT_URL},
            {"label": "MYSTIC STORY official seven-member continuity notice", "url": SEVEN_MEMBER_URL},
            {"label": "MYSTIC STORY official ARrCer fandom notice", "url": FANDOM_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "arrc-official-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "ARrC Official Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "singleGroupIdentityOnly": True,
            "terminalLifecycleEvidenceRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "terminalNoticeOverridesEarlierActiveEvidence": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "formerMemberDoesNotRemainInTerminalRoster": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "effectiveDate": "2026-06-22",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "MYSTIC STORY",
            "terminalMembers": EXPECTED_MEMBERS,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "arrc-official-terminal-lifecycle-catalog":
        raise RuntimeError("ARrC fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ARrC fallback exact provider catalog required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict):
        raise RuntimeError("ARrC fallback terminal lifecycle required")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("ARrC fallback inactive historical semantics required")
    if terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("ARrC fallback exact terminal member roster required")
    snapshot["collectionStatus"] = "verified_official_terminal_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(
            fetch(TERMINAL_URL),
            fetch(DEBUT_URL),
            fetch(SEVEN_MEMBER_URL),
            fetch(FANDOM_URL),
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
        raise RuntimeError(f"ARrC terminal catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
