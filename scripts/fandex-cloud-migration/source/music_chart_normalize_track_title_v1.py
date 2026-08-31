import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path


SEED_FILE = Path("music_chart_seed_v1.csv")

TARGET_ARTIST = "르세라핌"
CANONICAL_TITLE = "SPAGHETTI (feat. j-hope of BTS)"


def normalize(value):
    text = str(value or "").replace("\xa0", " ")
    return " ".join(text.split()).casefold()


def main():
    if not SEED_FILE.exists():
        print(f"ERROR: 파일이 없습니다: {SEED_FILE}")
        return 1

    with SEED_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    if not fieldnames:
        print("ERROR: CSV 헤더를 확인할 수 없습니다.")
        return 1

    matched = 0
    changed = 0

    for row in rows:
        artist = row.get("artist", "")
        title = row.get("trackTitle", "")

        if normalize(artist) != normalize(TARGET_ARTIST):
            continue

        if normalize(title) != normalize(CANONICAL_TITLE):
            continue

        matched += 1

        if title != CANONICAL_TITLE:
            print(f"수정: {title}")
            print(f"   → {CANONICAL_TITLE}")
            row["trackTitle"] = CANONICAL_TITLE
            changed += 1

    if matched != 2:
        print()
        print(f"ERROR: 대상 행이 2개여야 하지만 {matched}개입니다.")
        print("원본 seed는 수정하지 않았습니다.")
        return 1

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = Path(
        f"music_chart_seed_v1_backup_before_title_normalize_"
        f"{timestamp}.csv"
    )

    shutil.copy2(SEED_FILE, backup_file)

    with SEED_FILE.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)

    print()
    print("=" * 72)
    print("곡명 표기 통일 완료")
    print("=" * 72)
    print(f"대상 행: {matched}")
    print(f"수정 행: {changed}")
    print(f"백업 파일: {backup_file}")
    print(f"통일 곡명: {CANONICAL_TITLE}")

    return 0


if __name__ == "__main__":
    sys.exit(main())