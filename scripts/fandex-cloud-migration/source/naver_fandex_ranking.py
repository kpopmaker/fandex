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


def to_int(value):
    try:
        return int(float(value))
    except:
        return 0


def get_artist_from_filename(path):
    name = os.path.basename(path)
    match = re.match(r"naver_fandex_cumulative_(.+)_\d{8}_\d{6}\.csv", name)
    if match:
        return match.group(1)
    return ""


def main():
    files = glob.glob("naver_fandex_cumulative_*.csv")

    if not files:
        print("누적점수 파일이 없습니다.")
        print("먼저 py naver_fandex_cumulative_score.py 를 실행하세요.")
        return

    latest_by_artist = {}

    for file in files:
        artist = get_artist_from_filename(file)
        if not artist:
            continue

        if artist not in latest_by_artist:
            latest_by_artist[artist] = file
        else:
            old_file = latest_by_artist[artist]
            if os.path.getmtime(file) > os.path.getmtime(old_file):
                latest_by_artist[artist] = file

    ranking_rows = []

    for artist, file in latest_by_artist.items():
        rows = read_csv(file)
        if not rows:
            continue

        row = rows[0]

        ranking_rows.append({
            "rank": "",
            "artist": row.get("artist", artist),
            "fandexNaverCumulativePoint": round(to_float(row.get("fandexNaverCumulativePoint")), 2),

            "newsNetPoint": round(to_float(row.get("newsNetPoint")), 2),
            "newsPositivePoint": round(to_float(row.get("newsPositivePoint")), 2),
            "newsNegativePoint": round(to_float(row.get("newsNegativePoint")), 2),
            "positiveNewsCount": to_int(row.get("positiveNewsCount")),
            "negativeNewsCount": to_int(row.get("negativeNewsCount")),
            "neutralNewsCount": to_int(row.get("neutralNewsCount")),

            "blogContentPoint": round(to_float(row.get("blogContentPoint")), 2),
            "blogPrimaryCount": to_int(row.get("blogPrimaryCount")),
            "blogRelatedCount": to_int(row.get("blogRelatedCount")),

            "searchDemandPoint": round(to_float(row.get("searchDemandPoint")), 2),
            "trendSum": round(to_float(row.get("trendSum")), 2),
            "trendAvg": round(to_float(row.get("trendAvg")), 2),
            "trendLatest": round(to_float(row.get("trendLatest")), 2),

            "sourceFile": os.path.basename(file),
            "generatedAt": row.get("generatedAt", ""),
        })

    ranking_rows.sort(
        key=lambda x: x["fandexNaverCumulativePoint"],
        reverse=True
    )

    for index, row in enumerate(ranking_rows, start=1):
        row["rank"] = index

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"fandex_naver_ranking_{now}.csv"

    fieldnames = [
        "rank",
        "artist",
        "fandexNaverCumulativePoint",
        "newsNetPoint",
        "newsPositivePoint",
        "newsNegativePoint",
        "positiveNewsCount",
        "negativeNewsCount",
        "neutralNewsCount",
        "blogContentPoint",
        "blogPrimaryCount",
        "blogRelatedCount",
        "searchDemandPoint",
        "trendSum",
        "trendAvg",
        "trendLatest",
        "sourceFile",
        "generatedAt",
    ]

    write_csv(output_file, ranking_rows, fieldnames)

    print("FANDEX 네이버 랭킹 생성 완료")
    print(f"대상 아티스트 수: {len(ranking_rows)}")
    print(f"파일명: {output_file}")
    print()

    for row in ranking_rows[:10]:
        print(
            f"{row['rank']}위 {row['artist']} "
            f"- {row['fandexNaverCumulativePoint']}점 "
            f"(뉴스 {row['newsNetPoint']}, 블로그 {row['blogContentPoint']}, 검색 {row['searchDemandPoint']})"
        )


if __name__ == "__main__":
    main()