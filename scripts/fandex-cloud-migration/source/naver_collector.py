import os
import re
import csv
import json
import requests
from html import unescape
from datetime import datetime, date, timedelta

CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    raise RuntimeError("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 저장되어 있지 않습니다.")

HEADERS = {
    "X-Naver-Client-Id": CLIENT_ID,
    "X-Naver-Client-Secret": CLIENT_SECRET,
}

def clean_html(text):
    if text is None:
        return ""

    text = unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def safe_filename(text):
    text = re.sub(r'[\\/:*?"<>|]', "_", text)
    text = re.sub(r"\s+", "_", text)
    return text[:80]

def get_int_input(prompt, default):
    value = input(prompt).strip()

    if not value:
        return default

    try:
        number = int(value)
    except ValueError:
        print(f"숫자가 아니라서 기본값 {default}개로 진행합니다.")
        return default

    if number <= 0:
        print(f"0 이하라서 기본값 {default}개로 진행합니다.")
        return default

    return number

def get_date_input(prompt, default_value):
    value = input(prompt).strip()

    if not value:
        return default_value

    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        print(f"날짜 형식이 맞지 않아 기본값 {default_value}로 진행합니다.")
        return default_value

    return value

def write_csv(filename, rows, fieldnames):
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def collect_search(kind, query, target_count, sort):
    if kind not in ["blog", "news"]:
        raise ValueError("kind는 blog 또는 news만 가능합니다.")

    endpoint = f"https://openapi.naver.com/v1/search/{kind}.json"

    rows = []
    start = 1

    while len(rows) < target_count and start <= 1000:
        display = min(100, target_count - len(rows))

        response = requests.get(
            endpoint,
            headers=HEADERS,
            params={
                "query": query,
                "display": display,
                "start": start,
                "sort": sort,
            },
            timeout=20,
        )

        if response.status_code != 200:
            print(f"{kind} 검색 API 요청 실패")
            print("상태 코드:", response.status_code)
            print(response.text[:1000])
            break

        data = response.json()
        items = data.get("items", [])

        if not items:
            break

        for item in items:
            if kind == "blog":
                rows.append({
                    "source_type": "blog",
                    "query": query,
                    "title": clean_html(item.get("title")),
                    "link": item.get("link", ""),
                    "description": clean_html(item.get("description")),
                    "source_name": item.get("bloggername", ""),
                    "source_link": item.get("bloggerlink", ""),
                    "date": item.get("postdate", ""),
                    "collected_at": datetime.now().isoformat(timespec="seconds"),
                })

            if kind == "news":
                rows.append({
                    "source_type": "news",
                    "query": query,
                    "title": clean_html(item.get("title")),
                    "link": item.get("link", ""),
                    "originallink": item.get("originallink", ""),
                    "description": clean_html(item.get("description")),
                    "source_name": "",
                    "source_link": "",
                    "date": item.get("pubDate", ""),
                    "collected_at": datetime.now().isoformat(timespec="seconds"),
                })

        start += len(items)

        if len(items) < display:
            break

    return rows

def collect_search_trend(query, start_date, end_date, time_unit):
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
        "https://openapi.naver.com/v1/datalab/search",
        headers={**HEADERS, "Content-Type": "application/json"},
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        timeout=20,
    )

    if response.status_code != 200:
        print("검색어트렌드 API 요청 실패")
        print("상태 코드:", response.status_code)
        print(response.text[:1000])
        return []

    data = response.json()

    rows = []

    for result in data.get("results", []):
        title = result.get("title", "")
        keywords = ", ".join(result.get("keywords", []))

        for item in result.get("data", []):
            rows.append({
                "source_type": "search_trend",
                "query": query,
                "group_name": title,
                "keywords": keywords,
                "period": item.get("period", ""),
                "ratio": item.get("ratio", ""),
                "time_unit": time_unit,
                "start_date": start_date,
                "end_date": end_date,
                "collected_at": datetime.now().isoformat(timespec="seconds"),
            })

    return rows

def main():
    query = input("수집할 검색어를 입력하세요: ").strip()

    if not query:
        print("검색어가 비어 있어서 종료합니다.")
        return

    count = get_int_input("블로그/뉴스 각각 몇 개씩 수집할까요? 기본값 100: ", 100)

    sort_input = input("검색 정렬 방식 sim=정확도순, date=최신순. 기본값 date: ").strip()
    sort = sort_input if sort_input in ["sim", "date"] else "date"

    yesterday = date.today() - timedelta(days=1)
    default_end = yesterday.isoformat()
    default_start = (yesterday - timedelta(days=30)).isoformat()

    start_date = get_date_input(f"트렌드 시작일 YYYY-MM-DD. 기본값 {default_start}: ", default_start)
    end_date = get_date_input(f"트렌드 종료일 YYYY-MM-DD. 기본값 {default_end}: ", default_end)

    time_unit_input = input("트렌드 단위 date=일간, week=주간, month=월간. 기본값 date: ").strip()
    time_unit = time_unit_input if time_unit_input in ["date", "week", "month"] else "date"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    query_slug = safe_filename(query)

    print("\n블로그 검색 수집 중...")
    blog_rows = collect_search("blog", query, count, sort)
    blog_file = f"naver_blog_{query_slug}_{timestamp}.csv"
    write_csv(
        blog_file,
        blog_rows,
        [
            "source_type",
            "query",
            "title",
            "link",
            "description",
            "source_name",
            "source_link",
            "date",
            "collected_at",
        ],
    )
    print(f"블로그 {len(blog_rows)}개 저장 완료: {blog_file}")

    print("\n뉴스 검색 수집 중...")
    news_rows = collect_search("news", query, count, sort)
    news_file = f"naver_news_{query_slug}_{timestamp}.csv"
    write_csv(
        news_file,
        news_rows,
        [
            "source_type",
            "query",
            "title",
            "link",
            "originallink",
            "description",
            "source_name",
            "source_link",
            "date",
            "collected_at",
        ],
    )
    print(f"뉴스 {len(news_rows)}개 저장 완료: {news_file}")

    print("\n검색어트렌드 수집 중...")
    trend_rows = collect_search_trend(query, start_date, end_date, time_unit)
    trend_file = f"naver_search_trend_{query_slug}_{timestamp}.csv"
    write_csv(
        trend_file,
        trend_rows,
        [
            "source_type",
            "query",
            "group_name",
            "keywords",
            "period",
            "ratio",
            "time_unit",
            "start_date",
            "end_date",
            "collected_at",
        ],
    )
    print(f"검색어트렌드 {len(trend_rows)}개 저장 완료: {trend_file}")

    print("\n완료")
    print("저장 위치:", os.getcwd())

if __name__ == "__main__":
    main()