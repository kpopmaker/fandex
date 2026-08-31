import csv
import glob
import os


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def to_float(value):
    try:
        return float(value)
    except:
        return 0.0


def latest_file(pattern):
    files = glob.glob(pattern)
    files = [
        file for file in files
        if "_articles" not in os.path.basename(file)
        and "_primary" not in os.path.basename(file)
        and "_scored" not in os.path.basename(file)
    ]

    if not files:
        return None

    return max(files, key=os.path.getmtime)


def main():
    artist = input("블로그 주제를 확인할 아티스트명을 입력하세요: ").strip()

    if not artist:
        print("아티스트명을 입력해야 합니다.")
        return

    file = latest_file(f"naver_blog_{artist}_*_topic_cluster.csv")

    if not file:
        print("블로그 주제 묶음 파일이 없습니다.")
        return

    rows = read_csv(file)

    rows.sort(
        key=lambda row: to_float(row.get("cappedTopicPoint", 0)),
        reverse=True
    )

    print()
    print(f"[{artist}] 블로그 주제 점검")
    print(f"파일: {file}")
    print()

    total_raw = round(sum(to_float(row.get("rawPointSum", 0)) for row in rows), 2)
    total_capped = round(sum(to_float(row.get("cappedTopicPoint", 0)) for row in rows), 2)

    print(f"기존 블로그 점수 합계: {total_raw}")
    print(f"주제 묶음 적용 점수: {total_capped}")
    print()

    print("상위 40개 주제")
    print("-" * 120)

    for index, row in enumerate(rows[:40], start=1):
        topic_key = row.get("topicKey", "")
        topic_group = row.get("topicGroup", "")
        post_count = row.get("postCount", "")
        raw_point = row.get("rawPointSum", "")
        capped_point = row.get("cappedTopicPoint", "")

        print(
            f"{index:02d}. {topic_key} | "
            f"group={topic_group} | "
            f"posts={post_count} | "
            f"raw={raw_point} | "
            f"capped={capped_point}"
        )


if __name__ == "__main__":
    main()