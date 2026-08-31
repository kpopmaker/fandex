import csv
import glob
import os
import re
from html import unescape
from datetime import datetime


BLOG_CONTENT_POINT = {
    "primary": 2.0,
    "related": 1.0,
    "weak": 0.2,
    "none": 0.0,
}

TOPIC_CAP = {
    "music_release": 25.0,
    "content_drama_broadcast": 25.0,
    "concert_fan_event": 25.0,
    "fan_reaction": 20.0,
    "brand_ad": 15.0,
    "brand_rank": 15.0,
    "product_commerce": 5.0,
    "profile_info": 10.0,
    "award_event": 8.0,
    "general": 10.0,
    "weak_related": 1.0,
    "name_collision": 0.0,
    "none": 0.0,
}


PRODUCT_COMMERCE_KEYWORDS = [
    "슬립앤슬립",
    "아이유베개",
    "깊은잠베개",
    "베개",
    "경추",
    "목디스크",
    "숙면",
    "수면",
    "베개커버",
    "냉감",
    "이브자리",
    "침구",
]


def clean_text(value):
    text = unescape(str(value or ""))
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_key(value):
    value = clean_text(value).lower()
    value = re.sub(r"[^0-9a-zA-Z가-힣]+", "_", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_") or "etc"


def has_artist_mention(text, artist):
    text = clean_text(text)

    if artist == "아이유":
        reduced = text
        false_terms = [
            "유아이유",
            "UIU",
            "uiu",
            "아이유커피",
        ]

        for term in false_terms:
            reduced = reduced.replace(term, "")

        return artist in reduced

    return artist in text


def is_name_collision(text, artist):
    text = clean_text(text)

    if artist == "아이유":
        if any(term in text for term in ["유아이유", "UIU", "uiu", "아이유커피"]):
            return not has_artist_mention(text, artist)

    return False


def is_product_commerce(text):
    return any(keyword in text for keyword in PRODUCT_COMMERCE_KEYWORDS)


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


def latest_file(pattern, exclude_words=None):
    exclude_words = exclude_words or []
    files = glob.glob(pattern)

    filtered = []

    for file in files:
        name = os.path.basename(file)
        if any(word in name for word in exclude_words):
            continue
        filtered.append(file)

    if not filtered:
        return None

    return max(filtered, key=os.path.getmtime)


def find_blog_source_file(artist):
    scored_file = latest_file(
        f"naver_blog_{artist}_*_scored.csv",
        exclude_words=[
            "_primary",
            "_topic",
            "_cluster",
            "_final",
            "_cumulative",
            "_review",
        ],
    )

    if scored_file:
        return scored_file

    return latest_file(
        f"naver_blog_{artist}_*.csv",
        exclude_words=[
            "_primary",
            "_scored",
            "_topic",
            "_cluster",
            "_final",
            "_cumulative",
            "_review",
        ],
    )


def infer_relevance_level(row, artist):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"

    if is_name_collision(text, artist):
        return "none"

    level = clean_text(row.get("relevance_level", "")).lower()

    if level in BLOG_CONTENT_POINT:
        return level

    if has_artist_mention(title, artist):
        return "primary"

    if has_artist_mention(description, artist):
        return "related"

    return "none"


def classify_topic_group(row, artist):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"
    relevance = infer_relevance_level(row, artist)

    if relevance == "none":
        return "none"

    if is_name_collision(text, artist):
        return "name_collision"

    if "꿈" in title and "해몽" in text:
        return "weak_related"

    if not has_artist_mention(title, artist) and relevance in ["related", "weak"]:
        return "weak_related"

    if "닮은꼴" in text and has_artist_mention(title, artist):
        return "weak_related"

    if any(keyword in text for keyword in [
        "청룡",
        "핸드프린팅",
        "시상식",
        "어워즈",
        "레드카펫",
        "포토타임",
    ]):
        return "award_event"

    if any(keyword in text for keyword in [
        "광고모델",
        "광고 모델",
        "대표 광고모델",
        "광고업계",
        "현직 광고인",
    ]):
        return "brand_rank"

    if any(keyword in text for keyword in [
        "앰버서더",
        "글로벌 대사",
        "브랜드",
        "화보",
        "캠페인",
        "예거",
        "르쿨트르",
        "패션",
        "공항패션",
        "착장",
        "가방",
        "시계",
        "셀린느",
        "뉴발란스",
        "제이에스티나",
    ]):
        return "brand_ad"

    if is_product_commerce(text):
        return "product_commerce"

    if any(keyword in text for keyword in [
        "컴백",
        "발매",
        "신곡",
        "앨범",
        "싱글",
        "선공개",
        "뮤직비디오",
        "티저",
        "음원",
        "수록곡",
        "플레이리스트",
    ]):
        return "music_release"

    if "노래" in text and not is_product_commerce(text):
        return "music_release"

    if any(keyword in text for keyword in [
        "드라마",
        "영화",
        "예능",
        "출연",
        "넷플릭스",
        "폭싹",
        "폭싹 속았수다",
        "작품",
        "방송",
    ]):
        return "content_drama_broadcast"

    if any(keyword in text for keyword in [
        "콘서트",
        "팬미팅",
        "투어",
        "공연",
        "좌석",
        "티켓팅",
        "셋리스트",
        "유애나",
    ]):
        return "concert_fan_event"

    if "후기" in text and any(keyword in text for keyword in [
        "콘서트",
        "팬미팅",
        "공연",
        "티켓팅",
    ]):
        return "concert_fan_event"

    if any(keyword in text for keyword in [
        "프로필",
        "나이",
        "키",
        "소속사",
        "인스타",
        "인스타그램",
        "근황",
        "필모그래피",
        "데뷔",
    ]):
        return "profile_info"

    if any(keyword in text for keyword in [
        "감상",
        "리뷰",
        "추천",
        "좋다",
        "좋았",
        "예쁘",
        "귀엽",
        "팬",
        "입덕",
        "짤",
        "사진",
        "영상",
        "라이브",
    ]):
        return "fan_reaction"

    if "커버" in text and any(keyword in text for keyword in [
        "노래",
        "곡",
        "무대",
        "라이브",
        "댄스",
        "챌린지",
    ]):
        return "fan_reaction"

    return "general"


def classify_topic_key(row, artist, topic_group):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"

    if topic_group == "none":
        return "none__etc"

    if topic_group == "name_collision":
        return "name_collision__etc"

    if topic_group == "weak_related":
        return "weak_related__etc"

    if topic_group == "product_commerce":
        if any(keyword in text for keyword in [
            "슬립앤슬립",
            "아이유베개",
            "깊은잠베개",
            "베개",
            "경추",
            "목디스크",
            "숙면",
            "수면",
        ]):
            return "product_commerce__sleep_pillow"
        return "product_commerce__etc"

    if topic_group == "award_event":
        if "청룡" in text or "핸드프린팅" in text:
            return "award_event__blue_dragon_handprinting"
        return "award_event__etc"

    if topic_group == "brand_rank":
        return "brand_rank__advertising_model_rank"

    if topic_group == "brand_ad":
        if "예거" in text or "르쿨트르" in text:
            return "brand_ad__jaeger_lecoultre"
        if "제이에스티나" in text:
            return "brand_ad__j_estina"
        if "뉴발란스" in text:
            return "brand_ad__new_balance"
        if "셀린느" in text:
            return "brand_ad__celine"
        if "화보" in text:
            return "brand_ad__pictorial"
        if "앰버서더" in text or "글로벌 대사" in text:
            return "brand_ad__ambassador"
        return "brand_ad__etc"

    if topic_group == "content_drama_broadcast":
        if "폭싹" in text:
            return "content_drama_broadcast__when_life_gives_you_tangerines"
        if "넷플릭스" in text:
            return "content_drama_broadcast__netflix"
        if "드라마" in text:
            return "content_drama_broadcast__drama"
        if "영화" in text:
            return "content_drama_broadcast__movie"
        return "content_drama_broadcast__etc"

    if topic_group == "music_release":
        if "앨범" in text:
            return "music_release__album"
        if "신곡" in text or "발매" in text:
            return "music_release__new_song"
        if "플레이리스트" in text or "노래" in text:
            return "music_release__playlist_song"
        return "music_release__etc"

    if topic_group == "concert_fan_event":
        if "콘서트" in text or "공연" in text:
            return "concert_fan_event__concert"
        if "팬미팅" in text:
            return "concert_fan_event__fanmeeting"
        if "티켓팅" in text or "좌석" in text:
            return "concert_fan_event__ticketing"
        return "concert_fan_event__etc"

    if topic_group == "profile_info":
        return "profile_info__basic"

    if topic_group == "fan_reaction":
        if "라이브" in text:
            return "fan_reaction__live"
        if "커버" in text:
            return "fan_reaction__cover"
        if "사진" in text or "짤" in text:
            return "fan_reaction__photo_clip"
        return "fan_reaction__etc"

    return f"general__{normalize_key(title[:30])}"


def cap_topic_point(topic_group, point_sum):
    cap = TOPIC_CAP.get(topic_group, 10.0)

    if point_sum > cap:
        return cap

    if point_sum < -cap:
        return -cap

    return point_sum


def main():
    artist = input("블로그 주제 묶음을 만들 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    source_file = find_blog_source_file(artist)

    if not source_file:
        print("블로그 파일이 없습니다.")
        print("먼저 py naver_collector.py 와 py naver_relevance_filter.py 를 실행하세요.")
        return

    rows = read_csv(source_file)

    article_rows = []
    clusters = {}

    for row in rows:
        relevance = infer_relevance_level(row, artist)
        topic_group = classify_topic_group(row, artist)
        topic_key = classify_topic_key(row, artist, topic_group)

        base_point = BLOG_CONTENT_POINT.get(relevance, 0.0)

        if topic_key not in clusters:
            clusters[topic_key] = {
                "topicKey": topic_key,
                "topicGroup": topic_group,
                "postCount": 0,
                "primaryCount": 0,
                "relatedCount": 0,
                "weakCount": 0,
                "noneCount": 0,
                "rawPointSum": 0.0,
                "sampleTitles": [],
            }

        cluster = clusters[topic_key]

        cluster["postCount"] += 1
        cluster["rawPointSum"] += base_point

        if relevance == "primary":
            cluster["primaryCount"] += 1
        elif relevance == "related":
            cluster["relatedCount"] += 1
        elif relevance == "weak":
            cluster["weakCount"] += 1
        else:
            cluster["noneCount"] += 1

        title = clean_text(row.get("title", ""))
        if title and len(cluster["sampleTitles"]) < 5:
            cluster["sampleTitles"].append(title)

        new_row = dict(row)
        new_row["relevance_level_used"] = relevance
        new_row["topicGroup"] = topic_group
        new_row["topicKey"] = topic_key
        new_row["fandexBlogPoint"] = round(base_point, 2)
        article_rows.append(new_row)

    cluster_rows = []

    for topic_key, cluster in clusters.items():
        raw_point = round(cluster["rawPointSum"], 2)
        capped_point = round(cap_topic_point(cluster["topicGroup"], raw_point), 2)

        cluster_rows.append({
            "topicKey": topic_key,
            "topicGroup": cluster["topicGroup"],
            "postCount": cluster["postCount"],
            "primaryCount": cluster["primaryCount"],
            "relatedCount": cluster["relatedCount"],
            "weakCount": cluster["weakCount"],
            "noneCount": cluster["noneCount"],
            "rawPointSum": raw_point,
            "topicCap": TOPIC_CAP.get(cluster["topicGroup"], 10.0),
            "cappedTopicPoint": capped_point,
            "sampleTitles": " / ".join(cluster["sampleTitles"]),
        })

    cluster_rows.sort(
        key=lambda row: abs(to_float(row["cappedTopicPoint"])),
        reverse=True
    )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    cluster_file = f"naver_blog_{artist}_{now}_topic_cluster.csv"
    article_file = f"naver_blog_{artist}_{now}_topic_cluster_articles.csv"

    cluster_fieldnames = [
        "topicKey",
        "topicGroup",
        "postCount",
        "primaryCount",
        "relatedCount",
        "weakCount",
        "noneCount",
        "rawPointSum",
        "topicCap",
        "cappedTopicPoint",
        "sampleTitles",
    ]

    article_fieldnames = list(article_rows[0].keys()) if article_rows else []

    write_csv(cluster_file, cluster_rows, cluster_fieldnames)
    write_csv(article_file, article_rows, article_fieldnames)

    raw_total = round(sum(to_float(row["rawPointSum"]) for row in cluster_rows), 2)
    capped_total = round(sum(to_float(row["cappedTopicPoint"]) for row in cluster_rows), 2)

    print()
    print("블로그 주제 묶음 생성 완료")
    print(f"원본 파일: {source_file}")
    print(f"주제 요약 파일: {cluster_file}")
    print(f"글별 주제 파일: {article_file}")
    print()
    print(f"기존 블로그 점수 합계: {raw_total}점")
    print(f"주제 묶음 적용 점수: {capped_total}점")
    print()
    print("주제별 요약")

    for row in cluster_rows:
        print(
            f"- {row['topicKey']}: "
            f"{row['postCount']}개 / "
            f"기존 {row['rawPointSum']}점 → "
            f"묶음 {row['cappedTopicPoint']}점"
        )


if __name__ == "__main__":
    main()