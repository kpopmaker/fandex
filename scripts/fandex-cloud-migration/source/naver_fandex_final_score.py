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


def find_news_issue_cluster_file(artist):
    return latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_words=["_articles"]
    )


def find_blog_topic_cluster_file(artist):
    return latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_words=["_articles"]
    )


def find_trend_file(artist):
    return latest_file(
        f"naver_search_trend_{artist}_*.csv",
        exclude_words=["_scored", "_review", "_cumulative", "_final"]
    )


def analyze_news_issue_cluster(rows):
    total = 0.0
    article_count = 0

    group_points = {}
    group_counts = {}
    top_issues = []

    for row in rows:
        issue_key = row.get("issueKey", "")
        issue_group = row.get("issueGroup", "")
        article_count += int(to_float(row.get("articleCount", 0)))

        point = to_float(row.get("cappedIssuePoint", 0))
        total += point

        group_points[issue_group] = group_points.get(issue_group, 0.0) + point
        group_counts[issue_group] = group_counts.get(issue_group, 0) + 1

        top_issues.append({
            "issueKey": issue_key,
            "issueGroup": issue_group,
            "articleCount": int(to_float(row.get("articleCount", 0))),
            "rawPointSum": round(to_float(row.get("rawPointSum", 0)), 2),
            "cappedIssuePoint": round(point, 2),
            "sampleTitles": row.get("sampleTitles", ""),
        })

    top_issues.sort(
        key=lambda row: abs(row["cappedIssuePoint"]),
        reverse=True
    )

    return {
        "newsIssueClusterPoint": round(total, 2),
        "newsIssueCount": len(rows),
        "newsArticleCount": article_count,
        "newsGroupPoints": group_points,
        "newsGroupCounts": group_counts,
        "topIssues": top_issues,
    }


def analyze_blog_topic_cluster(rows):
    total = 0.0
    post_count = 0

    group_points = {}
    group_counts = {}
    top_topics = []

    for row in rows:
        topic_key = row.get("topicKey", "")
        topic_group = row.get("topicGroup", "")
        post_count += int(to_float(row.get("postCount", 0)))

        point = to_float(row.get("cappedTopicPoint", 0))
        total += point

        group_points[topic_group] = group_points.get(topic_group, 0.0) + point
        group_counts[topic_group] = group_counts.get(topic_group, 0) + 1

        top_topics.append({
            "topicKey": topic_key,
            "topicGroup": topic_group,
            "postCount": int(to_float(row.get("postCount", 0))),
            "rawPointSum": round(to_float(row.get("rawPointSum", 0)), 2),
            "cappedTopicPoint": round(point, 2),
            "sampleTitles": row.get("sampleTitles", ""),
        })

    top_topics.sort(
        key=lambda row: abs(row["cappedTopicPoint"]),
        reverse=True
    )

    return {
        "blogTopicClusterPoint": round(total, 2),
        "blogTopicCount": len(rows),
        "blogPostCount": post_count,
        "blogGroupPoints": group_points,
        "blogGroupCounts": group_counts,
        "topTopics": top_topics,
    }


def analyze_trend(rows):
    sorted_rows = sorted(rows, key=lambda row: row.get("period", ""))

    ratios = []

    for row in sorted_rows:
        value = row.get("ratio", "")
        try:
            ratios.append(float(value))
        except ValueError:
            pass

    if not ratios:
        return {
            "searchDemandPoint": 0.0,
            "trendSum": 0.0,
            "trendAvg": 0.0,
            "trendMax": 0.0,
            "trendFirst": 0.0,
            "trendLatest": 0.0,
            "trendChange": 0.0,
        }

    trend_sum = sum(ratios)

    return {
        "searchDemandPoint": round(trend_sum / 10, 2),
        "trendSum": round(trend_sum, 2),
        "trendAvg": round(trend_sum / len(ratios), 2),
        "trendMax": round(max(ratios), 2),
        "trendFirst": round(ratios[0], 2),
        "trendLatest": round(ratios[-1], 2),
        "trendChange": round(ratios[-1] - ratios[0], 2),
    }


