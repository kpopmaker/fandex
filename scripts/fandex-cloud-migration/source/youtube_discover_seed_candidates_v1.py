import csv
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "youtube_discover_seed_candidates_v1"

EXISTING_SEED_FILE = Path("youtube_seed_videos_v1.csv")
QUERY_SEED_FILE = Path("youtube_discovery_query_seed_v1.csv")

LATEST_CSV = Path("youtube_seed_candidates_v1_latest.csv")
LATEST_JSON = Path("fandex_youtube_seed_candidates_latest.json")
LATEST_REPORT = Path("FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT.txt")

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

REQUEST_SLEEP_SECONDS = 0.3


DEFAULT_QUERY_ROWS = [
    {"artist": "아이유", "query": "IU Love wins all official", "videoTypeHint": "official_mv", "memo": "official track/MV"},
    {"artist": "아이유", "query": "IU Love wins all live", "videoTypeHint": "live_clip", "memo": "live clip"},
    {"artist": "아이유", "query": "IU Love wins all shorts", "videoTypeHint": "shorts", "memo": "shortform"},

    {"artist": "에이티즈", "query": "ATEEZ BAD official", "videoTypeHint": "official_mv", "memo": "official track/MV"},
    {"artist": "에이티즈", "query": "ATEEZ BAD dance practice", "videoTypeHint": "dance_practice", "memo": "dance practice"},
    {"artist": "에이티즈", "query": "ATEEZ BAD shorts", "videoTypeHint": "shorts", "memo": "shortform"},

    {"artist": "보이넥스트도어", "query": "BOYNEXTDOOR VIRAL official", "videoTypeHint": "official_mv", "memo": "official track/MV"},
    {"artist": "보이넥스트도어", "query": "BOYNEXTDOOR VIRAL dance practice", "videoTypeHint": "dance_practice", "memo": "dance practice"},
    {"artist": "보이넥스트도어", "query": "BOYNEXTDOOR VIRAL shorts", "videoTypeHint": "shorts", "memo": "shortform"},

    {"artist": "에스파", "query": "aespa LEMONADE official", "videoTypeHint": "official_mv", "memo": "official track/MV"},
    {"artist": "에스파", "query": "aespa LEMONADE performance", "videoTypeHint": "performance_video", "memo": "performance"},
    {"artist": "에스파", "query": "aespa LEMONADE shorts", "videoTypeHint": "shorts", "memo": "shortform"},
]


def get_api_key():
    api_key = (os.environ.get("YOUTUBE_API_KEY") or "").strip()

    bad_values = {
        "",
        "실제_API_KEY",
        "진짜_키",
        "YOUR_API_KEY",
        "발급받은_진짜_API_KEY",
        "YOUTUBE_API_KEY",
    }

    if api_key in bad_values:
        raise SystemExit(
            "YOUTUBE_API_KEY가 설정되지 않았습니다.\n\n"
            "먼저 CMD에서 아래처럼 설정하세요.\n"
            "set YOUTUBE_API_KEY=발급받은_진짜_YouTube_API_KEY\n\n"
            "주의: API 키를 채팅에 붙여넣지 마세요."
        )

    return api_key


def ensure_query_seed_file():
    if QUERY_SEED_FILE.exists():
        return

    fieldnames = ["artist", "query", "videoTypeHint", "memo"]

    with open(QUERY_SEED_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(DEFAULT_QUERY_ROWS)

    print(f"query seed 파일 생성: {QUERY_SEED_FILE}")


def read_query_rows():
    ensure_query_seed_file()

    with open(QUERY_SEED_FILE, "r", encoding="utf-8-sig", newline="") as f:
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
            "videoTypeHint": (row.get("videoTypeHint") or "").strip(),
            "memo": (row.get("memo") or "").strip(),
        })

    return cleaned


