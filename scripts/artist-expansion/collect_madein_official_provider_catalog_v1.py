from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "madein_official_current_provider_catalog_adapter_v1"
PROFILE_URL = "https://madein-official.net/profile/"
BLOG_URL = "https://mabyjapan.jp/blog"
SCHEDULE_URL = "https://mabyjapan.jp/schedule"
EXPECTED_ARTISTS = ["MADEIN"]
CANONICAL_MEMBERS = ["MASHIRO", "MiU", "SUHYE", "YESEO", "SERINA", "NAGOMI"]
ACTIVE_PROMOTION_MEMBERS = ["MASHIRO", "MiU", "SERINA", "NAGOMI"]

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

def parse_live_pages(profile_html: str, blog_html: str, schedule_html: str) -> list[dict]:
    profile=text_blob(profile_html).lower()
    blog=text_blob(blog_html).lower()
    schedule=text_blob(schedule_html).lower()

    if "madein" not in profile:
        return []
    if not all(member.lower() in profile for member in CANONICAL_MEMBERS):
        return []
    if not all(member.lower() in blog for member in ACTIVE_PROMOTION_MEMBERS):
        return []
    if "2026" not in blog:
        return []
    if "girl meets boy" not in schedule or "2026" not in schedule:
        return []
    if "143 entertainment inc." not in blog and "143 entertainment inc." not in schedule:
        return []

    return [{
        "displayArtist":"MADEIN",
        "aliases":["메이딘","LIMELIGHT","라임라잇"],
        "evidence":[
            {"label":"MADEIN current official member profile","url":PROFILE_URL},
            {"label":"143-operated MADEIN current fanclub activity","url":BLOG_URL},
            {"label":"MADEIN current official schedule and discography","url":SCHEDULE_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"madein-official-current-provider-catalog",
            "type":"provider_catalog",
            "name":"MADEIN Official Current Provider Catalog",
            "observedAt":observed_at,
            "url":PROFILE_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "historicalLimelightContinuityPreserved":True,
            "temporaryPromotionLineupDoesNotOverrideCanonicalMembership":True,
            "departedFormerMemberExcluded":["GAEUN"],
            "current2026ActivityEvidenceRequired":True,
            "memberProfilesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="madein-official-current-provider-catalog":
        raise RuntimeError("MADEIN fallback snapshot source mismatch")
    if source.get("type")!="provider_catalog":
        raise RuntimeError("MADEIN fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("MADEIN fallback exact provider catalog required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(PROFILE_URL),fetch(BLOG_URL),fetch(SCHEDULE_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"MADEIN provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
