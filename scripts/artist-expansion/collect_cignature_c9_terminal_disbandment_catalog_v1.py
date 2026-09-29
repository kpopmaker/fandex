from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "cignature_c9_terminal_disbandment_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1707943wpp/cignature-announces-disbandment"
TERMINAL_KO_URL = "https://enews.imbc.com/M/Detail/439618"
PROFILE_URL = "https://www.koreajoongangdaily.com/entertainment/girl-group-cignature-to-release-fifth-ep-sweetie-but-saltie-in-june/11759375"
DEBUT_URL = "https://music.apple.com/us/album/nun-nu-nan-na-single/1670526978"
EXPECTED_ARTISTS = ["cignature"]
EXPECTED_MEMBERS = ["CHAESOL", "JEEWON", "SELINE", "CHLOE", "BELLE", "SEMI", "DOHEE"]

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

def parse_live_pages(terminal_html: str, terminal_ko_html: str, profile_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    terminal_ko = text_blob(terminal_ko_html)
    profile = text_blob(profile_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "C9 Entertainment"):
        return []
    if not contains_any(terminal, "disbandment of the group was necessary", "disbandment of the group"):
        return []
    if not contains_any(terminal, "all seven cignature members", "all seven members"):
        return []
    if not contains_any(terminal, "terminated the exclusive contracts", "terminate the exclusive contracts"):
        return []
    if not contains_any(terminal, "November 30, 2024"):
        return []

    if not contains_any(terminal_ko, "C9엔터테인먼트"):
        return []
    if not contains_any(terminal_ko, "팀의 해체가 필요", "팀 해체"):
        return []
    if not contains_any(terminal_ko, "멤버 7인 전원의 전속계약", "7인 전원의 전속계약"):
        return []
    if not contains_any(terminal_ko, "2024년 11월 30일", "지난달 30일"):
        return []

    member_tokens = [
        ("Chaesol", "채솔"),
        ("Jeewon", "지원"),
        ("Seline", "셀린"),
        ("Chloe", "클로이"),
        ("Belle", "벨"),
        ("Semi", "세미"),
        ("Dohee", "도희"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in member_tokens):
        return []
    if not contains_any(profile, "seven-member girl group", "seven-member group"):
        return []
    if not contains_any(profile, "performing as a group of six", "promote as six", "group of six"):
        return []
    if not contains_any(profile, "UNIS", "Unis"):
        return []

    if not contains_any(debut, "Nun Nu Nan Na"):
        return []
    if not contains_any(debut, "February 4, 2020", "2020-02-04"):
        return []
    if not contains_any(debut, "J9 Entertainment"):
        return []

    return [{
        "displayArtist": "cignature",
        "aliases": ["시그니처", "CIGNATURE"],
        "evidence": [
            {"label": "C9 explicit disbandment and all-seven contract termination statement", "url": TERMINAL_URL},
            {"label": "C9 terminal statement Korean preservation", "url": TERMINAL_KO_URL},
            {"label": "C9-supplied seven-member profile and Belle temporary project absence", "url": PROFILE_URL},
            {"label": "Apple Music Nun Nu Nan Na licensed debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "cignature-c9-terminal-disbandment-catalog",
            "type": "provider_catalog",
            "name": "cignature C9 Terminal Disbandment Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "explicitAgencyDisbandmentRequired": True,
            "allSevenExclusiveContractsTerminatedRequired": True,
            "groupActivityEndDateRequired": True,
            "temporaryProjectAbsenceDoesNotTerminateMembership": True,
            "sixMemberPromotionSubsetDoesNotChangeCanonicalRoster": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "groupDisbandmentConfirmed": True,
            "legalEntityDissolutionNotAsserted": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalManagement": {
            "announcedAt": "2024-12-03",
            "effectiveDate": "2024-11-30",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "C9 Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 7,
            "allSevenExclusiveContractsTerminated": True,
            "groupActivitiesEnded": True,
            "groupDisbandmentConfirmed": True,
            "belleTemporaryProjectAbsencePreserved": True,
            "promotionSubsetBeforeTermination": {
                "activePromotionMemberCount": 6,
                "absentMember": "BELLE",
                "reason": "temporary_UNIS_project_participation_not_departure",
            },
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2020-02-04",
            "debutRelease": "Nun Nu Nan Na",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "cignature-c9-terminal-disbandment-catalog":
        raise RuntimeError("cignature fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("cignature fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitAgencyDisbandmentRequired") is not True:
        raise RuntimeError("cignature fallback explicit disbandment required")
    if contract.get("temporaryProjectAbsenceDoesNotTerminateMembership") is not True:
        raise RuntimeError("cignature fallback temporary project absence safeguard required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("cignature fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 7:
        raise RuntimeError("cignature fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("cignature fallback terminal state mismatch")
    if terminal.get("allSevenExclusiveContractsTerminated") is not True or terminal.get("groupDisbandmentConfirmed") is not True:
        raise RuntimeError("cignature fallback terminal disbandment evidence mismatch")
    if terminal.get("belleTemporaryProjectAbsencePreserved") is not True:
        raise RuntimeError("cignature fallback Belle membership continuity required")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("cignature fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2020-02-04":
        raise RuntimeError("cignature fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(TERMINAL_KO_URL), fetch(PROFILE_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"cignature terminal disbandment catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
