import csv
import json
import os
from datetime import datetime


VERSION = "fandex_master_v2"

NAVER_RANKING_FILE = "fandex_naver_ranking_v3_latest.json"
NAVER_REPORT_FILE = "fandex_naver_artist_reports_v3_latest.json"
YOUTUBE_RANKING_FILE = "fandex_youtube_ranking_v1_latest.json"
YOUTUBE_REPORT_FILE = "fandex_youtube_artist_reports_v1_latest.json"

DEFAULT_SOURCE_WEIGHTS = {
    "naver": 0.55,
    "youtube": 0.45,
}


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def to_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def round_point(value):
    return round(float(value), 2)


def normalize_weight_map(weight_map):
    active = {
        key: value
        for key, value in weight_map.items()
        if value > 0
    }

    total = sum(active.values())
    if total <= 0:
        raise ValueError("활성 지표 가중치 합계가 0입니다.")

    return {
        key: value / total
        for key, value in active.items()
    }


def load_reports(path):
    if not os.path.exists(path):
        return {}, None

    data = read_json(path)
    reports = data.get("reports", [])
    report_map = {}

    for report in reports:
        artist = report.get("artist")
        if artist:
            report_map[artist] = report

    return report_map, data


def load_naver_source(weight):
    if not os.path.exists(NAVER_RANKING_FILE):
        raise FileNotFoundError(f"{NAVER_RANKING_FILE} 파일이 없습니다.")

    data = read_json(NAVER_RANKING_FILE)
    rows = data.get("ranking", [])
    max_raw = max(to_float(row.get("fandexNaverFinalPoint")) for row in rows)

    if max_raw <= 0:
        raise ValueError("네이버 최종점수 최대값이 0입니다.")

    source_map = {}

    for row in rows:
        artist = row.get("artist")
        if not artist:
            continue

        raw_point = to_float(row.get("fandexNaverFinalPoint"))
        normalized_point = raw_point / max_raw * 100

        source_map[artist] = {
            "rank": row.get("rank"),
            "rawPoint": round_point(raw_point),
            "normalizedPoint": round_point(normalized_point),
            "weightedPoint": round_point(normalized_point * weight),
            "available": True,
            "coreSignal": row.get("coreSignal", ""),
            "components": row.get("components", {}),
            "meta": row.get("meta", {}),
        }

    return source_map, data


def load_youtube_source(weight):
    if not os.path.exists(YOUTUBE_RANKING_FILE):
        return {}, None

    data = read_json(YOUTUBE_RANKING_FILE)
    rows = data.get("ranking", [])
    source_map = {}

    for row in rows:
        artist = row.get("artist")
        if not artist:
            continue

        normalized_point = to_float(row.get("fandexYoutubeFinalPoint"))

        source_map[artist] = {
            "rank": row.get("rank"),
            "rawPoint": round_point(normalized_point),
            "normalizedPoint": round_point(normalized_point),
            "weightedPoint": round_point(normalized_point * weight),
            "available": True,
            "coreSignal": row.get("coreSignal", ""),
            "components": row.get("components", {}),
            "rawMetrics": row.get("rawMetrics", {}),
            "topVideo": row.get("topVideo", {}),
            "meta": row.get("meta", {}),
        }

    return source_map, data


def detect_main_source(source_points):
    available = [
        (name, source.get("weightedPoint", 0.0))
        for name, source in source_points.items()
        if source.get("available")
    ]

    if not available:
        return ""

    return sorted(available, key=lambda item: item[1], reverse=True)[0][0]


def empty_source():
    return {
        "rank": None,
        "rawPoint": 0.0,
        "normalizedPoint": 0.0,
        "weightedPoint": 0.0,
        "available": False,
    }


def build_master_ranking(naver_source, youtube_source, weights):
    artists = sorted(set(naver_source.keys()) | set(youtube_source.keys()))
    ranking = []

    for artist in artists:
        source_points = {
            "naver": naver_source.get(artist, empty_source()),
            "youtube": youtube_source.get(artist, empty_source()),
        }

        final_point = sum(
            source.get("weightedPoint", 0.0)
            for source in source_points.values()
        )

        ranking.append({
            "artist": artist,
            "fandexFinalPoint": round_point(final_point),
            "mainSource": detect_main_source(source_points),
            "sourcePoints": source_points,
            "sourceRanks": {
                "naver": source_points["naver"].get("rank"),
                "youtube": source_points["youtube"].get("rank"),
            },
            "components": {
                "naver": source_points["naver"].get("components", {}),
                "youtube": source_points["youtube"].get("components", {}),
            },
            "meta": {
                "scoreVersion": VERSION,
                "activeSourceWeights": weights,
                "sourceAvailability": {
                    "naver": source_points["naver"].get("available", False),
                    "youtube": source_points["youtube"].get("available", False),
                },
            },
        })

    ranking.sort(key=lambda row: row["fandexFinalPoint"], reverse=True)

    for index, row in enumerate(ranking, start=1):
        row["rank"] = index

    return ranking


