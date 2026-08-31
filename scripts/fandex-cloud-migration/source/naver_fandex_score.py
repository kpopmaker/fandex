import csv
import glob
import os
from datetime import datetime

def read_csv_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def clamp(value, min_value=0, max_value=100):
    return max(min_value, min(max_value, value))

def get_latest_file(pattern):
    files = glob.glob(pattern)
    if not files:
        return None
    return max(files, key=os.path.getmtime)

def calculate_news_issue_point(news_primary_rows):
    count = len(news_primary_rows)

    # 최신 검색 결과 기준. 중심 뉴스 50개 이상이면 100점에 가깝게 봄.
    count_score = clamp((count / 50) * 100)

    avg_relevance = 0
    if news_primary_rows:
        avg_relevance = sum(float(row.get("relevance_score", 0) or 0) for row in news_primary_rows) / len(news_primary_rows)

    # 기사 수 70%, 중심성 평균 30%
    return round(count_score * 0.7 + avg_relevance * 0.3, 2)

def calculate_fan_content_point(blog_primary_rows):
    count = len(blog_primary_rows)

    # 블로그 중심 글 50개 이상이면 100점에 가깝게 봄.
    count_score = clamp((count / 50) * 100)

    avg_relevance = 0
    if blog_primary_rows:
        avg_relevance = sum(float(row.get("relevance_score", 0) or 0) for row in blog_primary_rows) / len(blog_primary_rows)

    # 글 수 70%, 중심성 평균 30%
    return round(count_score * 0.7 + avg_relevance * 0.3, 2)

def calculate_search_demand_point(trend_rows):
    if not trend_rows:
        return {
            "searchDemandPoint": 0,
            "trendAvg": 0,
            "trendMax": 0,
            "trendLatest": 0,
            "trendFirst": 0,
            "trendChange": 0,
            "trendChangeRate": 0,
        }

    sorted_rows = sorted(trend_rows, key=lambda row: row.get("period", ""))
    ratios = [float(row.get("ratio", 0) or 0) for row in sorted_rows]

    trend_avg = sum(ratios) / len(ratios)
    trend_max = max(ratios)
    trend_first = ratios[0]
    trend_latest = ratios[-1]
    trend_change = trend_latest - trend_first

    if trend_first == 0:
        trend_change_rate = 0
    else:
        trend_change_rate = (trend_change / trend_first) * 100

    # 평균 관심도 60%, 최고점 20%, 최근 변화 20%
    # 최근 변화는 -50~+50 구간을 0~100으로 변환
    change_score = clamp(trend_change + 50)

    search_demand_point = (
        trend_avg * 0.6
        + trend_max * 0.2
        + change_score * 0.2
    )

    return {
        "searchDemandPoint": round(clamp(search_demand_point), 2),
        "trendAvg": round(trend_avg, 2),
        "trendMax": round(trend_max, 2),
        "trendLatest": round(trend_latest, 2),
        "trendFirst": round(trend_first, 2),
        "trendChange": round(trend_change, 2),
        "trendChangeRate": round(trend_change_rate, 2),
    }

def get_latest_date(rows):
    dates = [row.get("date", "") for row in rows if row.get("date")]
    if not dates:
        return ""
    return max(dates)

def write_summary(path, row):
    fieldnames = [
        "artist",
        "naverSignalScore",
        "newsIssuePoint",
        "fanContentPoint",
        "searchDemandPoint",
        "newsPrimaryCount",
        "blogPrimaryCount",
        "trendAvg",
        "trendMax",
        "trendFirst",
        "trendLatest",
        "trendChange",
        "trendChangeRate",
        "newsLatestDate",
        "blogLatestDate",
        "dataStatus",
        "generatedAt",
        "newsFile",
        "blogFile",
        "trendFile",
    ]

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow(row)

def main():
    artist = input("점수를 계산할 아티스트/검색어를 입력하세요: ").strip()

    if not artist:
        print("검색어가 비어 있어서 종료합니다.")
        return

    news_file = get_latest_file(f"naver_news_{artist}_*_primary.csv")
    blog_file = get_latest_file(f"naver_blog_{artist}_*_primary.csv")
    trend_file = get_latest_file(f"naver_search_trend_{artist}_*.csv")

    missing = []

    if not news_file:
        missing.append("뉴스 primary CSV")
    if not blog_file:
        missing.append("블로그 primary CSV")
    if not trend_file:
        missing.append("검색어트렌드 CSV")

    if missing:
        print("필요한 파일이 없습니다:", ", ".join(missing))
        print("먼저 naver_collector.py와 naver_relevance_filter.py를 실행하세요.")
        return

    news_rows = read_csv_rows(news_file)
    blog_rows = read_csv_rows(blog_file)
    trend_rows = read_csv_rows(trend_file)

    news_issue_point = calculate_news_issue_point(news_rows)
    fan_content_point = calculate_fan_content_point(blog_rows)
    trend_metrics = calculate_search_demand_point(trend_rows)
    search_demand_point = trend_metrics["searchDemandPoint"]

    naver_signal_score = round(
        (
            news_issue_point * 0.35
            + fan_content_point * 0.30
            + search_demand_point * 0.35
        ),
        2,
    )

    data_status = "ready"
    if len(news_rows) == 0 or len(blog_rows) == 0 or len(trend_rows) == 0:
        data_status = "partial"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_fandex_score_{artist}_{timestamp}.csv"

    row = {
        "artist": artist,
        "naverSignalScore": naver_signal_score,
        "newsIssuePoint": news_issue_point,
        "fanContentPoint": fan_content_point,
        "searchDemandPoint": search_demand_point,
        "newsPrimaryCount": len(news_rows),
        "blogPrimaryCount": len(blog_rows),
        "trendAvg": trend_metrics["trendAvg"],
        "trendMax": trend_metrics["trendMax"],
        "trendFirst": trend_metrics["trendFirst"],
        "trendLatest": trend_metrics["trendLatest"],
        "trendChange": trend_metrics["trendChange"],
        "trendChangeRate": trend_metrics["trendChangeRate"],
        "newsLatestDate": get_latest_date(news_rows),
        "blogLatestDate": get_latest_date(blog_rows),
        "dataStatus": data_status,
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "newsFile": news_file,
        "blogFile": blog_file,
        "trendFile": trend_file,
    }

    write_summary(output_file, row)

    print()
    print("FANDEX 네이버 신호 점수 계산 완료")
    print("아티스트:", artist)
    print("종합 점수:", naver_signal_score)
    print("뉴스 이슈 점수:", news_issue_point)
    print("팬 콘텐츠 점수:", fan_content_point)
    print("검색 수요 점수:", search_demand_point)
    print("저장 파일:", output_file)

if __name__ == "__main__":
    main()