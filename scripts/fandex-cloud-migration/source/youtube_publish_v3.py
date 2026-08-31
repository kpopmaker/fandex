import csv
import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "youtube_publish_v3_uncapped_additive_scaled"

METRICS_FILE = Path("youtube_video_metrics_v1.csv")

LATEST_RANKING_JSON = Path("fandex_youtube_ranking_v3_latest.json")
LATEST_REPORTS_JSON = Path("fandex_youtube_artist_reports_v3_latest.json")
LATEST_AUDIT_CSV = Path("fandex_youtube_publish_v3_audit_latest.csv")

SCALE_FACTOR = 0.12

TYPE_MULTIPLIERS = {
    "official_mv": 1.30,
    "performance_video": 1.15,
    "dance_practice": 1.10,
    "live_clip": 1.15,
    "broadcast_clip": 1.05,
    "external_content": 0.90,
    "behind": 0.80,
    "shorts": 0.65,
    "challenge": 0.65,
}

CATEGORY_MAP = {
    "official_mv": "official_music",
    "performance_video": "official_music",
    "dance_practice": "official_music",
    "live_clip": "official_music",
    "broadcast_clip": "broadcast",
    "external_content": "external_spread",
    "behind": "fandom_content",
    "shorts": "shortform",
    "challenge": "shortform",
}

OFFICIAL_CHANNEL_HINTS = [
    "iu official",
    "이지금",
    "ateez",
    "boynextdoor",
    "aespa",
    "smtown",
    "hybe",
    "kq",
]

BROADCAST_CHANNEL_HINTS = [
    "sbskpop",
    "inkigayo",
    "kbs kpop",
    "mbckpop",
    "music bank",
    "musiccore",
]

LOW_TRUST_CHANNEL_HINTS = [
    "lyrics",
    "가사",
    "fan channel",
]


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def to_int(value):
    try:
        return int(str(value).replace(",", "").strip())
    except Exception:
        return 0


def get_first(row, keys, default=""):
    for key in keys:
        if key in row and row[key] not in [None, ""]:
            return row[key]
    return default


def log_points(value, weight):
    value = to_int(value)
    if value <= 0:
        return 0.0
    return (math.log10(value + 1) ** 2) * weight


def channel_multiplier(channel_title):
    channel = (channel_title or "").lower()

    if any(hint in channel for hint in LOW_TRUST_CHANNEL_HINTS):
        return 0.35

    if any(hint in channel for hint in OFFICIAL_CHANNEL_HINTS):
        return 1.12

    if any(hint in channel for hint in BROADCAST_CHANNEL_HINTS):
        return 1.05

    return 1.0


def type_multiplier(video_type):
    return TYPE_MULTIPLIERS.get(video_type or "", 0.85)


def category_of(video_type):
    return CATEGORY_MAP.get(video_type or "", "other")


def calculate_video_point(row):
    video_type = get_first(row, ["videoType", "suggestedVideoType"], "")
    channel_title = get_first(row, ["channelTitle", "channel"], "")

    views = to_int(get_first(row, ["viewCount", "views"], 0))
    likes = to_int(get_first(row, ["likeCount", "likes"], 0))
    comments = to_int(get_first(row, ["commentCount", "comments"], 0))

    view_point = log_points(views, 0.90)
    like_point = log_points(likes, 0.55)
    comment_point = log_points(comments, 0.35)

    base_point = view_point + like_point + comment_point

    tm = type_multiplier(video_type)
    cm = channel_multiplier(channel_title)

    raw_video_point = base_point * tm * cm
    final_video_point = raw_video_point * SCALE_FACTOR

    return {
        "viewPoint": round(view_point, 4),
        "likePoint": round(like_point, 4),
        "commentPoint": round(comment_point, 4),
        "basePoint": round(base_point, 4),
        "typeMultiplier": tm,
        "channelMultiplier": cm,
        "rawVideoPoint": round(raw_video_point, 4),
        "finalVideoPoint": round(final_video_point, 4),
    }


