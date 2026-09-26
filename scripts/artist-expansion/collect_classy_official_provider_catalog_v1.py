from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "classy_official_current_provider_catalog_adapter_v1"
KTIGERS_URL = "https://www.ktigers.com/95"
MANAGEMENT_URL = "https://weverse.io/classy/notice/31776?hl=ko"
MEDIA_URL = "https://weverse.io/classy/media"
EXPECTED_ARTISTS = ["CLASS:y"]
EXPECTED_MEMBERS = [
    "MYUNG HYUNGSEO",
    "YOON CHAEWON",
    "HONG HYEJU",
    "KIM RIWON",
    "WON JIMIN",
    "PARK BOEUN",
    "KIM SEONYOU",
]

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

def parse_live_pages(ktigers_html: str, management_html: str, media_html: str) -> list[dict]:
    ktigers=text_blob(ktigers_html).lower()
    management=text_blob(management_html).lower()
    media=text_blob(media_html).lower()
    if "class:y" not in ktigers and "클라씨" not in ktigers:
        return []
    if "k-tigers entertainment" not in management and "k타이거즈 엔터테인먼트" not in management:
        return []
    if "class:y" not in management and "클라씨" not in management:
        return []
    if "re:boot" not in media or "2026" not in media:
        return []
    member_tokens=["hyungseo","chaewon","hyeju","riwon","jimin","boeun","seonyou"]
    if sum(1 for token in member_tokens if token in media) < 7:
        return []
    return [{
        "displayArtist":"CLASS:y",
        "aliases":["클라씨","CLASSy","CLASS:Y"],
        "evidence":[
            {"label":"K-TIGERS official management history","url":KTIGERS_URL},
            {"label":"CLASS:y official management notice","url":MANAGEMENT_URL},
            {"label":"CLASS:y current 2026 official media","url":MEDIA_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"classy-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"CLASS:y Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":MEDIA_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "singleGroupIdentityOnly":True,
            "currentManagementEvidenceRequired":True,
            "currentSevenMemberContentEvidenceRequired":True,
            "memberSoloContentDoesNotCreateSoloCanonicals":True,
            "debutDateNotInferredFromAnniversaryContent":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="classy-official-current-provider-catalog":
        raise RuntimeError("CLASS:y fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("CLASS:y fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("CLASS:y fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(KTIGERS_URL),fetch(MANAGEMENT_URL),fetch(MEDIA_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"CLASS:y provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
