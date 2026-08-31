from pathlib import Path

path = Path("naver_fandex_final_score_v3.py")
text = path.read_text(encoding="utf-8-sig")

old_func = '''def find_news_issue_cluster_file(artist):
    quality_file = find_quality_applied_cluster_file(artist, "news")

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )


def find_blog_topic_cluster_file(artist):
    quality_file = find_quality_applied_cluster_file(artist, "blog")

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )
'''

new_func = '''def has_quality_filter_version(path):
    try:
        rows = read_csv(path)
        if not rows:
            return False

        first = rows[0]
        return "qualityFilterVersion" in first
    except Exception:
        return False


def find_latest_quality_cluster_by_pattern(pattern):
    files = glob.glob(pattern)
    files = [
        file for file in files
        if "_articles" not in os.path.basename(file)
        and "_primary" not in os.path.basename(file)
        and "_scored" not in os.path.basename(file)
    ]

    quality_files = [
        file for file in files
        if has_quality_filter_version(file)
    ]

    if not quality_files:
        return None

    return max(quality_files, key=os.path.getmtime)


def find_news_issue_cluster_file(artist):
    quality_file = find_quality_applied_cluster_file(artist, "news")

    if quality_file and os.path.exists(quality_file):
        return quality_file

    quality_file = find_latest_quality_cluster_by_pattern(
        f"naver_news_{artist}_*_issue_cluster.csv"
    )

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_news_{artist}_*_issue_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )


def find_blog_topic_cluster_file(artist):
    quality_file = find_quality_applied_cluster_file(artist, "blog")

    if quality_file and os.path.exists(quality_file):
        return quality_file

    quality_file = find_latest_quality_cluster_by_pattern(
        f"naver_blog_{artist}_*_topic_cluster.csv"
    )

    if quality_file:
        return quality_file

    return latest_file(
        f"naver_blog_{artist}_*_topic_cluster.csv",
        exclude_words=["_articles", "_primary", "_scored"]
    )
'''

if old_func not in text:
    raise SystemExit("교체할 기존 함수를 찾지 못했습니다. naver_fandex_final_score_v3.py 내용을 확인해야 합니다.")

text = text.replace(old_func, new_func)

path.write_text(text, encoding="utf-8")
print("final v3 quality cluster picker 패치 완료")