from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup

VERSION = "to1_wakeone_terminal_rename_catalog_adapter_v1"
TERMINAL_URL = "https://www.starnewskorea.com/star/2023/12/17/2023121710263313337"
TERMINAL_EN_URL = "https://www.soompi.com/article/1632072wpp/all-to1-members-to-part-ways-with-agency-wakeone"
RENAME_URL = "https://www.soompi.com/article/1461508wpp/too-changes-their-group-name-to-to1"
CHIHOON_URL = "https://www.soompi.com/article/1524342wpp/to1s-chi-hoon-leaves-group-terminates-contract-with-his-agency"
REORG_URL = "https://www.soompi.com/article/1531421wpp/to1s-agency-announces-group-will-make-comeback-with-3-new-members-min-su-jerome-and-woong-gi-depart-group"
RENTA_URL = "https://www.soompi.com/article/1615625wpp/to1s-renta-announces-departure-from-group-with-handwritten-letter-to-fans"
DEBUT_URL = "https://music.apple.com/us/album/reason-for-being-benevolence-ep/1605126003"
EXPECTED_ARTISTS = ["TO1"]
EXPECTED_MEMBERS = ["DONGGEON", "CHAN", "JISU", "JAEYUN", "J.YOU", "KYUNGHO", "DAIGO", "YEOJEONG"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"})
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def contains_any(text: str, *tokens: str) -> bool:
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(terminal_html: str, terminal_en_html: str, rename_html: str, chihoon_html: str, reorg_html: str, renta_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    terminal_en = text_blob(terminal_en_html)
    rename = text_blob(rename_html)
    chihoon = text_blob(chihoon_html)
    reorg = text_blob(reorg_html)
    renta = text_blob(renta_html)
    debut = text_blob(debut_html)

    terminal_member_tokens = [
        ("동건", "Donggeon"), ("찬", "Chan"), ("지수", "Jisu"), ("재윤", "Jaeyun"),
        ("제이유", "J.You"), ("경호", "Kyungho"), ("다이고", "Daigo"), ("여정", "Yeojeong"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens): return []
    if not contains_any(terminal, "2023년 12월 31일", "December 31, 2023"): return []
    if not contains_any(terminal, "전속 계약을 종료", "전속계약을 종료"): return []
    if not contains_any(terminal, "TO1이 아닌 새로운 길"): return []

    if any(not contains_any(terminal_en, *tokens) for tokens in terminal_member_tokens): return []
    if not contains_any(terminal_en, "December 31", "Dec. 31"): return []
    if not contains_any(terminal_en, "terminate our exclusive contract", "terminate their exclusive contracts"): return []

    if not contains_any(rename, "name change to TO1", "group name to TO1"): return []
    if not contains_any(rename, "TOO"): return []
    if not contains_any(rename, "March 28", "Mar 28"): return []

    if not contains_any(chihoon, "Chi Hoon", "치훈"): return []
    if not contains_any(chihoon, "left the team", "left both the group", "leaving the group"): return []

    for tokens in [("Min Su","민수"),("Jerome","제롬"),("Woong Gi","웅기"),("Daigo","다이고"),("Renta","렌타"),("Yeo Jeong","여정")]:
        if not contains_any(reorg, *tokens): return []
    if not contains_any(reorg, "leave TO1", "left the group"): return []

    if not contains_any(renta, "Renta", "렌타"): return []
    if not contains_any(renta, "end my activities as TO1", "leaving the group"): return []

    if not contains_any(debut, "REASON FOR BEING : Benevolence", "REASON FOR BEING"): return []
    if not contains_any(debut, "TOO"): return []
    if not contains_any(debut, "April 1, 2020", "2020-04-01"): return []
    if not contains_any(debut, "Stone Music Entertainment"): return []

    return [{"displayArtist":"TO1","aliases":["티오원","TOO","티오오"],"evidence":[
        {"label":"WAKEONE terminal eight-member contract/group-future statement","url":TERMINAL_URL},
        {"label":"WAKEONE terminal statement English preservation","url":TERMINAL_EN_URL},
        {"label":"TOO to TO1 official rename continuity","url":RENAME_URL},
        {"label":"WAKEONE Chi Hoon explicit departure","url":CHIHOON_URL},
        {"label":"WAKEONE 2022 roster reorganization","url":REORG_URL},
        {"label":"Renta explicit TO1 activity end","url":RENTA_URL},
        {"label":"Apple Music original TOO debut catalog","url":DEBUT_URL},
    ]}]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source":{"id":"to1-wakeone-terminal-rename-catalog","type":"provider_catalog","name":"TO1 WAKEONE Terminal Rename Catalog","observedAt":observed_at,"url":TERMINAL_URL},
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "renameContinuityRequired":True,"renameDoesNotCreateNewCanonical":True,"exactTerminalMemberRosterRequired":True,
            "allTerminalExclusiveContractsEndEvidenceRequired":True,"explicitNonTO1FutureEvidenceRequired":True,
            "historicalAgencyRequiresInactiveLifecycle":True,"priorExitedMembersExcludedFromTerminalRoster":True,
            "memberReorganizationMustNotCreateNewCanonical":True,"legalDisbandmentNotIndependentlyAsserted":True,
            "licensedOriginalDebutCatalogAllowed":True,"debutDateCrossRenameConsistencyRequired":True,
            "secondaryEditorialInferenceForbidden":True,"memberNamesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,"identityReviewRequired":True,"scopeVerificationRequired":True,
        },
        "terminalLifecycle":{
            "announcedAt":"2023-12-17","effectiveDate":"2023-12-31","lifecycleStatus":"inactive","agencyStatus":"historical","agency":"WAKEONE",
            "terminalMembers":EXPECTED_MEMBERS,"terminalMemberCount":8,"allTerminalExclusiveContractsEnded":True,
            "terminalFutureResolution":"members_follow_new_paths_not_as_TO1","legalDisbandmentAsserted":False,
            "renameContinuity":[{"from":"TOO","to":"TO1","effectiveDate":"2021-03-28","resolution":"same_group_official_name_change"}],
            "priorExitedMembers":[
                {"member":"CHI HOON","effectiveDate":"2022-04-30","resolution":"explicit_team_and_exclusive_contract_departure"},
                {"member":"MIN SU","effectiveDate":"2022-06-17","resolution":"explicit_team_departure"},
                {"member":"JEROME","effectiveDate":"2022-06-17","resolution":"explicit_team_departure"},
                {"member":"WOONG GI","effectiveDate":"2022-06-17","resolution":"explicit_team_departure"},
                {"member":"RENTA","effectiveDate":"2023-09-22","resolution":"explicit_TO1_activity_end"},
            ],
            "debutDate":"2020-04-01","debutName":"TOO","debutRelease":"REASON FOR BEING : Benevolence","fandomName":"TOgether",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="to1-wakeone-terminal-rename-catalog": raise RuntimeError("TO1 fallback source mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS: raise RuntimeError("TO1 fallback exact candidate catalog required")
    contract=snapshot.get("contract") if isinstance(snapshot,dict) else None
    if not isinstance(contract,dict) or contract.get("renameContinuityRequired") is not True: raise RuntimeError("TO1 fallback rename continuity contract required")
    if contract.get("explicitNonTO1FutureEvidenceRequired") is not True: raise RuntimeError("TO1 fallback terminal group-future evidence required")
    terminal=snapshot.get("terminalLifecycle") if isinstance(snapshot,dict) else None
    if not isinstance(terminal,dict) or terminal.get("terminalMembers")!=EXPECTED_MEMBERS: raise RuntimeError("TO1 fallback exact terminal roster required")
    if terminal.get("terminalMemberCount")!=8: raise RuntimeError("TO1 fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus")!="inactive" or terminal.get("agencyStatus")!="historical": raise RuntimeError("TO1 fallback terminal state mismatch")
    if terminal.get("allTerminalExclusiveContractsEnded") is not True: raise RuntimeError("TO1 fallback terminal contract evidence mismatch")
    if terminal.get("renameContinuity")!=[{"from":"TOO","to":"TO1","effectiveDate":"2021-03-28","resolution":"same_group_official_name_change"}]: raise RuntimeError("TO1 fallback rename continuity mismatch")
    if terminal.get("legalDisbandmentAsserted") is not False: raise RuntimeError("TO1 fallback legal disbandment must remain unasserted")
    if terminal.get("debutDate")!="2020-04-01": raise RuntimeError("TO1 fallback debut date mismatch")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(TERMINAL_URL),fetch(TERMINAL_EN_URL),fetch(RENAME_URL),fetch(CHIHOON_URL),fetch(REORG_URL),fetch(RENTA_URL),fetch(DEBUT_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"TO1 terminal rename catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
