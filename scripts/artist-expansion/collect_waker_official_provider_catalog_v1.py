from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "waker_official_current_provider_catalog_adapter_v1"
RENEWAL_URL = "https://artist.mnetplus.world/main/stg/waker/contents/6a9e383cdc57f3123077b548"
ACTIVITY_URL = "https://artist.mnetplus.world/main/stg/waker/contents/695e0f9f7dd68046c78e00ba"
HIATUS_URL = "https://artist.mnetplus.world/main/stg/waker/contents/69f581408c35c558d12746e1"
EXPECTED_ARTISTS = ["WAKER"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response=requests.get(
        url,timeout=30,
        headers={"User-Agent":"Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup=BeautifulSoup(html,"html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings)+" "+html)

def contains_any(blob: str, terms: list[str]) -> bool:
    lowered=blob.lower()
    return any(term.lower() in lowered for term in terms)

def parse_live_pages(renewal_html: str, activity_html: str, hiatus_html: str) -> list[dict]:
    renewal=text_blob(renewal_html)
    activity=text_blob(activity_html)
    hiatus=text_blob(hiatus_html)

    if not contains_any(renewal, ["WAKER","웨이커"]):
        return []
    if not contains_any(renewal, ["하울링엔터테인먼트","Howling Entertainment"]):
        return []
    if not contains_any(renewal, ["전속계약","재계약","renew"]):
        return []
    if not contains_any(activity, ["WAKER","웨이커"]):
        return []
    if not contains_any(activity, ["LiKE THAT","In Elixir","Spellbound"]):
        return []
    if "2026" not in activity:
        return []
    if not contains_any(hiatus, ["WAKER","웨이커"]):
        return []
    if not contains_any(hiatus, ["5인","5-member","불참"]):
        return []

    return [{
        "displayArtist":"WAKER",
        "aliases":["웨이커"],
        "evidence":[
            {"label":"Howling Entertainment current full-group renewal notice","url":RENEWAL_URL},
            {"label":"WAKER official 2026 music activity","url":ACTIVITY_URL},
            {"label":"Howling member-level hiatus notice","url":HIATUS_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"waker-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"WAKER Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":RENEWAL_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "singleGroupIdentityOnly":True,
            "fullGroupRenewalIsCurrentManagementEvidence":True,
            "memberLineupNotInferredWithoutCurrentOfficialEnumeration":True,
            "memberHealthOrParticipationStatusDoesNotOverrideGroupLifecycle":True,
            "memberProfilesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="waker-official-current-provider-catalog":
        raise RuntimeError("WAKER fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("WAKER fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("WAKER fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(RENEWAL_URL),fetch(ACTIVITY_URL),fetch(HIATUS_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"WAKER provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
