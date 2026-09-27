from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "luminous_barunson_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.ptkorea.com/368937/"
DEBUT_CATALOG_URL = "https://music.apple.com/us/album/youth-ep/1584270399"
DEBUT_REPORT_URL = "https://www.koreatimes.co.kr/entertainment/k-pop/20210909/k-pop-boy-group-luminous-debuts-with-first-album-youth"
EXPECTED_ARTISTS = ["LUMINOUS"]
EXPECTED_MEMBERS = ["YOUNGBIN", "SUIL", "STEVEN", "WOOBIN"]

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

def parse_live_pages(terminal_html: str, catalog_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    catalog = text_blob(catalog_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "Barunson Double IP", "Barunson"):
        return []
    if not contains_any(
        terminal,
        "terminate the contract and activities",
        "terminate the contract and activities of 'Luminous'",
        "계약 및 활동을 종료",
    ):
        return []

    terminal_member_tokens = [
        ("Youngbin", "영빈"),
        ("Sooil", "Suil", "수일"),
        ("Steven", "스티븐"),
        ("Woobin", "우빈"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal, "Lumini", "루미니"):
        return []

    if not contains_any(catalog, "LUMINOUS"):
        return []
    if not contains_any(catalog, "September 9, 2021", "2021-09-09"):
        return []
    if not contains_any(catalog, "YOUTH"):
        return []
    if not contains_any(catalog, "BarunsonWip Entertainment", "Barunson"):
        return []

    if not contains_any(debut, "Sep 9, 2021", "September 9, 2021", "2021-09-09"):
        return []
    if not contains_any(debut, "YOUTH"):
        return []
    if any(not contains_any(debut, *tokens) for tokens in terminal_member_tokens):
        return []

    return [{
        "displayArtist": "LUMINOUS",
        "aliases": ["루미너스"],
        "evidence": [
            {"label": "Barunson Double IP terminal statement preserved by PTKOREA", "url": TERMINAL_URL},
            {"label": "Apple Music licensed YOUTH debut catalog", "url": DEBUT_CATALOG_URL},
            {"label": "Barunson-sourced LUMINOUS debut report", "url": DEBUT_REPORT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "luminous-barunson-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "LUMINOUS Barunson Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "terminalContractEvidenceRequired": True,
            "explicitGroupActivityTerminationRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "groupActivityTerminationDoesNotInferIndividualCareerEnd": True,
            "laterMemberActivityDoesNotReactivateGroup": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "legalEntityDissolutionNotAsserted": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "effectiveDate": "2025-02-09",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "Barunson Double IP",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 4,
            "contractAndGroupActivitiesEnded": True,
            "debutDate": "2021-09-09",
            "debutRelease": "YOUTH",
            "fandomName": "Lumini",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "luminous-barunson-terminal-lifecycle-catalog":
        raise RuntimeError("LUMINOUS fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("LUMINOUS fallback exact catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupActivityTerminationRequired") is not True:
        raise RuntimeError("LUMINOUS fallback group activity termination contract required")
    lifecycle = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(lifecycle, dict) or lifecycle.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("LUMINOUS fallback exact terminal roster required")
    if lifecycle.get("lifecycleStatus") != "inactive" or lifecycle.get("agencyStatus") != "historical":
        raise RuntimeError("LUMINOUS fallback terminal state mismatch")
    if lifecycle.get("terminalMemberCount") != 4 or lifecycle.get("debutDate") != "2021-09-09":
        raise RuntimeError("LUMINOUS fallback count or debut mismatch")
    if lifecycle.get("contractAndGroupActivitiesEnded") is not True:
        raise RuntimeError("LUMINOUS fallback contract/activity closure required")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(DEBUT_CATALOG_URL), fetch(DEBUT_REPORT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"LUMINOUS terminal lifecycle expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
