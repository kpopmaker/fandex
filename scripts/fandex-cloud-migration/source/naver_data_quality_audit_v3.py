import csv
import glob
import json
import os
import re
import shutil
from datetime import datetime


RANKING_JSON_FILE = "fandex_naver_ranking_v3_latest.json"


HIGH_RISK_KEYWORDS = [
    "꿈해몽", "해몽", "꿈", "사주", "운세", "타로",
    "내돈내산", "후기", "추천", "가격", "할인", "구매", "판매",
    "베개", "침구", "수면", "숙면", "경추", "목디스크",
    "치킨", "푸라닭", "신메뉴", "맛집",
]

COMPARISON_KEYWORDS = [
    "제쳤다", "제치고", "꺾고", "앞섰다", "넘었다", "추월",
    "이겼다", "따돌리고", "보다", "비교", "순위", "랭킹",
]

RELATIONSHIP_KEYWORDS = [
    "이종석", "장기하", "열애", "연애", "결별", "전 연인",
    "남자친구", "윤가이", "커플",
]

WEAK_CONTENT_KEYWORDS = [
    "포토", "사진", "움짤", "짤", "직캠", "하객룩",
    "착장", "니트", "가디건", "원피스", "패션템",
]

NOISE_GROUPS = [
    "weak_related",
    "name_collision",
    "product_commerce",
    "relationship_mention",
    "general",
]


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


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


def clean_text(value):
    text = str(value or "")
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def has_any(text, keywords):
    return any(keyword in text for keyword in keywords)


def get_first(row, names, default=""):
    for name in names:
        if name in row and row.get(name) not in [None, ""]:
            return row.get(name)

    return default


def latest_file(pattern):
    files = glob.glob(pattern)

    if not files:
        return None

    return max(files, key=os.path.getmtime)


def candidate_file_exists(paths):
    for path in paths:
        if path and os.path.exists(path):
            return path

    return None


def find_news_article_file(artist, news_cluster_file):
    candidates = []

    if news_cluster_file:
        candidates.append(news_cluster_file.replace("_issue_cluster.csv", "_issue_cluster_articles.csv"))
        candidates.append(news_cluster_file.replace("_issue_cluster.csv", "_issue_articles.csv"))

    candidates.append(latest_file(f"naver_news_{artist}_*_issue_cluster_articles.csv"))
    candidates.append(latest_file(f"naver_news_{artist}_*_sentiment_scored.csv"))
    candidates.append(latest_file(f"naver_news_{artist}_*_scored.csv"))

    return candidate_file_exists(candidates)


def find_blog_article_file(artist, blog_cluster_file):
    candidates = []

    if blog_cluster_file:
        candidates.append(blog_cluster_file.replace("_topic_cluster.csv", "_topic_cluster_articles.csv"))
        candidates.append(blog_cluster_file.replace("_topic_cluster.csv", "_topic_articles.csv"))

    candidates.append(latest_file(f"naver_blog_{artist}_*_topic_cluster_articles.csv"))
    candidates.append(latest_file(f"naver_blog_{artist}_*_scored.csv"))

    return candidate_file_exists(candidates)


def has_artist_in_title(title, artist):
    title = clean_text(title)

    if not artist:
        return False

    if artist in title:
        return True

    return False


def has_artist_anywhere(title, description, artist):
    text = f"{title} {description}"
    return artist in text


def estimate_point(row, source_type):
    if source_type == "news":
        return to_float(get_first(row, [
            "fandexNewsIssuePoint",
            "fandexNewsPoint",
            "newsPoint",
            "sentimentWeightedPoint",
            "fandexPoint",
            "point",
        ], 0))

    return to_float(get_first(row, [
        "fandexBlogPoint",
        "blogPoint",
        "topicPoint",
        "fandexPoint",
        "point",
    ], 0))


def get_group_key(row, source_type):
    if source_type == "news":
        return get_first(row, ["issueGroup", "clusterGroup", "topicGroup", "group"], "")

    return get_first(row, ["topicGroup", "clusterGroup", "issueGroup", "group"], "")


def get_item_key(row, source_type):
    if source_type == "news":
        return get_first(row, ["issueKey", "clusterKey", "topicKey", "key"], "")

    return get_first(row, ["topicKey", "clusterKey", "issueKey", "key"], "")


