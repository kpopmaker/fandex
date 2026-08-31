import csv
import glob
import os
from datetime import datetime


QUALITY_APPLIED_SUMMARY_FILE = "naver_quality_applied_v3_summary_latest.csv"


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def to_float(value):
    try:
        return float(value)
    except:
        return 0.0


def latest_file(pattern, exclude_words=None):
    exclude_words = exclude_words or []
    files = glob.glob(pattern)

    filtered = []
    for file in files:
        name = os.path.basename(file)

        if any(word in name for word in exclude_words):
            continue

        filtered.append(file)

    if not filtered:
        return None

    return max(filtered, key=os.path.getmtime)


def find_quality_file_from_summary(artist, source_type):
    if not os.path.exists(QUALITY_APPLIED_SUMMARY_FILE):
        return None

    rows = read_csv(QUALITY_APPLIED_SUMMARY_FILE)

    for row in rows:
        row_artist = str(row.get("artist", "")).strip()
        row_source_type = str(row.get("sourceType", "")).strip()
        output_file = str(row.get("outputClusterFile", "")).strip()

        if row_artist == artist and row_source_type == source_type and output_file:
            if os.path.exists(output_file):
                return output_file

    return None


def has_quality_filter_version(path):
    try:
        rows = read_csv(path)
        if not rows:
            return False

        return "qualityFilterVersion" in rows[0]
    except:
        return False


def find_latest_quality_cluster(pattern):
    files = glob.glob(pattern)

    files = [
        file for file in files
        if "_articles" not in os.path.basename(file)
        and "_primary" not in os.path.basename(file)
        and "_scored" not in os.path.basename(file)
    ]

    quality_files = []

    for file in files:
        if has_quality_filter_version(file):
            quality_files.append(file)

    if not quality_files:
        return None

    return max(quality_files, key=os.path.getmtime)


def find_news_issue_cluster_file(artist):
    quality_file = find_quality_file_from_summary(artist, "news")

    if quality_file:
        return quality_file

    quality_file = find_latest_quality_cluster(
        f"naver_news_{artist}_*_issue_cluster.csv"
    )

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )


def find_blog_topic_cluster_file(artist):
    quality_file = find_quality_file_from_summary(artist, "blog")

    if quality_file:
        return quality_file

    quality_file = find_latest_quality_cluster(
        f"naver_blog_{artist}_*_topic_cluster.csv"
    )

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )


def find_compare_summary_file():
    return latest_file(
        "naver_search_trend_compare_v2_summary_*.csv",
        exclude_words=[]
    )


def sum_column(rows, column_name):
    return round(sum(to_float(row.get(column_name, 0)) for row in rows), 2)


def find_artist_search_compare(compare_rows, artist):
    for row in compare_rows:
        if str(row.get("artist", "")).strip() == artist:
            return row

    return None


def main():
    artist = input("최종 네이버 누적점수 v3를 계산할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    news_file = find_news_issue_cluster_file(artist)
    blog_file = find_blog_topic_cluster_file(artist)
    compare_file = find_compare_summary_file()

    print()
    print("사용할 파일:")
    print(f"- 뉴스 이슈 묶음: {news_file}")
    print(f"- 블로그 주제 묶음: {blog_file}")
    print(f"- 비교 검색트렌드 요약: {compare_file}")
    print()

    if not news_file or not blog_file or not compare_file:
        print("필요한 파일이 부족합니다.")
        print("아래 순서가 먼저 완료되어야 합니다.")
        print("1. py naver_search_trend_compare_v2.py")
        print("2. py naver_apply_quality_blocklist_v3.py")
        return

    news_rows = read_csv(news_file)
    blog_rows = read_csv(blog_file)
    compare_rows = read_csv(compare_file)

    compare_row = find_artist_search_compare(compare_rows, artist)

    if not compare_row:
        print(f"비교 검색트렌드 요약 파일에 {artist} 데이터가 없습니다.")
        print("artist_list.txt를 확인한 뒤 py naver_search_trend_compare_v2.py 를 다시 실행하세요.")
        return

    news_point = sum_column(news_rows, "cappedIssuePoint")
    blog_point = sum_column(blog_rows, "cappedTopicPoint")
    search_point = to_float(compare_row.get("searchDemandComparePoint", 0))

    final_point = round(news_point + blog_point + search_point, 2)

    news_quality = "yes" if has_quality_filter_version(news_file) else "no"
    blog_quality = "yes" if has_quality_filter_version(blog_file) else "no"

    quality_applied = "yes" if news_quality == "yes" and blog_quality == "yes" else "partial_or_no"

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    summary = {
        "artist": artist,
        "fandexNaverFinalPoint": final_point,

        "newsIssueClusterPoint": news_point,
        "blogTopicClusterPoint": blog_point,
        "searchDemandComparePoint": round(search_point, 2),

        "searchCompareRank": compare_row.get("searchCompareRank", ""),
        "trendSum": compare_row.get("trendSum", ""),
        "trendAvg": compare_row.get("trendAvg", ""),
        "trendMax": compare_row.get("trendMax", ""),
        "trendLatest": compare_row.get("trendLatest", ""),
        "trendCount": compare_row.get("trendCount", ""),

        "searchCompareMode": "same_request",
        "qualityFilterApplied": quality_applied,
        "newsQualityFilterApplied": news_quality,
        "blogQualityFilterApplied": blog_quality,
        "qualityAppliedSummaryFile": QUALITY_APPLIED_SUMMARY_FILE if os.path.exists(QUALITY_APPLIED_SUMMARY_FILE) else "",

        "scoreVersion": "v3_compare_search_quality",
        "dataStatus": "ready",

        "newsClusterFile": os.path.basename(news_file),
        "blogClusterFile": os.path.basename(blog_file),
        "searchCompareFile": os.path.basename(compare_file),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }

    output_file = f"naver_fandex_final_v3_{artist}_{now}.csv"

    write_csv(output_file, [summary], list(summary.keys()))

    print("최종 네이버 누적점수 v3 계산 완료")
    print(f"아티스트: {artist}")
    print(f"최종 네이버 누적점수 v3: {final_point}")
    print(f"- 뉴스 이슈 묶음 점수: {news_point}")
    print(f"- 블로그 주제 묶음 점수: {blog_point}")
    print(f"- 비교 검색 수요 점수: {round(search_point, 2)}")
    print(f"- 품질 필터 적용 여부: {quality_applied}")
    print(f"- 뉴스 품질 필터: {news_quality}")
    print(f"- 블로그 품질 필터: {blog_quality}")
    print()
    print(f"요약 파일: {output_file}")


if __name__ == "__main__":
    main()