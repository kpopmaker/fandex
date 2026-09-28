from __future__ import annotations
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup

VERSION="hinapia_osr_terminal_disbandment_catalog_adapter_v1"
TERMINAL_URL="https://www.soompi.com/article/1420662wpp/hinapia-announces-official-disbandment-and-termination-of-all-members-contracts"
DEBUT_PROFILE_URL="https://www.soompi.com/article/1363421wpp/watch-hinapia-with-former-pristin-members-makes-debut-with-sophisticated-drip-mv"
DEBUT_CATALOG_URL="https://music.apple.com/us/album/drip-single/1486120995"
EXPECTED_ARTISTS=["HINAPIA"]
EXPECTED_MEMBERS=["MINKYEUNG","GYEONGWON","EUNWOO","YAEBIN","BADA"]

def normalize_spaces(v): return re.sub(r"\s+"," ",str(v or "")).strip()
def fetch(url):
    r=requests.get(url,timeout=30,headers={"User-Agent":"Mozilla/5.0 (compatible; FANDEX validation research)"})
    r.raise_for_status(); return r.text
def text_blob(html):
    s=BeautifulSoup(html,"html.parser"); return normalize_spaces(" ".join(s.stripped_strings)+" "+html)
def contains_any(text,*tokens):
    v=text.lower(); return any(t.lower() in v for t in tokens)

def parse_live_pages(terminal_html,debut_profile_html,debut_catalog_html):
    terminal=text_blob(terminal_html); profile=text_blob(debut_profile_html); catalog=text_blob(debut_catalog_html)
    if not contains_any(terminal,"OSR Entertainment"): return []
    if not contains_any(terminal,"decision to disband the group","HINAPIA’s disbandment","HINAPIA's disbandment"): return []
    if not contains_any(terminal,"terminate our exclusive contracts with all five members","termination of all members’ contracts","termination of all members' contracts"): return []
    member_tokens=[("Minkyeung","Minkyung","민경"),("Gyeongwon","Kyungwon","경원"),("Eunwoo","은우"),("Yaebin","Yebin","예빈"),("Bada","바다")]
    if any(not contains_any(profile,*t) for t in member_tokens): return []
    if not contains_any(profile,"five members","five-member"): return []
    if not contains_any(profile,"November 3","Nov 3"): return []
    if not contains_any(catalog,"HINAPIA"): return []
    if not contains_any(catalog,"Drip - Single","DRIP"): return []
    if not contains_any(catalog,"November 3, 2019","2019-11-03"): return []
    if not contains_any(catalog,"OSR Entertainment"): return []
    return [{"displayArtist":"HINAPIA","aliases":["희나피아"],"evidence":[
      {"label":"OSR Entertainment explicit HINAPIA disbandment and all-five contract termination statement","url":TERMINAL_URL},
      {"label":"HINAPIA five-member debut profile","url":DEBUT_PROFILE_URL},
      {"label":"Apple Music DRIP licensed debut catalog","url":DEBUT_CATALOG_URL}]}]

def build_snapshot(rows,observed_at):
    return {"version":VERSION,"source":{"id":"hinapia-osr-terminal-disbandment-catalog","type":"provider_catalog","name":"HINAPIA OSR Terminal Disbandment Catalog","observedAt":observed_at,"url":TERMINAL_URL},"candidateCount":len(rows),"candidates":rows,
      "contract":{"preservedOfficialStatementsAllowedForHistoricalEvents":True,"explicitGroupDisbandmentEvidenceRequired":True,"allFiveMemberExclusiveContractTerminationRequired":True,"exactTerminalMemberRosterRequired":True,"historicalAgencyRequiresInactiveLifecycle":True,"legalEntityDissolutionNotInferred":True,"priorGroupMembershipDoesNotMergeGroupCanonicals":True,"terminalGroupStateDoesNotInferIndividualCareerEnd":True,"licensedProviderDebutCatalogAllowed":True,"debutDateCrossSourceConsistencyRequired":True,"memberNamesDoNotCreateSoloCanonicals":True,"autoPromote":False,"identityReviewRequired":True,"scopeVerificationRequired":True},
      "terminalLifecycle":{"announcedAt":"2020-08-21","effectiveDate":"2020-08-21","lifecycleStatus":"inactive","agencyStatus":"historical","agency":"OSR Entertainment","terminalMembers":EXPECTED_MEMBERS,"terminalMemberCount":5,"explicitGroupDisbandmentAnnounced":True,"allMemberExclusiveContractsTerminated":True,"legalEntityDissolutionAsserted":False,"debutDate":"2019-11-03","debutRelease":"DRIP"}}

def load_verified_fallback(path):
    s=json.loads(path.read_text(encoding="utf-8-sig"))
    if s.get("source",{}).get("id")!="hinapia-osr-terminal-disbandment-catalog": raise RuntimeError("HINAPIA fallback source mismatch")
    if [r.get("displayArtist") for r in s.get("candidates",[]) if isinstance(r,dict)]!=EXPECTED_ARTISTS: raise RuntimeError("HINAPIA fallback exact candidate catalog required")
    c=s.get("contract",{}); t=s.get("terminalLifecycle",{})
    if c.get("explicitGroupDisbandmentEvidenceRequired") is not True or c.get("allFiveMemberExclusiveContractTerminationRequired") is not True: raise RuntimeError("HINAPIA fallback terminal contracts required")
    if t.get("terminalMembers")!=EXPECTED_MEMBERS or t.get("terminalMemberCount")!=5: raise RuntimeError("HINAPIA fallback exact terminal roster required")
    if t.get("lifecycleStatus")!="inactive" or t.get("agencyStatus")!="historical": raise RuntimeError("HINAPIA fallback terminal state mismatch")
    if t.get("explicitGroupDisbandmentAnnounced") is not True or t.get("allMemberExclusiveContractsTerminated") is not True: raise RuntimeError("HINAPIA fallback disbandment/contract evidence mismatch")
    if t.get("legalEntityDissolutionAsserted") is not False or t.get("debutDate")!="2019-11-03": raise RuntimeError("HINAPIA fallback legal/debut mismatch")
    s["collectionStatus"]="verified_official_snapshot_fallback"; s["liveFetchParsed"]=False; return s

def main():
    p=argparse.ArgumentParser(); p.add_argument("--fallback-snapshot"); p.add_argument("--output",required=True); a=p.parse_args()
    try: rows=parse_live_pages(fetch(TERMINAL_URL),fetch(DEBUT_PROFILE_URL),fetch(DEBUT_CATALOG_URL))
    except requests.RequestException: rows=[]
    if [r.get("displayArtist") for r in rows]==EXPECTED_ARTISTS:
        s=build_snapshot(rows,datetime.now(timezone.utc).isoformat()); s["collectionStatus"]="live_parse"; s["liveFetchParsed"]=True
    elif a.fallback_snapshot: s=load_verified_fallback(Path(a.fallback_snapshot))
    else: raise RuntimeError(f"HINAPIA terminal disbandment catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(a.output).write_text(json.dumps(s,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__": main()