def audit_row(row, artist, source_type, source_file):
    title = clean_text(get_first(row, ["title", "sampleTitle", "name"], ""))
    description = clean_text(get_first(row, ["description", "summary", "content"], ""))
    link = get_first(row, ["link", "url"], "")

    text = f"{title} {description}"

    relevance = clean_text(get_first(row, [
        "relevance_level_used",
        "relevance_level",
        "relevanceLevel",
        "artistRelevance",
    ], ""))

    group_key = get_group_key(row, source_type)
    item_key = get_item_key(row, source_type)
    original_point = estimate_point(row, source_type)

    reasons = []
    level_score = 0

    if not has_artist_in_title(title, artist):
        reasons.append("title_missing_artist")
        level_score += 3

    if not has_artist_anywhere(title, description, artist):
        reasons.append("artist_not_found")
        level_score += 5

    if relevance in ["weak", "none"]:
        reasons.append(f"weak_relevance_{relevance}")
        level_score += 4

    if group_key in NOISE_GROUPS:
        reasons.append(f"noise_group_{group_key}")
        level_score += 3

    if has_any(text, HIGH_RISK_KEYWORDS):
        reasons.append("high_risk_keyword")
        level_score += 4

    if has_any(text, COMPARISON_KEYWORDS):
        reasons.append("comparison_or_rank_mention")
        level_score += 2

    if has_any(text, RELATIONSHIP_KEYWORDS):
        reasons.append("relationship_mention")
        level_score += 3

    if has_any(text, WEAK_CONTENT_KEYWORDS):
        reasons.append("weak_content_keyword")
        level_score += 1

    if source_type == "blog" and has_any(text, ["내돈내산", "후기", "추천", "가격", "구매"]):
        reasons.append("commercial_blog")
        level_score += 4

    if source_type == "news" and not has_artist_in_title(title, artist):
        reasons.append("news_not_artist_centered")
        level_score += 2

    if not reasons:
        return None

    if level_score >= 8:
        audit_level = "high"
    elif level_score >= 5:
        audit_level = "medium"
    else:
        audit_level = "low"

    return {
        "artist": artist,
        "sourceType": source_type,
        "auditLevel": audit_level,
        "riskScore": level_score,
        "reasonCodes": ",".join(reasons),
        "title": title,
        "description": description,
        "link": link,
        "relevanceLevel": relevance,
        "groupKey": group_key,
        "itemKey": item_key,
        "originalPoint": original_point,
        "sourceFile": os.path.basename(source_file),
    }


def load_ranking_items():
    if not os.path.exists(RANKING_JSON_FILE):
        print(f"{RANKING_JSON_FILE} 파일이 없습니다.")
        print("먼저 py naver_fandex_export_v3_json.py 를 실행하세요.")
        return []

    data = read_json(RANKING_JSON_FILE)
    return data.get("ranking", [])


def audit_artist(ranking_item):
    artist = ranking_item.get("artist", "")
    meta = ranking_item.get("meta", {})

    news_cluster_file = meta.get("newsClusterFile", "")
    blog_cluster_file = meta.get("blogClusterFile", "")

    news_article_file = find_news_article_file(artist, news_cluster_file)
    blog_article_file = find_blog_article_file(artist, blog_cluster_file)

    audit_rows = []

    if news_article_file and os.path.exists(news_article_file):
        news_rows = read_csv(news_article_file)

        for row in news_rows:
            audit = audit_row(
                row=row,
                artist=artist,
                source_type="news",
                source_file=news_article_file,
            )

            if audit:
                audit_rows.append(audit)

    if blog_article_file and os.path.exists(blog_article_file):
        blog_rows = read_csv(blog_article_file)

        for row in blog_rows:
            audit = audit_row(
                row=row,
                artist=artist,
                source_type="blog",
                source_file=blog_article_file,
            )

            if audit:
                audit_rows.append(audit)

    return audit_rows, news_article_file, blog_article_file


