import csv
import glob
import os
from datetime import datetime


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
    files = [
        file for file in files
        if not any(word in os.path.basename(file) for word in exclude_words)
    ]

    if not files:
        return None

    return max(files, key=os.path.getmtime)


def sum_column(rows, column_name):
    return round(sum(to_float(row.get(column_name, 0)) for row in rows), 2)


def analyze_trend(rows):
    ratios = []

    for row in rows:
        try:
            ratios.append(float(row.get("ratio", 0)))
        except:
            pass

    if not ratios:
        return {
            "searchDemandPoint": 0.0,
            "trendSum": 0.0,
            "trendAvg": 0.0,
            "trendMax": 0.0,
            "trendLatest": 0.0,
        }

    trend_sum = sum(ratios)

    return {
        "searchDemandPoint": round(trend_sum / 10, 2),
        "trendSum": round(trend_sum, 2),
        "trendAvg": round(trend_sum / len(ratios), 2),
        "trendMax": round(max(ratios), 2),
        "trendLatest": round(ratios[-1], 2),
    }


def main():
    artist = input("최종 네이버 누적점수를 계산할 아티스트명을 입력하세요: ").strip()

    news_file = latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_words=["_articles"]
    )

    blog_file = latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_words=["_articles"]
    )

    trend_file = latest_file(
        f"naver_search_trend_{artist}_*.csv",
        exclude_words=["_scored", "_review", "_cumulative", "_final"]
    )

    print()
    print("사용할 파일:")
    print(f"- 뉴스 이슈 묶음: {news_file}")
    print(f"- 블로그 주제 묶음: {blog_file}")
    print(f"- 검색트렌드: {trend_file}")
    print()

    if not news_file or not blog_file or not trend_file:
        print("필요한 파일이 부족합니다.")
        return

    news_rows = read_csv(news_file)
    blog_rows = read_csv(blog_file)
    trend_rows = read_csv(trend_file)

    news_point = sum_column(news_rows, "cappedIssuePoint")
    blog_point = sum_column(blog_rows, "cappedTopicPoint")
    trend = analyze_trend(trend_rows)

    final_point = round(
        news_point + blog_point + trend["searchDemandPoint"],
        2
    )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    summary = {
        "artist": artist,
        "fandexNaverFinalPoint": final_point,
        "newsIssueClusterPoint": news_point,
        "blogTopicClusterPoint": blog_point,
        "searchDemandPoint": trend["searchDemandPoint"],
        "trendSum": trend["trendSum"],
        "trendAvg": trend["trendAvg"],
        "trendMax": trend["trendMax"],
        "trendLatest": trend["trendLatest"],
        "newsClusterFile": os.path.basename(news_file),
        "blogClusterFile": os.path.basename(blog_file),
        "trendFile": os.path.basename(trend_file),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }

    summary_file = f"naver_fandex_final_v2_{artist}_{now}.csv"

    write_csv(summary_file, [summary], list(summary.keys()))

    print("최종 네이버 누적점수 계산 완료")
    print(f"아티스트: {artist}")
    print(f"최종 네이버 누적점수: {final_point}")
    print(f"- 뉴스 이슈 묶음 점수: {news_point}")
    print(f"- 블로그 주제 묶음 점수: {blog_point}")
    print(f"- 검색 수요 누적점수: {trend['searchDemandPoint']}")
    print()
    print(f"요약 파일: {summary_file}")


if __name__ == "__main__":
    main()