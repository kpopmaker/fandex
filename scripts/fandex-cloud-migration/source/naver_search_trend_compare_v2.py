import csv
import os
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


def ask_int(message, default_value, min_value=1, max_value=365):
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


def check_api_keys():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 없습니다.")
        return False

    return True


def to_float(value):
    try:
        return float(value)
    except:
        return 0.0


def fetch_compare_trend(artists, start_date, end_date, time_unit):
    url = "https://openapi.naver.com/v1/datalab/search"

    keyword_groups = []

    for artist in artists:
        keyword_groups.append({
            "groupName": artist,
            "keywords": [artist],
        })

    body = {
        "startDate": start_date,
        "endDate": end_date,
        "timeUnit": time_unit,
        "keywordGroups": keyword_groups,
    }

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        "Content-Type": "application/json",
    }

    response = requests.post(
        url,
        headers=headers,
        json=body,
        timeout=20,
    )

    if response.status_code != 200:
        print(f"검색트렌드 비교 수집 실패: {response.status_code}")
        print(response.text[:1000])
        return []

    data = response.json()
    results = data.get("results", [])

    rows = []

    for group in results:
        artist = group.get("title", "")

        for item in group.get("data", []):
            rows.append({
                "artist": artist,
                "period": item.get("period", ""),
                "ratio": item.get("ratio", ""),
                "startDate": start_date,
                "endDate": end_date,
                "timeUnit": time_unit,
                "compareMode": "same_request",
            })

    return rows


def summarize_compare(rows):
    by_artist = {}

    for row in rows:
        artist = row.get("artist", "")
        ratio = to_float(row.get("ratio", 0))

        if artist not in by_artist:
            by_artist[artist] = {
                "artist": artist,
                "trendSum": 0.0,
                "trendCount": 0,
                "trendMax": 0.0,
                "trendLatest": 0.0,
                "ratios": [],
            }

        by_artist[artist]["trendSum"] += ratio
        by_artist[artist]["trendCount"] += 1
        by_artist[artist]["trendMax"] = max(by_artist[artist]["trendMax"], ratio)
        by_artist[artist]["ratios"].append(ratio)

    summary_rows = []

    for artist, data in by_artist.items():
        ratios = data["ratios"]
        trend_sum = data["trendSum"]
        trend_count = data["trendCount"]
        trend_avg = trend_sum / trend_count if trend_count else 0.0
        trend_latest = ratios[-1] if ratios else 0.0

        summary_rows.append({
            "artist": artist,
            "searchDemandComparePoint": round(trend_sum / 10, 2),
            "trendSum": round(trend_sum, 2),
            "trendAvg": round(trend_avg, 2),
            "trendMax": round(data["trendMax"], 2),
            "trendLatest": round(trend_latest, 2),
            "trendCount": trend_count,
            "compareMode": "same_request",
        })

    summary_rows.sort(
        key=lambda row: to_float(row["searchDemandComparePoint"]),
        reverse=True
    )

    for index, row in enumerate(summary_rows, start=1):
        row["searchCompareRank"] = index

    return summary_rows


def main():
    if not check_api_keys():
        return

    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        return

    if len(artists) > 5:
        print("현재 비교 검색트렌드는 한 번에 최대 5명까지만 권장합니다.")
        print("artist_list.txt를 5명 이하로 줄여주세요.")
        print(f"현재 아티스트 수: {len(artists)}")
        return

    print()
    print("네이버 검색트렌드 아티스트 비교 v2 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()

    trend_days = ask_int("검색트렌드 기간, 최근 N일", 30, 1, 365)
    time_unit = ask_text("검색트렌드 단위 date/week/month 중 선택", "date")

    if time_unit not in ["date", "week", "month"]:
        time_unit = "date"

    end = datetime.now().date()
    start = end - timedelta(days=trend_days)

    start_date = start.strftime("%Y-%m-%d")
    end_date = end.strftime("%Y-%m-%d")

    rows = fetch_compare_trend(
        artists=artists,
        start_date=start_date,
        end_date=end_date,
        time_unit=time_unit,
    )

    if not rows:
        print("검색트렌드 비교 결과가 없습니다.")
        return

    summary_rows = summarize_compare(rows)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    detail_file = f"naver_search_trend_compare_v2_{now}.csv"
    summary_file = f"naver_search_trend_compare_v2_summary_{now}.csv"

    detail_fieldnames = [
        "artist",
        "period",
        "ratio",
        "startDate",
        "endDate",
        "timeUnit",
        "compareMode",
    ]

    summary_fieldnames = [
        "searchCompareRank",
        "artist",
        "searchDemandComparePoint",
        "trendSum",
        "trendAvg",
        "trendMax",
        "trendLatest",
        "trendCount",
        "compareMode",
    ]

    write_csv(detail_file, rows, detail_fieldnames)
    write_csv(summary_file, summary_rows, summary_fieldnames)

    print()
    print("검색트렌드 비교 수집 완료")
    print(f"상세 파일: {detail_file}")
    print(f"요약 파일: {summary_file}")
    print()
    print("검색 수요 비교 랭킹")

    for row in summary_rows:
        print(
            f"{row['searchCompareRank']}위. {row['artist']} "
            f"- 비교 검색점수 {row['searchDemandComparePoint']} "
            f"(합계 {row['trendSum']} / 평균 {row['trendAvg']} / 최신 {row['trendLatest']})"
        )


if __name__ == "__main__":
    main()