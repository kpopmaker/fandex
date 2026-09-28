from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "bugaboo_ateam_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1557636wpp/bugaboo-announces-disbandment"
DEBUT_PROFILE_URL = "https://www.soompi.com/article/1486572wpp/watch-producer-ryan-jhuns-new-girl-group-bugaboo-reveals-1st-glimpse-of-members"
DEBUT_CATALOG_URL = "https://music.apple.com/us/album/bugaboo-single/1590957051"
EXPECTED_ARTISTS = ["bugAboo"]
EXPECTED_MEMBERS = ["CHOYEON", "YOONA", "RAINIE", "ZIN", "EUNCHAE", "CYAN"]

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

def parse_live_pages(terminal_html: str, debut_profile_html: str, debut_catalog_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    debut_profile = text_blob(debut_profile_html)
    debut_catalog = text_blob(debut_catalog_html)

    if not contains_any(terminal, "ATEAM Entertainment", "A TEAM ENTERTAINMENT"):
        return []
    if not contains_any(terminal, "halting group activities from today"):
        return []
    if not contains_any(terminal, "terminate all the members' contracts", "terminate all the members’ contracts"):
        return []

    member_tokens = [
        ("Choyeon", "초연"),
        ("Yoona", "유우나", "유나"),
        ("Rainie", "레이니"),
        ("Zin", "진"),
        ("Eunchae", "은채"),
        ("Cyan", "시안"),
    ]
    if any(not contains_any(debut_profile, *tokens) for tokens in member_tokens):
        return []
    if not contains_any(debut_profile, "six-member", "six members"):
        return []
    if not contains_any(debut_profile, "October 25", "Oct 25"):
        return []

    if not contains_any(debut_catalog, "bugAboo"):
        return []
    if not contains_any(debut_catalog, "October 25, 2021", "2021-10-25"):
        return []
    if not contains_any(debut_catalog, "A TEAM ENTERTAINMENT", "에이팀엔터테인먼트"):
        return []

    return [{
        "displayArtist": "bugAboo",
        "aliases": ["버가부", "BUGABOO"],
        "evidence": [
            {"label": "ATEAM terminal group-activity and all-member contract statement", "url": TERMINAL_URL},
            {"label": "bugAboo six-member debut profile", "url": DEBUT_PROFILE_URL},
            {"label": "Apple Music bugAboo debut single catalog", "url": DEBUT_CATALOG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "bugaboo-ateam-terminal-management-catalog",
            "type": "provider_catalog",
            "name": "bugAboo ATEAM Terminal Management Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "groupActivityHaltEvidenceRequired": True,
            "allMemberExclusiveContractTerminationRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "headlineDisbandmentDoesNotCreateLegalConclusion": True,
            "legalDisbandmentNotIndependentlyAsserted": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalManagement": {
            "announcedAt": "2022-12-08",
            "effectiveDate": "2022-12-08",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "ATEAM Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 6,
            "groupActivitiesHalted": True,
            "allMemberExclusiveContractsTerminated": True,
            "legalDisbandmentAsserted": False,
            "debutDate": "2021-10-25",
            "debutRelease": "bugAboo",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "bugaboo-ateam-terminal-management-catalog":
        raise RuntimeError("bugAboo fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("bugAboo fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("allMemberExclusiveContractTerminationRequired") is not True:
        raise RuntimeError("bugAboo fallback all-member contract termination required")
    if contract.get("legalDisbandmentNotIndependentlyAsserted") is not True:
        raise RuntimeError("bugAboo fallback legal-disbandment safeguard required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("bugAboo fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 6:
        raise RuntimeError("bugAboo fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("bugAboo fallback terminal state mismatch")
    if terminal.get("groupActivitiesHalted") is not True or terminal.get("allMemberExclusiveContractsTerminated") is not True:
        raise RuntimeError("bugAboo fallback terminal evidence mismatch")
    if terminal.get("legalDisbandmentAsserted") is not False:
        raise RuntimeError("bugAboo fallback legal disbandment must remain unasserted")
    if terminal.get("debutDate") != "2021-10-25":
        raise RuntimeError("bugAboo fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(DEBUT_PROFILE_URL), fetch(DEBUT_CATALOG_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"bugAboo terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
