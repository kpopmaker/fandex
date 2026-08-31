import csv
import os
import re
from html import unescape
from datetime import datetime

from naver_file_resolver_v2 import find_latest_news_scored, basename


NEWS_SENTIMENT_POINT = {
    "positive": 3.0,
    "neutral": 1.0,
    "negative": -5.0,
    "mixed": 0.0,
}

RELEVANCE_WEIGHT = {
    "primary": 1.0,
    "related": 0.35,
    "weak": 0.05,
    "none": 0.0,
}

ARTICLE_TYPE_MULTIPLIER = {
    "normal": 1.0,
    "simple_event": 0.4,
    "photo": 0.15,
}

PHOTO_TITLE_KEYWORDS = [
    "[HD포토]",
    "[MD포토]",
    "[셀럽포토]",
    "[포토]",
    "[ST포토]",
    "[TD포토]",
    "[OSEN포토]",
    "[포토S]",
    "[사진]",
    "포토엔",
    "포토뉴스",
]

SIMPLE_EVENT_KEYWORDS = [
    "핸드프린팅",
    "포토타임",
    "행사에 참석",
    "포즈를 취하고",
    "레드카펫",
    "제작발표회",
    "쇼케이스",
    "기자간담회",
    "시상식",
    "어워즈",
]

POSITIVE_KEYWORDS = [
    "1위",
    "대상",
    "수상",
    "선정",
    "발탁",
    "앰버서더",
    "글로벌 대사",
    "컴백",
    "발매",
    "신곡",
    "기록",
    "돌파",
    "화제",
    "인기",
    "호평",
    "찬사",
    "완판",
    "기부",
    "선행",
    "공개",
    "출연",
    "확정",
    "청룡",
    "광고모델",
    "브랜드",
]

NEGATIVE_KEYWORDS = [
    "논란",
    "의혹",
    "피소",
    "고소",
    "사과",
    "해명",
    "하차",
    "활동 중단",
    "탈퇴",
    "계약 해지",
    "비판",
    "혹평",
    "사생활",
    "음주",
    "폭행",
    "갑질",
]


def clean_text(value):
    text = unescape(str(value or ""))
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


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


def count_keywords(text, keywords):
    return sum(1 for keyword in keywords if keyword in text)


def classify_article_type(row):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"

    if any(keyword in title for keyword in PHOTO_TITLE_KEYWORDS):
        return "photo"

    if any(keyword in text for keyword in SIMPLE_EVENT_KEYWORDS):
        return "simple_event"

    return "normal"


def classify_sentiment(row):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"

    positive_count = count_keywords(text, POSITIVE_KEYWORDS)
    negative_count = count_keywords(text, NEGATIVE_KEYWORDS)

    if positive_count > 0 and negative_count > 0:
        return "mixed", positive_count, negative_count

    if negative_count > 0:
        return "negative", positive_count, negative_count

    if positive_count > 0:
        return "positive", positive_count, negative_count

    return "neutral", positive_count, negative_count


def get_relevance_level(row):
    level = clean_text(row.get("relevance_level", "")).lower()

    if level in RELEVANCE_WEIGHT:
        return level

    level = clean_text(row.get("relevance", "")).lower()

    if level in RELEVANCE_WEIGHT:
        return level

    return "none"


def build_output_name(source_file, artist):
    name = basename(source_file)

    # naver_news_아이유_20260708_172223_scored.csv
    match = re.match(
        rf"naver_news_{re.escape(artist)}_(\d{{8}}_\d{{6}})_scored\.csv$",
        name,
    )

    if match:
        stamp = match.group(1)
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    return f"naver_news_{artist}_{stamp}_sentiment_scored.csv"


def main():
    artist = input("뉴스 감성 점수를 계산할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    source_file = find_latest_news_scored(artist)

    if not source_file:
        print("뉴스 중심성 scored 파일이 없습니다.")
        print("먼저 py naver_relevance_filter.py 를 실행하세요.")
        return

    rows = read_csv(source_file)

    scored_rows = []

    for row in rows:
        sentiment, positive_count, negative_count = classify_sentiment(row)
        article_type = classify_article_type(row)
        relevance_level = get_relevance_level(row)

        base_point = NEWS_SENTIMENT_POINT.get(sentiment, 0.0)
        relevance_weight = RELEVANCE_WEIGHT.get(relevance_level, 0.0)
        article_multiplier = ARTICLE_TYPE_MULTIPLIER.get(article_type, 1.0)

        fandex_point = base_point * relevance_weight * article_multiplier

        new_row = dict(row)
        new_row["sentiment"] = sentiment
        new_row["positiveKeywordCount"] = positive_count
        new_row["negativeKeywordCount"] = negative_count
        new_row["articleType"] = article_type
        new_row["articleMultiplier"] = article_multiplier
        new_row["relevance_level_used"] = relevance_level
        new_row["fandexNewsPoint"] = round(fandex_point, 4)

        scored_rows.append(new_row)

    output_file = build_output_name(source_file, artist)

    fieldnames = list(scored_rows[0].keys()) if scored_rows else []
    write_csv(output_file, scored_rows, fieldnames)

    total_point = round(sum(to_float(row.get("fandexNewsPoint", 0)) for row in scored_rows), 2)

    sentiment_summary = {}
    article_type_summary = {}
    relevance_summary = {}

    for row in scored_rows:
        sentiment = row.get("sentiment", "")
        article_type = row.get("articleType", "")
        relevance = row.get("relevance_level_used", "")

        sentiment_summary[sentiment] = sentiment_summary.get(sentiment, 0) + 1
        article_type_summary[article_type] = article_type_summary.get(article_type, 0) + 1
        relevance_summary[relevance] = relevance_summary.get(relevance, 0) + 1

    print()
    print("뉴스 감성 점수 v2 생성 완료")
    print(f"원본 scored 파일: {source_file}")
    print(f"감성 점수 파일: {output_file}")
    print(f"뉴스 점수 합계: {total_point}")
    print()
    print("감성 분포")
    for key, value in sorted(sentiment_summary.items()):
        print(f"- {key}: {value}개")

    print()
    print("기사 유형 분포")
    for key, value in sorted(article_type_summary.items()):
        print(f"- {key}: {value}개")

    print()
    print("중심성 분포")
    for key, value in sorted(relevance_summary.items()):
        print(f"- {key}: {value}개")


if __name__ == "__main__":
    main()