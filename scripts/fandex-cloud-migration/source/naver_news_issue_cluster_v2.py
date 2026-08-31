import csv
import re
from html import unescape
from datetime import datetime

from naver_file_resolver_v2 import find_latest_news_sentiment_scored, basename


ISSUE_CAP = {
    "controversy": 12.0,
    "donation_goodwill": 8.0,
    "music_release": 10.0,
    "record_chart_award": 10.0,
    "brand_ad": 8.0,
    "brand_rank": 8.0,
    "content_drama_broadcast": 7.0,
    "fan_event": 5.0,
    "award_event": 4.0,
    "sns_update": 3.0,
    "relationship_mention": 1.0,
    "general": 3.0,
    "weak_related": 0.5,
}


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


def get_relevance(row):
    return row.get("relevance_level_used", row.get("relevance_level", "")).strip()


def classify_issue_group(row, artist):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    sentiment = clean_text(row.get("sentiment", ""))
    relevance = get_relevance(row)
    text = f"{title} {description}"

    if relevance == "weak" and artist not in title:
        return "weak_related"

    if has_any(text, [
        "청룡", "핸드프린팅", "포토타임", "레드카펫", "시상식", "어워즈",
        "행사에 참석", "포즈를 취하고"
    ]):
        return "award_event"

    if has_any(text, [
        "기부", "선행", "성금", "취약계층", "이웃돕기", "저소득",
        "양평군", "양평"
    ]):
        return "donation_goodwill"

    if has_any(text, [
        "이종석", "장기하", "열애", "연애", "남자친구", "전 연인",
        "윤가이", "커플", "결별"
    ]):
        return "relationship_mention"

    if sentiment == "negative" or has_any(text, [
        "논란", "의혹", "피소", "고소", "사과", "해명", "하차", "활동 중단",
        "탈퇴", "계약 해지", "비판", "혹평", "사생활", "음주", "폭행", "갑질"
    ]):
        return "controversy"

    if has_any(text, [
        "컴백", "발매", "신곡", "앨범", "싱글", "선공개", "뮤직비디오", "티저"
    ]):
        return "music_release"

    if has_any(text, [
        "광고모델", "광고 모델", "대표 광고모델", "광고업계", "현직 광고인"
    ]):
        return "brand_rank"

    if has_any(text, [
        "앰버서더", "브랜드", "화보", "캠페인", "예거", "르쿨트르",
        "완판", "제이에스티나", "뉴발란스", "셀린느"
    ]):
        return "brand_ad"

    if has_any(text, [
        "1위", "차트", "기록", "돌파", "빌보드", "스포티파이", "멜론", "역주행",
        "대상 수상", "수상했다", "수상 소감"
    ]):
        return "record_chart_award"

    if has_any(text, [
        "드라마", "영화", "예능", "출연", "제작발표회", "인터뷰", "넷플릭스",
        "폭싹", "폭싹 속았수다", "작품", "방송"
    ]):
        return "content_drama_broadcast"

    if has_any(text, [
        "팬미팅", "콘서트", "투어", "공연", "유애나", "팬들", "팬"
    ]):
        return "fan_event"

    if has_any(text, [
        "SNS", "인스타", "인스타그램", "근황", "스토리", "게시물", "업로드"
    ]):
        return "sns_update"

    return "general"


def classify_issue_key(row, artist, issue_group):
    title = clean_text(row.get("title", ""))
    description = clean_text(row.get("description", ""))
    text = f"{title} {description}"

    if issue_group == "weak_related":
        return "weak_related__etc"

    if issue_group == "award_event":
        if "청룡" in text or "핸드프린팅" in text:
            return "award_event__blue_dragon_handprinting"
        return "award_event__etc"

    if issue_group == "donation_goodwill":
        if "양평" in text or "양평군" in text:
            return "donation_goodwill__yangpyeong"
        return "donation_goodwill__etc"

    if issue_group == "relationship_mention":
        if "이종석" in text:
            return "relationship_mention__lee_jongsuk"
        if "장기하" in text:
            return "relationship_mention__jang_kiha"
        return "relationship_mention__etc"

    if issue_group == "brand_rank":
        return "brand_rank__advertising_model_rank"

    if issue_group == "brand_ad":
        if "예거" in text or "르쿨트르" in text:
            return "brand_ad__jaeger_lecoultre_ambassador"
        if "제이에스티나" in text:
            return "brand_ad__j_estina"
        if "뉴발란스" in text:
            return "brand_ad__new_balance"
        if "셀린느" in text:
            return "brand_ad__celine"
        if "화보" in text:
            return "brand_ad__pictorial"
        if "앰버서더" in text:
            return "brand_ad__ambassador"
        return "brand_ad__etc"

    if issue_group == "content_drama_broadcast":
        if "폭싹" in text:
            return "content_drama_broadcast__when_life_gives_you_tangerines"
        if "넷플릭스" in text:
            return "content_drama_broadcast__netflix"
        if "드라마" in text:
            return "content_drama_broadcast__drama"
        if "영화" in text:
            return "content_drama_broadcast__movie"
        return "content_drama_broadcast__etc"

    if issue_group == "music_release":
        return "music_release__etc"

    if issue_group == "record_chart_award":
        return "record_chart_award__etc"

    if issue_group == "controversy":
        return "controversy__etc"

    if issue_group == "fan_event":
        return "fan_event__etc"

    if issue_group == "sns_update":
        return "sns_update__etc"

    # v2 핵심: 일반 기사는 제목별로 쪼개지 않고 하나로 묶음
    return "general__etc"


