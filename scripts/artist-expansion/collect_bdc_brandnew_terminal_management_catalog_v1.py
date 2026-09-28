from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "bdc_brandnew_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1607835wpp/bdc-to-part-ways-with-brandnew-music-after-4-years"
TERMINAL_KO_URL = "https://www.starnewskorea.com/music/2023/08/18/2023081814474222005"
DEBUT_CATALOG_URL = "https://music.apple.com/us/album/boys-da-capo-ep/1485382550"
DEBUT_ROLLOUT_URL = "https://www.soompi.com/article/1359376wpp/brand-new-music-trainees-from-produce-x-101-announce-unit-name-and-details-for-1st-single"
EXPECTED_ARTISTS = ["BDC"]
EXPECTED_MEMBERS = ["KIM SI HUN", "HONG SEONG JUN", "YUN JUNG HWAN"]

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

def parse_live_pages(terminal_html: str, terminal_ko_html: str, catalog_html: str, rollout_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    terminal_ko = text_blob(terminal_ko_html)
    catalog = text_blob(catalog_html)
    rollout = text_blob(rollout_html)

    terminal_member_tokens = [
        ("Kim Si Hun", "김시훈"),
        ("Hong Seong Jun", "홍성준"),
        ("Yun Jung Hwan", "윤정환"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal, "end their exclusive contract", "end of BDC's exclusive contract", "conclude the exclusive contract"):
        return []
    if not contains_any(terminal, "end all official promotions as artists under BRANDNEW MUSIC", "end all official promotions"):
        return []
    if not contains_any(terminal, "August 26", "Aug 26"):
        return []

    if any(not contains_any(terminal_ko, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal_ko, "전속계약을 종료", "전속 계약을 종료"):
        return []
    if not contains_any(terminal_ko, "공식적인 활동을 마무리", "공식 활동을 마무리"):
        return []

    if not contains_any(catalog, "BDC"):
        return []
    if not contains_any(catalog, "Boys Da Capo", "BOYS DA CAPO"):
        return []
    if not contains_any(catalog, "October 29, 2019", "2019-10-29"):
        return []
    if not contains_any(catalog, "BRANDNEW MUSIC", "브랜뉴뮤직"):
        return []

    if any(not contains_any(rollout, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(rollout, "October 29", "Oct 29"):
        return []
    if not contains_any(rollout, "Remember Me"):
        return []

    return [{
        "displayArtist": "BDC",
        "aliases": ["비디씨", "BOYS DA CAPO"],
        "evidence": [
            {"label": "BRANDNEW MUSIC terminal contract/activity statement", "url": TERMINAL_URL},
            {"label": "BRANDNEW MUSIC terminal statement Korean preservation", "url": TERMINAL_KO_URL},
            {"label": "Apple Music BOYS DA CAPO debut catalog", "url": DEBUT_CATALOG_URL},
            {"label": "Brand New Music BDC debut rollout", "url": DEBUT_ROLLOUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "bdc-brandnew-terminal-management-catalog",
            "type": "provider_catalog",
            "name": "BDC BRANDNEW MUSIC Terminal Management Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "exclusiveContractEndEvidenceRequired": True,
            "officialPromotionEndEvidenceRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "managementClosureDoesNotAssertLegalDisbandment": True,
            "postAgencyReactivationRequiresNewExplicitGroupEvidence": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "officialActivityEndDoesNotInferIndividualCareerEnd": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalManagement": {
            "announcedAt": "2023-08-18",
            "effectiveDate": "2023-08-26",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "BRANDNEW MUSIC",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 3,
            "exclusiveContractEnded": True,
            "officialPromotionsUnderAgencyEnded": True,
            "legalDisbandmentAsserted": False,
            "debutDate": "2019-10-29",
            "debutRelease": "BOYS DA CAPO",
            "fandomName": "FINE",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "bdc-brandnew-terminal-management-catalog":
        raise RuntimeError("BDC fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BDC fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("officialPromotionEndEvidenceRequired") is not True:
        raise RuntimeError("BDC fallback official-promotion-end contract required")
    if contract.get("managementClosureDoesNotAssertLegalDisbandment") is not True:
        raise RuntimeError("BDC fallback non-disbandment assertion contract required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("BDC fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 3:
        raise RuntimeError("BDC fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("BDC fallback terminal state mismatch")
    if terminal.get("officialPromotionsUnderAgencyEnded") is not True or terminal.get("exclusiveContractEnded") is not True:
        raise RuntimeError("BDC fallback terminal management evidence mismatch")
    if terminal.get("legalDisbandmentAsserted") is not False:
        raise RuntimeError("BDC fallback legal disbandment must remain unasserted")
    if terminal.get("debutDate") != "2019-10-29":
        raise RuntimeError("BDC fallback debut date mismatch")
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
            fetch(DEBUT_CATALOG_URL),
            fetch(DEBUT_ROLLOUT_URL),
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
        raise RuntimeError(f"BDC terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
