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


def main():
    artist = input("검토할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    files = glob.glob(f"naver_news_{artist}_*_sentiment_scored.csv")

    if not files:
        print("뉴스 감성 분류 파일이 없습니다.")
        print("먼저 py naver_fandex_cumulative_score.py 를 실행하세요.")
        return

    latest_file = max(files, key=os.path.getmtime)
    rows = read_csv(latest_file)

    review_rows = []

    summary = {
        "positive": {"count": 0, "point": 0.0},
        "neutral": {"count": 0, "point": 0.0},
        "negative": {"count": 0, "point": 0.0},
        "mixed": {"count": 0, "point": 0.0},
    }

    for row in rows:
        sentiment = row.get("sentiment", "neutral")
        point = to_float(row.get("fandexNewsPoint", 0))

        if sentiment not in summary:
            sentiment = "neutral"

        summary[sentiment]["count"] += 1
        summary[sentiment]["point"] += point

        review_rows.append({
            "sentiment": sentiment,
            "fandexNewsPoint": point,
            "relevance": row.get("relevance_level_used", row.get("relevance_level", "")),
            "title": row.get("title", ""),
            "description": row.get("description", ""),
            "link": row.get("link", ""),
            "pubDate": row.get("pubDate", row.get("date", "")),
        })

    sentiment_order = {
        "negative": 0,
        "mixed": 1,
        "positive": 2,
        "neutral": 3,
    }

    review_rows.sort(
        key=lambda x: (
            sentiment_order.get(x["sentiment"], 9),
            -abs(to_float(x["fandexNewsPoint"]))
        )
    )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_news_{artist}_{now}_sentiment_review.csv"

    fieldnames = [
        "sentiment",
        "fandexNewsPoint",
        "relevance",
        "title",
        "description",
        "link",
        "pubDate",
    ]

    write_csv(output_file, review_rows, fieldnames)

    print()
    print("뉴스 감성 검토 파일 생성 완료")
    print(f"원본 파일: {latest_file}")
    print(f"검토 파일: {output_file}")
    print()

    total_point = 0.0

    for sentiment in ["positive", "neutral", "negative", "mixed"]:
        count = summary[sentiment]["count"]
        point = round(summary[sentiment]["point"], 2)
        total_point += point
        print(f"{sentiment}: {count}개 / {point}점")

    print()
    print(f"뉴스 순점수 합계: {round(total_point, 2)}점")
    print()
    print("검토 파일에서 negative, mixed부터 먼저 확인하면 됩니다.")


if __name__ == "__main__":
    main()