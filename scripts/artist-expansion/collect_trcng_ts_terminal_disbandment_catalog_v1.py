from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "trcng_ts_terminal_disbandment_catalog_adapter_v1"
DISBAND_URL = "https://www.soompi.com/article/1519487wpp/trcng-shares-individual-statements-to-officially-announce-groups-disbandment"
EIGHT_URL = "https://www.soompi.com/article/1366540wpp/trcng-to-promote-as-8-member-group-after-taeseon-and-wooyeop-sue-ts-entertainment"
DEBUT_PROFILE_URL = "https://www.soompi.com/article/1045779wpp/ts-entertainments-new-boy-group"
DEBUT_CATALOG_URL = "https://music.apple.com/us/album/trcng-1st-mini-album-new-generation-ep/1294608588"
EXPECTED_ARTISTS = ["TRCNG"]
EXPECTED_MEMBERS = ["JIHUN", "HAYOUNG", "HAKMIN", "JISUNG", "HYUNWOO", "SIWOO", "HOHYEON", "KANGMIN"]
PRIOR_EXITED = ["TAESEON", "WOOYEOP"]

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

def parse_live_pages(disband_html: str, eight_html: str, debut_profile_html: str, debut_catalog_html: str) -> list[dict]:
    disband = text_blob(disband_html)
    eight = text_blob(eight_html)
    debut_profile = text_blob(debut_profile_html)
    debut_catalog = text_blob(debut_catalog_html)

    terminal_tokens = [
        ("Jihun", "Ji Hun", "지훈"),
        ("Hayoung", "Ha Young", "하영"),
        ("Hakmin", "Hak Min", "학민"),
        ("Jisung", "Ji Sung", "지성"),
        ("Hyunwoo", "Hyun Woo", "현우"),
        ("Siwoo", "Si Woo", "시우"),
        ("Hohyeon", "Ho Hyeon", "호현"),
        ("Kangmin", "Kang Min", "강민"),
    ]
    if any(not contains_any(disband, *tokens) for tokens in terminal_tokens):
        return []
    if not contains_any(disband, "announced their disbandment", "group's disbandment", "group’s disbandment"):
        return []
    if not contains_any(disband, "TRCNG has come to an end", "final greeting as TRCNG"):
        return []
    if not contains_any(disband, "March 16, 2022"):
        return []
    if not contains_any(disband, "February 28, 2022"):
        return []

    if not contains_any(eight, "promote as eight members", "8-member group"):
        return []
    if not contains_any(eight, "without Taeseon and Wooyeop", "excluding Taeseon and Wooyeop"):
        return []
    if not contains_any(eight, "TS Entertainment"):
        return []

    debut_tokens = [
        ("Ji Hun", "지훈"), ("Ha Young", "하영"), ("Tae Seon", "태선"), ("Hak Min", "학민"),
        ("Woo Yeop", "우엽"), ("Ji Sung", "지성"), ("Hyun Woo", "현우"), ("Si Woo", "시우"),
        ("Ho Hyeon", "호현"), ("Kang Min", "강민"),
    ]
    if any(not contains_any(debut_profile, *tokens) for tokens in debut_tokens):
        return []
    if not contains_any(debut_profile, "10-member group", "ten-member group"):
        return []
    if not contains_any(debut_profile, "October 10"):
        return []

    if not contains_any(debut_catalog, "New Generation"):
        return []
    if not contains_any(debut_catalog, "October 10, 2017", "2017-10-10"):
        return []
    if not contains_any(debut_catalog, "TS ENTER", "TS Entertainment"):
        return []

    return [{
        "displayArtist": "TRCNG",
        "aliases": ["티알씨엔지"],
        "evidence": [
            {"label": "TRCNG member disbandment statements", "url": DISBAND_URL},
            {"label": "TS Entertainment eight-member continuation statement", "url": EIGHT_URL},
            {"label": "TS Entertainment ten-member debut profile", "url": DEBUT_PROFILE_URL},
            {"label": "Apple Music New Generation debut catalog", "url": DEBUT_CATALOG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "trcng-ts-terminal-disbandment-catalog",
            "type": "provider_catalog",
            "name": "TRCNG TS Terminal Disbandment Catalog",
            "observedAt": observed_at,
            "url": DISBAND_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "explicitMemberDisbandmentStatementsRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "explicitPriorExitEvidenceRequired": True,
            "priorExitedMembersMustNotRemainInTerminalRoster": True,
            "memberContractEndDatesMayDiffer": True,
            "groupDisbandmentAnnouncementDateDistinctFromContractEndDates": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "explicitGroupDisbandmentMayBeAsserted": True,
            "legalEntityDissolutionNotAsserted": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2022-03-28",
            "effectiveDate": "2022-03-28",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "TS Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 8,
            "priorExitedMembers": [
                {"member": "TAESEON", "effectiveDate": "2019-11-19", "resolution": "explicit_exclusion_from_future_eight_member_promotions"},
                {"member": "WOOYEOP", "effectiveDate": "2019-11-19", "resolution": "explicit_exclusion_from_future_eight_member_promotions"},
            ],
            "contractEndDates": {
                "mostRemainingMembers": "2022-02-28",
                "hayoung": "2022-03-16",
                "note": "member statements report differing TS Entertainment contract end dates",
            },
            "explicitGroupDisbandmentAnnounced": True,
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2017-10-10",
            "debutRelease": "NEW GENERATION",
            "fandomName": "CHAMPION",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "trcng-ts-terminal-disbandment-catalog":
        raise RuntimeError("TRCNG fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("TRCNG fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitMemberDisbandmentStatementsRequired") is not True:
        raise RuntimeError("TRCNG fallback member-disbandment contract required")
    if contract.get("explicitPriorExitEvidenceRequired") is not True:
        raise RuntimeError("TRCNG fallback prior-exit contract required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("TRCNG fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 8:
        raise RuntimeError("TRCNG fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("TRCNG fallback terminal state mismatch")
    if [row.get("member") for row in terminal.get("priorExitedMembers", [])] != PRIOR_EXITED:
        raise RuntimeError("TRCNG fallback prior exited members mismatch")
    if terminal.get("explicitGroupDisbandmentAnnounced") is not True:
        raise RuntimeError("TRCNG fallback explicit group disbandment required")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("TRCNG fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2017-10-10":
        raise RuntimeError("TRCNG fallback debut date mismatch")
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
            fetch(EIGHT_URL),
            fetch(DEBUT_PROFILE_URL),
            fetch(DEBUT_CATALOG_URL),
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
        raise RuntimeError(f"TRCNG terminal disbandment catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
