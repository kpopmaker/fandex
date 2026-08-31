import csv
import json
import os
from datetime import datetime


VERSION = "youtube_publish_v2_content_type"

INPUT_FILE = "youtube_video_metrics_v1.csv"
TYPE_GUIDE_FILE = "youtube_video_type_guide_v2.csv"

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

GROUP_WEIGHTS = {
    "music": 40.0,
    "promo": 20.0,
    "fandom": 20.0,
    "external": 15.0,
    "shortform": 5.0,
    "other": 5.0,
}

METRIC_WEIGHTS = {
    "viewPoint": 45.0,
    "likePoint": 25.0,
    "commentPoint": 20.0,
    "engagementPoint": 10.0,
}

VIDEO_TYPE_GROUPS = {
    "official_mv": "music",
    "performance_video": "music",
    "dance_practice": "music",
    "live_clip": "music",
    "album_promo": "promo",
    "highlight_medley": "promo",
    "teaser": "promo",
    "self_content": "fandom",
    "behind": "fandom",
    "external_content": "external",
    "broadcast_clip": "external",
    "interview": "external",
    "shorts": "shortform",
    "challenge": "shortform",
    "unknown": "other",
}

GROUP_LABELS = {
    "music": "공식 음악 콘텐츠",
    "promo": "컴백/앨범 프로모션",
    "fandom": "팬덤 콘텐츠",
    "external": "외부 확산 콘텐츠",
    "shortform": "숏폼 확산",
    "other": "기타 콘텐츠",
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


def normalize_video_type(value):
    video_type = (value or "").strip().lower()
    return video_type if video_type else "unknown"


def get_content_group(video_type):
    return VIDEO_TYPE_GROUPS.get(video_type, "other")


def normalize_active_group_weights(active_groups):
    active_weight_map = {
        group: GROUP_WEIGHTS.get(group, GROUP_WEIGHTS["other"])
        for group in active_groups
    }

    total = sum(active_weight_map.values())
    if total <= 0:
        raise ValueError("활성 유튜브 콘텐츠 그룹 가중치 합계가 0입니다.")

    return {
        group: weight / total * 100
        for group, weight in active_weight_map.items()
    }


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
        video_type = normalize_video_type(row.get("videoType"))
        content_group = get_content_group(video_type)

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
            "videoType": video_type,
            "contentGroup": content_group,
            "sourceUrl": (row.get("sourceUrl") or "").strip(),
        })

    if not valid_rows:
        raise ValueError("유효한 유튜브 영상 데이터가 없습니다.")

    return valid_rows, skipped_rows


def empty_metrics():
    return {
        "videoCount": 0,
        "totalViews": 0.0,
        "totalLikes": 0.0,
        "totalComments": 0.0,
        "engagementPerThousandViews": 0.0,
        "videos": [],
    }


def aggregate_by_artist_and_group(rows):
    artist_map = {}
    active_groups = set()

    for row in rows:
        artist = row["artist"]
        group = row["contentGroup"]
        active_groups.add(group)

        if artist not in artist_map:
            artist_map[artist] = {
                "artist": artist,
                "groups": {},
                "videoTypes": {},
                "allVideos": [],
                "totals": empty_metrics(),
            }

        artist_item = artist_map[artist]
        group_item = artist_item["groups"].setdefault(group, empty_metrics())
        type_item = artist_item["videoTypes"].setdefault(row["videoType"], empty_metrics())

        for target in [group_item, type_item, artist_item["totals"]]:
            target["videoCount"] += 1
            target["totalViews"] += row["viewCount"]
            target["totalLikes"] += row["likeCount"]
            target["totalComments"] += row["commentCount"]
            target["videos"].append(row)

        artist_item["allVideos"].append(row)

    for artist_item in artist_map.values():
        for metrics in (
            list(artist_item["groups"].values())
            + list(artist_item["videoTypes"].values())
            + [artist_item["totals"]]
        ):
            views = metrics["totalViews"]
            reactions = metrics["totalLikes"] + metrics["totalComments"]
            metrics["engagementPerThousandViews"] = (
                reactions / views * 1000 if views > 0 else 0.0
            )

    return list(artist_map.values()), active_groups


def max_metric(artist_items, group, key):
    values = []
    for item in artist_items:
        group_metrics = item["groups"].get(group, {})
        values.append(to_float(group_metrics.get(key)))

    max_value = max(values) if values else 0.0
    return max_value if max_value > 0 else 1.0


