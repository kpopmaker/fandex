from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "idntt_official_current_provider_catalog_adapter_v1"
OFFICIAL_URL = "https://www.idntt-cosmo.com/"
COSMO_URL = "https://shop.cosmo.fans/en/shop/list"
EXPECTED_ARTISTS = ["idntt"]

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

def parse_live_pages(official_html: str, cosmo_html: str) -> list[dict]:
    official=text_blob(official_html).lower()
    cosmo=text_blob(cosmo_html).lower()
    if "idntt" not in official:
        return []
    if "kids return" not in official:
        return []
    if "modhaus" not in official:
        return []
    if "idntt" not in cosmo or "modhaus" not in cosmo:
        return []
    return [{
        "displayArtist":"idntt",
        "aliases":["아이덴티티","IDNTT"],
        "evidence":[
            {"label":"idntt current official site","url":OFFICIAL_URL},
            {"label":"Modhaus-operated Cosmo current catalog","url":COSMO_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"idntt-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"idntt Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":OFFICIAL_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "singleParentGroupIdentityOnly":True,
            "currentMusicActivityEvidenceRequired":True,
            "unitDebutDoesNotEqualParentGroupDebut":True,
            "plannedFinalMemberCountDoesNotEqualCurrentLineup":True,
            "unitMembersDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="idntt-official-current-provider-catalog":
        raise RuntimeError("idntt fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("idntt fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("idntt fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(OFFICIAL_URL),fetch(COSMO_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"idntt provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
