import json, urllib.request, urllib.parse
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36","Accept-Language":"ko-KR,ko;q=0.9"}
def check(label, url, headers=None, need=None):
    try:
        req=urllib.request.Request(url, headers={**UA, **(headers or {})})
        with urllib.request.urlopen(req, timeout=25) as r:
            b=r.read(); code=r.status
        hit = (need in b.decode('utf-8','ignore')) if need else None
        print(f"::notice title={label}::HTTP {code} size={len(b):,} {'키워드있음' if hit else ('키워드없음' if need else '')}")
    except Exception as e:
        print(f"::notice title={label}::ERROR {type(e).__name__} {str(e)[:90]}")
check("써클차트 앨범(초동)", "https://circlechart.kr/page_chart/album.circle?nationGbn=T&targetTime=11&hitYear=2026&termGbn=month&yearTime=3", need="차트")
check("써클차트 디지털", "https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL&termGbn=week&hitYear=2026&targetTime=45&yearTime=3")
check("한터차트", "https://www.hanteochart.com/", need="hanteo")
check("DART 공시 API(키없음)", "https://opendart.fss.or.kr/api/list.json?crtfc_key=TEST&bgn_de=20260101")
check("Spotify API(토큰없음)", "https://api.spotify.com/v1/search?q=aespa&type=artist")
check("Spotify 차트 페이지", "https://charts.spotify.com/charts/view/regional-kr-daily/latest")
check("Apple Music RSS(한국 Top)", "https://rss.applemarketingtools.com/api/v2/kr/music/most-played/25/songs.json", need="results")
check("구글 트렌드 daily", "https://trends.google.com/trends/api/dailytrends?hl=ko&geo=KR")
check("유튜브 차트", "https://charts.youtube.com/charts/TopSongs/kr/daily")
check("위버스", "https://weverse.io/")
