import csv
import os
import time
import requests
from datetime import datetime, timedelta


NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET")

ARTIST_LIST_FILE = "artist_list.txt"


def read_artist_list():
    if not os.path.exists(ARTIST_LIST_FILE):
        return []

    artists = []

    with open(ARTIST_LIST_FILE, "r", encoding="utf-8-sig") as f:
        for line in f:
            name = line.strip()
            if name:
                artists.append(name)

    return artists


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def ask_int(message, default_value, min_value=1, max_value=1000):
    raw = input(f"{message} 기본값 {default_value}: ").strip()

    if not raw:
        return default_value

    try:
        value = int(raw)
    except ValueError:
        return default_value

    if value < min_value:
        return min_value

    if value > max_value:
        return max_value

    return value


def ask_text(message, default_value):
    raw = input(f"{message} 기본값 {default_value}: ").strip()
    return raw if raw else default_value


def get_headers():
    return {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }


def check_api_keys():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 없습니다.")
        print("먼저 네이버 API 키를 환경변수로 저장해야 합니다.")
        return False

    return True


def fetch_search_api(api_type, query, total_count, sort):
    if api_type == "news":
        url = "https://openapi.naver.com/v1/search/news.json"
    elif api_type == "blog":
        url = "https://openapi.naver.com/v1/search/blog.json"
    else:
        raise ValueError("api_type은 news 또는 blog만 가능합니다.")

    rows = []
    display = 100

    for start in range(1, total_count + 1, display):
        params = {
            "query": query,
            "display": min(display, total_count - len(rows)),
            "start": start,
            "sort": sort,
        }

        response = requests.get(
            url,
            headers=get_headers(),
            params=params,
            timeout=15,
        )

        if response.status_code != 200:
            print(f"{api_type} 수집 실패: {response.status_code}")
            print(response.text[:500])
            break

        data = response.json()
        items = data.get("items", [])

        if not items:
            break

        for item in items:
            rows.append(item)

        if len(rows) >= total_count:
            break

        time.sleep(0.2)

    return rows[:total_count]


def fetch_search_trend(query, start_date, end_date, time_unit):
    url = "https://openapi.naver.com/v1/datalab/search"

    body = {
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": time_unit,
        "keywordGroups": [
            {
                "groupName": query,
                "keywords": [query],
            }
        ],
    }

    response = requests.post(
        url,
        headers={
            **get_headers(),
            "Content-Type": "application/json",
        },
        json=body,
        timeout=15,
    )

    if response.status_code != 200:
        print(f"검색트렌드 수집 실패: {response.status_code}")
        print(response.text[:500])
        return []

    data = response.json()
    results = data.get("results", [])

    if not results:
        return []

    trend_rows = []

    for group in results:
        group_name = group.get("title", query)

        for item in group.get("data", []):
            trend_rows.append({
                "query": query,
                "groupName": group_name,
                "period": item.get("period", ""),
                "ratio": item.get("ratio", ""),
                "startDate": start_date,
                "endDate": end_date,
                "timeUnit": time_unit,
            })

    return trend_rows


def normalize_news_rows(rows, query):
    normalized = []

    for row in rows:
        normalized.append({
            "query": query,
            "title": row.get("title", ""),
            "originallink": row.get("originallink", ""),
            "link": row.get("link", ""),
            "description": row.get("description", ""),
            "pubDate": row.get("pubDate", ""),
        })

    return normalized


def normalize_blog_rows(rows, query):
    normalized = []

    for row in rows:
        normalized.append({
            "query": query,
            "title": row.get("title", ""),
            "link": row.get("link", ""),
            "description": row.get("description", ""),
            "bloggername": row.get("bloggername", ""),
            "bloggerlink": row.get("bloggerlink", ""),
            "postdate": row.get("postdate", ""),
        })

    return normalized