def build_group_components(metrics, max_values, group_weight):
    view_point = metrics["totalViews"] / max_values["totalViews"] * group_weight * 0.45
    like_point = metrics["totalLikes"] / max_values["totalLikes"] * group_weight * 0.25
    comment_point = metrics["totalComments"] / max_values["totalComments"] * group_weight * 0.20
    engagement_point = (
        metrics["engagementPerThousandViews"]
        / max_values["engagementPerThousandViews"]
        * group_weight
        * 0.10
    )

    total_point = view_point + like_point + comment_point + engagement_point

    return {
        "point": round_point(total_point),
        "viewPoint": round_point(view_point),
        "likePoint": round_point(like_point),
        "commentPoint": round_point(comment_point),
        "engagementPoint": round_point(engagement_point),
    }


def summarize_metrics(metrics):
    views = metrics.get("totalViews", 0.0)
    video_count = max(metrics.get("videoCount", 0), 1)

    return {
        "videoCount": int(metrics.get("videoCount", 0)),
        "totalViews": int(views),
        "totalLikes": int(metrics.get("totalLikes", 0)),
        "totalComments": int(metrics.get("totalComments", 0)),
        "avgViews": round_point(views / video_count) if metrics.get("videoCount", 0) else 0.0,
        "engagementPerThousandViews": round_point(
            metrics.get("engagementPerThousandViews", 0)
        ),
    }


def summarize_video(video):
    return {
        "videoId": video.get("videoId", ""),
        "title": video.get("title", ""),
        "publishedAt": video.get("publishedAt", ""),
        "viewCount": int(video.get("viewCount", 0)),
        "likeCount": int(video.get("likeCount", 0)),
        "commentCount": int(video.get("commentCount", 0)),
        "videoType": video.get("videoType", "unknown"),
        "contentGroup": video.get("contentGroup", "other"),
        "sourceUrl": video.get("sourceUrl", ""),
    }


def top_videos(videos, limit=5):
    return [
        summarize_video(video)
        for video in sorted(videos, key=lambda row: row["viewCount"], reverse=True)[:limit]
    ]


def detect_core_signal(group_points):
    available = [
        (group, data.get("point", 0.0))
        for group, data in group_points.items()
        if data.get("point", 0.0) > 0
    ]

    if not available:
        return ""

    group = sorted(available, key=lambda item: item[1], reverse=True)[0][0]
    return GROUP_LABELS.get(group, group)


def build_ranking(artist_items, active_groups):
    active_group_weights = normalize_active_group_weights(active_groups)

    max_values_by_group = {}
    for group in active_group_weights:
        max_values_by_group[group] = {
            "totalViews": max_metric(artist_items, group, "totalViews"),
            "totalLikes": max_metric(artist_items, group, "totalLikes"),
            "totalComments": max_metric(artist_items, group, "totalComments"),
            "engagementPerThousandViews": max_metric(
                artist_items,
                group,
                "engagementPerThousandViews",
            ),
        }

    ranking = []

    for item in artist_items:
        group_points = {}
        groupMetrics = {}

        for group, group_weight in active_group_weights.items():
            metrics = item["groups"].get(group, empty_metrics())
            components = build_group_components(
                metrics,
                max_values_by_group[group],
                group_weight,
            )

            group_points[group] = {
                "label": GROUP_LABELS.get(group, group),
                "point": components["point"],
                "components": {
                    "viewPoint": components["viewPoint"],
                    "likePoint": components["likePoint"],
                    "commentPoint": components["commentPoint"],
                    "engagementPoint": components["engagementPoint"],
                },
            }
            groupMetrics[group] = summarize_metrics(metrics)

        final_point = sum(data["point"] for data in group_points.values())

        video_type_metrics = {
            video_type: summarize_metrics(metrics)
            for video_type, metrics in sorted(item["videoTypes"].items())
        }

        top_video = top_videos(item["allVideos"], limit=1)

        ranking.append({
            "artist": item["artist"],
            "fandexYoutubeFinalPoint": round_point(final_point),
            "coreSignal": detect_core_signal(group_points),
            "contentGroupPoints": group_points,
            "contentGroupMetrics": groupMetrics,
            "videoTypeMetrics": video_type_metrics,
            "rawMetrics": summarize_metrics(item["totals"]),
            "topVideo": top_video[0] if top_video else {},
            "topVideos": top_videos(item["allVideos"], limit=5),
            "meta": {
                "scoreVersion": VERSION,
                "activeGroupWeights": {
                    group: round_point(weight)
                    for group, weight in active_group_weights.items()
                },
                "baseGroupWeights": GROUP_WEIGHTS,
                "metricWeights": METRIC_WEIGHTS,
                "normalization": "content group batch max normalization; active groups reweighted to 100",
            },
        })

    ranking.sort(key=lambda row: row["fandexYoutubeFinalPoint"], reverse=True)

    for index, row in enumerate(ranking, start=1):
        row["rank"] = index

    return ranking, active_group_weights


