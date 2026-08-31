import csv
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_collect_artist_interest_v1"

SEED_FILE = Path("lastfm_artist_seed_v1.csv")

LATEST_CSV = Path("lastfm_artist_interest_v1_latest.csv")
LATEST_JSON = Path("fandex_lastfm_artist_interest_latest.json")
LATEST_REPORT = Path("FANDEX_LASTFM_COLLECTOR_REPORT.txt")

BASE_URL = "https://ws.audioscrobbler.com/2.0/"
REQUEST_SLEEP_SECONDS = 0.8


DEFAULT_SEED_ROWS = [
    {"artist": "아이유", "query": "IU", "memo": "Korean singer-songwriter IU"},
    {"artist": "에이티즈", "query": "ATEEZ", "memo": "K-pop boy group ATEEZ"},
    {"artist": "보이넥스트도어", "query": "BOYNEXTDOOR", "memo": "K-pop boy group BOYNEXTDOOR"},
    {"artist": "에스파", "query": "aespa", "memo": "K-pop girl group aespa"},
]


def get_api_key():
    api_key = (os.environ.get("LASTFM_API_KEY") or "").strip()

    bad_values = {
        "",
        "진짜_키",
        "실제_API_KEY",
        "YOUR_API_KEY",
        "LASTFM_API_KEY",
        "발급받은_진짜_API_KEY",
        "발급받은_진짜_키",
    }

    if api_key in bad_values:
        raise SystemExit(
            "LASTFM_API_KEY가 설정되지 않았습니다.\n"
            "먼저 CMD에서 아래처럼 설정하세요.\n\n"
            "set LASTFM_API_KEY=발급받은_진짜_키\n\n"
            "주의: API 키를 채팅에 붙여넣지 마세요."
        )

    return api_key


