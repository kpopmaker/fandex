import csv
import json
import os
from datetime import datetime


VERSION = "youtube_publish_v1"

INPUT_FILE = "youtube_video_metrics_v1.csv"
TEMPLATE_FILE = "youtube_video_metrics_v1_template.csv"

REQUIRED_FIELDS = [
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

POINT_WEIGHTS = {
    "viewPoint": 45.0,
    "likePoint": 25.0,
    "commentPoint": 20.0,
    "engagementPoint": 10.0,
}


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def to_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


def round_point(value):
    return round(float(value), 2)


def ensure_template():
    if os.path.exists(TEMPLATE_FILE):
        return

    rows = [
        {
            "artist": "아이유",
            "videoId": "example_iu_1",
            "title": "example title",
            "publishedAt": "2026-07-01",
            "viewCount": "1000000",
            "likeCount": "50000",
            "commentCount": "3000",
            "videoType": "official_mv",
            "sourceUrl": "https://www.youtube.com/watch?v=example_iu_1",
        },
        {
            "artist": "에이티즈",
            "videoId": "example_ateez_1",
            "title": "example title",
            "publishedAt": "2026-07-01",
            "viewCount": "800000",
            "likeCount": "70000",
            "commentCount": "6000",
            "videoType": "official_mv",
            "sourceUrl": "https://www.youtube.com/watch?v=example_ateez_1",
        },
    ]

    write_csv(TEMPLATE_FILE, rows, REQUIRED_FIELDS)


def validate_rows(rows):
    if not rows:
        raise ValueError(f"{INPUT_FILE} 안에 데이터가 없습니다.")

    missing_fields = [
        field for field in REQUIRED_FIELDS
        if field not in rows[0]
    ]

    if missing_fields:
        raise ValueError(f"필수 컬럼 누락: {', '.join(missing_fields)}")

    valid_rows = []
    skipped_rows = []

    for index, row in enumerate(rows, start=2):
        artist = (row.get("artist") or "").strip()
        video_id = (row.get("videoId") or "").strip()

        if not artist or not video_id:
            skipped_rows.append({
                "row": index,
                "reason": "artist 또는 videoId 누락",
            })
            continue

        valid_rows.append({
            "artist": artist,
            "videoId": video_id,
            "title": (row.get("title") or "").strip(),
            "publishedAt": (row.get("publishedAt") or "").strip(),
            "viewCount": to_float(row.get("viewCount")),
            "likeCount": to_float(row.get("likeCount")),
            "commentCount": to_float(row.get("commentCount")),
            "videoType": (row.get("videoType") or "").strip(),
            "sourceUrl": (row.get("sourceUrl") or "").strip(),
        })

    if not valid_rows:
        raise ValueError("유효한 유튜브 영상 데이터가 없습니다.")

    return valid_rows, skipped_rows


def aggregate_by_artist(rows):
    artist_map = {}

    for row in rows:
        artist = row["artist"]

        if artist not in artist_map:
            artist_map[artist] = {
                "artist": artist,
                "videoCount": 0,
                "totalViews": 0.0,
                "totalLikes": 0.0,
                "totalComments": 0.0,
                "videos": [],
            }

        item = artist_map[artist]
        item["videoCount"] += 1
        item["totalViews"] += row["viewCount"]
        item["totalLikes"] += row["likeCount"]
        item["totalComments"] += row["commentCount"]
        item["videos"].append(row)

    for item in artist_map.values():
        video_count = max(item["videoCount"], 1)
        total_views = max(item["totalViews"], 0.0)
        total_reactions = item["totalLikes"] + item["totalComments"]

        item["avgViews"] = total_views / video_count
        item["engagementPerThousandViews"] = (
            total_reactions / total_views * 1000
            if total_views > 0
            else 0.0
        )

        item["topVideo"] = sorted(
            item["videos"],
            key=lambda row: row["viewCount"],
            reverse=True,
        )[0]

    return list(artist_map.values())


def max_metric(items, key):
    value = max(to_float(item.get(key)) for item in items)
    return value if value > 0 else 1.0


def build_ranking(artist_items):
    max_views = max_metric(artist_items, "totalViews")
    max_likes = max_metric(artist_items, "totalLikes")
    max_comments = max_metric(artist_items, "totalComments")
    max_engagement = max_metric(artist_items, "engagementPerThousandViews")

    ranking = []

    for item in artist_items:
        view_point = item["totalViews"] / max_views * POINT_WEIGHTS["viewPoint"]
        like_point = item["totalLikes"] / max_likes * POINT_WEIGHTS["likePoint"]
        comment_point = item["totalComments"] / max_comments * POINT_WEIGHTS["commentPoint"]
        engagement_point = (
            item["engagementPerThousandViews"]
            / max_engagement
            * POINT_WEIGHTS["engagementPoint"]
        )

        final_point = view_point + like_point + comment_point + engagement_point

        ranking.append({
            "artist": item["artist"],
            "fandexYoutubeFinalPoint": round_point(final_point),
            "coreSignal": detect_core_signal(
                view_point,
                like_point,
                comment_point,
                engagement_point,
            ),
            "components": {
                "viewPoint": round_point(view_point),
                "likePoint": round_point(like_point),
                "commentPoint": round_point(comment_point),
                "engagementPoint": round_point(engagement_point),
            },
            "rawMetrics": {
                "videoCount": item["videoCount"],
                "totalViews": int(item["totalViews"]),
                "totalLikes": int(item["totalLikes"]),
                "totalComments": int(item["totalComments"]),
                "avgViews": round_point(item["avgViews"]),
                "engagementPerThousandViews": round_point(
                    item["engagementPerThousandViews"]
                ),
            },
            "topVideo": {
                "videoId": item["topVideo"]["videoId"],
                "title": item["topVideo"]["title"],
                "publishedAt": item["topVideo"]["publishedAt"],
                "viewCount": int(item["topVideo"]["viewCount"]),
                "sourceUrl": item["topVideo"]["sourceUrl"],
            },
            "meta": {
                "scoreVersion": VERSION,
                "pointWeights": POINT_WEIGHTS,
                "normalization": "batch max normalization by metric",
            },
        })

    ranking.sort(key=lambda row: row["fandexYoutubeFinalPoint"], reverse=True)

    for index, row in enumerate(ranking, start=1):
        row["rank"] = index

    return ranking


def detect_core_signal(view_point, like_point, comment_point, engagement_point):
    signals = [
        ("조회 규모", view_point),
        ("좋아요 반응", like_point),
        ("댓글 반응", comment_point),
        ("참여율", engagement_point),
    ]

    return sorted(signals, key=lambda item: item[1], reverse=True)[0][0]


def build_reports(ranking, artist_items):
    artist_item_map = {
        item["artist"]: item
        for item in artist_items
    }

    reports = []

    for ranking_item in ranking:
        artist = ranking_item["artist"]
        item = artist_item_map[artist]
        videos = sorted(
            item["videos"],
            key=lambda row: row["viewCount"],
            reverse=True,
        )

        reports.append({
            "rank": ranking_item["rank"],
            "artist": artist,
            "fandexYoutubeFinalPoint": ranking_item["fandexYoutubeFinalPoint"],
            "coreSignal": ranking_item["coreSignal"],
            "components": ranking_item["components"],
            "rawMetrics": ranking_item["rawMetrics"],
            "topVideos": [
                {
                    "videoId": video["videoId"],
                    "title": video["title"],
                    "publishedAt": video["publishedAt"],
                    "viewCount": int(video["viewCount"]),
                    "likeCount": int(video["likeCount"]),
                    "commentCount": int(video["commentCount"]),
                    "videoType": video["videoType"],
                    "sourceUrl": video["sourceUrl"],
                }
                for video in videos[:5]
            ],
            "meta": ranking_item["meta"],
        })

    return reports


def print_preview(ranking):
    print()
    print("YouTube ranking 미리보기")
    print("-" * 60)

    for item in ranking:
        metrics = item["rawMetrics"]
        print(
            f"{item['rank']}위. {item['artist']} "
            f"- YouTube {item['fandexYoutubeFinalPoint']}점 "
            f"/ 조회수 {metrics['totalViews']} "
            f"/ 좋아요 {metrics['totalLikes']} "
            f"/ 댓글 {metrics['totalComments']}"
        )


def main():
    ensure_template()

    print()
    print("YouTube publish v1 생성 시작")
    print("=" * 60)

    if not os.path.exists(INPUT_FILE):
        print(f"{INPUT_FILE} 파일이 없습니다.")
        print(f"{TEMPLATE_FILE} 파일을 복사해서 {INPUT_FILE} 이름으로 만든 뒤 데이터를 채워주세요.")
        raise SystemExit(1)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    created_at = datetime.now().isoformat(timespec="seconds")

    rows = read_csv(INPUT_FILE)
    valid_rows, skipped_rows = validate_rows(rows)
    artist_items = aggregate_by_artist(valid_rows)
    ranking = build_ranking(artist_items)
    reports = build_reports(ranking, artist_items)

    ranking_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "inputFile": INPUT_FILE,
        "ranking": ranking,
    }

    report_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "inputFile": INPUT_FILE,
        "reports": reports,
    }

    ranking_timestamp_file = f"fandex_youtube_ranking_v1_{now}.json"
    report_timestamp_file = f"fandex_youtube_artist_reports_v1_{now}.json"
    audit_file = f"fandex_youtube_publish_v1_audit_{now}.csv"

    write_json(ranking_timestamp_file, ranking_payload)
    write_json("fandex_youtube_ranking_v1_latest.json", ranking_payload)

    write_json(report_timestamp_file, report_payload)
    write_json("fandex_youtube_artist_reports_v1_latest.json", report_payload)

    audit_rows = []
    for item in ranking:
        metrics = item["rawMetrics"]
        components = item["components"]
        audit_rows.append({
            "rank": item["rank"],
            "artist": item["artist"],
            "fandexYoutubeFinalPoint": item["fandexYoutubeFinalPoint"],
            "coreSignal": item["coreSignal"],
            "videoCount": metrics["videoCount"],
            "totalViews": metrics["totalViews"],
            "totalLikes": metrics["totalLikes"],
            "totalComments": metrics["totalComments"],
            "engagementPerThousandViews": metrics["engagementPerThousandViews"],
            "viewPoint": components["viewPoint"],
            "likePoint": components["likePoint"],
            "commentPoint": components["commentPoint"],
            "engagementPoint": components["engagementPoint"],
        })

    write_csv(
        audit_file,
        audit_rows,
        [
            "rank",
            "artist",
            "fandexYoutubeFinalPoint",
            "coreSignal",
            "videoCount",
            "totalViews",
            "totalLikes",
            "totalComments",
            "engagementPerThousandViews",
            "viewPoint",
            "likePoint",
            "commentPoint",
            "engagementPoint",
        ],
    )

    if skipped_rows:
        skipped_file = f"fandex_youtube_publish_v1_skipped_{now}.csv"
        write_csv(skipped_file, skipped_rows, ["row", "reason"])
        print(f"건너뛴 행 파일: {skipped_file}")

    print_preview(ranking)

    print()
    print("=" * 60)
    print("YouTube publish v1 생성 완료")
    print("=" * 60)
    print(f"타임스탬프 ranking JSON: {ranking_timestamp_file}")
    print("최신 ranking JSON: fandex_youtube_ranking_v1_latest.json")
    print(f"타임스탬프 report JSON: {report_timestamp_file}")
    print("최신 report JSON: fandex_youtube_artist_reports_v1_latest.json")
    print(f"감사 CSV: {audit_file}")


if __name__ == "__main__":
    main()
