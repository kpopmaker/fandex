import csv
import json
import os
from datetime import datetime


VERSION = "fandex_master_v1"

NAVER_RANKING_FILE = "fandex_naver_ranking_v3_latest.json"
NAVER_REPORT_FILE = "fandex_naver_artist_reports_v3_latest.json"

ACTIVE_SOURCE_WEIGHTS = {
    "naver": 1.0,
}

REQUIRED_OUTPUTS = [
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
]


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
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


def load_naver_ranking():
    if not os.path.exists(NAVER_RANKING_FILE):
        raise FileNotFoundError(f"{NAVER_RANKING_FILE} 파일이 없습니다.")

    data = read_json(NAVER_RANKING_FILE)
    ranking = data.get("ranking", [])

    if not ranking:
        raise ValueError(f"{NAVER_RANKING_FILE} 안에 ranking 데이터가 없습니다.")

    return data, ranking


def load_naver_reports():
    if not os.path.exists(NAVER_REPORT_FILE):
        return {}, None

    data = read_json(NAVER_REPORT_FILE)
    reports = data.get("reports", [])

    report_by_artist = {}
    for report in reports:
        artist = report.get("artist")
        if artist:
            report_by_artist[artist] = report

    return report_by_artist, data


def normalize_weight_map(weight_map):
    total = sum(to_float(value) for value in weight_map.values())

    if total <= 0:
        raise ValueError("활성 지표 가중치 합계가 0입니다.")

    return {
        key: to_float(value) / total
        for key, value in weight_map.items()
    }


def detect_main_source(source_points):
    available_sources = [
        (source, data.get("weightedPoint", 0.0))
        for source, data in source_points.items()
        if data.get("available")
    ]

    if not available_sources:
        return ""

    return sorted(available_sources, key=lambda item: item[1], reverse=True)[0][0]


def build_naver_source_points(naver_ranking, normalized_weights):
    max_raw_point = max(
        to_float(item.get("fandexNaverFinalPoint"))
        for item in naver_ranking
    )

    if max_raw_point <= 0:
        raise ValueError("네이버 최종점수 최대값이 0입니다.")

    naver_by_artist = {}

    for item in naver_ranking:
        artist = item.get("artist")
        if not artist:
            continue

        raw_point = to_float(item.get("fandexNaverFinalPoint"))
        normalized_point = raw_point / max_raw_point * 100
        weighted_point = normalized_point * normalized_weights["naver"]

        naver_by_artist[artist] = {
            "rank": item.get("rank"),
            "rawPoint": round_point(raw_point),
            "normalizedPoint": round_point(normalized_point),
            "weightedPoint": round_point(weighted_point),
            "available": True,
            "normalizationBase": round_point(max_raw_point),
            "normalizationMethod": "raw_point / max_raw_point_in_batch * 100",
            "components": {
                "newsIssueClusterPoint": round_point(
                    item.get("components", {}).get("newsIssueClusterPoint", 0)
                ),
                "blogTopicClusterPoint": round_point(
                    item.get("components", {}).get("blogTopicClusterPoint", 0)
                ),
                "searchDemandComparePoint": round_point(
                    item.get("components", {}).get("searchDemandComparePoint", 0)
                ),
            },
            "coreSignal": item.get("coreSignal", ""),
            "meta": item.get("meta", {}),
        }

    return naver_by_artist


def build_master_ranking(naver_ranking, naver_by_artist, normalized_weights):
    artists = []

    for item in naver_ranking:
        artist = item.get("artist")
        if artist and artist not in artists:
            artists.append(artist)

    rows = []

    for artist in artists:
        naver = naver_by_artist.get(artist)

        source_points = {
            "naver": naver if naver else {
                "rank": None,
                "rawPoint": 0.0,
                "normalizedPoint": 0.0,
                "weightedPoint": 0.0,
                "available": False,
            }
        }

        final_point = sum(
            source.get("weightedPoint", 0.0)
            for source in source_points.values()
        )

        rows.append({
            "artist": artist,
            "fandexFinalPoint": round_point(final_point),
            "mainSource": detect_main_source(source_points),
            "sourcePoints": source_points,
            "sourceRanks": {
                "naver": naver.get("rank") if naver else None,
            },
            "components": {
                "naver": naver.get("components", {}) if naver else {},
            },
            "meta": {
                "scoreVersion": VERSION,
                "activeSourceWeights": normalized_weights,
                "sourceAvailability": {
                    "naver": bool(naver),
                },
            },
        })

    rows.sort(key=lambda row: row["fandexFinalPoint"], reverse=True)

    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return rows


def build_master_reports(master_ranking, naver_reports):
    reports = []

    for ranking_item in master_ranking:
        artist = ranking_item.get("artist")
        naver_report = naver_reports.get(artist, {})

        reports.append({
            "rank": ranking_item.get("rank"),
            "artist": artist,
            "fandexFinalPoint": ranking_item.get("fandexFinalPoint"),
            "mainSource": ranking_item.get("mainSource"),
            "sourcePoints": ranking_item.get("sourcePoints", {}),
            "sourceRanks": ranking_item.get("sourceRanks", {}),
            "components": ranking_item.get("components", {}),
            "reports": {
                "naver": naver_report,
            },
            "meta": ranking_item.get("meta", {}),
        })

    return reports


