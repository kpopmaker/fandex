from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "hotissue_s2_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1523252wpp/girl-group-hot-issue-disbands-before-1-year-anniversary"
TERMINAL_KO_URL = "https://enews.imbc.com/News/ViewAmp/345057"
DEBUT_URL = "https://www.yna.co.kr/view/AKR20210428139500005"
CATALOG_URL = "https://music.bugs.co.kr/album/4042514"
EXPECTED_ARTISTS = ["HOT ISSUE"]
EXPECTED_MEMBERS = ["NAHYUN", "MAYNA", "HYEONGSHIN", "DANA", "YEWON", "YEBIN", "DAIN"]

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

def parse_live_pages(terminal_html: str, terminal_ko_html: str, debut_html: str, catalog_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    terminal_ko = text_blob(terminal_ko_html)
    debut = text_blob(debut_html)
    catalog = text_blob(catalog_html)

    if not contains_any(terminal, "S2 Entertainment"):
        return []
    if not contains_any(terminal, "decided to disband the team"):
        return []
    if not contains_any(terminal, "April 22", "Apr 22"):
        return []

    if not contains_any(terminal_ko, "S2엔터테인먼트"):
        return []
    if not contains_any(terminal_ko, "팀을 해체하기로 결정"):
        return []

    debut_member_tokens = [
        ("나현", "Nahyun"),
        ("메이나", "Mayna"),
        ("형신", "Hyeongshin"),
        ("다나", "Dana"),
        ("예원", "Yewon"),
        ("예빈", "Yebin"),
        ("다인", "Dain"),
    ]
    if any(not contains_any(debut, *tokens) for tokens in debut_member_tokens):
        return []
    if not contains_any(debut, "7명의 멤버", "7명", "seven members"):
        return []
    if not contains_any(debut, "2021년04월28일", "2021-04-28", "4월 28일"):
        return []

    if not contains_any(catalog, "HOT ISSUE", "핫이슈"):
        return []
    if not contains_any(catalog, "ISSUE MAKER"):
        return []
    if not contains_any(catalog, "2021.04.28", "April 28, 2021", "2021-04-28"):
        return []
    if not contains_any(catalog, "S2 Entertainment"):
        return []

    return [{
        "displayArtist": "HOT ISSUE",
        "aliases": ["핫이슈"],
        "evidence": [
            {"label": "S2 explicit group-disbandment statement", "url": TERMINAL_URL},
            {"label": "S2 Korean disbandment statement preservation", "url": TERMINAL_KO_URL},
            {"label": "Yonhap seven-member debut identity", "url": DEBUT_URL},
            {"label": "Bugs ISSUE MAKER provider catalog", "url": CATALOG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "hotissue-s2-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "HOT ISSUE S2 Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "explicitGroupDisbandmentEvidenceRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "explicitGroupDisbandmentCanCloseGroupLifecycle": True,
            "groupDisbandmentDoesNotInferIndividualContractEnd": True,
            "groupDisbandmentDoesNotInferIndividualCareerEnd": True,
            "laterIndividualActivityDoesNotReactivateGroup": True,
            "licensedOrDomesticProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2022-04-22",
            "effectiveDate": "2022-04-22",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "S2 Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 7,
            "groupDisbandmentExplicit": True,
            "individualContractsEndedNotInferred": True,
            "individualCareersEndedNotInferred": True,
            "debutDate": "2021-04-28",
            "debutRelease": "ISSUE MAKER",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "hotissue-s2-terminal-lifecycle-catalog":
        raise RuntimeError("HOT ISSUE fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("HOT ISSUE fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupDisbandmentEvidenceRequired") is not True:
        raise RuntimeError("HOT ISSUE fallback explicit disbandment contract required")
    if contract.get("groupDisbandmentDoesNotInferIndividualContractEnd") is not True:
        raise RuntimeError("HOT ISSUE fallback individual-contract safeguard required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("HOT ISSUE fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 7:
        raise RuntimeError("HOT ISSUE fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("HOT ISSUE fallback terminal state mismatch")
    if terminal.get("groupDisbandmentExplicit") is not True:
        raise RuntimeError("HOT ISSUE fallback explicit disbandment required")
    if terminal.get("debutDate") != "2021-04-28":
        raise RuntimeError("HOT ISSUE fallback debut date mismatch")
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
            fetch(TERMINAL_KO_URL),
            fetch(DEBUT_URL),
            fetch(CATALOG_URL),
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
        raise RuntimeError(f"HOT ISSUE terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
