import csv
import json
import math
import os
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "youtube_discover_seed_candidates_artist_list_v2"

ARTIST_LIST = Path("artist_list.txt")
SEED_CSV = Path("youtube_seed_videos_v1.csv")

LATEST_CSV = Path("youtube_seed_candidates_v1_latest.csv")
LATEST_JSON = Path("fandex_youtube_seed_candidates_latest.json")
REPORT = Path("FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT.txt")

API_KEY_ENV = "YOUTUBE_API_KEY"

PUBLISHED_AFTER = os.environ.get("YOUTUBE_PUBLISHED_AFTER", "2026-01-01T00:00:00Z")
MAX_RESULTS_PER_QUERY = int(os.environ.get("YOUTUBE_DISCOVERY_MAX_RESULTS", "5"))
MAX_QUERIES_PER_ARTIST = int(os.environ.get("YOUTUBE_DISCOVERY_MAX_QUERIES", "4"))


ALIASES = {
    "아이유": ["IU", "아이유"],
    "에스파": ["aespa", "에스파"],
    "에이티즈": ["ATEEZ", "에이티즈"],
    "보이넥스트도어": ["BOYNEXTDOOR", "보이넥스트도어"],
    "아이브": ["IVE", "아이브"],
    "르세라핌": ["LE SSERAFIM", "르세라핌"],
    "뉴진스": ["NewJeans", "뉴진스"],
    "세븐틴": ["SEVENTEEN", "세븐틴"],
    "스트레이키즈": ["Stray Kids", "SKZ", "스트레이키즈"],
    "투모로우바이투게더": ["TXT", "TOMORROW X TOGETHER", "투모로우바이투게더"],
}


OFFICIAL_CHANNEL_HINTS = [
    "HYBE LABELS",
    "SMTOWN",
    "JYP Entertainment",
    "starshipTV",
    "IVE",
    "LE SSERAFIM",
    "NewJeans",
    "SEVENTEEN",
    "Stray Kids",
    "TOMORROW X TOGETHER",
    "TXT",
]


def read_artist_list():
    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def read_csv(path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def safe_int(value):
    try:
        if value is None or str(value).strip() == "":
            return 0
        return int(float(str(value).replace(",", "").strip()))
    except Exception:
        return 0


def youtube_get(endpoint, params):
    params = dict(params)
    params["key"] = os.environ[API_KEY_ENV]

    url = "https://www.googleapis.com/youtube/v3/" + endpoint + "?" + urllib.parse.urlencode(params)

    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_video_id_from_url(url):
    if not url:
        return ""

    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)

    if "v" in query and query["v"]:
        return query["v"][0]

    parts = parsed.path.strip("/").split("/")
    if parts:
        return parts[-1]

    return ""


def read_existing_seed():
    rows = read_csv(SEED_CSV)
    video_ids = set()
    artists = set()

    for row in rows:
        artist = str(row.get("artist", "")).strip()
        if artist:
            artists.add(artist)

        video_id = (
            row.get("videoId")
            or row.get("video_id")
            or row.get("id")
            or extract_video_id_from_url(row.get("url") or row.get("videoUrl") or "")
        )

        video_id = str(video_id or "").strip()

        if video_id:
            video_ids.add(video_id)

    return rows, video_ids, artists


def build_queries(artist):
    aliases = ALIASES.get(artist, [artist])
    main = aliases[0]

    queries = [
        f"{main} 2026 official MV",
        f"{main} 2026 dance practice",
        f"{main} 2026 performance",
        f"{main} 2026 shorts",
    ]

    # 너무 많이 API를 쓰지 않도록 기본 4개만
    return queries[:MAX_QUERIES_PER_ARTIST]


def search_videos(query):
    payload = youtube_get(
        "search",
        {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": MAX_RESULTS_PER_QUERY,
            "order": "relevance",
            "publishedAfter": PUBLISHED_AFTER,
            "safeSearch": "none",
            "regionCode": "KR",
        },
    )

    video_ids = []

    for item in payload.get("items", []):
        video_id = item.get("id", {}).get("videoId")
        if video_id:
            video_ids.append(video_id)

    return video_ids


def get_video_details(video_ids):
    if not video_ids:
        return []

    items = []

    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i:i + 50]

        payload = youtube_get(
            "videos",
            {
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(chunk),
                "maxResults": 50,
            },
        )

        items.extend(payload.get("items", []))

    return items


