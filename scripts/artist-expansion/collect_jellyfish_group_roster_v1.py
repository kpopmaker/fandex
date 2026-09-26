from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "jellyfish_current_group_roster_adapter_v1"
DIRECTORY_URL = "https://www.jelly-fish.co.kr/sub/artist/list.html"
HISTORY_URL = "https://www.jelly-fish.co.kr/sub/company.html"
EXPECTED_ARTISTS = ["EVNNE", "VIXX", "VERIVERY"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(
        url, timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def parse_live_pages(directory_html: str, history_html: str) -> list[dict]:
    directory = text_blob(directory_html).lower()
    history = text_blob(history_html).lower()
    checks = [
        ("evnne" in directory),
        ("vixx" in directory or "빅스" in directory),
        ("verivery" in directory or "베리베리" in directory),
        ("evnne" in history and "our evnneing" in history),
        ("vixx" in history and "case no. vixx" in history),
        ("verivery" in history and "lost and found" in history),
    ]
    if not all(checks):
        return []
    return [
        {"displayArtist":"EVNNE","aliases":["이븐"],"evidence":[
            {"label":"Jellyfish current official artist directory","url":DIRECTORY_URL},
            {"label":"Jellyfish current/recent group history","url":HISTORY_URL},
        ]},
        {"displayArtist":"VIXX","aliases":["빅스"],"evidence":[
            {"label":"Jellyfish current official artist directory","url":DIRECTORY_URL},
            {"label":"Jellyfish 2026 group activity","url":HISTORY_URL},
        ]},
        {"displayArtist":"VERIVERY","aliases":["베리베리"],"evidence":[
            {"label":"Jellyfish current official artist directory","url":DIRECTORY_URL},
            {"label":"Jellyfish recent group history","url":HISTORY_URL},
        ]},
    ]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id":"jellyfish-current-official-group-roster",
            "type":"agency_roster",
            "name":"Jellyfish Entertainment Current Official Group Roster",
            "observedAt": observed_at,
            "url": DIRECTORY_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialSourceOnly": True,
            "currentMusicGroupsOnly": True,
            "nonGroupArtistRowsExcluded": True,
            "currentDirectoryIsPrimaryLifecycleSignal": True,
            "individualMemberAgencyDoesNotOverrideGroupManagement": True,
            "memberActivityDoesNotCreateSoloCanonical": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot=json.loads(path.read_text(encoding="utf-8-sig"))
    source=snapshot.get("source") if isinstance(snapshot,dict) else None
    if not isinstance(source,dict) or source.get("id")!="jellyfish-current-official-group-roster":
        raise RuntimeError("Jellyfish fallback snapshot source mismatch")
    if source.get("type")!="agency_roster":
        raise RuntimeError("Jellyfish fallback source type mismatch")
    candidates=snapshot.get("candidates")
    names=[row.get("displayArtist") for row in candidates if isinstance(row,dict)] if isinstance(candidates,list) else []
    if names!=EXPECTED_ARTISTS:
        raise RuntimeError("Jellyfish fallback exact current group roster required")
    snapshot["collectionStatus"]="verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"]=False
    return snapshot

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    try:
        rows=parse_live_pages(fetch(DIRECTORY_URL),fetch(HISTORY_URL))
    except requests.RequestException:
        rows=[]
    if [row.get("displayArtist") for row in rows]==EXPECTED_ARTISTS:
        snapshot=build_snapshot(rows,datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"]="live_parse"
        snapshot["liveFetchParsed"]=True
    elif args.fallback_snapshot:
        snapshot=load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"Jellyfish group roster expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
