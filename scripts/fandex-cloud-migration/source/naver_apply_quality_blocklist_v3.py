import csv
import glob
import json
import os
import re
from html import unescape
from datetime import datetime


RANKING_JSON_FILE = "fandex_naver_ranking_v3_latest.json"
BLOCKLIST_FILE = "naver_quality_blocklist_v3_latest.csv"


NEWS_ISSUE_GROUP_CAP = {
    "record_chart_award": 10.0,
    "music_release": 10.0,
    "brand_ad": 8.0,
    "brand_rank": 8.0,
    "content_drama_broadcast": 7.0,
    "concert_fan_event": 7.0,
    "donation_goodwill": 8.0,
    "award_event": 4.0,
    "controversy": 20.0,
    "relationship_mention": 1.0,
    "weak_related": 0.5,
    "general": 3.0,
    "none": 0.0,
}

BLOG_TOPIC_KEY_CAP = {
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

BLOG_TOPIC_GROUP_CAP = {
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
    text = unescape(str(value or ""))
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def latest_file(pattern):
    files = glob.glob(pattern)

    if not files:
        return None

    return max(files, key=os.path.getmtime)


def get_first(row, names, default=""):
    for name in names:
        if name in row and row.get(name) not in [None, ""]:
            return row.get(name)

    return default


def basename(path):
    return os.path.basename(path) if path else ""


def make_match_key(artist, source_type, source_file, title):
    return "|".join([
        clean_text(artist),
        clean_text(source_type),
        basename(source_file),
        clean_text(title),
    ])


def make_title_key(artist, source_type, title):
    return "|".join([
        clean_text(artist),
        clean_text(source_type),
        clean_text(title),
    ])


def load_exclude_keys():
    if not os.path.exists(BLOCKLIST_FILE):
        print(f"{BLOCKLIST_FILE} 파일이 없습니다.")
        print("먼저 py naver_quality_blocklist_v3.py 를 실행하세요.")
        return None, None

    rows = read_csv(BLOCKLIST_FILE)

    exact_keys = set()
    title_keys = set()

    for row in rows:
        if row.get("blockAction") != "exclude":
            continue

        artist = row.get("artist", "")
        source_type = row.get("sourceType", "")
        source_file = row.get("sourceFile", "")
        title = row.get("title", "")

        exact_keys.add(make_match_key(artist, source_type, source_file, title))
        title_keys.add(make_title_key(artist, source_type, title))

    return exact_keys, title_keys


def is_excluded(row, artist, source_type, source_file, exact_keys, title_keys):
    title = clean_text(get_first(row, ["title", "sampleTitle", "name"], ""))

    exact_key = make_match_key(artist, source_type, source_file, title)
    title_key = make_title_key(artist, source_type, title)

    return exact_key in exact_keys or title_key in title_keys


def find_news_article_file(artist, ranking_item):
    meta = ranking_item.get("meta", {})
    cluster_file = meta.get("newsClusterFile", "")

    candidates = []

    if cluster_file:
        candidates.append(cluster_file.replace("_issue_cluster.csv", "_issue_cluster_articles.csv"))

    candidates.append(latest_file(f"naver_news_{artist}_*_issue_cluster_articles.csv"))

    for path in candidates:
        if path and os.path.exists(path):
            return path

    return None


def find_blog_article_file(artist, ranking_item):
    meta = ranking_item.get("meta", {})
    cluster_file = meta.get("blogClusterFile", "")

    candidates = []

    if cluster_file:
        candidates.append(cluster_file.replace("_topic_cluster.csv", "_topic_cluster_articles.csv"))

    candidates.append(latest_file(f"naver_blog_{artist}_*_topic_cluster_articles.csv"))

    for path in candidates:
        if path and os.path.exists(path):
            return path

    return None


def get_news_point(row):
    return to_float(get_first(row, [
        "fandexNewsIssuePoint",
        "fandexNewsPoint",
        "newsPoint",
        "sentimentWeightedPoint",
        "fandexPoint",
        "point",
    ], 0))


def get_blog_point(row):
    return to_float(get_first(row, [
        "fandexBlogPoint",
        "blogPoint",
        "topicPoint",
        "fandexPoint",
        "point",
    ], 0))


def get_news_group(row):
    return get_first(row, [
        "issueGroup",
        "clusterGroup",
        "topicGroup",
        "group",
    ], "general")


def get_news_key(row):
    return get_first(row, [
        "issueKey",
        "clusterKey",
        "topicKey",
        "key",
    ], "general__etc")


def get_blog_group(row):
    return get_first(row, [
        "topicGroup",
        "clusterGroup",
        "issueGroup",
        "group",
    ], "general")


def get_blog_key(row):
    return get_first(row, [
        "topicKey",
        "clusterKey",
        "issueKey",
        "key",
    ], "general__etc")



# Auto-added by patch_naver_apply_quality_missing_negative_caps_v1.py
# Empty dict keeps existing .get(..., default) behavior and prevents NameError.
NEWS_ISSUE_GROUP_NEGATIVE_CAP = {}

def apply_news_cap(issue_group, raw_point):
    positive_cap = NEWS_ISSUE_GROUP_CAP.get(issue_group, 3.0)
    negative_cap = NEWS_ISSUE_GROUP_NEGATIVE_CAP.get(issue_group, -3.0)

    if raw_point >= 0:
        return round(min(raw_point, positive_cap), 2)

    return round(max(raw_point, negative_cap), 2)

def rebuild_news_cluster(artist, article_file, exact_keys, title_keys, stamp):
    rows = read_csv(article_file)

    kept_rows = []
    excluded_count = 0
    before_point = 0.0

    for row in rows:
        point = get_news_point(row)
        before_point += point

        if is_excluded(row, artist, "news", article_file, exact_keys, title_keys):
            excluded_count += 1
            continue

        new_row = dict(row)
        new_row["qualityFilterStatus"] = "kept"
        kept_rows.append(new_row)

    clusters = {}

    for row in kept_rows:
        issue_group = get_news_group(row)
        issue_key = get_news_key(row)
        point = get_news_point(row)

        if issue_key not in clusters:
            clusters[issue_key] = {
                "issueKey": issue_key,
                "issueGroup": issue_group,
                "articleCount": 0,
                "rawPointSum": 0.0,
                "sampleTitles": [],
            }

        cluster = clusters[issue_key]
        cluster["articleCount"] += 1
        cluster["rawPointSum"] += point

        title = clean_text(get_first(row, ["title", "sampleTitle"], ""))
        if title and len(cluster["sampleTitles"]) < 5:
            cluster["sampleTitles"].append(title)

    cluster_rows = []

    for issue_key, cluster in clusters.items():
        raw_point = round(cluster["rawPointSum"], 2)
        issue_group = cluster["issueGroup"]
        capped = apply_news_cap(issue_group, raw_point)

        cluster_rows.append({
            "issueKey": issue_key,
            "issueGroup": issue_group,
            "articleCount": cluster["articleCount"],
            "rawPointSum": raw_point,
            "issueGroupCap": NEWS_ISSUE_GROUP_CAP.get(issue_group, 3.0),
            "cappedIssuePoint": capped,
            "sampleTitles": " / ".join(cluster["sampleTitles"]),
            "qualityFilterVersion": "v3_blocklist",
        })

    cluster_rows.sort(
        key=lambda row: to_float(row["cappedIssuePoint"]),
        reverse=True
    )

    output_cluster = f"naver_news_{artist}_{stamp}_issue_cluster.csv"
    output_articles = f"naver_news_{artist}_{stamp}_issue_cluster_articles.csv"

    cluster_fieldnames = [
        "issueKey",
        "issueGroup",
        "articleCount",
        "rawPointSum",
        "issueGroupCap",
        "cappedIssuePoint",
        "sampleTitles",
        "qualityFilterVersion",
    ]

    article_fieldnames = list(kept_rows[0].keys()) if kept_rows else ["qualityFilterStatus"]

    write_csv(output_cluster, cluster_rows, cluster_fieldnames)
    write_csv(output_articles, kept_rows, article_fieldnames)

    after_raw = round(sum(to_float(row["rawPointSum"]) for row in cluster_rows), 2)
    after_capped = round(sum(to_float(row["cappedIssuePoint"]) for row in cluster_rows), 2)

    return {
        "artist": artist,
        "sourceType": "news",
        "sourceFile": basename(article_file),
        "outputClusterFile": output_cluster,
        "outputArticleFile": output_articles,
        "beforeArticleCount": len(rows),
        "excludedArticleCount": excluded_count,
        "keptArticleCount": len(kept_rows),
        "beforeRawPointSum": round(before_point, 2),
        "afterRawPointSum": after_raw,
        "afterCappedPointSum": after_capped,
    }


def apply_blog_caps(cluster_rows):
    group_sums = {}

    for row in cluster_rows:
        group = row["topicGroup"]
        raw_point = to_float(row["rawPointSum"])

        key_cap = BLOG_TOPIC_KEY_CAP.get(group, 2.0)
        key_capped = min(raw_point, key_cap)

        row["topicKeyCap"] = key_cap
        row["keyCappedTopicPoint"] = round(key_capped, 2)

        group_sums[group] = group_sums.get(group, 0.0) + key_capped

    group_ratios = {}

    for group, group_sum in group_sums.items():
        group_cap = BLOG_TOPIC_GROUP_CAP.get(group, 5.0)

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

        row["topicGroupCap"] = BLOG_TOPIC_GROUP_CAP.get(group, 5.0)
        row["topicGroupRatio"] = round(ratio, 4)
        row["cappedTopicPoint"] = round(final_point, 2)

    return cluster_rows


def rebuild_blog_cluster(artist, article_file, exact_keys, title_keys, stamp):
    rows = read_csv(article_file)

    kept_rows = []
    excluded_count = 0
    before_point = 0.0

    for row in rows:
        point = get_blog_point(row)
        before_point += point

        if is_excluded(row, artist, "blog", article_file, exact_keys, title_keys):
            excluded_count += 1
            continue

        new_row = dict(row)
        new_row["qualityFilterStatus"] = "kept"
        kept_rows.append(new_row)

    clusters = {}

    for row in kept_rows:
        topic_group = get_blog_group(row)
        topic_key = get_blog_key(row)
        point = get_blog_point(row)

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
        cluster["rawPointSum"] += point

        relevance = clean_text(get_first(row, [
            "relevance_level_used",
            "relevance_level",
            "relevanceLevel",
        ], ""))

        if relevance == "primary":
            cluster["primaryCount"] += 1
        elif relevance == "related":
            cluster["relatedCount"] += 1
        elif relevance == "weak":
            cluster["weakCount"] += 1
        else:
            cluster["noneCount"] += 1

        title = clean_text(get_first(row, ["title", "sampleTitle"], ""))
        if title and len(cluster["sampleTitles"]) < 5:
            cluster["sampleTitles"].append(title)

    cluster_rows = []

    for topic_key, cluster in clusters.items():
        cluster_rows.append({
            "topicKey": topic_key,
            "topicGroup": cluster["topicGroup"],
            "postCount": cluster["postCount"],
            "primaryCount": cluster["primaryCount"],
            "relatedCount": cluster["relatedCount"],
            "weakCount": cluster["weakCount"],
            "noneCount": cluster["noneCount"],
            "rawPointSum": round(cluster["rawPointSum"], 2),
            "topicKeyCap": 0.0,
            "keyCappedTopicPoint": 0.0,
            "topicGroupCap": 0.0,
            "topicGroupRatio": 1.0,
            "cappedTopicPoint": 0.0,
            "sampleTitles": " / ".join(cluster["sampleTitles"]),
            "qualityFilterVersion": "v3_blocklist",
        })

    cluster_rows = apply_blog_caps(cluster_rows)

    cluster_rows.sort(
        key=lambda row: to_float(row["cappedTopicPoint"]),
        reverse=True
    )

    output_cluster = f"naver_blog_{artist}_{stamp}_topic_cluster.csv"
    output_articles = f"naver_blog_{artist}_{stamp}_topic_cluster_articles.csv"

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
        "qualityFilterVersion",
    ]

    article_fieldnames = list(kept_rows[0].keys()) if kept_rows else ["qualityFilterStatus"]

    write_csv(output_cluster, cluster_rows, cluster_fieldnames)
    write_csv(output_articles, kept_rows, article_fieldnames)

    after_raw = round(sum(to_float(row["rawPointSum"]) for row in cluster_rows), 2)
    after_capped = round(sum(to_float(row["cappedTopicPoint"]) for row in cluster_rows), 2)

    return {
        "artist": artist,
        "sourceType": "blog",
        "sourceFile": basename(article_file),
        "outputClusterFile": output_cluster,
        "outputArticleFile": output_articles,
        "beforeArticleCount": len(rows),
        "excludedArticleCount": excluded_count,
        "keptArticleCount": len(kept_rows),
        "beforeRawPointSum": round(before_point, 2),
        "afterRawPointSum": after_raw,
        "afterCappedPointSum": after_capped,
    }


def main():
    if not os.path.exists(RANKING_JSON_FILE):
        print(f"{RANKING_JSON_FILE} 파일이 없습니다.")
        print("먼저 py naver_fandex_export_v3_json.py 를 실행하세요.")
        return

    exact_keys, title_keys = load_exclude_keys()

    if exact_keys is None:
        return

    ranking_data = read_json(RANKING_JSON_FILE)
    ranking_items = ranking_data.get("ranking", [])

    if not ranking_items:
        print("랭킹 JSON 안에 ranking 데이터가 없습니다.")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_rows = []

    print()
    print("네이버 FANDEX quality blocklist 적용 v3 시작")
    print(f"exclude key 수: {len(exact_keys)}")
    print()

    for item in ranking_items:
        artist = item.get("artist", "")

        news_article_file = find_news_article_file(artist, item)
        blog_article_file = find_blog_article_file(artist, item)

        print(f"[{artist}]")

        if news_article_file:
            news_summary = rebuild_news_cluster(
                artist=artist,
                article_file=news_article_file,
                exact_keys=exact_keys,
                title_keys=title_keys,
                stamp=stamp,
            )
            summary_rows.append(news_summary)

            print(
                f"- 뉴스: {news_summary['beforeArticleCount']}개 중 "
                f"{news_summary['excludedArticleCount']}개 제외 → "
                f"최종 {news_summary['afterCappedPointSum']}점"
            )
        else:
            print("- 뉴스 article 파일 없음")

        if blog_article_file:
            blog_summary = rebuild_blog_cluster(
                artist=artist,
                article_file=blog_article_file,
                exact_keys=exact_keys,
                title_keys=title_keys,
                stamp=stamp,
            )
            summary_rows.append(blog_summary)

            print(
                f"- 블로그: {blog_summary['beforeArticleCount']}개 중 "
                f"{blog_summary['excludedArticleCount']}개 제외 → "
                f"최종 {blog_summary['afterCappedPointSum']}점"
            )
        else:
            print("- 블로그 article 파일 없음")

        print()

    summary_file = f"naver_quality_applied_v3_summary_{stamp}.csv"
    latest_file_name = "naver_quality_applied_v3_summary_latest.csv"

    fieldnames = [
        "artist",
        "sourceType",
        "sourceFile",
        "outputClusterFile",
        "outputArticleFile",
        "beforeArticleCount",
        "excludedArticleCount",
        "keptArticleCount",
        "beforeRawPointSum",
        "afterRawPointSum",
        "afterCappedPointSum",
    ]

    write_csv(summary_file, summary_rows, fieldnames)
    write_csv(latest_file_name, summary_rows, fieldnames)

    print("quality blocklist 적용 완료")
    print(f"요약 파일: {summary_file}")
    print(f"요약 최신: {latest_file_name}")
    print()
    print("다음 단계:")
    print("py naver_fandex_final_score_v3_batch.py")
    print("py naver_fandex_ranking_v3.py")


if __name__ == "__main__":
    main()