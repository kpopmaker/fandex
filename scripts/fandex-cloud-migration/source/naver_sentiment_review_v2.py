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


artist = input("검토할 아티스트명을 입력하세요: ").strip()

files = glob.glob(f"naver_news_{artist}_*_sentiment_scored.csv")

if not files:
    print("뉴스 감성 분류 파일이 없습니다.")
    raise SystemExit

latest_file = max(files, key=os.path.getmtime)
rows = read_csv(latest_file)

review_rows = []

for row in rows:
    review_rows.append({
        "sentiment": row.get("sentiment", ""),
        "articleType": row.get("articleType", ""),
        "articleMultiplier": row.get("articleMultiplier", ""),
        "fandexNewsPoint": row.get("fandexNewsPoint", ""),
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
output_file = f"naver_news_{artist}_{now}_sentiment_review_v2.csv"

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
print("검토 파일 생성 완료")
print(f"원본 파일: {latest_file}")
print(f"검토 파일: {output_file}")
print()

summary = {}

for row in review_rows:
    key = row["articleType"]
    if key not in summary:
        summary[key] = {"count": 0, "point": 0.0}
    summary[key]["count"] += 1
    summary[key]["point"] += to_float(row["fandexNewsPoint"])

print("기사 유형별 요약")
for key, value in summary.items():
    print(f"- {key}: {value['count']}개 / {round(value['point'], 2)}점")