def summarize_audit(all_rows, file_map):
    summary = {}

    for row in all_rows:
        artist = row["artist"]

        if artist not in summary:
            summary[artist] = {
                "artist": artist,
                "totalSuspectCount": 0,
                "highCount": 0,
                "mediumCount": 0,
                "lowCount": 0,
                "newsSuspectCount": 0,
                "blogSuspectCount": 0,
                "suspectOriginalPointSum": 0.0,
                "topReasonCodes": {},
                "newsArticleFile": file_map.get(artist, {}).get("news", ""),
                "blogArticleFile": file_map.get(artist, {}).get("blog", ""),
            }

        item = summary[artist]
        item["totalSuspectCount"] += 1
        item["suspectOriginalPointSum"] += to_float(row.get("originalPoint", 0))

        if row["auditLevel"] == "high":
            item["highCount"] += 1
        elif row["auditLevel"] == "medium":
            item["mediumCount"] += 1
        else:
            item["lowCount"] += 1

        if row["sourceType"] == "news":
            item["newsSuspectCount"] += 1
        else:
            item["blogSuspectCount"] += 1

        for code in row["reasonCodes"].split(","):
            if not code:
                continue
            item["topReasonCodes"][code] = item["topReasonCodes"].get(code, 0) + 1

    summary_rows = []

    for artist, item in summary.items():
        reason_pairs = sorted(
            item["topReasonCodes"].items(),
            key=lambda x: x[1],
            reverse=True
        )

        top_reasons = " / ".join([f"{key}:{count}" for key, count in reason_pairs[:8]])

        summary_rows.append({
            "artist": artist,
            "totalSuspectCount": item["totalSuspectCount"],
            "highCount": item["highCount"],
            "mediumCount": item["mediumCount"],
            "lowCount": item["lowCount"],
            "newsSuspectCount": item["newsSuspectCount"],
            "blogSuspectCount": item["blogSuspectCount"],
            "suspectOriginalPointSum": round(item["suspectOriginalPointSum"], 2),
            "topReasonCodes": top_reasons,
            "newsArticleFile": os.path.basename(item["newsArticleFile"]) if item["newsArticleFile"] else "",
            "blogArticleFile": os.path.basename(item["blogArticleFile"]) if item["blogArticleFile"] else "",
        })

    summary_rows.sort(
        key=lambda row: (
            to_int(row["highCount"]),
            to_int(row["totalSuspectCount"]),
            to_float(row["suspectOriginalPointSum"]),
        ),
        reverse=True
    )

    return summary_rows


def main():
    ranking_items = load_ranking_items()

    if not ranking_items:
        print("랭킹 데이터가 없습니다.")
        return

    print()
    print("네이버 FANDEX 데이터 품질 감사 v3 시작")
    print()

    all_audit_rows = []
    file_map = {}

    for item in ranking_items:
        artist = item.get("artist", "")

        audit_rows, news_file, blog_file = audit_artist(item)

        file_map[artist] = {
            "news": news_file,
            "blog": blog_file,
        }

        all_audit_rows.extend(audit_rows)

        print(
            f"- {artist}: 의심 데이터 {len(audit_rows)}개 "
            f"(news={os.path.basename(news_file) if news_file else '-'} / "
            f"blog={os.path.basename(blog_file) if blog_file else '-'})"
        )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    audit_file = f"naver_data_quality_audit_v3_{now}.csv"
    summary_file = f"naver_data_quality_audit_v3_summary_{now}.csv"

    audit_latest_file = "naver_data_quality_audit_v3_latest.csv"
    summary_latest_file = "naver_data_quality_audit_v3_summary_latest.csv"

    audit_fieldnames = [
        "artist",
        "sourceType",
        "auditLevel",
        "riskScore",
        "reasonCodes",
        "title",
        "description",
        "link",
        "relevanceLevel",
        "groupKey",
        "itemKey",
        "originalPoint",
        "sourceFile",
    ]

    if all_audit_rows:
        all_audit_rows.sort(
            key=lambda row: (
                {"high": 3, "medium": 2, "low": 1}.get(row["auditLevel"], 0),
                to_float(row["riskScore"]),
                to_float(row["originalPoint"]),
            ),
            reverse=True
        )

        write_csv(audit_file, all_audit_rows, audit_fieldnames)
        shutil.copyfile(audit_file, audit_latest_file)
    else:
        write_csv(audit_file, [], audit_fieldnames)
        shutil.copyfile(audit_file, audit_latest_file)

    summary_rows = summarize_audit(all_audit_rows, file_map)

    summary_fieldnames = [
        "artist",
        "totalSuspectCount",
        "highCount",
        "mediumCount",
        "lowCount",
        "newsSuspectCount",
        "blogSuspectCount",
        "suspectOriginalPointSum",
        "topReasonCodes",
        "newsArticleFile",
        "blogArticleFile",
    ]

    write_csv(summary_file, summary_rows, summary_fieldnames)
    shutil.copyfile(summary_file, summary_latest_file)

    print()
    print("데이터 품질 감사 v3 완료")
    print(f"상세 파일: {audit_file}")
    print(f"상세 최신 파일: {audit_latest_file}")
    print(f"요약 파일: {summary_file}")
    print(f"요약 최신 파일: {summary_latest_file}")
    print()
    print("요약 미리보기")

    for row in summary_rows:
        print(
            f"- {row['artist']}: "
            f"의심 {row['totalSuspectCount']}개 "
            f"/ high {row['highCount']} "
            f"/ medium {row['mediumCount']} "
            f"/ news {row['newsSuspectCount']} "
            f"/ blog {row['blogSuspectCount']}"
        )


if __name__ == "__main__":
    main()