def classify_type(title):
    text = title.lower()

    if "#shorts" in text or "shorts" in text:
        return "shorts"

    if "dance practice" in text or "choreography" in text or "안무" in text:
        return "dance_practice"

    if "official mv" in text or "music video" in text or " m/v" in text or "mv " in text:
        return "official_mv"

    if "performance" in text or "stage" in text or "musiccore" in text or "뮤직뱅크" in text or "인기가요" in text:
        return "performance_video"

    if "live" in text or "라이브" in text:
        return "live_clip"

    return "external_content"


def is_officialish_channel(artist, channel_title):
    channel = channel_title.lower()
    aliases = [a.lower() for a in ALIASES.get(artist, [artist])]

    if any(alias.lower() in channel for alias in aliases):
        return True

    for hint in OFFICIAL_CHANNEL_HINTS:
        if hint.lower() in channel:
            return True

    return False


def calc_score(artist, title, channel_title, video_type, views):
    score = 0
    text = f"{title} {channel_title}".lower()
    aliases = [a.lower() for a in ALIASES.get(artist, [artist])]

    if any(alias in text for alias in aliases):
        score += 25

    if is_officialish_channel(artist, channel_title):
        score += 25

    type_bonus = {
        "official_mv": 25,
        "dance_practice": 22,
        "performance_video": 18,
        "live_clip": 16,
        "shorts": 15,
        "external_content": 8,
    }.get(video_type, 8)

    score += type_bonus

    if views > 0:
        score += min(25, int(math.log10(max(views, 1)) * 5))

    return min(score, 100)