def cap_issue_point(issue_group, point_sum):
    cap = ISSUE_CAP.get(issue_group, 3.0)

    if point_sum > cap:
        return cap

    if point_sum < -cap:
        return -cap

    return point_sum


def build_output_names(source_file, artist):
    name = basename(source_file)

    match = re.match(
        rf"naver_news_{re.escape(artist)}_(\d{{8}}_\d{{6}})_sentiment_scored\.csv$",
        name,
    )

    if match:
        stamp = match.group(1)
    else:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    cluster_file = f"naver_news_{artist}_{stamp}_issue_cluster.csv"
    article_file = f"naver_news_{artist}_{stamp}_issue_cluster_articles.csv"

    return cluster_file, article_file


def main():
    artist = input("이슈 묶음을 만들 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    source_file = find_latest_news_sentiment_scored(artist)

    if not source_file:
        print("뉴스 감성 점수 파일이 없습니다.")
        print("먼저 py naver_fandex_cumulative_score_v2.py 를 실행하세요.")
        return

    rows = read_csv(source_file)

    article_rows = []
    clusters = {}

    for row in rows:
        issue_group = classify_issue_group(row, artist)
        issue_key = classify_issue_key(row, artist, issue_group)

        point = to_float(row.get("fandexNewsPoint", 0))
        relevance = get_relevance(row)
        article_type = row.get("articleType", "")
        sentiment = row.get("sentiment", "")

        if issue_key not in clusters:
            clusters[issue_key] = {
                "issueKey": issue_key,
                "issueGroup": issue_group,
                "articleCount": 0,
                "primaryCount": 0,
                "relatedCount": 0,
                "weakCount": 0,
                "positiveCount": 0,
                "neutralCount": 0,
                "negativeCount": 0,
                "normalCount": 0,
                "simpleEventCount": 0,
                "photoCount": 0,
                "rawPointSum": 0.0,
                "sampleTitles": [],
            }

        cluster = clusters[issue_key]

        cluster["articleCount"] += 1
        cluster["rawPointSum"] += point

        if relevance == "primary":
            cluster["primaryCount"] += 1
        elif relevance == "related":
            cluster["relatedCount"] += 1
        elif relevance == "weak":
            cluster["weakCount"] += 1

        if sentiment == "positive":
            cluster["positiveCount"] += 1
        elif sentiment == "neutral":
            cluster["neutralCount"] += 1
        elif sentiment == "negative":
            cluster["negativeCount"] += 1

        if article_type == "normal":
            cluster["normalCount"] += 1
        elif article_type == "simple_event":
            cluster["simpleEventCount"] += 1
        elif article_type == "photo":
            cluster["photoCount"] += 1

        title = clean_text(row.get("title", ""))
        if title and len(cluster["sampleTitles"]) < 5:
            cluster["sampleTitles"].append(title)

        new_row = dict(row)
        new_row["issueGroup"] = issue_group
        new_row["issueKey"] = issue_key
        article_rows.append(new_row)

    cluster_rows = []

    for issue_key, cluster in clusters.items():
        raw_point = round(cluster["rawPointSum"], 2)
        capped_point = round(cap_issue_point(cluster["issueGroup"], raw_point), 2)

        cluster_rows.append({
            "issueKey": issue_key,
            "issueGroup": cluster["issueGroup"],
            "articleCount": cluster["articleCount"],
            "primaryCount": cluster["primaryCount"],
            "relatedCount": cluster["relatedCount"],
            "weakCount": cluster["weakCount"],
            "positiveCount": cluster["positiveCount"],
            "neutralCount": cluster["neutralCount"],
            "negativeCount": cluster["negativeCount"],
            "normalCount": cluster["normalCount"],
            "simpleEventCount": cluster["simpleEventCount"],
            "photoCount": cluster["photoCount"],
            "rawPointSum": raw_point,
            "issueCap": ISSUE_CAP.get(cluster["issueGroup"], 3.0),
            "cappedIssuePoint": capped_point,
            "sampleTitles": " / ".join(cluster["sampleTitles"]),
        })

    cluster_rows.sort(
        key=lambda row: abs(to_float(row["cappedIssuePoint"])),
        reverse=True
    )

    cluster_file, article_file = build_output_names(source_file, artist)

    cluster_fieldnames = [
        "issueKey",
        "issueGroup",
        "articleCount",
        "primaryCount",
        "relatedCount",
        "weakCount",
        "positiveCount",
        "neutralCount",
        "negativeCount",
        "normalCount",
        "simpleEventCount",
        "photoCount",
        "rawPointSum",
        "issueCap",
        "cappedIssuePoint",
        "sampleTitles",
    ]

    article_fieldnames = list(article_rows[0].keys()) if article_rows else []

    write_csv(cluster_file, cluster_rows, cluster_fieldnames)
    write_csv(article_file, article_rows, article_fieldnames)

    raw_total = round(sum(to_float(row["rawPointSum"]) for row in cluster_rows), 2)
    capped_total = round(sum(to_float(row["cappedIssuePoint"]) for row in cluster_rows), 2)

    print()
    print("뉴스 이슈 묶음 v2 생성 완료")
    print(f"원본 파일: {source_file}")
    print(f"이슈 요약 파일: {cluster_file}")
    print(f"기사별 이슈 파일: {article_file}")
    print()
    print(f"기존 뉴스 점수 합계: {raw_total}점")
    print(f"이슈 묶음 적용 점수: {capped_total}점")
    print()
    print("이슈별 요약")

    for row in cluster_rows:
        print(
            f"- {row['issueKey']}: "
            f"{row['articleCount']}개 / "
            f"기존 {row['rawPointSum']}점 → "
            f"묶음 {row['cappedIssuePoint']}점"
        )


if __name__ == "__main__":
    main()