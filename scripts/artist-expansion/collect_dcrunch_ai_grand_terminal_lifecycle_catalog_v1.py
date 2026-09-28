from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "dcrunch_ai_grand_terminal_lifecycle_catalog_adapter_v1"
DISBAND_URL = "https://www.soompi.com/article/1553405wpp/d-crunch-announces-disbandment"
DYLAN_URL = "https://www.soompi.com/article/1550794wpp/d-crunch-announces-dylans-departure-from-the-group"
MINHYUK_URL = "https://www.soompi.com/article/1497929wpp/d-crunchs-minhyuk-leaves-the-group-dylan-temporarily-halts-activities"
HYUNWOO_URL = "https://www.soompi.com/article/1445723wpp/d-crunch-announces-hyunwoos-departure-from-group"
DEBUT_URL = "https://www.soompi.com/article/1210859wpp/watch-d-crunch-makes-powerful-debut-palace-mv"
PROVIDER_URL = "https://music.apple.com/us/artist/d-crunch/1423014634"
EXPECTED_ARTISTS = ["D-CRUNCH"]
EXPECTED_MEMBERS = ["HYUNWOOK", "HYUNHO", "HYUNOH", "O.V", "CHANYOUNG", "JUNGSEUNG"]

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
    disband_html: str,
    dylan_html: str,
    minhyuk_html: str,
    hyunwoo_html: str,
    debut_html: str,
    provider_html: str,
) -> list[dict]:
    disband = text_blob(disband_html)
    dylan = text_blob(dylan_html)
    minhyuk = text_blob(minhyuk_html)
    hyunwoo = text_blob(hyunwoo_html)
    debut = text_blob(debut_html)
    provider = text_blob(provider_html)

    if not contains_any(disband, "AI Grand Korea", "Ai Grand Korea"):
        return []
    if not contains_any(disband, "decided to disband the group", "decided to disband"):
        return []
    if not contains_any(disband, "official fan cafe", "official social media"):
        return []

    if not contains_any(dylan, "Dylan will be leaving D-CRUNCH", "Dylan will be leaving the group"):
        return []
    if not contains_any(dylan, "continue promotions as six members", "continue as six members"):
        return []

    if not contains_any(minhyuk, "Minhyuk will be leaving the group D-CRUNCH", "Minhyuk will be leaving the group"):
        return []
    if not contains_any(hyunwoo, "Hyunwoo has officially left the group", "Hyunwoo expressed his desire to leave the group"):
        return []

    debut_members = [
        ("Hyunwook",), ("Hyunho",), ("Hyunwoo",), ("Hyunoh",),
        ("O.V",), ("Minhyuk",), ("Chanyoung",), ("Dylan",), ("Jungseung",),
    ]
    if any(not contains_any(debut, *tokens) for tokens in debut_members):
        return []
    if not contains_any(debut, "August 6, 2018", "Aug 06, 2018", "Aug 6, 2018"):
        return []
    if not contains_any(debut, "0806"):
        return []

    if not contains_any(provider, "D-CRUNCH"):
        return []
    if not contains_any(provider, "August 6, 2018", "2018-08-06"):
        return []
    if not contains_any(provider, "K-Pop"):
        return []

    return [{
        "displayArtist": "D-CRUNCH",
        "aliases": ["디크런치", "DCRUNCH", "DIAMOND-CRUNCH"],
        "evidence": [
            {"label": "AI Grand Korea explicit D-CRUNCH disbandment statement", "url": DISBAND_URL},
            {"label": "AI Grand Korea DYLAN departure and six-member continuation statement", "url": DYLAN_URL},
            {"label": "AI Grand Korea MINHYUK departure statement", "url": MINHYUK_URL},
            {"label": "AI Grand Korea HYUNWOO departure statement", "url": HYUNWOO_URL},
            {"label": "D-CRUNCH original nine-member debut report", "url": DEBUT_URL},
            {"label": "Apple Music D-CRUNCH provider profile", "url": PROVIDER_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "dcrunch-ai-grand-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "D-CRUNCH AI Grand Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": DISBAND_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "explicitGroupDisbandmentRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "priorDepartureChainRequired": True,
            "explicitDepartureRequiredForMemberRemoval": True,
            "temporaryHiatusDoesNotEqualDeparture": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "individualContractsEndedNotInferred": True,
            "individualCareersEndedNotInferred": True,
            "legalEntityDissolutionNotAsserted": True,
            "providerDebutDateCrossCheckRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2022-11-09",
            "effectiveDate": "2022-11-09",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "AI Grand Korea",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 6,
            "groupDisbandmentExplicit": True,
            "legalEntityDissolutionAsserted": False,
            "individualContractsEndedNotInferred": True,
            "individualCareersEndedNotInferred": True,
            "priorExitedMembers": [
                {"member": "HYUNWOO", "effectiveDate": "2020-12-28", "resolution": "explicit_team_departure_and_contract_termination"},
                {"member": "MINHYUK", "effectiveDate": "2021-11-09", "resolution": "explicit_team_departure"},
                {"member": "DYLAN", "effectiveDate": "2022-10-21", "resolution": "explicit_team_departure_after_prior_temporary_hiatus"},
            ],
            "debutDate": "2018-08-06",
            "debutRelease": "0806",
            "fandomName": "DIANA",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "dcrunch-ai-grand-terminal-lifecycle-catalog":
        raise RuntimeError("D-CRUNCH fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("D-CRUNCH fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupDisbandmentRequired") is not True:
        raise RuntimeError("D-CRUNCH fallback explicit disbandment contract required")
    if contract.get("priorDepartureChainRequired") is not True:
        raise RuntimeError("D-CRUNCH fallback prior departure chain required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("D-CRUNCH fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 6:
        raise RuntimeError("D-CRUNCH fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("D-CRUNCH fallback terminal state mismatch")
    if terminal.get("groupDisbandmentExplicit") is not True:
        raise RuntimeError("D-CRUNCH fallback explicit disbandment evidence mismatch")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("D-CRUNCH fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2018-08-06":
        raise RuntimeError("D-CRUNCH fallback debut date mismatch")
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
            fetch(DISBAND_URL),
            fetch(DYLAN_URL),
            fetch(MINHYUK_URL),
            fetch(HYUNWOO_URL),
            fetch(DEBUT_URL),
            fetch(PROVIDER_URL),
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
        raise RuntimeError(f"D-CRUNCH terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
