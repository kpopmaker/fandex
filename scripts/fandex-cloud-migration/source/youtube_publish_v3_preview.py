import csv
import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "youtube_publish_v3_preview_uncapped_additive"

METRICS_FILE = Path("youtube_video_metrics_v1.csv")
V2_RANKING_FILE = Path("fandex_youtube_ranking_v2_latest.json")

LATEST_JSON = Path("fandex_youtube_ranking_v3_preview_latest.json")
LATEST_REPORT = Path("FANDEX_YOUTUBE_V3_PREVIEW_REPORT.txt")
LATEST_AUDIT_CSV = Path("youtube_publish_v3_preview_audit_latest.csv")


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


def read_json(path):
    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


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

    final_point = base_point * tm * cm

    return {
        "viewPoint": round(view_point, 4),
        "likePoint": round(like_point, 4),
        "commentPoint": round(comment_point, 4),
        "basePoint": round(base_point, 4),
        "typeMultiplier": tm,
        "channelMultiplier": cm,
        "videoPoint": round(final_point, 4),
    }


def extract_v2_scores(payload):
    if not payload:
        return {}

    candidates = []

    if isinstance(payload, list):
        candidates = payload
    elif isinstance(payload, dict):
        for key in ["ranking", "rankings", "artists", "data", "items"]:
            value = payload.get(key)
            if isinstance(value, list):
                candidates = value
                break

    result = {}

    for item in candidates:
        if not isinstance(item, dict):
            continue

        artist = (
            item.get("artist")
            or item.get("artistName")
            or item.get("name")
            or ""
        )

        score = (
            item.get("youtubePoint")
            or item.get("youtubeScore")
            or item.get("score")
            or item.get("totalPoint")
            or item.get("cumulativePoint")
            or ""
        )

        if artist:
            result[artist] = score

    return result


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("YouTube publish v3 preview 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: master/latest 점수에는 아직 반영하지 않습니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    rows = read_csv(METRICS_FILE)
    v2_payload = read_json(V2_RANKING_FILE)
    v2_scores = extract_v2_scores(v2_payload)

    audit_rows = []
    artist_totals = defaultdict(float)
    artist_counts = defaultdict(int)
    category_totals = defaultdict(lambda: defaultdict(float))
    type_counts = defaultdict(lambda: defaultdict(int))
    view_totals = defaultdict(int)
    like_totals = defaultdict(int)
    comment_totals = defaultdict(int)

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
        video_point = point_info["videoPoint"]
        category = category_of(video_type)

        artist_totals[artist] += video_point
        artist_counts[artist] += 1
        category_totals[artist][category] += video_point
        type_counts[artist][video_type] += 1
        view_totals[artist] += views
        like_totals[artist] += likes
        comment_totals[artist] += comments

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
            "videoPoint": video_point,
        })

    ranking = []

    for artist, total in artist_totals.items():
        breakdown = {
            category: round(point, 4)
            for category, point in sorted(category_totals[artist].items())
        }

        video_type_count = {
            video_type: count
            for video_type, count in sorted(type_counts[artist].items())
        }

        ranking.append({
            "artist": artist,
            "youtubePointV3Preview": round(total, 4),
            "previousV2Score": v2_scores.get(artist, ""),
            "videoCount": artist_counts[artist],
            "viewCountTotal": view_totals[artist],
            "likeCountTotal": like_totals[artist],
            "commentCountTotal": comment_totals[artist],
            "categoryBreakdown": breakdown,
            "videoTypeCount": video_type_count,
        })

    ranking.sort(key=lambda item: item["youtubePointV3Preview"], reverse=True)

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "youtube_v3_preview_uncapped_additive_log_points",
        "note": "Preview only. This file does not replace v2 latest or master score.",
        "ranking": ranking,
    }

    timestamp_json = Path(f"fandex_youtube_ranking_v3_preview_{timestamp}.json")
    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    timestamp_audit = Path(f"youtube_publish_v3_preview_audit_{timestamp}.csv")
    fieldnames = [
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
        "videoPoint",
    ]

    for path in [timestamp_audit, LATEST_AUDIT_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(sorted(audit_rows, key=lambda r: (r["artist"], -float(r["videoPoint"]))))

    lines = []
    lines.append("FANDEX YouTube v3 Preview Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("v3 공식")
    lines.append("-" * 70)
    lines.append("- 영상이 추가되면 기존 영상 점수를 깎지 않는 additive 구조")
    lines.append("- view/like/comment는 log point로 변환")
    lines.append("- videoType multiplier 적용")
    lines.append("- official/broadcast/fan channel multiplier 적용")
    lines.append("- 아직 master score에는 반영하지 않음")
    lines.append("")
    lines.append("v2 vs v3 preview")
    lines.append("-" * 70)

    for index, item in enumerate(ranking, start=1):
        lines.append(
            f"{index}위 {item['artist']} | "
            f"v3Preview={item['youtubePointV3Preview']} | "
            f"currentV2={item['previousV2Score']} | "
            f"videos={item['videoCount']} | views={item['viewCountTotal']}"
        )

        for category, point in item["categoryBreakdown"].items():
            lines.append(f"  - {category}: {point}")

    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)
    lines.append("- v3는 seed 확장 시 점수가 하락하는 문제를 줄이기 위한 preview 공식이다.")
    lines.append("- 이 결과가 납득되면 다음 단계에서 youtube_publish_v3.py로 승격한다.")
    lines.append("- 승격 후에는 master v7에서 YouTube v3를 읽도록 분리 적용한다.")

    timestamp_report = Path(f"FANDEX_YOUTUBE_V3_PREVIEW_REPORT_{timestamp}.txt")
    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print("YouTube publish v3 preview 완료")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 audit CSV: {timestamp_audit}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")
    print(f"리포트: {LATEST_REPORT}")
    print()
    print("확인:")
    print("notepad FANDEX_YOUTUBE_V3_PREVIEW_REPORT.txt")
    print("notepad youtube_publish_v3_preview_audit_latest.csv")


if __name__ == "__main__":
    main()