import glob
import os
import re
from datetime import datetime


DERIVED_KEYWORDS = [
    "_primary",
    "_scored",
    "_sentiment",
    "_review",
    "_issue",
    "_cluster",
    "_articles",
    "_topic",
    "_final",
    "_cumulative",
    "_ranking",
    "_status",
    "_log",
    "_summary",
]


def basename(path):
    return os.path.basename(path) if path else ""


def get_mtime(path):
    if not path or not os.path.exists(path):
        return 0
    return os.path.getmtime(path)


def get_mtime_text(path):
    if not path or not os.path.exists(path):
        return ""
    return datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")


def has_any_keyword(filename, keywords):
    return any(keyword in filename for keyword in keywords)


def latest_file(pattern, exclude_keywords=None, include_keywords=None):
    exclude_keywords = exclude_keywords or []
    include_keywords = include_keywords or []

    files = glob.glob(pattern)
    candidates = []

    for file in files:
        name = os.path.basename(file)

        if include_keywords and not all(keyword in name for keyword in include_keywords):
            continue

        if exclude_keywords and has_any_keyword(name, exclude_keywords):
            continue

        candidates.append(file)

    if not candidates:
        return None

    return max(candidates, key=os.path.getmtime)


def find_latest_news_raw(artist):
    return latest_file(
        f"naver_news_{artist}_*.csv",
        exclude_keywords=DERIVED_KEYWORDS,
    )


def find_latest_blog_raw(artist):
    return latest_file(
        f"naver_blog_{artist}_*.csv",
        exclude_keywords=DERIVED_KEYWORDS,
    )


def find_latest_trend_raw(artist):
    return latest_file(
        f"naver_search_trend_{artist}_*.csv",
        exclude_keywords=[
            "_scored",
            "_review",
            "_cumulative",
            "_final",
            "_ranking",
            "_status",
            "_log",
            "_summary",
        ],
    )


def find_latest_news_scored(artist):
    return latest_file(
        f"naver_news_{artist}_*_scored.csv",
        exclude_keywords=[
            "_sentiment",
            "_review",
            "_issue",
            "_cluster",
            "_articles",
            "_final",
            "_cumulative",
        ],
    )


def find_latest_blog_scored(artist):
    return latest_file(
        f"naver_blog_{artist}_*_scored.csv",
        exclude_keywords=[
            "_topic",
            "_cluster",
            "_articles",
            "_final",
            "_cumulative",
            "_review",
        ],
    )


def find_latest_news_sentiment_scored(artist):
    return latest_file(
        f"naver_news_{artist}_*_sentiment_scored.csv",
        exclude_keywords=[
            "_review",
            "_issue",
            "_cluster",
            "_articles",
            "_final",
            "_cumulative",
        ],
    )


def find_latest_news_issue_cluster(artist):
    return latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_keywords=[
            "_articles",
            "_primary",
            "_scored",
        ],
    )


def find_latest_blog_topic_cluster(artist):
    return latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_keywords=[
            "_articles",
            "_primary",
            "_scored",
        ],
    )


def find_latest_final_v2(artist):
    return latest_file(
        f"naver_fandex_final_v2_{artist}_*.csv",
        exclude_keywords=[],
    )


def print_file(label, path):
    if path:
        print(f"- {label}: {basename(path)} / {get_mtime_text(path)}")
    else:
        print(f"- {label}: 없음")


def debug_artist_files(artist):
    print()
    print(f"[{artist}] 파일 선택 결과")
    print_file("뉴스 원본", find_latest_news_raw(artist))
    print_file("블로그 원본", find_latest_blog_raw(artist))
    print_file("검색트렌드 원본", find_latest_trend_raw(artist))
    print_file("뉴스 중심성 scored", find_latest_news_scored(artist))
    print_file("블로그 중심성 scored", find_latest_blog_scored(artist))
    print_file("뉴스 감성 scored", find_latest_news_sentiment_scored(artist))
    print_file("뉴스 이슈 묶음", find_latest_news_issue_cluster(artist))
    print_file("블로그 주제 묶음", find_latest_blog_topic_cluster(artist))
    print_file("최종 final v2", find_latest_final_v2(artist))