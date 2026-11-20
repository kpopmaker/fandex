import os, json, urllib.parse, urllib.request
LF=os.environ['LF']
def info(q, ac):
    u=("https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&format=json&autocorrect=%d&api_key=%s&artist=%s"
       % (ac, LF, urllib.parse.quote(q)))
    try:
        a=json.load(urllib.request.urlopen(urllib.request.Request(u), timeout=30))["artist"]
        tags=[x["name"] for x in (a.get("tags",{}).get("tag") or [])][:4]
        return f"name={a['name']!r} listeners={int(a['stats']['listeners']):,} plays={int(a['stats']['playcount']):,} tags={tags}"
    except Exception as e:
        return f"none ({e})"
tests = {
 "babymonster": ["BABYMONSTER","BABYMONSTER (베이비몬스터)","베이비몬스터","Baby Monster"],
 "triples":     ["tripleS","트리플에스","TripleS","Triple S"],
 "stayc":       ["STAYC","스테이씨","Stayc","Stay-C"],
 "apink":       ["Apink","에이핑크","APINK","A Pink"],
}
for gid, qs in tests.items():
    for q in qs:
        for ac in (0,1):
            print(f"::notice title={gid} [{q}] autocorrect={ac}::{info(q, ac)}")
