from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "bvndit_mnh_terminal_management_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1553673wpp/bvndit-announces-disbandment-3-years-after-debut"
DEBUT_PROFILE_URL = "https://www.soompi.com/article/1312560wpp/watch-new-girl-group-bvndit-gears-up-for-april-debut-with-colorful-prologue-clip"
DEBUT_CATALOG_URL = "https://music.apple.com/us/album/bvndit-be-ambitious-single/1660686650"
EXPECTED_ARTISTS = ["BVNDIT"]
EXPECTED_MEMBERS = ["YIYEON", "SONGHEE", "JUNGWOO", "SIMYEONG", "SEUNGEUN"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent":"Mozilla/5.0 (compatible; FANDEX validation research)"})
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

    if not contains_any(terminal, "Hello. This is MNH Entertainment", "MNH Entertainment"):
        return []
    if not contains_any(terminal, "terminate BVNDIT's exclusive contract at the end of October", "terminate BVNDIT’s exclusive contract at the end of October"):
        return []
    if not contains_any(terminal, "members have decided to support each other's new beginnings", "members have decided to support each other’s new beginnings"):
        return []

    member_tokens = [
        ("Yiyeon", "이연"),
        ("Songhee", "송희"),
        ("Jungwoo", "정우"),
        ("Simyeong", "시명"),
        ("Seungeun", "승은"),
    ]
    if any(not contains_any(debut_profile, *tokens) for tokens in member_tokens):
        return []
    if not contains_any(debut_profile, "five members", "five-member"):
        return []
    if not contains_any(debut_profile, "April 10", "Apr 10"):
        return []

    if not contains_any(debut_catalog, "BVNDIT, BE AMBITIOUS"):
        return []
    if not contains_any(debut_catalog, "April 10, 2019", "2019-04-10"):
        return []
    if not contains_any(debut_catalog, "MNH Entertainment"):
        return []

    return [{
        "displayArtist":"BVNDIT",
        "aliases":["밴디트"],
        "evidence":[
            {"label":"MNH Entertainment terminal contract statement","url":TERMINAL_URL},
            {"label":"MNH Entertainment five-member debut profile","url":DEBUT_PROFILE_URL},
            {"label":"Apple Music BVNDIT BE AMBITIOUS debut catalog","url":DEBUT_CATALOG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"bvndit-mnh-terminal-management-catalog",
            "type":"provider_catalog",
            "name":"BVNDIT MNH Terminal Management Catalog",
            "observedAt":observed_at,
            "url":TERMINAL_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "preservedOfficialStatementsAllowedForHistoricalEvents":True,
            "exactTerminalMemberRosterRequired":True,
            "groupExclusiveContractEndEvidenceRequired":True,
            "impreciseContractEndDateMustRemainPeriod":True,
            "historicalAgencyRequiresInactiveLifecycle":True,
            "headlineDisbandmentDoesNotCreateLegalConclusion":True,
            "legalDisbandmentNotIndependentlyAsserted":True,
            "individualPostGroupActivityDoesNotReactivateGroup":True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd":True,
            "licensedProviderDebutCatalogAllowed":True,
            "debutDateCrossSourceConsistencyRequired":True,
            "secondaryEditorialInferenceForbidden":True,
            "memberNamesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
        "terminalManagement":{
            "announcedAt":"2022-11-11",
            "contractEndPeriod":"2022-10",
            "lifecycleStatus":"inactive",
            "agencyStatus":"historical",
            "agency":"MNH Entertainment",
            "terminalMembers":EXPECTED_MEMBERS,
            "terminalMemberCount":5,
            "groupExclusiveContractEnded":True,
            "legalDisbandmentAsserted":False,
            "debutDate":"2019-04-10",
            "debutRelease":"BVNDIT, BE AMBITIOUS!",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="bvndit-mnh-terminal-management-catalog":
        raise RuntimeError("BVNDIT fallback source mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("BVNDIT fallback exact candidate catalog required")
    contract=snapshot.get("contract") if isinstance(snapshot,dict) else None
    if not isinstance(contract,dict) or contract.get("groupExclusiveContractEndEvidenceRequired") is not True:
        raise RuntimeError("BVNDIT fallback contract-end evidence required")
    if contract.get("impreciseContractEndDateMustRemainPeriod") is not True:
        raise RuntimeError("BVNDIT fallback period-preservation contract required")
    terminal=snapshot.get("terminalManagement") if isinstance(snapshot,dict) else None
    if not isinstance(terminal,dict) or terminal.get("terminalMembers")!=EXPECTED_MEMBERS:
        raise RuntimeError("BVNDIT fallback exact terminal roster required")
    if terminal.get("terminalMemberCount")!=5:
        raise RuntimeError("BVNDIT fallback member count mismatch")
    if terminal.get("lifecycleStatus")!="inactive" or terminal.get("agencyStatus")!="historical":
        raise RuntimeError("BVNDIT fallback terminal state mismatch")
    if terminal.get("groupExclusiveContractEnded") is not True:
        raise RuntimeError("BVNDIT fallback group contract closure missing")
    if terminal.get("legalDisbandmentAsserted") is not False:
        raise RuntimeError("BVNDIT fallback legal disbandment must remain unasserted")
    if terminal.get("contractEndPeriod")!="2022-10":
        raise RuntimeError("BVNDIT fallback contract end period mismatch")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(TERMINAL_URL),fetch(DEBUT_PROFILE_URL),fetch(DEBUT_CATALOG_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"BVNDIT terminal management catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
