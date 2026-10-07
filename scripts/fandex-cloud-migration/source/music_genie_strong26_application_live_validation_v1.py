from __future__ import annotations

import concurrent.futures
import json
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[3]
TARGET=ROOT/"data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
BINDINGS=ROOT/"data/fandex-cloud-v10/seed/music_genie_strong26_provider_bindings_v1.json"
METADATA=ROOT/"music_genie_canonical_identity_metadata_v1.json"
OUTPUT=Path("music_genie_strong26_application_live_validation_v1.json")

UA=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36")
TRANSIENT={429,500,502,503,504}

def compact(v):
    return re.sub(r"[^0-9a-z가-힣]+","",(v or "").strip().lower())

def get(url):
    last=None
    for attempt in range(1,4):
        try:
            r=requests.get(url,headers={"User-Agent":UA,"Accept-Language":"ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"},timeout=20)
            if r.status_code in TRANSIENT and attempt<3:
                time.sleep(attempt)
                continue
            return r
        except Exception as exc:
            last=exc
            if attempt<3:
                time.sleep(attempt)
    raise last

def search_candidates(query):
    url="https://www.genie.co.kr/search/searchMain?query="+quote_plus(query)
    r=get(url)
    soup=BeautifulSoup(r.text,"html.parser")
    pat=re.compile(r"fnViewArtist\(['\"](\d+)['\"]\)",re.I)
    out={}
    for a in soup.find_all("a"):
        m=pat.search(str(a.get("onclick") or ""))
        if not m: continue
        pid=m.group(1)
        name=" ".join(a.stripped_strings).strip()
        if not name:
            img=a.find("img")
            name=str(img.get("alt") or "").strip() if img else ""
        if name:
            out[(pid,compact(name))]={"providerArtistId":pid,"providerDisplay":name}
    return r.status_code,list(out.values())

def label_value(soup,label):
    img=soup.find("img",attrs={"alt":label})
    if img is not None:
        li=img.find_parent("li")
        if li is not None:
            text=" ".join(li.stripped_strings).strip()
            if text: return text
    for node in soup.find_all(string=lambda s:isinstance(s,str) and label in s):
        parent=node.parent
        if parent is None: continue
        li=parent.find_parent("li") or parent
        text=" ".join(li.stripped_strings).strip().replace(label,"",1).strip()
        if text: return text
    return None

def detail(pid):
    url=f"https://www.genie.co.kr/detail/artistInfo?xxnm={pid}"
    r=get(url)
    soup=BeautifulSoup(r.text,"html.parser")
    node=soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    name=" ".join(node.stripped_strings).strip() if node else ""
    if not name:
        og=soup.find("meta",attrs={"property":"og:title"})
        name=str(og.get("content") or "").strip() if og else ""
    activity=label_value(soup,"활동유형")
    debut=label_value(soup,"데뷔")
    m=re.search(r"(19|20)\d{2}",debut or "")
    return {
        "statusCode":r.status_code,
        "providerDisplay":name,
        "providerActivityType":activity,
        "providerDebutYear":int(m.group(0)) if m else None,
        "providerUrl":url,
    }

def validate_one(binding,target,meta):
    aliases=[target["artist"],*(target.get("aliases") or [])]
    keys={compact(x) for x in aliases if compact(x)}
    search_status,candidates=search_candidates(target["artist"])
    exact=[c for c in candidates if compact(c["providerDisplay"]) in keys]
    exact_ids=sorted({c["providerArtistId"] for c in exact})
    expected=binding["providerArtistId"]
    d=detail(expected)
    display_match=compact(d["providerDisplay"]) in keys
    entity_match=("그룹" in (d["providerActivityType"] or "")) if meta["entityType"]=="group" else ("솔로" in (d["providerActivityType"] or ""))
    debut_match=(meta["debutYear"]==d["providerDebutYear"])
    ok=(
        search_status==200
        and exact_ids==[expected]
        and d["statusCode"]==200
        and display_match
        and entity_match
        and debut_match
        and d["providerDebutYear"]==binding["providerDebutYear"]
    )
    return {
        "canonicalArtistId":binding["canonicalArtistId"],
        "expectedProviderArtistId":expected,
        "searchStatusCode":search_status,
        "exactProviderArtistIds":exact_ids,
        "detailStatusCode":d["statusCode"],
        "providerDisplay":d["providerDisplay"],
        "displayAliasMatch":display_match,
        "providerActivityType":d["providerActivityType"],
        "entityTypeMatch":entity_match,
        "providerDebutYear":d["providerDebutYear"],
        "canonicalDebutYear":meta["debutYear"],
        "debutYearMatch":debut_match,
        "validated":ok,
    }

def main():
    target=json.loads(TARGET.read_text(encoding="utf-8-sig"))
    compat=json.loads(COMPAT.read_text(encoding="utf-8-sig"))
    bindings=json.loads(BINDINGS.read_text(encoding="utf-8-sig"))
    metadata=json.loads(METADATA.read_text(encoding="utf-8-sig"))

    target_by={r["canonicalArtistId"]:r for r in target["artists"]}
    meta_by={r["canonicalArtistId"]:r for r in metadata["artists"]}
    rows=bindings["bindings"]
    ids=[r["canonicalArtistId"] for r in rows]

    music=compat["sources"]["music_chart"]
    assert len(target["artists"])==117
    assert len(music["supportedCanonicalArtistIds"])==117
    assert len(music["unresolvedCanonicalArtistIds"])==238
    assert len(music["unsupportedCanonicalArtistIds"])==0
    assert set(ids) <= set(music["supportedCanonicalArtistIds"])
    assert set(ids).isdisjoint(music["unresolvedCanonicalArtistIds"])

    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(validate_one,b,target_by[b["canonicalArtistId"]],meta_by[b["canonicalArtistId"]]):b["canonicalArtistId"] for b in rows}
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
    order={cid:i for i,cid in enumerate(ids)}
    results.sort(key=lambda r:order[r["canonicalArtistId"]])

    validated=[r["canonicalArtistId"] for r in results if r["validated"]]
    failed=[r["canonicalArtistId"] for r in results if not r["validated"]]
    payload={
        "version":"music_genie_strong26_application_live_validation_v1",
        "createdAt":datetime.now().isoformat(timespec="seconds"),
        "targetCount":117,
        "supportedCount":117,
        "unresolvedCount":238,
        "unsupportedCount":0,
        "bindingCount":26,
        "validatedBindingCount":len(validated),
        "failedBindingCount":len(failed),
        "validatedCanonicalArtistIds":validated,
        "failedCanonicalArtistIds":failed,
        "results":results,
        "productCohortModified":False,
        "productRuntimeModified":False,
    }
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    if failed:
        raise RuntimeError("strong26_live_validation_failed:"+",".join(failed))
    print("PASS: Genie strong26 application live validation | bindings=26/26 | coverage=117/238/0")

if __name__=="__main__":
    main()
