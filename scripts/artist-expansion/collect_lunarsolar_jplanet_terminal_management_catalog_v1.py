from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "lunarsolar_jplanet_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1527427wpp/lunarsolar-disbands-after-less-than-2-years"
DEBUT_URL = "https://music.apple.com/us/album/solar-flare-single/1529221633"
EXPECTED_ARTISTS = ["LUNARSOLAR"]
EXPECTED_MEMBERS = ["ESEO", "TAERYEONG", "JIAN", "YUURI"]

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

def parse_live_pages(terminal_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "J Planet Entertainment"):
        return []
    if not contains_any(terminal, "terminate the exclusive artist contract"):
        return []

    member_tokens = [
        ("Eseo", "이서"),
        ("Taeryeong", "태령"),
        ("Jian", "지안"),
        ("Yuuri", "유우리"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in member_tokens):
        return []
    if not contains_any(terminal, "supporting each other for their new beginning", "new beginning"):
        return []

    if not contains_any(debut, "LUNARSOLAR"):
        return []
    if not contains_any(debut, "SOLAR : flare"):
        return []
    if not contains_any(debut, "September 2, 2020", "2020-09-02"):
        return []
    if not contains_any(debut, "제이플래닛 엔터테인먼트", "J Planet Entertainment"):
        return []

    return [{
        "displayArtist": "LUNARSOLAR",
        "aliases": ["루나솔라"],
        "evidence": [
            {"label": "J Planet Entertainment terminal contract statement", "url": TERMINAL_URL},
            {"label": "Apple Music SOLAR : flare licensed debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "lunarsolar-jplanet-terminal-management-catalog",
            "type": "provider_catalog",
            "name": "LUNARSOLAR J Planet Terminal Management Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "exclusiveContractTerminationRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "articleHeadlineDoesNotOverrideQuotedAgencyStatement": True,
            "legalDisbandmentNotIndependentlyAsserted": True,
            "postAgencyReactivationRequiresNewExplicitGroupEvidence": True,
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
            "announcedAt": "2022-05-22",
            "effectiveDate": "2022-05-22",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "J Planet Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 4,
            "exclusiveArtistContractTerminated": True,
            "legalDisbandmentAsserted": False,
            "debutDate": "2020-09-02",
            "debutRelease": "SOLAR : flare",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "lunarsolar-jplanet-terminal-management-catalog":
        raise RuntimeError("LUNARSOLAR fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("LUNARSOLAR fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("exclusiveContractTerminationRequired") is not True:
        raise RuntimeError("LUNARSOLAR fallback contract termination required")
    if contract.get("legalDisbandmentNotIndependentlyAsserted") is not True:
        raise RuntimeError("LUNARSOLAR fallback legal-disbandment safeguard required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("LUNARSOLAR fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 4:
        raise RuntimeError("LUNARSOLAR fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("LUNARSOLAR fallback terminal state mismatch")
    if terminal.get("exclusiveArtistContractTerminated") is not True:
        raise RuntimeError("LUNARSOLAR fallback contract termination evidence mismatch")
    if terminal.get("legalDisbandmentAsserted") is not False:
        raise RuntimeError("LUNARSOLAR fallback legal disbandment must remain unasserted")
    if terminal.get("debutDate") != "2020-09-02":
        raise RuntimeError("LUNARSOLAR fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"LUNARSOLAR terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