def build_reports(ranking):
    reports = []

    for item in ranking:
        reports.append({
            "rank": item["rank"],
            "artist": item["artist"],
            "fandexYoutubeFinalPoint": item["fandexYoutubeFinalPoint"],
            "coreSignal": item["coreSignal"],
            "contentGroupPoints": item["contentGroupPoints"],
            "contentGroupMetrics": item["contentGroupMetrics"],
            "videoTypeMetrics": item["videoTypeMetrics"],
            "rawMetrics": item["rawMetrics"],
            "topVideos": item["topVideos"],
            "meta": item["meta"],
        })

    return reports


def print_preview(ranking):
    print()
    print("YouTube ranking v2 미리보기")
    print("-" * 60)

    for item in ranking:
        group_text = " / ".join(
            f"{data['label']} {data['point']}"
            for data in item["contentGroupPoints"].values()
            if data["point"] > 0
        )
        print(
            f"{item['rank']}위. {item['artist']} "
            f"- YouTube {item['fandexYoutubeFinalPoint']}점 "
            f"/ 핵심 신호: {item['coreSignal']} "
            f"/ {group_text}"
        )


def main():
    print()
    print("YouTube publish v2 생성 시작")
    print("=" * 60)

    if not os.path.exists(INPUT_FILE):
        raise SystemExit(f"{INPUT_FILE} 파일이 없습니다. 먼저 youtube_collect_video_metrics_v1.py를 실행하세요.")

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    created_at = datetime.now().isoformat(timespec="seconds")

    rows = read_csv(INPUT_FILE)
    valid_rows, skipped_rows = validate_rows(rows)
    artist_items, active_groups = aggregate_by_artist_and_group(valid_rows)
    ranking, active_group_weights = build_ranking(artist_items, active_groups)
    reports = build_reports(ranking)

    ranking_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "inputFile": INPUT_FILE,
        "typeGuideFile": TYPE_GUIDE_FILE,
        "activeGroupWeights": {
            group: round_point(weight)
            for group, weight in active_group_weights.items()
        },
        "ranking": ranking,
    }

    report_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "inputFile": INPUT_FILE,
        "typeGuideFile": TYPE_GUIDE_FILE,
        "activeGroupWeights": ranking_payload["activeGroupWeights"],
        "reports": reports,
    }

    ranking_timestamp_file = f"fandex_youtube_ranking_v2_{now}.json"
    report_timestamp_file = f"fandex_youtube_artist_reports_v2_{now}.json"
    audit_file = f"fandex_youtube_publish_v2_audit_{now}.csv"

    write_json(ranking_timestamp_file, ranking_payload)
    write_json("fandex_youtube_ranking_v2_latest.json", ranking_payload)

    write_json(report_timestamp_file, report_payload)
    write_json("fandex_youtube_artist_reports_v2_latest.json", report_payload)

    audit_rows = []
    for item in ranking:
        audit_row = {
            "rank": item["rank"],
            "artist": item["artist"],
            "fandexYoutubeFinalPoint": item["fandexYoutubeFinalPoint"],
            "coreSignal": item["coreSignal"],
            "videoCount": item["rawMetrics"]["videoCount"],
            "totalViews": item["rawMetrics"]["totalViews"],
            "totalLikes": item["rawMetrics"]["totalLikes"],
            "totalComments": item["rawMetrics"]["totalComments"],
        }

        for group in sorted(active_group_weights.keys()):
            audit_row[f"{group}Point"] = item["contentGroupPoints"][group]["point"]
            audit_row[f"{group}VideoCount"] = item["contentGroupMetrics"][group]["videoCount"]
            audit_row[f"{group}Views"] = item["contentGroupMetrics"][group]["totalViews"]

        audit_rows.append(audit_row)

    audit_fields = [
        "rank",
        "artist",
        "fandexYoutubeFinalPoint",
        "coreSignal",
        "videoCount",
        "totalViews",
        "totalLikes",
        "totalComments",
    ]
    for group in sorted(active_group_weights.keys()):
        audit_fields += [
            f"{group}Point",
            f"{group}VideoCount",
            f"{group}Views",
        ]

    write_csv(audit_file, audit_rows, audit_fields)

    if skipped_rows:
        skipped_file = f"fandex_youtube_publish_v2_skipped_{now}.csv"
        write_csv(skipped_file, skipped_rows, ["row", "reason"])
        print(f"건너뛴 행 파일: {skipped_file}")

    print_preview(ranking)

    print()
    print("=" * 60)
    print("YouTube publish v2 생성 완료")
    print("=" * 60)
    print(f"타임스탬프 ranking JSON: {ranking_timestamp_file}")
    print("최신 ranking JSON: fandex_youtube_ranking_v2_latest.json")
    print(f"타임스탬프 report JSON: {report_timestamp_file}")
    print("최신 report JSON: fandex_youtube_artist_reports_v2_latest.json")
    print(f"감사 CSV: {audit_file}")


if __name__ == "__main__":
    main()
