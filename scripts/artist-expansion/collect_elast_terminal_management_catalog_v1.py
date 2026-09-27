from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "elast_official_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://eent.co.kr/bbs/board.php?bo_table=notice&sca=E%E2%80%99LAST&wr_id=65"
CHOI_IN_URL = "https://eent.co.kr/bbs/board.php?bo_table=notice&wr_id=63"
SEUNGYEOP_URL = "https://eent.co.kr/bbs/board.php?bo_table=notice&wr_id=54"
DEBUT_URL = "https://eent.co.kr/bbs/board.php?bo_table=musician&wr_id=6"
FANDOM_URL = "https://shop.weverse.io/en/shop/KRW/artists/105/sales/54943"
EXPECTED_ARTISTS = ["E'LAST"]
EXPECTED_MEMBERS = ["RANO", "BAEKGYEUL", "ROMIN", "WONHYUK", "WONJUN", "YEJUN"]

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

def parse_live_pages(
    terminal_html: str,
    choi_in_html: str,
    seungyeop_html: str,
    debut_html: str,
    fandom_html: str,
) -> list[dict]:
    terminal = text_blob(terminal_html)
    choi_in = text_blob(choi_in_html)
    seungyeop = text_blob(seungyeop_html)
    debut = text_blob(debut_html)
    fandom = text_blob(fandom_html)

    if not contains_any(terminal, "이엔터테인먼트", "E ENTERTAINMENT"):
        return []
    if not contains_any(terminal, "2026년 8월 31일", "2026-08-31", "August 31, 2026"):
        return []
    if not contains_any(terminal, "전속계약을 종료", "exclusive contract"):
        return []

    terminal_member_tokens = [
        ("라노", "RANO"),
        ("백결", "BAEKGYEUL", "BAEK GYEUL"),
        ("로민", "ROMIN"),
        ("원혁", "WONHYUK", "WON HYUK"),
        ("원준", "WONJUN", "WON JUN"),
        ("예준", "YEJUN", "YE JUN"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []

    if not contains_any(choi_in, "최인", "CHOI IN"):
        return []
    if not contains_any(choi_in, "전속계약이 종료", "contract"):
        return []
    if "2026" not in choi_in:
        return []

    if not contains_any(seungyeop, "승엽", "SEUNGYEOP"):
        return []
    if not contains_any(seungyeop, "팀에서 탈퇴", "left the group"):
        return []
    if not contains_any(seungyeop, "2025년 6월 5일", "2025-06-05", "June 5, 2025"):
        return []

    if not contains_any(debut, "2020년 6월 9일", "June 9, 2020"):
        return []
    if not contains_any(debut, "DAY DREAM"):
        return []

    if not contains_any(fandom, "ELRING MEMBERSHIP", "ELRING"):
        return []

    return [{
        "displayArtist": "E'LAST",
        "aliases": ["엘라스트", "ELAST"],
        "evidence": [
            {"label": "E Entertainment terminal six-member management notice", "url": TERMINAL_URL},
            {"label": "E Entertainment CHOI IN contract-end notice", "url": CHOI_IN_URL},
            {"label": "E Entertainment SEUNGYEOP team-departure notice", "url": SEUNGYEOP_URL},
            {"label": "E Entertainment official member profile with group debut date", "url": DEBUT_URL},
            {"label": "Official E'LAST ELRING Weverse Membership", "url": FANDOM_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "elast-official-terminal-management-catalog",
            "type": "provider_catalog",
            "name": "E'LAST Official Terminal Management Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "terminalManagementEvidenceRequired": True,
            "exactTerminalManagedMemberRosterRequired": True,
            "allRemainingManagementContractsTerminated": True,
            "priorExplicitDeparturesExcludedFromTerminalRoster": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "managementClosureDoesNotAssertLegalDisbandment": True,
            "postContractIndividualOrArchiveActivityDoesNotReactivateGroup": True,
            "officialDebutDateEvidenceRequired": True,
            "fandomEvidenceRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalManagement": {
            "effectiveDate": "2026-08-31",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "E Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "priorExitedMembers": [
                {"member": "SEUNGYEOP", "effectiveDate": "2025-06-05", "resolution": "explicit_team_departure"},
                {"member": "CHOI IN", "effectiveDate": "2026-04-30", "resolution": "exclusive_contract_ended_before_terminal_management_closure"},
            ],
            "terminalMemberCount": 6,
            "debutDate": "2020-06-09",
            "fandomName": "ELRING",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "elast-official-terminal-management-catalog":
        raise RuntimeError("E'LAST fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("E'LAST fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("terminalManagementEvidenceRequired") is not True:
        raise RuntimeError("E'LAST fallback terminal management contract required")
    if contract.get("managementClosureDoesNotAssertLegalDisbandment") is not True:
        raise RuntimeError("E'LAST fallback legal-disbandment non-assertion required")
    lifecycle = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(lifecycle, dict) or lifecycle.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("E'LAST fallback exact terminal managed roster required")
    if lifecycle.get("lifecycleStatus") != "inactive" or lifecycle.get("agencyStatus") != "historical":
        raise RuntimeError("E'LAST fallback terminal management status mismatch")
    if lifecycle.get("terminalMemberCount") != 6:
        raise RuntimeError("E'LAST fallback terminal managed member count mismatch")
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
            fetch(TERMINAL_URL),
            fetch(CHOI_IN_URL),
            fetch(SEUNGYEOP_URL),
            fetch(DEBUT_URL),
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
        raise RuntimeError(f"E'LAST terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
