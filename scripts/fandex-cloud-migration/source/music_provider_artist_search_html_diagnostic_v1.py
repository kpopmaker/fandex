from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus

import requests

OUTPUT=Path("music_provider_artist_search_html_diagnostic_v1.json")
UA=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36")

QUERY="아이유"
URLS=[
    ("melon_mcom", "https://search.melon.com/search/mcom_index.htm?q="+quote_plus(QUERY)),
    ("melon_result_list", "https://search.melon.com/search/resultList.htm?q="+quote_plus(QUERY)),
    ("melon_total", "https://search.melon.com/search/total/index.htm?q="+quote_plus(QUERY)),
    ("genie_main", "https://www.genie.co.kr/search/searchMain?query="+quote_plus(QUERY)),
]
TOKENS=[
    "아이유",
    "IU",
    "artistId",
    "goArtistDetail",
    "artistInfo",
    "xxnm",
    "fnViewArtist",
    "artist_detail",
    "67872918",
]


def snippets(text:str, token:str, radius:int=220, limit:int=5):
    out=[]
    lower=text.lower()
    needle=token.lower()
    start=0
    while len(out)<limit:
        i=lower.find(needle,start)
        if i<0:
            break
        a=max(0,i-radius)
        b=min(len(text),i+len(token)+radius)
        out.append(re.sub(r"\s+"," ",text[a:b]))
        start=i+len(token)
    return out


def main():
    rows=[]
    headers={
        "User-Agent":UA,
        "Accept-Language":"ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    for name,url in URLS:
        r=requests.get(url,headers=headers,timeout=20,allow_redirects=True)
        text=r.text
        token_counts={t:len(re.findall(re.escape(t),text,flags=re.I)) for t in TOKENS}
        broad_ids={
            "artistIdDigits":sorted(set(re.findall(r"artistId[^0-9]{0,20}(\d{4,})",text,flags=re.I)))[:30],
            "xxnmDigits":sorted(set(re.findall(r"xxnm[^0-9]{0,20}(\d{4,})",text,flags=re.I)))[:30],
            "goArtistDetailDigits":sorted(set(re.findall(r"goArtistDetail[^0-9]{0,30}(\d{4,})",text,flags=re.I)))[:30],
            "fnViewArtistDigits":sorted(set(re.findall(r"fnViewArtist[^0-9]{0,30}(\d{4,})",text,flags=re.I)))[:30],
        }
        rows.append({
            "name":name,
            "requestedUrl":url,
            "finalUrl":r.url,
            "statusCode":r.status_code,
            "responseLength":len(text),
            "contentType":r.headers.get("content-type",""),
            "tokenCounts":token_counts,
            "broadIds":broad_ids,
            "snippets":{
                t:snippets(text,t)
                for t in ["아이유","artistId","goArtistDetail","artistInfo","xxnm","fnViewArtist","67872918"]
                if token_counts.get(t,0)>0
            },
        })

    payload={
        "version":"music_provider_artist_search_html_diagnostic_v1",
        "createdAt":datetime.now().isoformat(timespec="seconds"),
        "query":QUERY,
        "rows":rows,
    }
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for row in rows:
        print(
            row["name"],
            "status="+str(row["statusCode"]),
            "len="+str(row["responseLength"]),
            "queryCount="+str(row["tokenCounts"]["아이유"]),
            "artistIdCount="+str(row["tokenCounts"]["artistId"]),
            "xxnmCount="+str(row["tokenCounts"]["xxnm"]),
            "goArtistDetailCount="+str(row["tokenCounts"]["goArtistDetail"]),
            "fnViewArtistCount="+str(row["tokenCounts"]["fnViewArtist"]),
            "artistIdDigits="+json.dumps(row["broadIds"]["artistIdDigits"],ensure_ascii=False),
            "xxnmDigits="+json.dumps(row["broadIds"]["xxnmDigits"],ensure_ascii=False),
        )


if __name__=="__main__":
    main()
