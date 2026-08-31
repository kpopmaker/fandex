import csv
import json
import math
import os
from collections import defaultdict
from datetime import datetime


VERSION = "fandex_music_chart_v1_manual_seed"

INPUT_FILE = "music_chart_seed_v1.csv"
TEMPLATE_FILE = "music_chart_seed_v1_template.csv"

PLATFORM_WEIGHTS = {
    "melon": 1.20,
    "circle": 1.35,
    "spotify": 1.10,
    "youtube_music": 1.00,
    "genie": 0.85,
    "bugs": 0.75,
    "flo": 0.75,
    "other": 0.60,
}

CHART_TYPE_WEIGHTS = {
    "realtime": 0.60,
    "daily": 1.00,
    "weekly": 1.15,
    "monthly": 1.25,
    "peak": 0.80,
    "other": 1.00,
}

RANK_BUCKETS = [
    (1, 100.0),
    (3, 90.0),
    (10, 75.0),
    (20, 60.0),
    (50, 40.0),
    (100, 20.0),
    (200, 8.0),
]


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


def to_int(value, default=None):
    try:
        if value in [None, ""]:
            return default
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return default


def normalize_key(value, default="other"):
    value = (value or "").strip().lower()
    return value if value else default


def round_point(value):
    return round(float(value), 2)


def get_rank_base_point(rank):
    if rank is None or rank <= 0:
        return 0.0

    for max_rank, point in RANK_BUCKETS:
        if rank <= max_rank:
            return point

    return 3.0


def get_metric_bonus(metric_value):
    value = to_float(metric_value)

    if value <= 0:
        return 0.0

    return min(math.log10(value + 1) * 2.0, 30.0)


def score_row(row):
    platform = normalize_key(row.get("platform"))
    chart_type = normalize_key(row.get("chartType"))
    rank = to_int(row.get("rank"))

    rank_base_point = get_rank_base_point(rank)
    platform_weight = PLATFORM_WEIGHTS.get(platform, PLATFORM_WEIGHTS["other"])
    chart_type_weight = CHART_TYPE_WEIGHTS.get(chart_type, CHART_TYPE_WEIGHTS["other"])
    metric_bonus = get_metric_bonus(row.get("metricValue"))

    final_point = rank_base_point * platform_weight * chart_type_weight + metric_bonus

    return {
        "platform": platform,
        "chartType": chart_type,
        "rank": rank,
        "rankBasePoint": round_point(rank_base_point),
        "platformWeight": platform_weight,
        "chartTypeWeight": chart_type_weight,
        "metricBonus": round_point(metric_bonus),
        "musicChartPoint": round_point(final_point),
    }


def validate_rows(rows):
    valid_rows = []
    skipped_rows = []

    for index, row in enumerate(rows, start=2):
        artist = (row.get("artist") or "").strip()
        track_title = (row.get("trackTitle") or "").strip()
        rank = to_int(row.get("rank"))

        if not artist:
            skipped_rows.append({
                "rowNumber": index,
                "reason": "artist 없음",
                "raw": row,
            })
            continue

        if not track_title:
            skipped_rows.append({
                "rowNumber": index,
                "reason": "trackTitle 없음",
                "raw": row,
            })
            continue

        if rank is None or rank <= 0:
            skipped_rows.append({
                "rowNumber": index,
                "reason": "rank 없음 또는 이상",
                "raw": row,
            })
            continue

        scored = score_row(row)
        normalized = {
            "artist": artist,
            "platform": scored["platform"],
            "chartName": (row.get("chartName") or "").strip(),
            "trackTitle": track_title,
            "rank": scored["rank"],
            "chartDate": (row.get("chartDate") or "").strip(),
            "chartType": scored["chartType"],
            "metricType": (row.get("metricType") or "").strip(),
            "metricValue": to_float(row.get("metricValue")),
            "memo": (row.get("memo") or "").strip(),
            "rankBasePoint": scored["rankBasePoint"],
            "platformWeight": scored["platformWeight"],
            "chartTypeWeight": scored["chartTypeWeight"],
            "metricBonus": scored["metricBonus"],
            "musicChartPoint": scored["musicChartPoint"],
        }
        valid_rows.append(normalized)

    return valid_rows, skipped_rows


def aggregate_artist_rows(rows):
    artist_map = {}

    for row in rows:
        artist = row["artist"]

        if artist not in artist_map:
            artist_map[artist] = {
                "artist": artist,
                "musicChartFinalPoint": 0.0,
                "entryCount": 0,
                "platformPoints": defaultdict(float),
                "chartTypePoints": defaultdict(float),
                "trackPoints": defaultdict(float),
                "bestEntry": None,
                "entries": [],
            }

        artist_item = artist_map[artist]
        point = row["musicChartPoint"]

        artist_item["musicChartFinalPoint"] += point
        artist_item["entryCount"] += 1
        artist_item["platformPoints"][row["platform"]] += point
        artist_item["chartTypePoints"][row["chartType"]] += point
        artist_item["trackPoints"][row["trackTitle"]] += point
        artist_item["entries"].append(row)

        if (
            artist_item["bestEntry"] is None
            or point > artist_item["bestEntry"]["musicChartPoint"]
        ):
            artist_item["bestEntry"] = row

    ranking = []

    for artist_item in artist_map.values():
        platform_points = {
            key: round_point(value)
            for key, value in sorted(
                artist_item["platformPoints"].items(),
                key=lambda item: item[1],
                reverse=True,
            )
        }
        chart_type_points = {
            key: round_point(value)
            for key, value in sorted(
                artist_item["chartTypePoints"].items(),
                key=lambda item: item[1],
                reverse=True,
            )
        }
        track_points = {
            key: round_point(value)
            for key, value in sorted(
                artist_item["trackPoints"].items(),
                key=lambda item: item[1],
                reverse=True,
            )
        }
        core_signal = next(iter(platform_points.keys()), "")

        ranking.append({
            "artist": artist_item["artist"],
            "fandexMusicChartFinalPoint": round_point(artist_item["musicChartFinalPoint"]),
            "coreSignal": core_signal,
            "entryCount": artist_item["entryCount"],
            "platformPoints": platform_points,
            "chartTypePoints": chart_type_points,
            "trackPoints": track_points,
            "bestEntry": artist_item["bestEntry"] or {},
            "entries": artist_item["entries"],
            "meta": {
                "scoreVersion": VERSION,
                "scoreMode": "uncapped_cumulative_chart_entries",
            },
        })

    ranking.sort(key=lambda item: item["fandexMusicChartFinalPoint"], reverse=True)

    for index, item in enumerate(ranking, start=1):
        item["rank"] = index

    return ranking