def verify_outputs():
    problems = []

    for path in REQUIRED_OUTPUTS:
        if not os.path.exists(path):
            problems.append(f"{path} 파일 없음")

    if os.path.exists("fandex_master_ranking_latest.json"):
        try:
            data = read_json("fandex_master_ranking_latest.json")
            ranking = data.get("ranking", [])

            if data.get("version") != VERSION:
                problems.append("master ranking version 이상")

            if not ranking:
                problems.append("master ranking 데이터 없음")

            for item in ranking:
                if not item.get("artist"):
                    problems.append("master ranking artist 누락")
                if item.get("fandexFinalPoint") in [None, ""]:
                    problems.append(f"{item.get('artist', '-')}: 최종점수 누락")
        except Exception as e:
            problems.append(f"master ranking JSON 읽기 실패: {e}")

    return problems


def print_preview(master_ranking):
    print()
    print("FANDEX master ranking 미리보기")
    print("-" * 60)

    for item in master_ranking:
        naver = item.get("sourcePoints", {}).get("naver", {})
        print(
            f"{item.get('rank')}위. {item.get('artist')} "
            f"- FANDEX {item.get('fandexFinalPoint')}점 "
            f"/ 네이버 {naver.get('normalizedPoint')}점 "
            f"(raw {naver.get('rawPoint')})"
        )


def main():
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    created_at = datetime.now().isoformat(timespec="seconds")

    print()
    print("FANDEX master score v1 생성 시작")
    print("=" * 60)

    normalized_weights = normalize_weight_map(ACTIVE_SOURCE_WEIGHTS)

    naver_data, naver_ranking = load_naver_ranking()
    naver_reports, naver_report_data = load_naver_reports()

    naver_by_artist = build_naver_source_points(
        naver_ranking,
        normalized_weights,
    )

    master_ranking = build_master_ranking(
        naver_ranking,
        naver_by_artist,
        normalized_weights,
    )

    master_reports = build_master_reports(master_ranking, naver_reports)

    ranking_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "activeSourceWeights": normalized_weights,
        "normalization": {
            "naver": "raw_point / max_raw_point_in_batch * 100",
        },
        "sourceFiles": {
            "naverRanking": NAVER_RANKING_FILE,
            "naverReports": NAVER_REPORT_FILE if naver_report_data else None,
        },
        "sourceVersions": {
            "naverRanking": naver_data.get("version", ""),
            "naverReports": naver_report_data.get("version", "") if naver_report_data else "",
        },
        "ranking": master_ranking,
    }

    report_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "scoreScale": "0_to_100",
        "activeSourceWeights": normalized_weights,
        "sourceFiles": ranking_payload["sourceFiles"],
        "reports": master_reports,
    }

    ranking_timestamp_file = f"fandex_master_ranking_v1_{now}.json"
    report_timestamp_file = f"fandex_master_artist_reports_v1_{now}.json"

    write_json(ranking_timestamp_file, ranking_payload)
    write_json("fandex_master_ranking_latest.json", ranking_payload)

    write_json(report_timestamp_file, report_payload)
    write_json("fandex_master_artist_reports_latest.json", report_payload)

    audit_rows = []
    for item in master_ranking:
        naver = item.get("sourcePoints", {}).get("naver", {})
        audit_rows.append({
            "rank": item.get("rank"),
            "artist": item.get("artist"),
            "fandexFinalPoint": item.get("fandexFinalPoint"),
            "mainSource": item.get("mainSource"),
            "naverRawPoint": naver.get("rawPoint"),
            "naverNormalizedPoint": naver.get("normalizedPoint"),
            "naverWeightedPoint": naver.get("weightedPoint"),
            "naverRank": naver.get("rank"),
        })

    audit_file = f"fandex_master_score_v1_audit_{now}.csv"
    write_csv(
        audit_file,
        audit_rows,
        [
            "rank",
            "artist",
            "fandexFinalPoint",
            "mainSource",
            "naverRawPoint",
            "naverNormalizedPoint",
            "naverWeightedPoint",
            "naverRank",
        ],
    )

    problems = verify_outputs()
    if problems:
        print()
        print("FANDEX master score 검증 실패")
        for problem in problems:
            print(f"- {problem}")
        raise SystemExit(1)

    print_preview(master_ranking)

    print()
    print("=" * 60)
    print("FANDEX master score v1 생성 완료")
    print("=" * 60)
    print(f"타임스탬프 ranking JSON: {ranking_timestamp_file}")
    print(f"최신 ranking JSON: fandex_master_ranking_latest.json")
    print(f"타임스탬프 report JSON: {report_timestamp_file}")
    print(f"최신 report JSON: fandex_master_artist_reports_latest.json")
    print(f"감사 CSV: {audit_file}")


if __name__ == "__main__":
    main()
