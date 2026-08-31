import csv
import re
from html import unescape
from datetime import datetime

from naver_file_resolver_v2 import find_latest_blog_scored, basename


BLOG_CONTENT_POINT = {
    "primary": 2.0,
    "related": 1.0,
    "weak": 0.2,
    "none": 0.0,
}

TOPIC_KEY_CAP = {
    "music_release": 20.0,
    "content_drama_broadcast": 20.0,
    "concert_fan_event": 15.0,
    "fan_reaction": 12.0,
    "brand_ad": 10.0,
    "brand_rank": 8.0,
    "profile_info": 5.0,
    "award_event": 4.0,
    "product_commerce": 2.0,
    "relationship_mention": 1.0,
    "donation_goodwill": 4.0,
    "general": 2.0,
    "weak_related": 1.0,
    "name_collision": 0.0,
    "none": 0.0,
}

TOPIC_GROUP_CAP = {
    "music_release": 45.0,
    "content_drama_broadcast": 45.0,
    "concert_fan_event": 30.0,
    "fan_reaction": 25.0,
    "brand_ad": 35.0,
    "brand_rank": 8.0,
    "profile_info": 5.0,
    "award_event": 5.0,
    "product_commerce": 2.0,
    "relationship_mention": 1.0,
    "donation_goodwill": 4.0,
    "general": 5.0,
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
    "푸라닭",
    "치킨",
    "신메뉴",
    "내돈내산",
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


def has_any(text, keywords):
    return any(keyword in text for keyword in keywords)


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
        if has_any(text, ["유아이유", "UIU", "uiu", "아이유커피"]):
            return not has_artist_mention(text, artist)

    return False


def is_product_commerce(text):
    return has_any(text, PRODUCT_COMMERCE_KEYWORDS)


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

    if not has_artist_mention(title, artist) and relevance in ["related", "weak"]:
        return "weak_related"

    if has_any(text, ["이종석", "장기하", "열애", "연애", "윤가이", "남자친구", "결별"]):
        return "relationship_mention"

    if has_any(text, ["기부", "선행", "성금", "취약계층", "이웃돕기", "저소득", "양평"]):
        return "donation_goodwill"

    if has_any(text, [
        "청룡", "핸드프린팅", "시상식", "어워즈", "레드카펫", "포토타임"
    ]):
        return "award_event"

    if has_any(text, [
        "광고모델", "광고 모델", "대표 광고모델", "광고업계", "현직 광고인"
    ]):
        return "brand_rank"

    if has_any(text, [
        "앰버서더", "글로벌 대사", "브랜드", "화보", "캠페인", "예거",
        "르쿨트르", "패션", "공항패션", "착장", "가방", "시계",
        "셀린느", "뉴발란스", "제이에스티나"
    ]):
        return "brand_ad"

    if is_product_commerce(text):
        return "product_commerce"

    if has_any(text, [
        "컴백", "발매", "신곡", "앨범", "싱글", "선공개", "뮤직비디오",
        "티저", "음원", "수록곡", "플레이리스트", "노래", "곡"
    ]):
        return "music_release"

    if has_any(text, [
        "드라마", "영화", "예능", "출연", "넷플릭스", "폭싹",
        "폭싹 속았수다", "작품", "방송", "대군부인"
    ]):
        return "content_drama_broadcast"

    if has_any(text, [
        "콘서트", "팬미팅", "투어", "공연", "좌석", "티켓팅",
        "셋리스트", "유애나"
    ]):
        return "concert_fan_event"

    if has_any(text, [
        "프로필", "나이", "키", "소속사", "인스타", "인스타그램",
        "근황", "필모그래피", "데뷔"
    ]):
        return "profile_info"

    if has_any(text, [
        "감상", "리뷰", "추천", "좋다", "좋았", "예쁘", "귀엽",
        "팬", "입덕", "짤", "사진", "영상", "라이브", "커버"
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

    if topic_group == "relationship_mention":
        if "이종석" in text:
            return "relationship_mention__lee_jongsuk"
        if "장기하" in text:
            return "relationship_mention__jang_kiha"
        return "relationship_mention__etc"

    if topic_group == "donation_goodwill":
        if "양평" in text:
            return "donation_goodwill__yangpyeong"
        return "donation_goodwill__etc"

    if topic_group == "product_commerce":
        if has_any(text, ["슬립앤슬립", "아이유베개", "깊은잠베개", "베개", "숙면", "수면"]):
            return "product_commerce__sleep_pillow"
        if has_any(text, ["푸라닭", "치킨", "신메뉴"]):
            return "product_commerce__food"
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
        if "대군부인" in text:
            return "content_drama_broadcast__twenty_first_century_grand_prince"
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

    return "general__etc"


def apply_caps(cluster_rows):
    group_sums = {}

    for row in cluster_rows:
        group = row["topicGroup"]
        raw_point = to_float(row["rawPointSum"])

        key_cap = TOPIC_KEY_CAP.get(group, 2.0)
        key_capped = min(raw_point, key_cap)

        row["keyCappedTopicPoint"] = round(key_capped, 2)

        group_sums[group] = group_sums.get(group, 0.0) + key_capped

    group_ratios = {}

    for group, group_sum in group_sums.items():
        group_cap = TOPIC_GROUP_CAP.get(group, 5.0)

        if group_sum <= 0:
            group_ratios[group] = 0.0
        elif group_sum > group_cap:
            group_ratios[group] = group_cap / group_sum
        else:
            group_ratios[group] = 1.0

    for row in cluster_rows:
        group = row["topicGroup"]
        ratio = group_ratios.get(group, 1.0)
        final_point = to_float(row["keyCappedTopicPoint"]) * ratio

        row["topicGroupCap"] = TOPIC_GROUP_CAP.get(group, 5.0)
        row["topicGroupRatio"] = round(ratio, 4)
        row["cappedTopicPoint"] = round(final_point, 2)

    return cluster_rows


def build_output_names(source_file, artist):
    name = basename(source_file)

    match = re.match(
        rf"naver_blog_{re.escape(artist)}_(\d{{8}}_\d{{6}})_scored\.csv$",
        name,
    )

    if match:
        stamp = match.group(1)
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    cluster_file = f"naver_blog_{artist}_{stamp}_topic_cluster.csv"
    article_file = f"naver_blog_{artist}_{stamp}_topic_cluster_articles.csv"

    return cluster_file, article_file


def main():
    artist = input("블로그 주제 묶음을 만들 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    source_file = find_latest_blog_scored(artist)

    if not source_file:
        print("블로그 중심성 scored 파일이 없습니다.")
        print("먼저 py naver_relevance_filter.py 를 실행하세요.")
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

        cluster_rows.append({
            "topicKey": topic_key,
            "topicGroup": cluster["topicGroup"],
            "postCount": cluster["postCount"],
            "primaryCount": cluster["primaryCount"],
            "relatedCount": cluster["relatedCount"],
            "weakCount": cluster["weakCount"],
            "noneCount": cluster["noneCount"],
            "rawPointSum": raw_point,
            "topicKeyCap": TOPIC_KEY_CAP.get(cluster["topicGroup"], 2.0),
            "keyCappedTopicPoint": 0.0,
            "topicGroupCap": TOPIC_GROUP_CAP.get(cluster["topicGroup"], 5.0),
            "topicGroupRatio": 1.0,
            "cappedTopicPoint": 0.0,
            "sampleTitles": " / ".join(cluster["sampleTitles"]),
        })

    cluster_rows = apply_caps(cluster_rows)

    cluster_rows.sort(
        key=lambda row: to_float(row["cappedTopicPoint"]),
        reverse=True
    )

    cluster_file, article_file = build_output_names(source_file, artist)

    cluster_fieldnames = [
        "topicKey",
        "topicGroup",
        "postCount",
        "primaryCount",
        "relatedCount",
        "weakCount",
        "noneCount",
        "rawPointSum",
        "topicKeyCap",
        "keyCappedTopicPoint",
        "topicGroupCap",
        "topicGroupRatio",
        "cappedTopicPoint",
        "sampleTitles",
    ]

    article_fieldnames = list(article_rows[0].keys()) if article_rows else []

    write_csv(cluster_file, cluster_rows, cluster_fieldnames)
    write_csv(article_file, article_rows, article_fieldnames)

    raw_total = round(sum(to_float(row["rawPointSum"]) for row in cluster_rows), 2)
    key_capped_total = round(sum(to_float(row["keyCappedTopicPoint"]) for row in cluster_rows), 2)
    final_total = round(sum(to_float(row["cappedTopicPoint"]) for row in cluster_rows), 2)

    print()
    print("블로그 주제 묶음 v2 생성 완료")
    print(f"원본 파일: {source_file}")
    print(f"주제 요약 파일: {cluster_file}")
    print(f"글별 주제 파일: {article_file}")
    print()
    print(f"기존 블로그 점수 합계: {raw_total}점")
    print(f"topicKey cap 적용 점수: {key_capped_total}점")
    print(f"topicGroup cap 적용 최종 점수: {final_total}점")
    print()
    print("상위 주제")

    for row in cluster_rows[:30]:
        print(
            f"- {row['topicKey']}: "
            f"{row['postCount']}개 / "
            f"raw {row['rawPointSum']} → "
            f"keyCap {row['keyCappedTopicPoint']} → "
            f"groupCap {row['cappedTopicPoint']}"
        )


if __name__ == "__main__":
    main()