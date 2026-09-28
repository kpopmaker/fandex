from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "one_the_nine_pocketdol_terminal_project_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1415274wpp/1the9s-agency-responds-to-report-regarding-groups-disbandment-date"
ROSTER_URL = "https://www.soompi.com/article/1302495wpp/under-19-reveals-final-9-members-who-will-make-their-debut"
DEBUT_URL = "https://music.apple.com/us/album/xix/1459859616"
EXPECTED_ARTISTS = ["1THE9"]
EXPECTED_MEMBERS = [
    "JEON DO YUM", "JUNG JIN SUNG", "KIM TAE WOO", "SHIN YE CHAN", "JEONG TAEK HYEON",
    "YOO YONG HA", "PARK SUNG WON", "LEE SEUNG HWAN", "KIM JUN SEO"
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

def parse_live_pages(terminal_html: str, roster_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    roster = text_blob(roster_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "PocketDol Studio"):
        return []
    if not contains_any(terminal, "promotions end on August 8", "promotions will end on August 8"):
        return []
    if not contains_any(terminal, "activities as a group end that day", "group activities end"):
        return []
    if not contains_any(terminal, "return to their respective agencies"):
        return []

    roster_tokens = [
        ("Jeon Doyum", "Jeon Do Yum"),
        ("Jung Jinsung", "Jung Jin Sung"),
        ("Kim Taewoo", "Kim Tae Woo"),
        ("Shin Yechan", "Shin Ye Chan"),
        ("Jeong Taekhyeon", "Jeong Taek Hyeon"),
        ("Yoo Yongha", "Yoo Yong Ha"),
        ("Park Sungwon", "Park Sung Won"),
        ("Lee Seunghwan", "Lee Seung Hwan"),
        ("Kim Junseo", "Kim Jun Seo"),
    ]
    if any(not contains_any(roster, *tokens) for tokens in roster_tokens):
        return []
    if not contains_any(roster, "final 9 members", "final 9", "top 9"):
        return []

    if not contains_any(debut, "XIX"):
        return []
    if not contains_any(debut, "April 13, 2019", "2019-04-13"):
        return []
    if not contains_any(debut, "PocketDol Studio"):
        return []

    return [{
        "displayArtist": "1THE9",
        "aliases": ["원더나인"],
        "evidence": [
            {"label": "PocketDol Studio official project-group activity-end statement", "url": TERMINAL_URL},
            {"label": "MBC Under 19 exact final nine-member lineup", "url": ROSTER_URL},
            {"label": "Apple Music XIX licensed debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "1the9-pocketdol-terminal-project-catalog",
            "type": "provider_catalog",
            "name": "1THE9 PocketDol Terminal Project Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "officialProjectGroupActivityEndRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "projectGroupExpirationRequiresInactiveLifecycle": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "membersReturnToOwnAgenciesDoesNotReactivateGroup": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "groupActivityEndDoesNotInferIndividualCareerEnd": True,
            "legalEntityDissolutionNotAsserted": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2020-07-27",
            "effectiveDate": "2020-08-08",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "PocketDol Studio",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 9,
            "officialPromotionsEnded": True,
            "groupActivitiesEnded": True,
            "membersReturnedToRespectiveAgencies": True,
            "projectGroupCompleted": True,
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2019-04-13",
            "debutRelease": "XIX",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "1the9-pocketdol-terminal-project-catalog":
        raise RuntimeError("1THE9 fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("1THE9 fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("officialProjectGroupActivityEndRequired") is not True:
        raise RuntimeError("1THE9 fallback project-group activity-end contract required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("1THE9 fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 9:
        raise RuntimeError("1THE9 fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("1THE9 fallback terminal state mismatch")
    if terminal.get("officialPromotionsEnded") is not True or terminal.get("groupActivitiesEnded") is not True:
        raise RuntimeError("1THE9 fallback activity-end evidence mismatch")
    if terminal.get("projectGroupCompleted") is not True:
        raise RuntimeError("1THE9 fallback project completion required")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("1THE9 fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2019-04-13":
        raise RuntimeError("1THE9 fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(ROSTER_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"1THE9 terminal project catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
