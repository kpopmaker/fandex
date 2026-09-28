from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "x1_swing_terminal_disbandment_catalog_adapter_v1"
DISBAND_URL = "https://www.soompi.com/article/1375470wpp/breaking-x1-members-agencies-announce-groups-disbandment"
ROSTER_URL = "https://www.soompi.com/article/1375971wpp/dispatch-reports-details-of-how-x1-members-agencies-came-to-decision-to-disband"
FANCAFE_URL = "https://www.soompi.com/article/1375586wpp/x1-"
SWING_URL = "https://www.soompi.com/article/1376147wpp/x1s-agency-to-provide-full-refunds-for-fan-club-membership"
DEBUT_URL = "https://music.apple.com/us/album/quantum-leap-ep/1579995230"
EXPECTED_ARTISTS = ["X1"]
EXPECTED_MEMBERS = [
    "HAN SEUNG WOO", "CHO SEUNG YOUN", "KIM WOO SEOK", "KIM YO HAN", "LEE HAN GYUL",
    "CHA JUN HO", "SON DONG PYO", "KANG MIN HEE", "LEE EUN SANG", "SONG HYEONG JUN", "NAM DO HYON"
]

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

def parse_live_pages(disband_html: str, roster_html: str, fancafe_html: str, swing_html: str, debut_html: str) -> list[dict]:
    disband = text_blob(disband_html)
    roster = text_blob(roster_html)
    fancafe = text_blob(fancafe_html)
    swing = text_blob(swing_html)
    debut = text_blob(debut_html)

    joint_agencies = [
        "Play M Entertainment", "Yuehua Entertainment", "TOP Media", "OUI Entertainment",
        "MBK Entertainment", "Woollim Entertainment", "DSP Media", "Starship Entertainment",
        "Brand New Music"
    ]
    if any(not contains_any(disband, agency) for agency in joint_agencies):
        return []
    if not contains_any(disband, "decided on their disbandment", "decided on X1's disbandment"):
        return []

    roster_tokens = [
        ("Han Seung Woo",), ("Cho Seung Youn", "WOODZ"), ("Kim Woo Seok",), ("Kim Yo Han",),
        ("Lee Han Gyul", "Hangyul"), ("Cha Jun Ho",), ("Son Dong Pyo",), ("Kang Min Hee",),
        ("Lee Eun Sang",), ("Song Hyeong Jun",), ("Nam Do Hyon", "Nam Dohyon")
    ]
    if any(not contains_any(roster, *tokens) for tokens in roster_tokens):
        return []
    if not contains_any(roster, "management agency Swing Entertainment", "X1’s management agency Swing Entertainment", "X1's management agency Swing Entertainment"):
        return []

    if not contains_any(fancafe, "official activities have concluded"):
        return []
    if not contains_any(fancafe, "11 members", "11 youths"):
        return []

    if not contains_any(swing, "Swing Entertainment"):
        return []
    if not contains_any(swing, "activities have officially concluded"):
        return []

    if not contains_any(debut, "QUANTUM LEAP"):
        return []
    if not contains_any(debut, "August 27, 2019", "2019-08-27"):
        return []
    if not contains_any(debut, "SWING Entertainment"):
        return []

    return [{
        "displayArtist": "X1",
        "aliases": ["엑스원"],
        "evidence": [
            {"label": "Joint member-agency explicit disbandment statement", "url": DISBAND_URL},
            {"label": "Exact eleven-member agency mapping and Swing management", "url": ROSTER_URL},
            {"label": "Official fan cafe activity-conclusion notice", "url": FANCAFE_URL},
            {"label": "Swing Entertainment official activity-conclusion notice", "url": SWING_URL},
            {"label": "Apple Music QUANTUM LEAP debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "x1-swing-terminal-disbandment-catalog",
            "type": "provider_catalog",
            "name": "X1 Swing Terminal Disbandment Catalog",
            "observedAt": observed_at,
            "url": DISBAND_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "explicitJointAgencyDisbandmentDecisionRequired": True,
            "explicitOfficialActivityConclusionRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "managementAgencyMustRemainDistinctFromMemberAgencies": True,
            "legalDisbandmentAssertionRequiresExplicitJointStatement": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "postDisbandmentIndividualActivityDoesNotReactivateGroup": True,
            "memberAgencyActivityDoesNotReactivateGroup": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2020-01-06",
            "effectiveDate": "2020-01-06",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "Swing Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 11,
            "explicitDisbandmentDecision": True,
            "officialActivitiesConcluded": True,
            "legalDisbandmentAsserted": True,
            "debutDate": "2019-08-27",
            "debutRelease": "QUANTUM LEAP",
            "fandomName": "ONE IT",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "x1-swing-terminal-disbandment-catalog":
        raise RuntimeError("X1 fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("X1 fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitJointAgencyDisbandmentDecisionRequired") is not True:
        raise RuntimeError("X1 fallback explicit joint disbandment contract required")
    if contract.get("legalDisbandmentAssertionRequiresExplicitJointStatement") is not True:
        raise RuntimeError("X1 fallback legal disbandment contract required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("X1 fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 11:
        raise RuntimeError("X1 fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("X1 fallback terminal state mismatch")
    if terminal.get("explicitDisbandmentDecision") is not True or terminal.get("officialActivitiesConcluded") is not True:
        raise RuntimeError("X1 fallback terminal disbandment evidence mismatch")
    if terminal.get("legalDisbandmentAsserted") is not True:
        raise RuntimeError("X1 fallback explicit legal disbandment assertion required")
    if terminal.get("debutDate") != "2019-08-27":
        raise RuntimeError("X1 fallback debut date mismatch")
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
            fetch(ROSTER_URL),
            fetch(FANCAFE_URL),
            fetch(SWING_URL),
            fetch(DEBUT_URL),
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
        raise RuntimeError(f"X1 terminal disbandment catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
