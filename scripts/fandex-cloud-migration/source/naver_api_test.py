import os
import json
import requests
from datetime import date, timedelta

CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    raise RuntimeError("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 저장되어 있지 않습니다.")

headers = {
    "X-Naver-Client-Id": CLIENT_ID,
    "X-Naver-Client-Secret": CLIENT_SECRET,
}

end_date = date.today() - timedelta(days=1)
start_date = end_date - timedelta(days=30)

def print_result(name, response):
    print("\n" + "=" * 50)
    print(name)
    print("상태 코드:", response.status_code)

    if response.status_code == 200:
        data = response.json()
        print("성공")

        if "items" in data:
            print("결과 개수:", len(data["items"]))
            if data["items"]:
                print("첫 결과:", data["items"][0])

        if "results" in data:
            print("결과 그룹 수:", len(data["results"]))
            if data["results"]:
                print("첫 그룹:", data["results"][0])
    else:
        print("실패")
        print(response.text[:1000])

# 1. 검색 API - 블로그
blog_response = requests.get(
    "https://openapi.naver.com/v1/search/blog.json",
    headers=headers,
    params={
        "query": "도영",
        "display": 3,
        "start": 1,
        "sort": "date",
    },
    timeout=20,
)
print_result("검색 API - 블로그", blog_response)

# 2. 검색 API - 뉴스
news_response = requests.get(
    "https://openapi.naver.com/v1/search/news.json",
    headers=headers,
    params={
        "query": "도영",
        "display": 3,
        "start": 1,
        "sort": "date",
    },
    timeout=20,
)
print_result("검색 API - 뉴스", news_response)

# 3. 데이터랩 - 검색어트렌드
trend_body = {
    "startDate": start_date.isoformat(),
    "endDate": end_date.isoformat(),
    "timeUnit": "date",
    "keywordGroups": [
        {
            "groupName": "도영",
            "keywords": ["도영", "NCT 도영"],
        }
    ],
}

trend_response = requests.post(
    "https://openapi.naver.com/v1/datalab/search",
    headers={**headers, "Content-Type": "application/json"},
    data=json.dumps(trend_body, ensure_ascii=False).encode("utf-8"),
    timeout=20,
)
print_result("데이터랩 - 검색어트렌드", trend_response)

# 4. 데이터랩 - 쇼핑인사이트 키워드
shopping_body = {
    "startDate": start_date.isoformat(),
    "endDate": end_date.isoformat(),
    "timeUnit": "date",
    "category": "50000011",
    "keyword": [
        {
            "name": "앨범",
            "param": ["앨범"],
        }
    ],
}

shopping_response = requests.post(
    "https://openapi.naver.com/v1/datalab/shopping/category/keywords",
    headers={**headers, "Content-Type": "application/json"},
    data=json.dumps(shopping_body, ensure_ascii=False).encode("utf-8"),
    timeout=20,
)
print_result("데이터랩 - 쇼핑인사이트 키워드", shopping_response)