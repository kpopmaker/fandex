from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "d1ce_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1563804wpp/d1ce-officially-announces-disbandment"
DEBUT_PROFILE_URL = "https://www.soompi.com/article/1342746wpp/watch-d1ce-makes-the-world-wake-up-with-powerful-debut-mv"
APPLE_URL = "https://music.apple.com/us/song/1475189864"
BUGS_URL = "https://music.bugs.co.kr/album/20268984"
EXPECTED_ARTISTS = ["D1CE"]
EXPECTED_MEMBERS = ["WOO JIN YOUNG", "PARK WOO DAM", "KIM HYUN SOO", "JUNG YOO JUN", "JO YONG GEUN"]

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

def parse_live_pages(terminal_html: str, debut_profile_html: str, apple_html: str, bugs_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    debut_profile = text_blob(debut_profile_html)
    apple = text_blob(apple_html)
    bugs = text_blob(bugs_html)

    terminal_member_tokens = [
        ("Woo Jin Young", "우진영"),
        ("Park Woo Dam", "박우담"),
        ("Kim Hyun Soo", "김현수"),
        ("Jung Yoo Jun", "정유준"),
        ("Jo Yong Geun", "조용근"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal, "expired on January 20, 2023", "expired on january 20"):
        return []
    if not contains_any(terminal, "mutually agreed to end our exclusive contracts", "mutually agreed to end"):
        return []
    if not contains_any(terminal, "D1CE Entertainment"):
        return []

    if any(not contains_any(debut_profile, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(debut_profile, "August 1, 2019", "Aug 1, 2019", "August 1"):
        return []
    if not contains_any(debut_profile, "Wake up : Roll the World", "Wake Up"):
        return []

    if not contains_any(apple, "D1CE"):
        return []
    if not contains_any(apple, "August 1, 2019", "1 August 2019"):
        return []
    if not contains_any(apple, "Wake Up : Roll the World"):
        return []

    if not contains_any(bugs, "D1CE", "디원스"):
        return []
    if not contains_any(bugs, "2019.08.01", "2019-08-01"):
        return []
    if not contains_any(bugs, "D1CE ENTERTAINMENT"):
        return []

    return [{
        "displayArtist": "D1CE",
        "aliases": ["디원스"],
        "evidence": [
            {"label": "D1CE Entertainment terminal five-member contract announcement", "url": TERMINAL_URL},
            {"label": "D1CE five-member debut profile", "url": DEBUT_PROFILE_URL},
            {"label": "Apple Music Wake Up debut catalog", "url": APPLE_URL},
            {"label": "Bugs Wake Up : Roll the World agency catalog", "url": BUGS_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "d1ce-terminal-management-catalog",
            "type": "provider_catalog",
            "name": "D1CE Entertainment Terminal Management Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "allMemberExclusiveContractExpiryRequired": True,
            "agencyAnnouncementClassifiedAsGroupDisbandmentByPreservedSource": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "legalEntityDissolutionNotAsserted": True,
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
            "announcedAt": "2023-01-20",
            "effectiveDate": "2023-01-20",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "D1CE Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 5,
            "allMemberExclusiveContractsExpired": True,
            "groupDisbandmentAnnouncementPreserved": True,
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2019-08-01",
            "debutRelease": "Wake Up : Roll the World",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "d1ce-terminal-management-catalog":
        raise RuntimeError("D1CE fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("D1CE fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("allMemberExclusiveContractExpiryRequired") is not True:
        raise RuntimeError("D1CE fallback all-member contract expiry required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("D1CE fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 5:
        raise RuntimeError("D1CE fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("D1CE fallback terminal state mismatch")
    if terminal.get("allMemberExclusiveContractsExpired") is not True:
        raise RuntimeError("D1CE fallback contract expiry mismatch")
    if terminal.get("groupDisbandmentAnnouncementPreserved") is not True:
        raise RuntimeError("D1CE fallback disbandment announcement required")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("D1CE fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2019-08-01":
        raise RuntimeError("D1CE fallback debut date mismatch")
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
            fetch(DEBUT_PROFILE_URL),
            fetch(APPLE_URL),
            fetch(BUGS_URL),
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
        raise RuntimeError(f"D1CE terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
