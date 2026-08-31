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
        r"naver_fandex_final_v2_(.+)_\d{8}_\d{6}\.csv$",
        name
    )

    if not match:
        return None

    return match.group(1)


def find_latest_final_files():
    files = glob.glob("naver_fandex_final_v2_*.csv")
    latest_by_artist = {}

    for file in files:
        artist = extract_artist_from_filename(file)

        if not artist:
            continue

        current_file = latest_by_artist.get(artist)

        if current_file is None:
            latest_by_artist[artist] = file
        elif os.path.getmtime(file) > os.path.getmtime(current_file):
            latest_by_artist[artist] = file

    return latest_by_artist


def calculate_share(part, total):
    if total == 0:
        return 0.0

    return round((part / total) * 100, 2)


def main():
    latest_files = find_latest_final_files()

    if not latest_files:
        print("final_v2 파일이 없습니다.")
        print("먼저 py naver_fandex_final_score_v2.py 를 실행하세요.")
        return

    rows_for_ranking = []

    for artist, file in latest_files.items():
        rows = read_csv(file)

        if not rows:
            continue

        row = rows[0]

        final_point = to_float(row.get("fandexNaverFinalPoint", 0))
        news_point = to_float(row.get("newsIssueClusterPoint", 0))
        blog_point = to_float(row.get("blogTopicClusterPoint", 0))
        search_point = to_float(row.get("searchDemandPoint", 0))

        rows_for_ranking.append({
            "artist": artist,
            "fandexNaverFinalPoint": round(final_point, 2),

            "newsIssueClusterPoint": round(news_point, 2),
            "blogTopicClusterPoint": round(blog_point, 2),
            "searchDemandPoint": round(search_point, 2),

            "newsSharePercent": calculate_share(news_point, final_point),
            "blogSharePercent": calculate_share(blog_point, final_point),
            "searchSharePercent": calculate_share(search_point, final_point),

            "trendSum": row.get("trendSum", ""),
            "trendAvg": row.get("trendAvg", ""),
            "trendMax": row.get("trendMax", ""),
            "trendLatest": row.get("trendLatest", ""),

            "newsClusterFile": row.get("newsClusterFile", ""),
            "blogClusterFile": row.get("blogClusterFile", ""),
            "trendFile": row.get("trendFile", ""),
            "finalSourceFile": os.path.basename(file),
            "generatedAt": row.get("generatedAt", ""),
        })

    rows_for_ranking.sort(
        key=lambda row: row["fandexNaverFinalPoint"],
        reverse=True
    )

    ranking_rows = []

    for index, row in enumerate(rows_for_ranking, start=1):
        row_with_rank = {"rank": index}
        row_with_rank.update(row)
        ranking_rows.append(row_with_rank)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_fandex_ranking_v2_{now}.csv"

    fieldnames = [
        "rank",
        "artist",
        "fandexNaverFinalPoint",

        "newsIssueClusterPoint",
        "blogTopicClusterPoint",
        "searchDemandPoint",

        "newsSharePercent",
        "blogSharePercent",
        "searchSharePercent",

        "trendSum",
        "trendAvg",
        "trendMax",
        "trendLatest",

        "newsClusterFile",
        "blogClusterFile",
        "trendFile",
        "finalSourceFile",
        "generatedAt",
    ]

    write_csv(output_file, ranking_rows, fieldnames)

    print()
    print("네이버 FANDEX 랭킹 생성 완료")
    print(f"랭킹 파일: {output_file}")
    print()
    print("랭킹 미리보기")

    for row in ranking_rows[:20]:
        print(
            f"{row['rank']}위. {row['artist']} "
            f"- {row['fandexNaverFinalPoint']}점 "
            f"(뉴스 {row['newsIssueClusterPoint']} / "
            f"블로그 {row['blogTopicClusterPoint']} / "
            f"검색 {row['searchDemandPoint']})"
        )


if __name__ == "__main__":
    main()