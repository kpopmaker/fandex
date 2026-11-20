import os, json, re, urllib.parse, urllib.request
LF=os.environ['LF']; NID=os.environ['NID']; NSEC=os.environ['NSEC']
def get(url, headers=None):
    req=urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)
def note(t,m): print(f"::notice title={t}::{m}")
for q in ["NOWADAYS","NOWZ","나우즈","LUCY","루시","LUCY (KOR)","Lucy (Korea)"]:
    u="https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&autocorrect=1&format=json&api_key="+LF+"&artist="+urllib.parse.quote(q)
    try:
        a=get(u)["artist"]; tags=[x["name"] for x in (a.get("tags",{}).get("tag") or [])]
        note("lastfm "+q, f"name={a['name']} listeners={a['stats']['listeners']} plays={a['stats']['playcount']} tags={tags[:6]}")
    except Exception as e: note("lastfm "+q, f"none {e}")
H={"X-Naver-Client-Id":NID,"X-Naver-Client-Secret":NSEC}
for q in ["호라이즌","HORI7ON 호라이즌","HORI7ON","호라이즌 그룹","호라이즌 HORI7ON 멤버"]:
    u="https://openapi.naver.com/v1/search/news.json?display=30&sort=date&query="+urllib.parse.quote(q)
    try:
        b=get(u,H); items=b.get("items",[])
        clean=lambda s: re.sub("<[^>]+>","",s)
        hit=sum(1 for i in items if "HORI7ON" in clean(i["title"]).upper())
        note("naver "+q, f"total={b.get('total')} 상위{len(items)}중 HORI7ON제목={hit} | " + " / ".join(clean(i["title"])[:40] for i in items[:3]))
    except Exception as e: note("naver "+q, f"error {e}")
