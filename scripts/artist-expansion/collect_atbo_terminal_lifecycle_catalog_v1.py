from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "atbo_official_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1806092wpp/atbo-announces-disbandment"
DEPARTURE_URL = "https://www.soompi.com/article/1659346wpp/atbo-announces-seok-rakwons-departure-from-group?mobile-app=true&theme=false"
DEBUT_URL = "https://weverse.io/atbo/live/1-101510922"
EXPECTED_ARTISTS = ["ATBO"]
EXPECTED_MEMBERS = ["OH JUNSEOK", "RYU JUNMIN", "BAE HYUNJUN", "JEONG SEUNGHWAN", "KIM YEONKYU", "WON BIN"]

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
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(terminal_html: str, departure_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    departure = text_blob(departure_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "IST Entertainment", "IST엔터테인먼트"):
        return []
    if not contains_any(terminal, "terminate", "termination", "전속계약", "contract"):
        return []
    if not contains_any(terminal, "journey", "여정", "comes to an end", "end"):
        return []

    terminal_member_tokens = [
        ("Oh Junseok", "오준석"),
        ("Ryu Junmin", "류준민"),
        ("Bae Hyunjun", "배현준"),
        ("Jeong Seunghwan", "정승환"),
        ("Kim Yeonkyu", "김연규"),
        ("Won Bin", "원빈"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal, "military", "군 복무"):
        return []

    if not contains_any(departure, "Seok Rakwon", "석락원"):
        return []
    if not contains_any(departure, "departed", "departure", "탈퇴"):
        return []
    if not contains_any(departure, "six members", "six-member", "6인"):
        return []

    if not contains_any(debut, "ATBO DEBUT SHOWCASE", "DEBUT SHOWCASE"):
        return []
    if not contains_any(debut, "Jul 27, 2022", "2022년 7월 27일", "2022 年 7 月 27 日", "2022.07.27"):
        return []
    if not contains_any(debut, "The Beginning", "開花"):
        return []

    return [{
        "displayArtist": "ATBO",
        "aliases": ["에이티비오"],
        "evidence": [
            {"label": "IST terminal ATBO statement preserved by Soompi", "url": TERMINAL_URL},
            {"label": "IST SEOK RAKWON departure statement preserved by Soompi", "url": DEPARTURE_URL},
            {"label": "ATBO official Weverse debut showcase", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "atbo-official-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "ATBO Official Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "terminalManagementEvidenceRequired": True,
            "explicitGroupJourneyEndEvidenceRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "priorExplicitDepartureExcludedFromTerminalRoster": True,
            "militaryServiceDoesNotTerminateMembership": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "managementTerminationAloneDoesNotAssertLegalDisbandment": True,
            "explicitJourneyEndSupportsInactiveLifecycle": True,
            "postTerminationIndividualActivityDoesNotReactivateGroup": True,
            "officialDebutDateEvidenceRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "effectiveDate": "2025-12-17",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "IST Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 6,
            "priorExitedMembers": [
                {"member": "SEOK RAKWON", "effectiveDate": "2024-05-06", "resolution": "explicit_team_departure_after_health_hiatus"},
            ],
            "militaryServiceAtTerminal": ["JEONG SEUNGHWAN"],
            "debutDate": "2022-07-27",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "atbo-official-terminal-lifecycle-catalog":
        raise RuntimeError("ATBO fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("ATBO fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("terminalManagementEvidenceRequired") is not True:
        raise RuntimeError("ATBO fallback terminal management contract required")
    if contract.get("militaryServiceDoesNotTerminateMembership") is not True:
        raise RuntimeError("ATBO fallback military membership continuity contract required")
    lifecycle = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(lifecycle, dict) or lifecycle.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("ATBO fallback exact terminal roster required")
    if lifecycle.get("lifecycleStatus") != "inactive" or lifecycle.get("agencyStatus") != "historical":
        raise RuntimeError("ATBO fallback terminal status mismatch")
    if lifecycle.get("terminalMemberCount") != 6 or lifecycle.get("debutDate") != "2022-07-27":
        raise RuntimeError("ATBO fallback terminal count or debut mismatch")
    if lifecycle.get("priorExitedMembers") != [{"member": "SEOK RAKWON", "effectiveDate": "2024-05-06", "resolution": "explicit_team_departure_after_health_hiatus"}]:
        raise RuntimeError("ATBO fallback prior departure mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(DEPARTURE_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"ATBO terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
