import csv
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime


VERSION = "youtube_collect_video_metrics_v1"

INPUT_FILE = "youtube_seed_videos_v1.csv"
TEMPLATE_FILE = "youtube_seed_videos_v1_template.csv"
OUTPUT_FILE = "youtube_video_metrics_v1.csv"

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"

SEED_FIELDS = [
    "artist",
    "videoId",
    "sourceUrl",
    "videoType",
    "memo",
]

OUTPUT_FIELDS = [
    "artist",
    "videoId",
    "title",
    "publishedAt",
    "viewCount",
    "likeCount",
    "commentCount",
    "videoType",
    "sourceUrl",
]


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def ensure_template():
    if os.path.exists(TEMPLATE_FILE):
        return

    rows = [
        {
            "artist": "아이유",
            "videoId": "",
            "sourceUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
            "videoType": "official_mv",
            "memo": "",
        },
        {
            "artist": "에이티즈",
            "videoId": "",
            "sourceUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
            "videoType": "official_mv",
            "memo": "",
        },
        {
            "artist": "보이넥스트도어",
            "videoId": "",
            "sourceUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
            "videoType": "official_mv",
            "memo": "",
        },
        {
            "artist": "에스파",
            "videoId": "",
            "sourceUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
            "videoType": "official_mv",
            "memo": "",
        },
    ]

    write_csv(TEMPLATE_FILE, rows, SEED_FIELDS)


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def clean_text(value):
    return (value or "").strip()


def extract_video_id(value):
    text = clean_text(value)
    if not text:
        return ""

    if re.fullmatch(r"[A-Za-z0-9_-]{11}", text):
        return text

    parsed = urllib.parse.urlparse(text)
    host = parsed.netloc.lower()
    path = parsed.path.strip("/")

    if "youtu.be" in host:
        candidate = path.split("/")[0]
        return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else ""

    if "youtube.com" in host:
        query = urllib.parse.parse_qs(parsed.query)
        if query.get("v"):
            candidate = query["v"][0]
            return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else ""

        path_parts = path.split("/")
        if len(path_parts) >= 2 and path_parts[0] in ["shorts", "embed", "live"]:
            candidate = path_parts[1]
            return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else ""

    return ""


def normalize_seed_rows(rows):
    missing_fields = [
        field for field in SEED_FIELDS
        if rows and field not in rows[0]
    ]

    if missing_fields:
        raise ValueError(f"필수 컬럼 누락: {', '.join(missing_fields)}")

    normalized = []
    skipped = []
    seen_video_ids = set()

    for row_number, row in enumerate(rows, start=2):
        artist = clean_text(row.get("artist"))
        video_id = extract_video_id(row.get("videoId"))
        source_url = clean_text(row.get("sourceUrl"))
        url_video_id = extract_video_id(source_url)
        video_type = clean_text(row.get("videoType")) or "unknown"
        memo = clean_text(row.get("memo"))

        if not video_id:
            video_id = url_video_id

        if not artist:
            skipped.append({
                "row": row_number,
                "artist": artist,
                "videoId": video_id,
                "sourceUrl": source_url,
                "reason": "artist 누락",
            })
            continue

        if not video_id:
            skipped.append({
                "row": row_number,
                "artist": artist,
                "videoId": video_id,
                "sourceUrl": source_url,
                "reason": "videoId 추출 실패",
            })
            continue

        if video_id in seen_video_ids:
            skipped.append({
                "row": row_number,
                "artist": artist,
                "videoId": video_id,
                "sourceUrl": source_url,
                "reason": "중복 videoId",
            })
            continue

        seen_video_ids.add(video_id)

        normalized.append({
            "artist": artist,
            "videoId": video_id,
            "sourceUrl": source_url or f"https://www.youtube.com/watch?v={video_id}",
            "videoType": video_type,
            "memo": memo,
            "row": row_number,
        })

    if not normalized:
        raise ValueError("수집할 유효한 유튜브 영상이 없습니다.")

    return normalized, skipped


def get_api_key():
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if api_key:
        return api_key

    raise EnvironmentError(
        "YOUTUBE_API_KEY 환경변수가 없습니다. "
        "CMD에서 set YOUTUBE_API_KEY=발급받은_API_KEY 를 먼저 실행하세요."
    )


def request_youtube_videos(api_key, video_ids):
    params = {
        "part": "snippet,statistics",
        "id": ",".join(video_ids),
        "key": api_key,
        "maxResults": "50",
    }

    url = YOUTUBE_API_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-youtube-collector-v1",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"YouTube API HTTP {e.code}: {body}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"YouTube API 연결 실패: {e}") from e


