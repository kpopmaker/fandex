import csv
import glob
import json
import os
import re
import shutil
from datetime import datetime


RANKING_JSON_FILE = "fandex_naver_ranking_v3_latest.json"


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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


def clean_text(value):
    text = str(value or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def safe_filename(value):
    value = str(value or "")
    value = re.sub(r'[\\/:*?"<>|]', "_", value)
    return value.strip() or "unknown"


def get_first(row, names, default=""):
    for name in names:
        if name in row and row.get(name) not in [None, ""]:
            return row.get(name)

    return default


def find_news_cluster_file(artist, ranking_item):
    meta = ranking_item.get("meta", {})
    file_name = meta.get("newsClusterFile", "")

    if file_name and os.path.exists(file_name):
        return file_name

    return latest_file(f"naver_news_{artist}_*_issue_cluster.csv")


def find_blog_cluster_file(artist, ranking_item):
    meta = ranking_item.get("meta", {})
    file_name = meta.get("blogClusterFile", "")

    if file_name and os.path.exists(file_name):
        return file_name

    return latest_file(f"naver_blog_{artist}_*_topic_cluster.csv")


def find_search_summary_file(ranking_item):
    meta = ranking_item.get("meta", {})
    file_name = meta.get("searchCompareFile", "")

    if file_name and os.path.exists(file_name):
        return file_name

    return latest_file("naver_search_trend_compare_v2_summary_*.csv")


def find_search_detail_file(summary_file):
    if not summary_file:
        return None

    name = os.path.basename(summary_file)

    detail_name = name.replace(
        "naver_search_trend_compare_v2_summary_",
        "naver_search_trend_compare_v2_"
    )

    if os.path.exists(detail_name):
        return detail_name

    return latest_file("naver_search_trend_compare_v2_*.csv")


def build_top_news_issues(news_file, limit=10):
    if not news_file or not os.path.exists(news_file):
        return []

    rows = read_csv(news_file)

    rows.sort(
        key=lambda row: to_float(get_first(row, ["cappedIssuePoint", "issuePoint", "point"])),
        reverse=True
    )

    results = []

    for row in rows[:limit]:
        issue_key = get_first(row, ["issueKey", "clusterKey", "topicKey"], "")
        issue_group = get_first(row, ["issueGroup", "clusterGroup", "topicGroup"], "")

        results.append({
            "issueKey": issue_key,
            "issueGroup": issue_group,
            "articleCount": to_int(get_first(row, ["articleCount", "postCount", "count"], 0)),
            "rawPointSum": to_float(get_first(row, ["rawPointSum", "pointSum"], 0)),
            "cappedIssuePoint": to_float(get_first(row, ["cappedIssuePoint", "issuePoint", "point"], 0)),
            "sampleTitles": clean_text(get_first(row, ["sampleTitles", "titles", "sampleTitle"], "")),
        })

    return results


def build_top_blog_topics(blog_file, limit=10):
    if not blog_file or not os.path.exists(blog_file):
        return []

    rows = read_csv(blog_file)

    rows.sort(
        key=lambda row: to_float(get_first(row, ["cappedTopicPoint", "topicPoint", "point"])),
        reverse=True
    )

    results = []

    for row in rows[:limit]:
        results.append({
            "topicKey": get_first(row, ["topicKey", "clusterKey"], ""),
            "topicGroup": get_first(row, ["topicGroup", "clusterGroup"], ""),
            "postCount": to_int(get_first(row, ["postCount", "articleCount", "count"], 0)),
            "rawPointSum": to_float(get_first(row, ["rawPointSum", "pointSum"], 0)),
            "topicKeyCap": to_float(get_first(row, ["topicKeyCap"], 0)),
            "keyCappedTopicPoint": to_float(get_first(row, ["keyCappedTopicPoint"], 0)),
            "topicGroupCap": to_float(get_first(row, ["topicGroupCap"], 0)),
            "topicGroupRatio": to_float(get_first(row, ["topicGroupRatio"], 0)),
            "cappedTopicPoint": to_float(get_first(row, ["cappedTopicPoint", "topicPoint", "point"], 0)),
            "sampleTitles": clean_text(get_first(row, ["sampleTitles", "titles", "sampleTitle"], "")),
        })

    return results


def build_search_series(search_detail_file, artist):
    if not search_detail_file or not os.path.exists(search_detail_file):
        return []

    rows = read_csv(search_detail_file)

    series = []

    for row in rows:
        if row.get("artist") != artist:
            continue

        series.append({
            "period": row.get("period", ""),
            "ratio": to_float(row.get("ratio", 0)),
        })

    series.sort(key=lambda row: row["period"])

    return series


def build_report_item(ranking_item):
    artist = ranking_item.get("artist", "")

    components = ranking_item.get("components", {})
    shares = ranking_item.get("shares", {})
    signals = ranking_item.get("signals", {})
    search_trend = ranking_item.get("searchTrend", {})

    news_file = find_news_cluster_file(artist, ranking_item)
    blog_file = find_blog_cluster_file(artist, ranking_item)
    search_summary_file = find_search_summary_file(ranking_item)
    search_detail_file = find_search_detail_file(search_summary_file)

    top_news_issues = build_top_news_issues(news_file, limit=10)
    top_blog_topics = build_top_blog_topics(blog_file, limit=10)
    search_series = build_search_series(search_detail_file, artist)

    report = {
        "rank": to_int(ranking_item.get("rank")),
        "artist": artist,
        "fandexNaverFinalPoint": to_float(ranking_item.get("fandexNaverFinalPoint")),

        "components": {
            "newsIssueClusterPoint": to_float(components.get("newsIssueClusterPoint")),
            "blogTopicClusterPoint": to_float(components.get("blogTopicClusterPoint")),
            "searchDemandComparePoint": to_float(components.get("searchDemandComparePoint")),
        },

        "shares": {
            "newsSharePercent": to_float(shares.get("newsSharePercent")),
            "blogSharePercent": to_float(shares.get("blogSharePercent")),
            "searchSharePercent": to_float(shares.get("searchSharePercent")),
        },

        "signals": {
            "dominantSignal": signals.get("dominantSignal", ""),
            "dominantSignalLabel": signals.get("dominantSignalLabel", ""),
        },

        "summary": {
            "topNewsIssue": top_news_issues[0] if top_news_issues else None,
            "topBlogTopic": top_blog_topics[0] if top_blog_topics else None,
            "searchTrendLatest": to_float(search_trend.get("trendLatest")),
            "searchCompareRank": to_int(search_trend.get("searchCompareRank")),
        },

        "newsIssues": top_news_issues,
        "blogTopics": top_blog_topics,

        "searchTrend": {
            "searchCompareRank": to_int(search_trend.get("searchCompareRank")),
            "trendSum": to_float(search_trend.get("trendSum")),
            "trendAvg": to_float(search_trend.get("trendAvg")),
            "trendMax": to_float(search_trend.get("trendMax")),
            "trendLatest": to_float(search_trend.get("trendLatest")),
            "trendCount": to_int(search_trend.get("trendCount")),
            "series": search_series,
        },

        "meta": {
            "scoreVersion": "v3_compare_search_quality",
            "newsClusterFile": os.path.basename(news_file) if news_file else "",
            "blogClusterFile": os.path.basename(blog_file) if blog_file else "",
            "searchSummaryFile": os.path.basename(search_summary_file) if search_summary_file else "",
            "searchDetailFile": os.path.basename(search_detail_file) if search_detail_file else "",
            "rankingSourceFile": RANKING_JSON_FILE,
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
        }
    }

    return report


def main():
    if not os.path.exists(RANKING_JSON_FILE):
        print(f"{RANKING_JSON_FILE} 파일이 없습니다.")
        print("먼저 py naver_fandex_export_v3_json.py 를 실행하세요.")
        return

    ranking_data = read_json(RANKING_JSON_FILE)
    ranking_items = ranking_data.get("ranking", [])

    if not ranking_items:
        print("랭킹 JSON 안에 ranking 데이터가 없습니다.")
        return

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    reports = []

    print()
    print("네이버 FANDEX 아티스트 상세 리포트 v3 생성 시작")
    print()

    for item in ranking_items:
        report = build_report_item(item)
        reports.append(report)

        artist = report["artist"]
        artist_file = f"fandex_naver_artist_report_v3_{safe_filename(artist)}_{now}.json"
        artist_latest_file = f"fandex_naver_artist_report_v3_{safe_filename(artist)}_latest.json"

        write_json(artist_file, report)
        shutil.copyfile(artist_file, artist_latest_file)

        print(
            f"- {artist} 상세 리포트 생성 완료: "
            f"{artist_latest_file}"
        )

    output = {
        "service": "FANDEX",
        "metric": "naverArtistDetailReport",
        "version": "v3_compare_search_quality",
        "sourceFile": RANKING_JSON_FILE,
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "count": len(reports),
        "reports": reports,
    }

    timestamp_file = f"fandex_naver_artist_reports_v3_{now}.json"
    latest_file = "fandex_naver_artist_reports_v3_latest.json"

    write_json(timestamp_file, output)
    shutil.copyfile(timestamp_file, latest_file)

    print()
    print("아티스트 상세 리포트 v3 전체 생성 완료")
    print(f"타임스탬프 JSON: {timestamp_file}")
    print(f"최신 고정 JSON: {latest_file}")
    print()
    print("미리보기")

    for report in reports:
        top_news = report["summary"]["topNewsIssue"]
        top_blog = report["summary"]["topBlogTopic"]

        top_news_key = top_news["issueKey"] if top_news else "-"
        top_blog_key = top_blog["topicKey"] if top_blog else "-"

        print(
            f"{report['rank']}위. {report['artist']} "
            f"- {report['fandexNaverFinalPoint']}점 "
            f"/ 뉴스 TOP: {top_news_key} "
            f"/ 블로그 TOP: {top_blog_key}"
        )


if __name__ == "__main__":
    main()