def main():
    artist = input("최종 네이버 누적점수를 계산할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    news_cluster_file = find_news_issue_cluster_file(artist)
    blog_cluster_file = find_blog_topic_cluster_file(artist)
    trend_file = find_trend_file(artist)

    print()
    print("사용할 파일:")
    print(f"- 뉴스 이슈 묶음: {news_cluster_file}")
    print(f"- 블로그 주제 묶음: {blog_cluster_file}")
    print(f"- 검색트렌드: {trend_file}")
    print()

    if not news_cluster_file or not blog_cluster_file or not trend_file:
        print("필요한 파일이 부족합니다.")
        print("아래 순서가 완료되어야 합니다.")
        print("1. py naver_collector.py")
        print("2. py naver_relevance_filter.py")
        print("3. py naver_fandex_cumulative_score.py")
        print("4. py naver_news_issue_cluster.py")
        print("5. py naver_blog_topic_cluster.py")
        return

    news_rows = read_csv(news_cluster_file)
    blog_rows = read_csv(blog_cluster_file)
    trend_rows = read_csv(trend_file)

    news = analyze_news_issue_cluster(news_rows)
    blog = analyze_blog_topic_cluster(blog_rows)
    trend = analyze_trend(trend_rows)

    final_point = (
        news["newsIssueClusterPoint"]
        + blog["blogTopicClusterPoint"]
        + trend["searchDemandPoint"]
    )

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    summary = {
        "artist": artist,
        "fandexNaverFinalPoint": round(final_point, 2),

        "newsIssueClusterPoint": news["newsIssueClusterPoint"],
        "newsIssueCount": news["newsIssueCount"],
        "newsArticleCount": news["newsArticleCount"],

        "blogTopicClusterPoint": blog["blogTopicClusterPoint"],
        "blogTopicCount": blog["blogTopicCount"],
        "blogPostCount": blog["blogPostCount"],

        "searchDemandPoint": trend["searchDemandPoint"],
        "trendSum": trend["trendSum"],
        "trendAvg": trend["trendAvg"],
        "trendMax": trend["trendMax"],
        "trendFirst": trend["trendFirst"],
        "trendLatest": trend["trendLatest"],
        "trendChange": trend["trendChange"],

        "dataStatus": "ready",
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "newsClusterFile": os.path.basename(news_cluster_file),
        "blogClusterFile": os.path.basename(blog_cluster_file),
        "trendFile": os.path.basename(trend_file),
    }

    for group, point in sorted(news["newsGroupPoints"].items()):
        summary[f"newsGroupPoint_{group}"] = round(point, 2)

    for group, count in sorted(news["newsGroupCounts"].items()):
        summary[f"newsGroupCount_{group}"] = count

    for group, point in sorted(blog["blogGroupPoints"].items()):
        summary[f"blogGroupPoint_{group}"] = round(point, 2)

    for group, count in sorted(blog["blogGroupCounts"].items()):
        summary[f"blogGroupCount_{group}"] = count

    summary_file = f"naver_fandex_final_{artist}_{now}.csv"
    issue_file = f"naver_fandex_final_{artist}_{now}_top_news_issues.csv"
    topic_file = f"naver_fandex_final_{artist}_{now}_top_blog_topics.csv"

    write_csv(summary_file, [summary], list(summary.keys()))

    issue_fieldnames = [
        "issueKey",
        "issueGroup",
        "articleCount",
        "rawPointSum",
        "cappedIssuePoint",
        "sampleTitles",
    ]

    topic_fieldnames = [
        "topicKey",
        "topicGroup",
        "postCount",
        "rawPointSum",
        "cappedTopicPoint",
        "sampleTitles",
    ]

    write_csv(issue_file, news["topIssues"], issue_fieldnames)
    write_csv(topic_file, blog["topTopics"], topic_fieldnames)

    print("최종 네이버 누적점수 계산 완료")
    print(f"아티스트: {artist}")
    print(f"최종 네이버 누적점수: {round(final_point, 2)}")
    print(f"- 뉴스 이슈 묶음 점수: {news['newsIssueClusterPoint']}")
    print(f"- 블로그 주제 묶음 점수: {blog['blogTopicClusterPoint']}")
    print(f"- 검색 수요 누적점수: {trend['searchDemandPoint']}")
    print()
    print(f"요약 파일: {summary_file}")
    print(f"상위 뉴스 이슈 파일: {issue_file}")
    print(f"상위 블로그 주제 파일: {topic_file}")
    print()

    print("상위 뉴스 이슈")
    for issue in news["topIssues"][:10]:
        print(
            f"- {issue['issueKey']}: "
            f"{issue['articleCount']}개 / "
            f"{issue['cappedIssuePoint']}점"
        )

    print()
    print("상위 블로그 주제")
    for topic in blog["topTopics"][:10]:
        print(
            f"- {topic['topicKey']}: "
            f"{topic['postCount']}개 / "
            f"{topic['cappedTopicPoint']}점"
        )


if __name__ == "__main__":
    main()