def to_int(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def collect_video_metrics(seed_rows, api_key):
    seed_by_video_id = {
        row["videoId"]: row
        for row in seed_rows
    }

    output_rows = []
    raw_batches = []
    missing_rows = []

    for video_id_batch in chunked(list(seed_by_video_id.keys()), 50):
        response = request_youtube_videos(api_key, video_id_batch)
        raw_batches.append(response)

        returned_ids = set()

        for item in response.get("items", []):
            video_id = item.get("id", "")
            returned_ids.add(video_id)

            seed = seed_by_video_id.get(video_id, {})
            snippet = item.get("snippet", {})
            statistics = item.get("statistics", {})

            output_rows.append({
                "artist": seed.get("artist", ""),
                "videoId": video_id,
                "title": snippet.get("title", ""),
                "publishedAt": snippet.get("publishedAt", ""),
                "viewCount": to_int(statistics.get("viewCount")),
                "likeCount": to_int(statistics.get("likeCount")),
                "commentCount": to_int(statistics.get("commentCount")),
                "videoType": seed.get("videoType", "unknown"),
                "sourceUrl": seed.get("sourceUrl") or f"https://www.youtube.com/watch?v={video_id}",
            })

        for video_id in video_id_batch:
            if video_id not in returned_ids:
                seed = seed_by_video_id[video_id]
                missing_rows.append({
                    "row": seed.get("row", ""),
                    "artist": seed.get("artist", ""),
                    "videoId": video_id,
                    "sourceUrl": seed.get("sourceUrl", ""),
                    "reason": "YouTube API 응답에서 videoId 없음",
                })

    output_rows.sort(
        key=lambda row: (row["artist"], -row["viewCount"], row["videoId"])
    )

    return output_rows, raw_batches, missing_rows


def print_preview(rows):
    print()
    print("YouTube 수집 결과 미리보기")
    print("-" * 60)

    for row in rows[:20]:
        print(
            f"{row['artist']} / {row['title']} "
            f"/ 조회수 {row['viewCount']} "
            f"/ 좋아요 {row['likeCount']} "
            f"/ 댓글 {row['commentCount']}"
        )

    if len(rows) > 20:
        print(f"... 외 {len(rows) - 20}개")


def main():
    ensure_template()

    print()
    print("YouTube video metrics 수집 v1 시작")
    print("=" * 60)

    if not os.path.exists(INPUT_FILE):
        print(f"{INPUT_FILE} 파일이 없습니다.")
        print(f"{TEMPLATE_FILE} 파일을 복사해서 {INPUT_FILE} 이름으로 만든 뒤 영상 URL을 채우세요.")
        print()
        print("명령어:")
        print(f"copy {TEMPLATE_FILE} {INPUT_FILE}")
        raise SystemExit(1)

    api_key = get_api_key()

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    seed_rows = read_csv(INPUT_FILE)
    normalized_rows, skipped_rows = normalize_seed_rows(seed_rows)
    output_rows, raw_batches, missing_rows = collect_video_metrics(
        normalized_rows,
        api_key,
    )

    if not output_rows:
        raise SystemExit("수집된 유튜브 영상 데이터가 없습니다.")

    timestamp_output_file = f"youtube_video_metrics_v1_{now}.csv"
    raw_json_file = f"youtube_video_metrics_v1_raw_{now}.json"

    write_csv(timestamp_output_file, output_rows, OUTPUT_FIELDS)
    write_csv(OUTPUT_FILE, output_rows, OUTPUT_FIELDS)

    write_json(raw_json_file, {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "inputFile": INPUT_FILE,
        "outputFile": OUTPUT_FILE,
        "rawBatches": raw_batches,
    })

    rejected_rows = skipped_rows + missing_rows
    if rejected_rows:
        rejected_file = f"youtube_video_metrics_v1_rejected_{now}.csv"
        write_csv(
            rejected_file,
            rejected_rows,
            ["row", "artist", "videoId", "sourceUrl", "reason"],
        )
        print(f"제외/누락 행 파일: {rejected_file}")

    print_preview(output_rows)

    print()
    print("=" * 60)
    print("YouTube video metrics 수집 v1 완료")
    print("=" * 60)
    print(f"타임스탬프 CSV: {timestamp_output_file}")
    print(f"최신 CSV: {OUTPUT_FILE}")
    print(f"원본 API 응답 JSON: {raw_json_file}")
    print()
    print("다음 실행:")
    print("py youtube_publish_v2.py")
    print("py music_chart_publish_v1.py")
    print("py fandex_master_score_v6.py")
    print()
    print("또는 전체 publish:")
    print("py fandex_publish_all_v5.py")
    print("py fandex_publish_all_v5.py --refresh-youtube")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print()
        print("YouTube video metrics 수집 실패")
        print(f"원인: {e}")
        sys.exit(1)