def label_top_category(category_breakdown):
    if not category_breakdown:
        return "데이터 없음"

    top = max(category_breakdown.items(), key=lambda item: item[1])[0]

    labels = {
        "official_music": "공식 음악 콘텐츠",
        "broadcast": "방송 무대 확산",
        "external_spread": "외부 확산 콘텐츠",
        "fandom_content": "팬덤 콘텐츠",
        "shortform": "숏폼 확산",
        "other": "기타",
    }

    return labels.get(top, top)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("YouTube publish v3 생성 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"scaleFactor: {SCALE_FACTOR}")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    rows = read_csv(METRICS_FILE)

    audit_rows = []

    artist_raw_totals = defaultdict(float)
    artist_final_totals = defaultdict(float)
    artist_counts = defaultdict(int)
    category_raw_totals = defaultdict(lambda: defaultdict(float))
    category_final_totals = defaultdict(lambda: defaultdict(float))
    type_counts = defaultdict(lambda: defaultdict(int))
    view_totals = defaultdict(int)
    like_totals = defaultdict(int)
    comment_totals = defaultdict(int)
    videos_by_artist = defaultdict(list)

    for row in rows:
        artist = get_first(row, ["artist"], "").strip()
        video_id = get_first(row, ["videoId"], "").strip()
        video_type = get_first(row, ["videoType", "suggestedVideoType"], "").strip()
        title = get_first(row, ["title"], "")
        channel = get_first(row, ["channelTitle", "channel"], "")

        views = to_int(get_first(row, ["viewCount", "views"], 0))
        likes = to_int(get_first(row, ["likeCount", "likes"], 0))
        comments = to_int(get_first(row, ["commentCount", "comments"], 0))

        point_info = calculate_video_point(row)
        raw_point = point_info["rawVideoPoint"]
        final_point = point_info["finalVideoPoint"]
        category = category_of(video_type)

        artist_raw_totals[artist] += raw_point
        artist_final_totals[artist] += final_point
        artist_counts[artist] += 1
        category_raw_totals[artist][category] += raw_point
        category_final_totals[artist][category] += final_point
        type_counts[artist][video_type] += 1
        view_totals[artist] += views
        like_totals[artist] += likes
        comment_totals[artist] += comments

        video_payload = {
            "artist": artist,
            "videoId": video_id,
            "videoType": video_type,
            "category": category,
            "title": title,
            "channelTitle": channel,
            "viewCount": views,
            "likeCount": likes,
            "commentCount": comments,
            "rawVideoPoint": raw_point,
            "finalVideoPoint": final_point,
        }

        videos_by_artist[artist].append(video_payload)

        audit_rows.append({
            "artist": artist,
            "videoId": video_id,
            "videoType": video_type,
            "category": category,
            "title": title,
            "channelTitle": channel,
            "viewCount": views,
            "likeCount": likes,
            "commentCount": comments,
            "viewPoint": point_info["viewPoint"],
            "likePoint": point_info["likePoint"],
            "commentPoint": point_info["commentPoint"],
            "basePoint": point_info["basePoint"],
            "typeMultiplier": point_info["typeMultiplier"],
            "channelMultiplier": point_info["channelMultiplier"],
            "rawVideoPoint": raw_point,
            "scaleFactor": SCALE_FACTOR,
            "finalVideoPoint": final_point,
        })

    ranking = []
    reports = {}

    for artist in sorted(artist_final_totals.keys()):
        raw_total = artist_raw_totals[artist]
        final_total = artist_final_totals[artist]

        final_breakdown = {
            category: round(point, 4)
            for category, point in sorted(category_final_totals[artist].items())
        }

        raw_breakdown = {
            category: round(point, 4)
            for category, point in sorted(category_raw_totals[artist].items())
        }

        video_type_count = {
            video_type: count
            for video_type, count in sorted(type_counts[artist].items())
        }

        top_signal = label_top_category(final_breakdown)

        ranking_item = {
            "artist": artist,
            "youtubePoint": round(final_total, 2),
            "youtubeRawPoint": round(raw_total, 4),
            "cumulativePoint": round(final_total, 2),
            "score": round(final_total, 2),
            "videoCount": artist_counts[artist],
            "viewCountTotal": view_totals[artist],
            "likeCountTotal": like_totals[artist],
            "commentCountTotal": comment_totals[artist],
            "topSignal": top_signal,
            "categoryBreakdown": final_breakdown,
            "rawCategoryBreakdown": raw_breakdown,
            "videoTypeCount": video_type_count,
        }

        ranking.append(ranking_item)

        top_videos = sorted(
            videos_by_artist[artist],
            key=lambda item: item["finalVideoPoint"],
            reverse=True,
        )[:10]

        reports[artist] = {
            "artist": artist,
            "version": VERSION,
            "youtubePoint": round(final_total, 2),
            "youtubeRawPoint": round(raw_total, 4),
            "scoreMode": "uncapped_additive_log_points_scaled",
            "scaleFactor": SCALE_FACTOR,
            "topSignal": top_signal,
            "videoCount": artist_counts[artist],
            "viewCountTotal": view_totals[artist],
            "likeCountTotal": like_totals[artist],
            "commentCountTotal": comment_totals[artist],
            "categoryBreakdown": final_breakdown,
            "rawCategoryBreakdown": raw_breakdown,
            "videoTypeCount": video_type_count,
            "topVideos": top_videos,
        }

    ranking.sort(key=lambda item: item["youtubePoint"], reverse=True)

    for index, item in enumerate(ranking, start=1):
        item["rank"] = index

    ranking_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_additive_log_points_scaled",
        "scaleFactor": SCALE_FACTOR,
        "ranking": ranking,
    }

    reports_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_additive_log_points_scaled",
        "scaleFactor": SCALE_FACTOR,
        "reports": reports,
    }

    timestamp_ranking_json = Path(f"fandex_youtube_ranking_v3_{timestamp}.json")
    timestamp_reports_json = Path(f"fandex_youtube_artist_reports_v3_{timestamp}.json")

    for path in [timestamp_ranking_json, LATEST_RANKING_JSON]:
        path.write_text(
            json.dumps(ranking_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    for path in [timestamp_reports_json, LATEST_REPORTS_JSON]:
        path.write_text(
            json.dumps(reports_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    timestamp_audit_csv = Path(f"fandex_youtube_publish_v3_audit_{timestamp}.csv")

    audit_fieldnames = [
        "artist",
        "videoId",
        "videoType",
        "category",
        "title",
        "channelTitle",
        "viewCount",
        "likeCount",
        "commentCount",
        "viewPoint",
        "likePoint",
        "commentPoint",
        "basePoint",
        "typeMultiplier",
        "channelMultiplier",
        "rawVideoPoint",
        "scaleFactor",
        "finalVideoPoint",
    ]

    for path in [timestamp_audit_csv, LATEST_AUDIT_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=audit_fieldnames)
            writer.writeheader()
            writer.writerows(
                sorted(
                    audit_rows,
                    key=lambda row: (row["artist"], -float(row["finalVideoPoint"])),
                )
            )

    print()
    print("YouTube ranking v3 미리보기")
    print("-" * 70)

    for item in ranking:
        print(
            f"{item['rank']}위. {item['artist']} - YouTube {item['youtubePoint']}점 "
            f"/ raw {item['youtubeRawPoint']} "
            f"/ 핵심 신호: {item['topSignal']} "
            f"/ videos {item['videoCount']}"
        )

    print()
    print("=" * 70)
    print("YouTube publish v3 생성 완료")
    print("=" * 70)
    print(f"타임스탬프 ranking JSON: {timestamp_ranking_json}")
    print(f"최신 ranking JSON: {LATEST_RANKING_JSON}")
    print(f"타임스탬프 report JSON: {timestamp_reports_json}")
    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")
    print(f"타임스탬프 audit CSV: {timestamp_audit_csv}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")


if __name__ == "__main__":
    main()