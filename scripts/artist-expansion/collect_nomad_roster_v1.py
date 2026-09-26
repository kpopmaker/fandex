from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "nomad_entertainment_current_roster_adapter_v1"
HOME_URL = "https://nomadent.co.kr/"
ARTIST_URL = "https://nomadent.co.kr/introduce/"
DISCOGRAPHY_URL = "https://nomadent.co.kr/discography/"
EXPECTED_ARTISTS = ["NOMAD"]
EXPECTED_MEMBERS = ["DOY", "SANGHA", "ONE", "RIVR", "JUNHO"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response=requests.get(url,timeout=30,headers={"User-Agent":"Mozilla/5.0 (compatible; FANDEX validation research)"})
    response.raise_for_status()
    return response.text

def blob(html: str) -> str:
    soup=BeautifulSoup(html,"html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings)+" "+html).lower()

def parse_live_pages(home_html: str, artist_html: str, discography_html: str) -> list[dict]:
    home=blob(home_html)
    artist=blob(artist_html)
    disco=blob(discography_html)
    if "nomad" not in home or "k-pop" not in home:
        return []
    if "2024.02.28" not in artist:
        return []
    for member in EXPECTED_MEMBERS:
        if member.lower() not in artist:
            return []
    if "call me back" not in disco or "2024.10.09" not in disco:
        return []
    return [{
        "displayArtist":"NOMAD",
        "aliases":["노매드"],
        "evidence":[
            {"label":"NOMAD Entertainment current official homepage","url":HOME_URL},
            {"label":"NOMAD Entertainment official artist profile","url":ARTIST_URL},
            {"label":"NOMAD Entertainment official discography","url":DISCOGRAPHY_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version":VERSION,
        "source":{
            "id":"nomad-entertainment-current-roster",
            "type":"agency_roster",
            "name":"NOMAD Entertainment Current Artist Roster",
            "observedAt":observed_at,
            "url":ARTIST_URL,
        },
        "candidateCount":len(rows),
        "candidates":rows,
        "contract":{
            "officialSourceOnly":True,
            "singleCurrentMusicGroupOnly":True,
            "exactCurrentMemberRosterRequired":True,
            "officialKpopDescriptionRequired":True,
            "memberProfilesDoNotCreateSoloCanonicals":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="nomad-entertainment-current-roster":
        raise RuntimeError("NOMAD fallback snapshot source mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("NOMAD fallback exact roster required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(HOME_URL),fetch(ARTIST_URL),fetch(DISCOGRAPHY_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"NOMAD roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