def build_reports(ranking):
    reports = []

    for item in ranking:
        reports.append({
            "rank": item["rank"],
            "artist": item["artist"],
            "fandexMusicChartFinalPoint": item["fandexMusicChartFinalPoint"],
            "coreSignal": item["coreSignal"],
            "entryCount": item["entryCount"],
            "platformPoints": item["platformPoints"],
            "chartTypePoints": item["chartTypePoints"],
            "trackPoints": item["trackPoints"],
            "bestEntry": item["bestEntry"],
            "entries": item["entries"],
            "meta": item["meta"],
        })

    return reports


def print_preview(ranking):
    print()
    print("Music chart ranking v1 미리보기")
    print("-" * 60)

    for item in ranking:
        best_entry = item.get("bestEntry", {})
        print(
            f"{item['rank']}위. {item['artist']} "
            f"- Music {item['fandexMusicChartFinalPoint']}점 "
            f"/ 핵심 플랫폼: {item.get('coreSignal', '-')} "
            f"/ 최고 항목: {best_entry.get('platform', '-')} "
            f"{best_entry.get('chartName', '')} "
            f"{best_entry.get('trackTitle', '')} "
            f"{best_entry.get('rank', '')}위"
        )


def main():
    print()
    print("Music chart publish v1 생성 시작")
    print("=" * 60)

    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(
            f"{INPUT_FILE} 파일이 없습니다. "
            f"{TEMPLATE_FILE}를 복사해서 rank를 입력하세요."
        )

    rows = read_csv(INPUT_FILE)
    valid_rows, skipped_rows = validate_rows(rows)

    if not valid_rows:
        raise ValueError(f"{INPUT_FILE} 안에 유효한 차트 데이터가 없습니다.")

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    created_at = datetime.now().isoformat(timespec="seconds")

    ranking = aggregate_artist_rows(valid_rows)
    reports = build_reports(ranking)

    ranking_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "uncapped_cumulative_points",
        "scoreMode": "uncapped_cumulative_chart_entries",
        "inputFile": INPUT_FILE,
        "platformWeights": PLATFORM_WEIGHTS,
        "chartTypeWeights": CHART_TYPE_WEIGHTS,
        "ranking": ranking,
    }

    report_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": ranking_payload["scoreScale"],
        "scoreMode": ranking_payload["scoreMode"],
        "inputFile": INPUT_FILE,
        "reports": reports,
    }

    ranking_timestamp_file = f"fandex_music_chart_ranking_v1_{now}.json"
    report_timestamp_file = f"fandex_music_chart_artist_reports_v1_{now}.json"
    audit_file = f"fandex_music_chart_publish_v1_audit_{now}.csv"

    write_json(ranking_timestamp_file, ranking_payload)
    write_json("fandex_music_chart_ranking_v1_latest.json", ranking_payload)
    write_json(report_timestamp_file, report_payload)
    write_json("fandex_music_chart_artist_reports_v1_latest.json", report_payload)

    audit_rows = []
    for item in ranking:
        audit_rows.append({
            "rank": item["rank"],
            "artist": item["artist"],
            "fandexMusicChartFinalPoint": item["fandexMusicChartFinalPoint"],
            "coreSignal": item["coreSignal"],
            "entryCount": item["entryCount"],
            "platformPoints": json.dumps(item["platformPoints"], ensure_ascii=False),
            "trackPoints": json.dumps(item["trackPoints"], ensure_ascii=False),
        })

    write_csv(
        audit_file,
        audit_rows,
        [
            "rank",
            "artist",
            "fandexMusicChartFinalPoint",
            "coreSignal",
            "entryCount",
            "platformPoints",
            "trackPoints",
        ],
    )

    if skipped_rows:
        skipped_file = f"fandex_music_chart_publish_v1_skipped_{now}.json"
        write_json(skipped_file, {
            "version": VERSION,
            "createdAt": created_at,
            "skippedRows": skipped_rows,
        })
        print(f"스킵된 row 파일: {skipped_file}")

    print_preview(ranking)

    print()
    print("=" * 60)
    print("Music chart publish v1 생성 완료")
    print("=" * 60)
    print(f"타임스탬프 ranking JSON: {ranking_timestamp_file}")
    print("최신 ranking JSON: fandex_music_chart_ranking_v1_latest.json")
    print(f"타임스탬프 report JSON: {report_timestamp_file}")
    print("최신 report JSON: fandex_music_chart_artist_reports_v1_latest.json")
    print(f"감사 CSV: {audit_file}")


if __name__ == "__main__":
    main()
