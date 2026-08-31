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

    sentiment_summary = {
        "positive": {"count": 0, "point": 0.0},
        "neutral": {"count": 0, "point": 0.0},
        "negative": {"count": 0, "point": 0.0},
        "mixed": {"count": 0, "point": 0.0},
    }

    type_summary = {
        "normal": {"count": 0, "point": 0.0},
        "simple_event": {"count": 0, "point": 0.0},
        "photo": {"count": 0, "point": 0.0},
    }

    for row in rows:
        sentiment = row.get("sentiment", "neutral")
        article_type = row.get("articleType", "normal")
        point = to_float(row.get("fandexNewsPoint", 0))

        if sentiment not in sentiment_summary:
            sentiment = "neutral"

        if article_type not in type_summary:
            article_type = "normal"

        sentiment_summary[sentiment]["count"] += 1
        sentiment_summary[sentiment]["point"] += point

        type_summary[article_type]["count"] += 1
        type_summary[article_type]["point"] += point

        review_rows.append({
            "sentiment": sentiment,
            "articleType": article_type,
            "articleMultiplier": row.get("articleMultiplier", ""),
            "fandexNewsPoint": point,
            "relevance": row.get("relevance_level_used", row.get("relevance_level", "")),
            "positiveKeywordCount": row.get("positiveKeywordCount", ""),
            "negativeKeywordCount": row.get("negativeKeywordCount", ""),
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

    type_order = {
        "normal": 0,
        "simple_event": 1,
        "photo": 2,
    }

    review_rows.sort(
        key=lambda x: (
            sentiment_order.get(x["sentiment"], 9),
            type_order.get(x["articleType"], 9),
            -abs(to_float(x["fandexNewsPoint"]))
        )
    )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_news_{artist}_{now}_sentiment_review.csv"

    fieldnames = [
        "sentiment",
        "articleType",
        "articleMultiplier",
        "fandexNewsPoint",
        "relevance",
        "positiveKeywordCount",
        "negativeKeywordCount",
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

    print("감성별 요약")
    total_point = 0.0
    for sentiment in ["positive", "neutral", "negative", "mixed"]:
        count = sentiment_summary[sentiment]["count"]
        point = round(sentiment_summary[sentiment]["point"], 2)
        total_point += point
        print(f"- {sentiment}: {count}개 / {point}점")

    print()
    print("기사 유형별 요약")
    for article_type in ["normal", "simple_event", "photo"]:
        count = type_summary[article_type]["count"]
        point = round(type_summary[article_type]["point"], 2)
        print(f"- {article_type}: {count}개 / {point}점")

    print()
    print(f"뉴스 순점수 합계: {round(total_point, 2)}점")
    print()
    print("검토 파일에서 negative, mixed, normal 기사부터 확인하면 됩니다.")


if __name__ == "__main__":
    main()