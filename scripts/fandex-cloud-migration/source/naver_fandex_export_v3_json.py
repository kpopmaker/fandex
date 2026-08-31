import csv
import glob
import json
import os
import shutil
from datetime import datetime


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def to_float(value):
    try:
        return float(value)
    except:
        return 0.0


def to_int(value):
    try:
        return int(float(value))
    except:
        return 0


def latest_file(pattern):
    files = glob.glob(pattern)

    if not files:
        return None

    return max(files, key=os.path.getmtime)


def calc_dominant_signal(news_point, blog_point, search_point):
    values = {
        "news": news_point,
        "blog": blog_point,
        "search": search_point,
    }

    dominant = max(values, key=values.get)

    if dominant == "news":
        return "news_issue"

    if dominant == "blog":
        return "blog_topic"

    if dominant == "search":
        return "search_demand"

    return "mixed"


def calc_signal_label(signal):
    labels = {
        "news_issue": "뉴스 이슈",
        "blog_topic": "블로그 화제성",
        "search_demand": "검색 수요",
        "mixed": "혼합",
    }

    return labels.get(signal, "혼합")


def main():
    ranking_file = latest_file("naver_fandex_ranking_v3_*.csv")

    if not ranking_file:
        print("ranking v3 파일이 없습니다.")
        print("먼저 py naver_fandex_ranking_v3.py 를 실행하세요.")
        return

    rows = read_csv(ranking_file)

    export_rows = []

    for row in rows:
        rank = to_int(row.get("rank"))
        artist = row.get("artist", "")

        final_point = to_float(row.get("fandexNaverFinalPoint"))
        news_point = to_float(row.get("newsIssueClusterPoint"))
        blog_point = to_float(row.get("blogTopicClusterPoint"))
        search_point = to_float(row.get("searchDemandComparePoint"))

        dominant_signal = calc_dominant_signal(
            news_point=news_point,
            blog_point=blog_point,
            search_point=search_point,
        )

        export_rows.append({
            "rank": rank,
            "artist": artist,
            "fandexNaverFinalPoint": final_point,

            "components": {
                "newsIssueClusterPoint": news_point,
                "blogTopicClusterPoint": blog_point,
                "searchDemandComparePoint": search_point,
            },

            "shares": {
                "newsSharePercent": to_float(row.get("newsSharePercent")),
                "blogSharePercent": to_float(row.get("blogSharePercent")),
                "searchSharePercent": to_float(row.get("searchSharePercent")),
            },

            "signals": {
                "dominantSignal": dominant_signal,
                "dominantSignalLabel": calc_signal_label(dominant_signal),
            },

            "searchTrend": {
                "searchCompareRank": to_int(row.get("searchCompareRank")),
                "trendSum": to_float(row.get("trendSum")),
                "trendAvg": to_float(row.get("trendAvg")),
                "trendMax": to_float(row.get("trendMax")),
                "trendLatest": to_float(row.get("trendLatest")),
                "trendCount": to_int(row.get("trendCount")),
            },

            "meta": {
                "scoreVersion": "v3_compare_search_quality",
                "newsClusterFile": row.get("newsClusterFile", ""),
                "blogClusterFile": row.get("blogClusterFile", ""),
                "searchCompareFile": row.get("searchCompareFile", ""),
                "finalSourceFile": row.get("finalSourceFile", ""),
                "generatedAt": row.get("generatedAt", ""),
            },
        })

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    output = {
        "service": "FANDEX",
        "metric": "naverCumulativeScore",
        "version": "v3_compare_search_quality",
        "sourceFile": os.path.basename(ranking_file),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "count": len(export_rows),
        "ranking": export_rows,
    }

    timestamp_file = f"fandex_naver_ranking_v3_{now}.json"
    latest_file_name = "fandex_naver_ranking_v3_latest.json"

    with open(timestamp_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    shutil.copyfile(timestamp_file, latest_file_name)

    print()
    print("FANDEX 사이트용 JSON export 완료")
    print(f"원본 랭킹 파일: {ranking_file}")
    print(f"타임스탬프 JSON: {timestamp_file}")
    print(f"최신 고정 JSON: {latest_file_name}")
    print()
    print("미리보기")

    for item in export_rows:
        components = item["components"]

        print(
            f"{item['rank']}위. {item['artist']} "
            f"- {item['fandexNaverFinalPoint']}점 "
            f"/ 핵심 신호: {item['signals']['dominantSignalLabel']} "
            f"/ 뉴스 {components['newsIssueClusterPoint']} "
            f"/ 블로그 {components['blogTopicClusterPoint']} "
            f"/ 검색 {components['searchDemandComparePoint']}"
        )


if __name__ == "__main__":
    main()