def extract_video_id_from_url(url):
    url = (url or "").strip()

    patterns = [
        r"youtu\.be/([A-Za-z0-9_-]{11})",
        r"youtube\.com/watch\?v=([A-Za-z0-9_-]{11})",
        r"youtube\.com/shorts/([A-Za-z0-9_-]{11})",
        r"youtube\.com/embed/([A-Za-z0-9_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return ""


def read_existing_video_ids():
    existing = set()

    if not EXISTING_SEED_FILE.exists():
        return existing

    with open(EXISTING_SEED_FILE, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        video_id = (row.get("videoId") or "").strip()
        source_url = (row.get("sourceUrl") or "").strip()

        if video_id:
            existing.add(video_id)

        extracted = extract_video_id_from_url(source_url)
        if extracted:
            existing.add(extracted)

    return existing


def youtube_get(url, params):
    query = urllib.parse.urlencode(params)
    request_url = f"{url}?{query}"

    request = urllib.request.Request(
        request_url,
        headers={
            "User-Agent": "FANDEXPythonCollector/1.0",
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")

    data = json.loads(body)

    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(json.dumps(data["error"], ensure_ascii=False))

    return data, request_url


def search_youtube(api_key, query):
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 5,
        "order": "relevance",
        "key": api_key,
    }

    data, request_url = youtube_get(YOUTUBE_SEARCH_URL, params)

    items = data.get("items") or []

    results = []

    for item in items:
        video_id = (((item.get("id") or {}).get("videoId")) or "").strip()
        snippet = item.get("snippet") or {}

        if not video_id:
            continue

        results.append({
            "videoId": video_id,
            "title": snippet.get("title", ""),
            "channelTitle": snippet.get("channelTitle", ""),
            "publishedAt": snippet.get("publishedAt", ""),
            "description": snippet.get("description", ""),
            "searchRequestUrl": request_url,
        })

    return results


def fetch_video_stats(api_key, video_ids):
    if not video_ids:
        return {}

    params = {
        "part": "snippet,statistics,contentDetails",
        "id": ",".join(video_ids),
        "key": api_key,
    }

    data, request_url = youtube_get(YOUTUBE_VIDEOS_URL, params)

    stats_map = {}

    for item in data.get("items") or []:
        video_id = item.get("id", "")
        snippet = item.get("snippet") or {}
        stats = item.get("statistics") or {}
        details = item.get("contentDetails") or {}

        stats_map[video_id] = {
            "videoId": video_id,
            "title": snippet.get("title", ""),
            "channelTitle": snippet.get("channelTitle", ""),
            "publishedAt": snippet.get("publishedAt", ""),
            "duration": details.get("duration", ""),
            "viewCount": int(stats.get("viewCount") or 0),
            "likeCount": int(stats.get("likeCount") or 0),
            "commentCount": int(stats.get("commentCount") or 0),
            "videoRequestUrl": request_url,
        }

    return stats_map


def infer_video_type(title, query_hint):
    title_l = (title or "").lower()
    hint = (query_hint or "").strip()

    if "shorts" in title_l or "#shorts" in title_l or hint == "shorts":
        return "shorts"

    if "dance practice" in title_l or hint == "dance_practice":
        return "dance_practice"

    if "performance" in title_l or hint == "performance_video":
        return "performance_video"

    if "live" in title_l or hint == "live_clip":
        return "live_clip"

    if "behind" in title_l or "bts" in title_l:
        return "behind"

    if "official" in title_l or "mv" in title_l or hint == "official_mv":
        return "official_mv"

    return hint or "external_content"


def score_candidate(row):
    score = 0

    title = (row.get("title") or "").lower()
    channel = (row.get("channelTitle") or "").lower()
    video_type = row.get("suggestedVideoType") or ""

    view_count = int(row.get("viewCount") or 0)
    like_count = int(row.get("likeCount") or 0)
    comment_count = int(row.get("commentCount") or 0)

    if "official" in title or "mv" in title:
        score += 30

    if any(token in channel for token in ["hybe", "smtown", "ateez", "iu", "boynextdoor", "aespa", "kq"]):
        score += 30

    if video_type in {"official_mv", "performance_video", "dance_practice", "live_clip"}:
        score += 20

    if view_count >= 10_000_000:
        score += 30
    elif view_count >= 1_000_000:
        score += 20
    elif view_count >= 100_000:
        score += 10

    if like_count >= 100_000:
        score += 15
    elif like_count >= 10_000:
        score += 8

    if comment_count >= 10_000:
        score += 10
    elif comment_count >= 1_000:
        score += 5

    return score


def write_csv(rows, timestamp):
    timestamp_csv = Path(f"youtube_seed_candidates_v1_{timestamp}.csv")

    fieldnames = [
        "artist",
        "query",
        "videoId",
        "sourceUrl",
        "title",
        "channelTitle",
        "publishedAt",
        "duration",
        "viewCount",
        "likeCount",
        "commentCount",
        "suggestedVideoType",
        "candidateScore",
        "alreadyInSeed",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return timestamp_csv


def write_json(rows, timestamp):
    timestamp_json = Path(f"fandex_youtube_seed_candidates_v1_{timestamp}.json")

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "note": "Candidate discovery only. Existing youtube_seed_videos_v1.csv is not modified.",
        "candidateCount": len(rows),
        "candidates": rows,
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return timestamp_json


def write_report(rows, timestamp):
    timestamp_report = Path(f"FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT_{timestamp}.txt")

    lines = []

    lines.append("FANDEX YouTube Seed Discovery Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("후보 요약")
    lines.append("-" * 70)

    new_rows = [row for row in rows if row["alreadyInSeed"] == "no"]
    old_rows = [row for row in rows if row["alreadyInSeed"] == "yes"]

    lines.append(f"전체 후보: {len(rows)}")
    lines.append(f"신규 후보: {len(new_rows)}")
    lines.append(f"기존 seed 중복: {len(old_rows)}")
    lines.append("")

    lines.append("신규 후보 TOP")
    lines.append("-" * 70)

    top_new = sorted(
        new_rows,
        key=lambda row: int(row["candidateScore"] or 0),
        reverse=True,
    )[:20]

    for row in top_new:
        lines.append(
            f"{row['artist']} | score={row['candidateScore']} | "
            f"type={row['suggestedVideoType']} | views={row['viewCount']} | "
            f"{row['channelTitle']} | {row['title']} | {row['sourceUrl']}"
        )

    lines.append("")
    lines.append("주의")
    lines.append("- 이 스크립트는 후보만 생성한다.")
    lines.append("- youtube_seed_videos_v1.csv 원본은 수정하지 않는다.")
    lines.append("- 다음 단계에서 사람이 후보를 보고 seed에 반영할지 결정한다.")

    text = "\n".join(lines)

    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text(text, encoding="utf-8")

    return timestamp_report


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("YouTube seed candidates discovery v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: youtube_seed_videos_v1.csv 원본은 수정하지 않습니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    api_key = get_api_key()
    query_rows = read_query_rows()
    existing_ids = read_existing_video_ids()

    print(f"query rows: {len(query_rows)}")
    print(f"existing seed video ids: {len(existing_ids)}")
    print()

    discovered = {}

    for index, query_row in enumerate(query_rows, start=1):
        artist = query_row["artist"]
        query = query_row["query"]
        hint = query_row["videoTypeHint"]

        print(f"[{index}/{len(query_rows)}] {artist} / {query}")

        try:
            search_results = search_youtube(api_key, query)
            video_ids = [item["videoId"] for item in search_results]
            stats_map = fetch_video_stats(api_key, video_ids)

            for item in search_results:
                video_id = item["videoId"]
                stats = stats_map.get(video_id, {})

                title = stats.get("title") or item.get("title", "")
                channel = stats.get("channelTitle") or item.get("channelTitle", "")
                suggested_type = infer_video_type(title, hint)

                row = {
                    "artist": artist,
                    "query": query,
                    "videoId": video_id,
                    "sourceUrl": f"https://www.youtube.com/watch?v={video_id}",
                    "title": title,
                    "channelTitle": channel,
                    "publishedAt": stats.get("publishedAt") or item.get("publishedAt", ""),
                    "duration": stats.get("duration", ""),
                    "viewCount": stats.get("viewCount", 0),
                    "likeCount": stats.get("likeCount", 0),
                    "commentCount": stats.get("commentCount", 0),
                    "suggestedVideoType": suggested_type,
                    "candidateScore": 0,
                    "alreadyInSeed": "yes" if video_id in existing_ids else "no",
                    "memo": query_row["memo"],
                }

                row["candidateScore"] = score_candidate(row)

                key = (artist, video_id)

                if key not in discovered:
                    discovered[key] = row
                else:
                    if row["candidateScore"] > discovered[key]["candidateScore"]:
                        discovered[key] = row

            print(f"  -> candidates: {len(search_results)}")

        except Exception as exc:
            print(f"  -> ERROR: {exc}")

        if index < len(query_rows):
            time.sleep(REQUEST_SLEEP_SECONDS)

    rows = list(discovered.values())
    rows.sort(
        key=lambda row: (
            row["artist"],
            row["alreadyInSeed"],
            -int(row["candidateScore"] or 0),
        )
    )

    timestamp_csv = write_csv(rows, timestamp)
    timestamp_json = write_json(rows, timestamp)
    timestamp_report = write_report(rows, timestamp)

    print()
    print("=" * 70)
    print("YouTube seed candidates discovery v1 완료")
    print("=" * 70)
    print(f"타임스탬프 CSV: {timestamp_csv}")
    print(f"최신 CSV: {LATEST_CSV}")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 리포트: {timestamp_report}")
    print(f"최신 리포트: {LATEST_REPORT}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT.txt")
    print("notepad youtube_seed_candidates_v1_latest.csv")


if __name__ == "__main__":
    main()