def ensure_seed_file():
    if SEED_FILE.exists():
        return

    fieldnames = ["artist", "query", "memo"]

    with open(SEED_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(DEFAULT_SEED_ROWS)

    print(f"seed 파일 생성: {SEED_FILE}")


def read_seed_rows():
    ensure_seed_file()

    with open(SEED_FILE, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    cleaned = []

    for row in rows:
        artist = (row.get("artist") or "").strip()
        query = (row.get("query") or "").strip()

        if not artist or not query:
            continue

        cleaned.append({
            "artist": artist,
            "query": query,
            "memo": (row.get("memo") or "").strip(),
        })

    return cleaned


def fetch_lastfm(method, api_key, extra_params):
    params = {
        "method": method,
        "api_key": api_key,
        "format": "json",
    }
    params.update(extra_params)

    query = urllib.parse.urlencode(params)
    url = f"{BASE_URL}?{query}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "FANDEXPythonCollector/1.0",
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")

    data = json.loads(body)

    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"Last.fm API error {data.get('error')}: {data.get('message')}")

    return data, url


def to_int(value):
    try:
        return int(str(value).replace(",", "").strip())
    except Exception:
        return 0


def compact_top_tracks(data):
    tracks = (((data or {}).get("toptracks") or {}).get("track")) or []

    compact = []

    for item in tracks[:10]:
        compact.append({
            "name": item.get("name", ""),
            "playcount": to_int(item.get("playcount")),
            "listeners": to_int(item.get("listeners")),
            "url": item.get("url", ""),
        })

    return compact


def compact_top_tags(data):
    tags = (((data or {}).get("toptags") or {}).get("tag")) or []

    compact = []

    for item in tags[:10]:
        compact.append({
            "name": item.get("name", ""),
            "count": to_int(item.get("count")),
            "url": item.get("url", ""),
        })

    return compact


def make_tags_preview(tags):
    return " | ".join(
        [
            f"{item['name']}:{item['count']}"
            for item in tags[:5]
            if item.get("name")
        ]
    )


def make_tracks_preview(tracks):
    return " | ".join(
        [
            f"{item['name']}({item['listeners']} listeners)"
            for item in tracks[:5]
            if item.get("name")
        ]
    )


def collect_one(seed, api_key):
    artist = seed["artist"]
    query = seed["query"]

    info_data, info_url = fetch_lastfm(
        "artist.getInfo",
        api_key,
        {"artist": query, "autocorrect": 1},
    )

    time.sleep(REQUEST_SLEEP_SECONDS)

    tracks_data, tracks_url = fetch_lastfm(
        "artist.getTopTracks",
        api_key,
        {"artist": query, "autocorrect": 1, "limit": 10},
    )

    time.sleep(REQUEST_SLEEP_SECONDS)

    tags_data, tags_url = fetch_lastfm(
        "artist.getTopTags",
        api_key,
        {"artist": query, "autocorrect": 1},
    )

    artist_info = info_data.get("artist") or {}
    stats = artist_info.get("stats") or {}

    listeners = to_int(stats.get("listeners"))
    playcount = to_int(stats.get("playcount"))

    top_tracks = compact_top_tracks(tracks_data)
    top_tags = compact_top_tags(tags_data)

    row = {
        "artist": artist,
        "query": query,
        "status": "ok",
        "lastfmName": artist_info.get("name", ""),
        "lastfmUrl": artist_info.get("url", ""),
        "listeners": listeners,
        "playcount": playcount,
        "streamable": artist_info.get("streamable", ""),
        "mbid": artist_info.get("mbid", ""),
        "topTracksPreview": make_tracks_preview(top_tracks),
        "topTagsPreview": make_tags_preview(top_tags),
        "infoUrl": info_url,
        "topTracksUrl": tracks_url,
        "topTagsUrl": tags_url,
        "memo": seed["memo"],
    }

    raw = {
        "info": artist_info,
        "topTracks": top_tracks,
        "topTags": top_tags,
    }

    return row, raw


def write_csv(rows, timestamp):
    timestamp_csv = Path(f"lastfm_artist_interest_v1_{timestamp}.csv")

    fieldnames = [
        "artist",
        "query",
        "status",
        "lastfmName",
        "lastfmUrl",
        "listeners",
        "playcount",
        "streamable",
        "mbid",
        "topTracksPreview",
        "topTagsPreview",
        "infoUrl",
        "topTracksUrl",
        "topTagsUrl",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return timestamp_csv


def write_json(rows, raw_by_artist, timestamp):
    timestamp_json = Path(f"fandex_lastfm_artist_interest_v1_{timestamp}.json")

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "source": "Last.fm API",
        "note": "Global listening interest metadata. Not merged into FANDEX master score yet.",
        "artistCount": len(rows),
        "artists": rows,
        "rawByArtist": raw_by_artist,
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return timestamp_json


def write_report(rows, timestamp):
    timestamp_report = Path(f"FANDEX_LASTFM_COLLECTOR_REPORT_{timestamp}.txt")

    lines = []

    lines.append("FANDEX Last.fm Collector Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("수집 결과")
    lines.append("-" * 70)

    sorted_rows = sorted(rows, key=lambda row: to_int(row.get("listeners")), reverse=True)

    for row in sorted_rows:
        lines.append(
            f"{row['artist']} | status={row['status']} | "
            f"Last.fm={row['lastfmName']} | listeners={row['listeners']} | "
            f"playcount={row['playcount']} | tags={row['topTagsPreview']}"
        )

    lines.append("")
    lines.append("활용 방향")
    lines.append("-" * 70)
    lines.append("- 글로벌 청취 관심도 보조 지표")
    lines.append("- listeners / playcount 기반 글로벌 팬덤 관심도 확인")
    lines.append("- top tags 기반 장르/인식 키워드 확인")
    lines.append("- 이후 점수 공식 고도화 단계에서 별도 source point로 반영 가능")
    lines.append("")
    lines.append("주의")
    lines.append("- Last.fm 수치는 FANDEX master v6에 아직 합산하지 않는다.")
    lines.append("- 이 스크립트는 웹사이트 public/data를 건드리지 않는다.")
    lines.append("- API 키는 환경변수 LASTFM_API_KEY로만 사용한다.")

    text = "\n".join(lines)

    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text(text, encoding="utf-8")

    return timestamp_report


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Last.fm artist interest collect v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    api_key = get_api_key()
    seeds = read_seed_rows()

    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print()

    rows = []
    raw_by_artist = {}

    for index, seed in enumerate(seeds, start=1):
        print(f"[{index}/{len(seeds)}] {seed['artist']} / query={seed['query']}")

        try:
            row, raw = collect_one(seed, api_key)
            rows.append(row)
            raw_by_artist[seed["artist"]] = raw

            print(
                f"  -> {row['status']} / {row['lastfmName']} / "
                f"listeners={row['listeners']} / playcount={row['playcount']}"
            )

        except Exception as exc:
            print(f"  -> ERROR: {exc}")

            rows.append({
                "artist": seed["artist"],
                "query": seed["query"],
                "status": "error",
                "lastfmName": "",
                "lastfmUrl": "",
                "listeners": 0,
                "playcount": 0,
                "streamable": "",
                "mbid": "",
                "topTracksPreview": "",
                "topTagsPreview": "",
                "infoUrl": "",
                "topTracksUrl": "",
                "topTagsUrl": "",
                "memo": f"{seed['memo']} / error={exc}",
            })
            raw_by_artist[seed["artist"]] = {}

        if index < len(seeds):
            time.sleep(REQUEST_SLEEP_SECONDS)

    timestamp_csv = write_csv(rows, timestamp)
    timestamp_json = write_json(rows, raw_by_artist, timestamp)
    timestamp_report = write_report(rows, timestamp)

    print()
    print("=" * 70)
    print("Last.fm artist interest collect v1 완료")
    print("=" * 70)
    print(f"타임스탬프 CSV: {timestamp_csv}")
    print(f"최신 CSV: {LATEST_CSV}")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 리포트: {timestamp_report}")
    print(f"최신 리포트: {LATEST_REPORT}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_LASTFM_COLLECTOR_REPORT.txt")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_LASTFM_COLLECTOR_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()