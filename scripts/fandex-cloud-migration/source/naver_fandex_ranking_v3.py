import csv
import glob
import os
import re
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


def extract_artist_from_filename(path):
    name = os.path.basename(path)

    match = re.match(
        r"naver_fandex_final_v3_(.+)_\d{8}_\d{6}\.csv$",
        name
    )

    if not match:
        return None

    return match.group(1)


def find_latest_final_v3_files():
    files = glob.glob("naver_fandex_final_v3_*.csv")
    latest_by_artist = {}

    for file in files:
        artist = extract_artist_from_filename(file)

        if not artist:
            continue

        current = latest_by_artist.get(artist)

        if current is None or os.path.getmtime(file) > os.path.getmtime(current):
            latest_by_artist[artist] = file

    return latest_by_artist


def calculate_share(part, total):
    if total == 0:
        return 0.0

    return round((part / total) * 100, 2)


def main():
    latest_files = find_latest_final_v3_files()

    if not latest_files:
        print("final_v3 파일이 없습니다.")
        print("먼저 py naver_fandex_final_score_v3.py 를 실행하세요.")
        return

    ranking_rows = []

    for artist, file in latest_files.items():
        rows = read_csv(file)

        if not rows:
            continue

        row = rows[0]

        final_point = to_float(row.get("fandexNaverFinalPoint", 0))
        news_point = to_float(row.get("newsIssueClusterPoint", 0))
        blog_point = to_float(row.get("blogTopicClusterPoint", 0))
        search_point = to_float(row.get("searchDemandComparePoint", 0))

        ranking_rows.append({
            "artist": artist,
            "fandexNaverFinalPoint": round(final_point, 2),

            "newsIssueClusterPoint": round(news_point, 2),
            "blogTopicClusterPoint": round(blog_point, 2),
            "searchDemandComparePoint": round(search_point, 2),

            "newsSharePercent": calculate_share(news_point, final_point),
            "blogSharePercent": calculate_share(blog_point, final_point),
            "searchSharePercent": calculate_share(search_point, final_point),

            "searchCompareRank": row.get("searchCompareRank", ""),
            "trendSum": row.get("trendSum", ""),
            "trendAvg": row.get("trendAvg", ""),
            "trendMax": row.get("trendMax", ""),
            "trendLatest": row.get("trendLatest", ""),
            "trendCount": row.get("trendCount", ""),

            "scoreVersion": row.get("scoreVersion", "v3_compare_search_quality"),
            "newsClusterFile": row.get("newsClusterFile", ""),
            "blogClusterFile": row.get("blogClusterFile", ""),
            "searchCompareFile": row.get("searchCompareFile", ""),
            "finalSourceFile": os.path.basename(file),
            "generatedAt": row.get("generatedAt", ""),
        })

    ranking_rows.sort(
        key=lambda row: row["fandexNaverFinalPoint"],
        reverse=True
    )

    output_rows = []

    for index, row in enumerate(ranking_rows, start=1):
        new_row = {"rank": index}
        new_row.update(row)
        output_rows.append(new_row)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_fandex_ranking_v3_{now}.csv"

    fieldnames = [
        "rank",
        "artist",
        "fandexNaverFinalPoint",

        "newsIssueClusterPoint",
        "blogTopicClusterPoint",
        "searchDemandComparePoint",

        "newsSharePercent",
        "blogSharePercent",
        "searchSharePercent",

        "searchCompareRank",
        "trendSum",
        "trendAvg",
        "trendMax",
        "trendLatest",
        "trendCount",

        "scoreVersion",
        "newsClusterFile",
        "blogClusterFile",
        "searchCompareFile",
        "finalSourceFile",
        "generatedAt",
    ]

    write_csv(output_file, output_rows, fieldnames)

    print()
    print("네이버 FANDEX 랭킹 v3 생성 완료")
    print(f"랭킹 파일: {output_file}")
    print()
    print("랭킹 미리보기")

    for row in output_rows:
        print(
            f"{row['rank']}위. {row['artist']} "
            f"- {row['fandexNaverFinalPoint']}점 "
            f"(뉴스 {row['newsIssueClusterPoint']} / "
            f"블로그 {row['blogTopicClusterPoint']} / "
            f"비교검색 {row['searchDemandComparePoint']})"
        )


if __name__ == "__main__":
    main()