def main():
    print()
    print("YouTube seed discovery artist-list v2 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: youtube_seed_videos_v1.csv 원본은 수정하지 않습니다.")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    if API_KEY_ENV not in os.environ or not os.environ[API_KEY_ENV].strip():
        raise SystemExit("YOUTUBE_API_KEY 환경변수가 없습니다. 먼저 set YOUTUBE_API_KEY=진짜키 를 입력하세요.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if LATEST_CSV.exists():
        shutil.copy2(LATEST_CSV, f"youtube_seed_candidates_v1_latest_backup_before_artist_list_v2_{timestamp}.csv")

    if LATEST_JSON.exists():
        shutil.copy2(LATEST_JSON, f"fandex_youtube_seed_candidates_latest_backup_before_artist_list_v2_{timestamp}.json")

    artists = read_artist_list()
    seed_rows, existing_video_ids, seed_artists = read_existing_seed()

    if "--all" in sys.argv:
        target_artists = artists
        target_mode = "all artists"
    else:
        target_artists = [artist for artist in artists if artist not in seed_artists]
        target_mode = "artists missing from youtube_seed_videos_v1.csv"

    print(f"artist_list count: {len(artists)}")
    print(f"seed artist count: {len(seed_artists)}")
    print(f"target mode: {target_mode}")
    print(f"target artists: {', '.join(target_artists) if target_artists else '없음'}")
    print(f"publishedAfter: {PUBLISHED_AFTER}")
    print()

    if not target_artists:
        raise SystemExit("YouTube seed가 없는 신규 아티스트가 없습니다. 전체 재탐색은 --all 옵션으로 실행하세요.")

    found = {}
    query_log = []

    for artist in target_artists:
        queries = build_queries(artist)

        print()
        print(f"[{artist}]")
        print("-" * 70)

        for query in queries:
            print(f"검색: {query}")

            try:
                ids = search_videos(query)
            except Exception as e:
                print(f"ERROR: {e}")
                query_log.append({
                    "artist": artist,
                    "query": query,
                    "status": "ERROR",
                    "message": str(e),
                    "videoCount": 0,
                })
                continue

            print(f"video ids: {len(ids)}")

            query_log.append({
                "artist": artist,
                "query": query,
                "status": "OK",
                "message": "",
                "videoCount": len(ids),
            })

            details = get_video_details(ids)

            for item in details:
                video_id = item.get("id", "")
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})

                title = snippet.get("title", "")
                channel_title = snippet.get("channelTitle", "")
                published_at = snippet.get("publishedAt", "")

                views = safe_int(stats.get("viewCount"))
                likes = safe_int(stats.get("likeCount"))
                comments = safe_int(stats.get("commentCount"))

                video_type = classify_type(title)
                score = calc_score(artist, title, channel_title, video_type, views)

                key = (artist, video_id)

                current = found.get(key)

                row = {
                    "artist": artist,
                    "videoId": video_id,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
                    "title": title,
                    "channelTitle": channel_title,
                    "publishedAt": published_at,
                    "type": video_type,
                    "videoType": video_type,
                    "score": score,
                    "candidateScore": score,
                    "views": views,
                    "viewCount": views,
                    "likes": likes,
                    "likeCount": likes,
                    "comments": comments,
                    "commentCount": comments,
                    "isExistingSeed": "Y" if video_id in existing_video_ids else "N",
                    "candidateStatus": "DUPLICATE_SEED" if video_id in existing_video_ids else "NEW",
                    "query": query,
                    "discoveryVersion": VERSION,
                    "discoveredAt": datetime.now().isoformat(timespec="seconds"),
                }

                if current is None or score > safe_int(current.get("score")):
                    found[key] = row

    rows = list(found.values())
    rows.sort(
        key=lambda r: (
            r["candidateStatus"] != "NEW",
            -safe_int(r["score"]),
            -safe_int(r["views"]),
            r["artist"],
        )
    )

    fieldnames = [
        "artist",
        "videoId",
        "url",
        "videoUrl",
        "title",
        "channelTitle",
        "publishedAt",
        "type",
        "videoType",
        "score",
        "candidateScore",
        "views",
        "viewCount",
        "likes",
        "likeCount",
        "comments",
        "commentCount",
        "isExistingSeed",
        "candidateStatus",
        "query",
        "discoveryVersion",
        "discoveredAt",
    ]

    timestamp_csv = Path(f"youtube_seed_candidates_v1_artist_list_v2_{timestamp}.csv")
    write_csv(timestamp_csv, rows, fieldnames)
    write_csv(LATEST_CSV, rows, fieldnames)

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "scope": "Python-only / no website public-data export",
        "targetMode": target_mode,
        "publishedAfter": PUBLISHED_AFTER,
        "artistListCount": len(artists),
        "seedArtistCount": len(seed_artists),
        "targetArtists": target_artists,
        "totalCandidates": len(rows),
        "newCandidates": sum(1 for r in rows if r["candidateStatus"] == "NEW"),
        "duplicateSeed": sum(1 for r in rows if r["candidateStatus"] != "NEW"),
        "queryLog": query_log,
        "candidates": rows,
    }

    LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("FANDEX YouTube Seed Discovery Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("대상")
    lines.append("-" * 70)
    lines.append(f"targetMode: {target_mode}")
    lines.append(f"targetArtists: {', '.join(target_artists)}")
    lines.append(f"publishedAfter: {PUBLISHED_AFTER}")
    lines.append("")
    lines.append("후보 요약")
    lines.append("-" * 70)
    lines.append(f"전체 후보: {len(rows)}")
    lines.append(f"신규 후보: {sum(1 for r in rows if r['candidateStatus'] == 'NEW')}")
    lines.append(f"기존 seed 중복: {sum(1 for r in rows if r['candidateStatus'] != 'NEW')}")
    lines.append("")
    lines.append("아티스트별 후보 수")
    lines.append("-" * 70)

    for artist in target_artists:
        artist_rows = [r for r in rows if r["artist"] == artist]
        new_count = sum(1 for r in artist_rows if r["candidateStatus"] == "NEW")
        lines.append(f"{artist}: 전체 {len(artist_rows)} / 신규 {new_count}")

    lines.append("")
    lines.append("신규 후보 TOP")
    lines.append("-" * 70)

    top_rows = [r for r in rows if r["candidateStatus"] == "NEW"][:80]

    if top_rows:
        for r in top_rows:
            lines.append(
                f"{r['artist']} | score={r['score']} | type={r['type']} | "
                f"views={r['views']} | {r['channelTitle']} | {r['title']} | {r['url']}"
            )
    else:
        lines.append("신규 후보 없음")

    lines.append("")
    lines.append("생성 파일")
    lines.append("-" * 70)
    lines.append(f"timestamp csv: {timestamp_csv}")
    lines.append(f"latest csv: {LATEST_CSV}")
    lines.append(f"latest json: {LATEST_JSON}")
    lines.append("")
    lines.append("주의")
    lines.append("- 이 스크립트는 후보만 생성한다.")
    lines.append("- youtube_seed_videos_v1.csv 원본은 수정하지 않는다.")
    lines.append("- 다음 단계에서 사람이 후보를 보고 seed에 반영할지 결정한다.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("YouTube seed discovery artist-list v2 완료")
    print("=" * 70)
    print(f"target artists: {len(target_artists)}")
    print(f"total candidates: {len(rows)}")
    print(f"new candidates: {sum(1 for r in rows if r['candidateStatus'] == 'NEW')}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()