def build_master_reports(ranking, naver_reports, youtube_reports):
    reports = []

    for row in ranking:
        artist = row["artist"]
        reports.append({
            "rank": row["rank"],
            "artist": artist,
            "fandexFinalPoint": row["fandexFinalPoint"],
            "mainSource": row["mainSource"],
            "sourcePoints": row["sourcePoints"],
            "sourceRanks": row["sourceRanks"],
            "components": row["components"],
            "reports": {
                "naver": naver_reports.get(artist, {}),
                "youtube": youtube_reports.get(artist, {}),
            },
            "meta": row["meta"],
        })

    return reports


def print_preview(ranking, has_youtube):
    print()
    print("FANDEX master ranking v2 미리보기")
    print("-" * 60)

    for row in ranking:
        naver = row["sourcePoints"]["naver"]
        youtube = row["sourcePoints"]["youtube"]
        youtube_text = (
            f" / 유튜브 {youtube.get('normalizedPoint')}점"
            if has_youtube and youtube.get("available")
            else " / 유튜브 없음"
        )

        print(
            f"{row['rank']}위. {row['artist']} "
            f"- FANDEX {row['fandexFinalPoint']}점 "
            f"/ 네이버 {naver.get('normalizedPoint')}점"
            f"{youtube_text}"
        )


def main():
    print()
    print("FANDEX master score v2 생성 시작")
    print("=" * 60)

    has_youtube = os.path.exists(YOUTUBE_RANKING_FILE)

    source_weights = {
        "naver": DEFAULT_SOURCE_WEIGHTS["naver"],
    }
    if has_youtube:
        source_weights["youtube"] = DEFAULT_SOURCE_WEIGHTS["youtube"]

    weights = normalize_weight_map(source_weights)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    created_at = datetime.now().isoformat(timespec="seconds")

    naver_source, naver_data = load_naver_source(weights["naver"])
    youtube_source, youtube_data = load_youtube_source(weights.get("youtube", 0.0))

    naver_reports, naver_report_data = load_reports(NAVER_REPORT_FILE)
    youtube_reports, youtube_report_data = load_reports(YOUTUBE_REPORT_FILE)

    ranking = build_master_ranking(naver_source, youtube_source, weights)
    reports = build_master_reports(ranking, naver_reports, youtube_reports)

    ranking_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "activeSourceWeights": weights,
        "sourceFiles": {
            "naverRanking": NAVER_RANKING_FILE,
            "naverReports": NAVER_REPORT_FILE if naver_report_data else None,
            "youtubeRanking": YOUTUBE_RANKING_FILE if youtube_data else None,
            "youtubeReports": YOUTUBE_REPORT_FILE if youtube_report_data else None,
        },
        "sourceVersions": {
            "naverRanking": naver_data.get("version", ""),
            "naverReports": naver_report_data.get("version", "") if naver_report_data else "",
            "youtubeRanking": youtube_data.get("version", "") if youtube_data else "",
            "youtubeReports": youtube_report_data.get("version", "") if youtube_report_data else "",
        },
        "ranking": ranking,
    }

    report_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "activeSourceWeights": weights,
        "sourceFiles": ranking_payload["sourceFiles"],
        "reports": reports,
    }

    ranking_timestamp_file = f"fandex_master_ranking_v2_{now}.json"
    report_timestamp_file = f"fandex_master_artist_reports_v2_{now}.json"
    audit_file = f"fandex_master_score_v2_audit_{now}.csv"

    write_json(ranking_timestamp_file, ranking_payload)
    write_json("fandex_master_ranking_latest.json", ranking_payload)
    write_json(report_timestamp_file, report_payload)
    write_json("fandex_master_artist_reports_latest.json", report_payload)

    audit_rows = []
    for row in ranking:
        naver = row["sourcePoints"]["naver"]
        youtube = row["sourcePoints"]["youtube"]
        audit_rows.append({
            "rank": row["rank"],
            "artist": row["artist"],
            "fandexFinalPoint": row["fandexFinalPoint"],
            "mainSource": row["mainSource"],
            "naverNormalizedPoint": naver.get("normalizedPoint"),
            "naverWeightedPoint": naver.get("weightedPoint"),
            "youtubeNormalizedPoint": youtube.get("normalizedPoint"),
            "youtubeWeightedPoint": youtube.get("weightedPoint"),
        })

    write_csv(
        audit_file,
        audit_rows,
        [
            "rank",
            "artist",
            "fandexFinalPoint",
            "mainSource",
            "naverNormalizedPoint",
            "naverWeightedPoint",
            "youtubeNormalizedPoint",
            "youtubeWeightedPoint",
        ],
    )

    print_preview(ranking, has_youtube)

    print()
    print("=" * 60)
    print("FANDEX master score v2 생성 완료")
    print("=" * 60)
    print(f"타임스탬프 ranking JSON: {ranking_timestamp_file}")
    print("최신 ranking JSON: fandex_master_ranking_latest.json")
    print(f"타임스탬프 report JSON: {report_timestamp_file}")
    print("최신 report JSON: fandex_master_artist_reports_latest.json")
    print(f"감사 CSV: {audit_file}")


if __name__ == "__main__":
    main()
