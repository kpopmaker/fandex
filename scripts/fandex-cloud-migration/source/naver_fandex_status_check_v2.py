import csv
import glob
import os
from datetime import datetime


REQUIRED_STEPS = [
    {
        "step": "news_raw",
        "label": "뉴스 원본",
        "pattern": "naver_news_{artist}_*.csv",
        "exclude": [
            "_scored",
            "_primary",
            "_sentiment",
            "_review",
            "_issue",
            "_cluster",
            "_final",
            "_cumulative",
        ],
    },
    {
        "step": "blog_raw",
        "label": "블로그 원본",
        "pattern": "naver_blog_{artist}_*.csv",
        "exclude": [
            "_scored",
            "_primary",
            "_topic",
            "_cluster",
            "_final",
            "_cumulative",
            "_review",
        ],
    },
    {
        "step": "trend_raw",
        "label": "검색트렌드",
        "pattern": "naver_search_trend_{artist}_*.csv",
        "exclude": [
            "_scored",
            "_review",
            "_cumulative",
            "_final",
        ],
    },
    {
        "step": "news_scored",
        "label": "뉴스 중심성 필터",
        "pattern": "naver_news_{artist}_*_scored.csv",
        "exclude": [
            "_sentiment",
            "_review",
            "_issue",
            "_cluster",
            "_final",
            "_cumulative",
        ],
    },
    {
        "step": "blog_scored",
        "label": "블로그 중심성 필터",
        "pattern": "naver_blog_{artist}_*_scored.csv",
        "exclude": [
            "_topic",
            "_cluster",
            "_final",
            "_cumulative",
            "_review",
        ],
    },
    {
        "step": "news_sentiment",
        "label": "뉴스 감성 점수",
        "pattern": "naver_news_{artist}_*_sentiment_scored.csv",
        "exclude": [
            "_review",
            "_issue",
            "_cluster",
            "_final",
        ],
    },
    {
        "step": "news_issue_cluster",
        "label": "뉴스 이슈 묶음",
        "pattern": "naver_news_{artist}_*_issue_cluster.csv",
        "exclude": [
            "_articles",
        ],
    },
    {
        "step": "blog_topic_cluster",
        "label": "블로그 주제 묶음",
        "pattern": "naver_blog_{artist}_*_topic_cluster.csv",
        "exclude": [
            "_articles",
        ],
    },
    {
        "step": "final_v2",
        "label": "최종 점수 v2",
        "pattern": "naver_fandex_final_v2_{artist}_*.csv",
        "exclude": [],
    },
]


def read_artist_list():
    path = "artist_list.txt"

    if not os.path.exists(path):
        return []

    artists = []

    with open(path, "r", encoding="utf-8-sig") as f:
        for line in f:
            name = line.strip()
            if name:
                artists.append(name)

    return artists


def get_artists_from_files():
    artists = set()

    for file in glob.glob("naver_fandex_final_v2_*.csv"):
        name = os.path.basename(file)

        if not name.startswith("naver_fandex_final_v2_"):
            continue

        without_prefix = name.replace("naver_fandex_final_v2_", "")
        parts = without_prefix.split("_")

        if len(parts) >= 3:
            artist = "_".join(parts[:-2])
            artists.add(artist)

    return sorted(artists)


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


def file_time(path):
    if not path:
        return ""

    timestamp = os.path.getmtime(path)
    return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    artists = read_artist_list()

    if artists:
        print("artist_list.txt 기준으로 상태를 점검합니다.")
    else:
        artists = get_artists_from_files()
        print("artist_list.txt가 없어서 final_v2 파일 기준으로 상태를 점검합니다.")

    if not artists:
        print("점검할 아티스트가 없습니다.")
        print("artist_list.txt를 만들거나 final_v2 파일을 먼저 생성하세요.")
        return

    status_rows = []

    print()
    print("상태 점검 결과")
    print()

    for artist in artists:
        print(f"[{artist}]")

        missing_steps = []
        latest_final_file = None

        row = {
            "artist": artist,
        }

        for step in REQUIRED_STEPS:
            pattern = step["pattern"].format(artist=artist)
            file = latest_file(pattern, step["exclude"])

            exists = "Y" if file else "N"

            row[f"{step['step']}_exists"] = exists
            row[f"{step['step']}_file"] = os.path.basename(file) if file else ""
            row[f"{step['step']}_updatedAt"] = file_time(file)

            if step["step"] == "final_v2":
                latest_final_file = file

            if not file:
                missing_steps.append(step["label"])

            mark = "OK" if file else "MISSING"
            print(f"- {step['label']}: {mark}")

        if latest_final_file:
            row["pipelineStatus"] = "ready"
        else:
            row["pipelineStatus"] = "incomplete"

        row["missingSteps"] = " / ".join(missing_steps)

        status_rows.append(row)

        if missing_steps:
            print(f"  빠진 단계: {' / '.join(missing_steps)}")
        else:
            print("  전체 완료")

        print()

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"naver_fandex_status_v2_{now}.csv"

    fieldnames = ["artist", "pipelineStatus", "missingSteps"]

    for step in REQUIRED_STEPS:
        fieldnames.extend([
            f"{step['step']}_exists",
            f"{step['step']}_file",
            f"{step['step']}_updatedAt",
        ])

    write_csv(output_file, status_rows, fieldnames)

    print("상태 점검 파일 생성 완료")
    print(f"파일: {output_file}")


if __name__ == "__main__":
    main()