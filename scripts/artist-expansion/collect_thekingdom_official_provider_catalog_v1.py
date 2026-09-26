from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "thekingdom_official_current_provider_catalog_adapter_v1"
NOTICE_URL = "https://weverse.io/kingdom/notice/33746"
HIGHLIGHT_URL = "https://weverse.io/kingdom/highlight?hl=ko"
FANCON_URL = "https://weverse.io/kingdom/notice/33410"
EXPECTED_ARTISTS = ["The KingDom"]
EXPECTED_MEMBERS = ["DANN", "ARTHUR", "MUJIN", "LOUIS", "IVAN", "JAHAN"]

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

def parse_live_pages(notice_html: str, highlight_html: str, fancon_html: str) -> list[dict]:
    notice=text_blob(notice_html).lower()
    highlight=text_blob(highlight_html).lower()
    fancon=text_blob(fancon_html).lower()
    if "the kingdom" not in notice and "더킹덤" not in notice:
        return []
    if "그룹 활동을 중단" not in notice and "halt" not in notice:
        return []
    if "gf엔터테인먼트" not in notice and "gf entertainment" not in notice:
        return []
    member_hits=sum(1 for member in EXPECTED_MEMBERS if member.lower() in highlight)
    if member_hits < 5:
        return []
    if "2026" not in fancon or ("fan-con" not in fancon and "팬콘" not in fancon):
        return []
    return [{
        "displayArtist":"The KingDom",
        "aliases":["더킹덤","킹덤","KINGDOM"],
        "evidence":[
            {"label":"GF Entertainment official group halt notice","url":NOTICE_URL},
            {"label":"The KingDom current official Weverse surface","url":HIGHLIGHT_URL},
            {"label":"GF Entertainment official 2026 fan-con notice","url":FANCON_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"thekingdom-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"The KingDom Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":HIGHLIGHT_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialPlatformOnly":True,
            "singleGroupIdentityOnly":True,
            "renameContinuityPreserved":True,
            "temporaryGroupHaltMapsToInactiveLifecycle":True,
            "currentAgencySupportDoesNotBecomeHistorical":True,
            "militaryStatusDoesNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="thekingdom-official-current-provider-catalog":
        raise RuntimeError("The KingDom fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("The KingDom fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("The KingDom fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(NOTICE_URL),fetch(HIGHLIGHT_URL),fetch(FANCON_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"The KingDom provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