def collect_artist(artist, news_count, blog_count, search_sort, trend_days, time_unit):
    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    end = datetime.now().date()
    start = end - timedelta(days=trend_days)

    start_date = start.strftime("%Y-%m-%d")
    end_date = end.strftime("%Y-%m-%d")

    print()
    print("=" * 60)
    print(f"[{artist}] 원본 수집 시작")
    print("=" * 60)

    print(f"- 뉴스 {news_count}개 수집 중")
    news_rows_raw = fetch_search_api(
        api_type="news",
        query=artist,
        total_count=news_count,
        sort=search_sort,
    )

    news_rows = normalize_news_rows(news_rows_raw, artist)

    news_file = f"naver_news_{artist}_{now}.csv"
    write_csv(
        news_file,
        news_rows,
        ["query", "title", "originallink", "link", "description", "pubDate"],
    )

    print(f"  저장 완료: {news_file} / {len(news_rows)}개")

    print(f"- 블로그 {blog_count}개 수집 중")
    blog_rows_raw = fetch_search_api(
        api_type="blog",
        query=artist,
        total_count=blog_count,
        sort=search_sort,
    )

    blog_rows = normalize_blog_rows(blog_rows_raw, artist)

    blog_file = f"naver_blog_{artist}_{now}.csv"
    write_csv(
        blog_file,
        blog_rows,
        ["query", "title", "link", "description", "bloggername", "bloggerlink", "postdate"],
    )

    print(f"  저장 완료: {blog_file} / {len(blog_rows)}개")

    print(f"- 검색트렌드 수집 중: {start_date} ~ {end_date}")
    trend_rows = fetch_search_trend(
        query=artist,
        start_date=start_date,
        end_date=end_date,
        time_unit=time_unit,
    )

    trend_file = f"naver_search_trend_{artist}_{now}.csv"
    write_csv(
        trend_file,
        trend_rows,
        ["query", "groupName", "period", "ratio", "startDate", "endDate", "timeUnit"],
    )

    print(f"  저장 완료: {trend_file} / {len(trend_rows)}개")

    return {
        "artist": artist,
        "newsFile": news_file,
        "newsCount": len(news_rows),
        "blogFile": blog_file,
        "blogCount": len(blog_rows),
        "trendFile": trend_file,
        "trendCount": len(trend_rows),
    }


def main():
    if not check_api_keys():
        return

    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        print("예시:")
        print("아이유")
        print("에스파")
        return

    print()
    print("네이버 원본 수집 자동화 v2 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()

    news_count = ask_int("뉴스 수집 개수", 100, 1, 1000)
    blog_count = ask_int("블로그 수집 개수", 100, 1, 1000)

    search_sort = ask_text("정렬 방식 sim/date 중 선택", "date")

    if search_sort not in ["sim", "date"]:
        search_sort = "date"

    trend_days = ask_int("검색트렌드 기간, 최근 N일", 30, 1, 365)
    time_unit = ask_text("검색트렌드 단위 date/week/month 중 선택", "date")

    if time_unit not in ["date", "week", "month"]:
        time_unit = "date"

    summaries = []

    for artist in artists:
        try:
            summary = collect_artist(
                artist=artist,
                news_count=news_count,
                blog_count=blog_count,
                search_sort=search_sort,
                trend_days=trend_days,
                time_unit=time_unit,
            )

            summaries.append(summary)

            time.sleep(0.5)

        except Exception as e:
            print(f"[{artist}] 수집 중 오류 발생: {e}")
            summaries.append({
                "artist": artist,
                "newsFile": "",
                "newsCount": 0,
                "blogFile": "",
                "blogCount": 0,
                "trendFile": "",
                "trendCount": 0,
                "error": str(e),
            })

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_file = f"naver_multi_collector_v2_summary_{now}.csv"

    fieldnames = [
        "artist",
        "newsFile",
        "newsCount",
        "blogFile",
        "blogCount",
        "trendFile",
        "trendCount",
    ]

    if any("error" in row for row in summaries):
        fieldnames.append("error")

    write_csv(summary_file, summaries, fieldnames)

    print()
    print("네이버 원본 수집 자동화 완료")
    print(f"요약 파일: {summary_file}")
    print()
    print("다음 단계:")
    print("py naver_batch_pipeline_safe_v2.py")


if __name__ == "__main__":
    main()