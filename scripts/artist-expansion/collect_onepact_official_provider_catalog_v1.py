from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "onepact_official_current_provider_catalog_adapter_v1"
ARMADA_URL = "https://armada-ent.com/"
PLATFORM_URL = "https://onepact.bstage.in/"
ACTIVITY_URL = "https://artist.mnetplus.world/main/stg/0nepact/surveys/6a68b2de8f20217aae9945aa"
EXPECTED_ARTISTS = ["ONE PACT"]

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

def parse_live_pages(armada_html: str, platform_html: str, activity_html: str) -> list[dict]:
    armada=text_blob(armada_html).lower()
    platform=text_blob(platform_html).lower()
    activity=text_blob(activity_html).lower()
    if "one + impact" not in armada and "one pact" not in armada:
        return []
    if "one pact" not in platform and "onepact" not in platform:
        return []
    if "armada ent" not in activity or "one pact" not in activity:
        return []
    if "2026" not in activity:
        return []
    return [{
        "displayArtist":"ONE PACT",
        "aliases":["원팩트","ONEPACT"],
        "evidence":[
            {"label":"ARMADA current official site","url":ARMADA_URL},
            {"label":"ONE PACT current official platform","url":PLATFORM_URL},
            {"label":"ARMADA current 2026 group activity","url":ACTIVITY_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"onepact-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"ONE PACT Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":PLATFORM_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "singleGroupIdentityOnly":True,
            "currentActivityEvidenceRequired":True,
            "memberLineupNotInferredWithoutCurrentOfficialRoster":True,
            "memberProfilesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="onepact-official-current-provider-catalog":
        raise RuntimeError("ONE PACT fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("ONE PACT fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("ONE PACT fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(ARMADA_URL),fetch(PLATFORM_URL),fetch(ACTIVITY_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"ONE PACT provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
