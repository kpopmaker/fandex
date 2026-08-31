import csv
import os
from datetime import datetime


AUDIT_FILE = "naver_data_quality_audit_v3_latest.csv"


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


def split_reason_codes(value):
    return [
        item.strip()
        for item in str(value or "").split(",")
        if item.strip()
    ]


def add_stat(stats, key, row):
    if key not in stats:
        stats[key] = {
            "reasonCode": key,
            "totalCount": 0,
            "highCount": 0,
            "mediumCount": 0,
            "lowCount": 0,
            "newsCount": 0,
            "blogCount": 0,
            "originalPointSum": 0.0,
            "artists": {},
            "sampleTitles": [],
        }

    item = stats[key]

    item["totalCount"] += 1
    item["originalPointSum"] += to_float(row.get("originalPoint", 0))

    level = row.get("auditLevel", "")
    source_type = row.get("sourceType", "")
    artist = row.get("artist", "")
    title = row.get("title", "")

    if level == "high":
        item["highCount"] += 1
    elif level == "medium":
        item["mediumCount"] += 1
    else:
        item["lowCount"] += 1

    if source_type == "news":
        item["newsCount"] += 1
    elif source_type == "blog":
        item["blogCount"] += 1

    if artist:
        item["artists"][artist] = item["artists"].get(artist, 0) + 1

    if title and len(item["sampleTitles"]) < 5:
        item["sampleTitles"].append(title)


def build_reason_summary(rows):
    stats = {}

    for row in rows:
        for code in split_reason_codes(row.get("reasonCodes", "")):
            add_stat(stats, code, row)

    output = []

    for code, item in stats.items():
        artist_pairs = sorted(
            item["artists"].items(),
            key=lambda x: x[1],
            reverse=True,
        )

        top_artists = " / ".join([
            f"{artist}:{count}"
            for artist, count in artist_pairs[:6]
        ])

        output.append({
            "reasonCode": code,
            "totalCount": item["totalCount"],
            "highCount": item["highCount"],
            "mediumCount": item["mediumCount"],
            "lowCount": item["lowCount"],
            "newsCount": item["newsCount"],
            "blogCount": item["blogCount"],
            "originalPointSum": round(item["originalPointSum"], 2),
            "topArtists": top_artists,
            "sampleTitles": " / ".join(item["sampleTitles"]),
        })

    output.sort(
        key=lambda row: (
            int(row["highCount"]),
            int(row["totalCount"]),
            float(row["originalPointSum"]),
        ),
        reverse=True,
    )

    return output


def build_artist_reason_summary(rows):
    stats = {}

    for row in rows:
        artist = row.get("artist", "")
        source_type = row.get("sourceType", "")
        level = row.get("auditLevel", "")

        for code in split_reason_codes(row.get("reasonCodes", "")):
            key = (artist, source_type, code)

            if key not in stats:
                stats[key] = {
                    "artist": artist,
                    "sourceType": source_type,
                    "reasonCode": code,
                    "totalCount": 0,
                    "highCount": 0,
                    "mediumCount": 0,
                    "lowCount": 0,
                    "originalPointSum": 0.0,
                    "sampleTitles": [],
                }

            item = stats[key]
            item["totalCount"] += 1
            item["originalPointSum"] += to_float(row.get("originalPoint", 0))

            if level == "high":
                item["highCount"] += 1
            elif level == "medium":
                item["mediumCount"] += 1
            else:
                item["lowCount"] += 1

            title = row.get("title", "")
            if title and len(item["sampleTitles"]) < 3:
                item["sampleTitles"].append(title)

    output = []

    for key, item in stats.items():
        output.append({
            "artist": item["artist"],
            "sourceType": item["sourceType"],
            "reasonCode": item["reasonCode"],
            "totalCount": item["totalCount"],
            "highCount": item["highCount"],
            "mediumCount": item["mediumCount"],
            "lowCount": item["lowCount"],
            "originalPointSum": round(item["originalPointSum"], 2),
            "sampleTitles": " / ".join(item["sampleTitles"]),
        })

    output.sort(
        key=lambda row: (
            row["artist"],
            row["sourceType"],
            int(row["highCount"]),
            int(row["totalCount"]),
        ),
        reverse=False,
    )

    return output


def main():
    if not os.path.exists(AUDIT_FILE):
        print(f"{AUDIT_FILE} 파일이 없습니다.")
        print("먼저 py naver_data_quality_audit_v3.py 를 실행하세요.")
        return

    rows = read_csv(AUDIT_FILE)

    if not rows:
        print("감사 데이터가 없습니다.")
        return

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    reason_rows = build_reason_summary(rows)
    artist_reason_rows = build_artist_reason_summary(rows)

    reason_file = f"naver_quality_reason_summary_v3_{now}.csv"
    reason_latest = "naver_quality_reason_summary_v3_latest.csv"

    artist_reason_file = f"naver_quality_artist_reason_summary_v3_{now}.csv"
    artist_reason_latest = "naver_quality_artist_reason_summary_v3_latest.csv"

    reason_fieldnames = [
        "reasonCode",
        "totalCount",
        "highCount",
        "mediumCount",
        "lowCount",
        "newsCount",
        "blogCount",
        "originalPointSum",
        "topArtists",
        "sampleTitles",
    ]

    artist_reason_fieldnames = [
        "artist",
        "sourceType",
        "reasonCode",
        "totalCount",
        "highCount",
        "mediumCount",
        "lowCount",
        "originalPointSum",
        "sampleTitles",
    ]

    write_csv(reason_file, reason_rows, reason_fieldnames)
    write_csv(reason_latest, reason_rows, reason_fieldnames)

    write_csv(artist_reason_file, artist_reason_rows, artist_reason_fieldnames)
    write_csv(artist_reason_latest, artist_reason_rows, artist_reason_fieldnames)

    print()
    print("품질 감사 reason 요약 v3 생성 완료")
    print(f"전체 reason 요약: {reason_file}")
    print(f"전체 reason 최신: {reason_latest}")
    print(f"아티스트별 reason 요약: {artist_reason_file}")
    print(f"아티스트별 reason 최신: {artist_reason_latest}")
    print()
    print("상위 reason 미리보기")

    for row in reason_rows[:20]:
        print(
            f"- {row['reasonCode']}: "
            f"total {row['totalCount']} / "
            f"high {row['highCount']} / "
            f"news {row['newsCount']} / "
            f"blog {row['blogCount']} / "
            f"point {row['originalPointSum']}"
        )


if __name__ == "__main__":
    main()