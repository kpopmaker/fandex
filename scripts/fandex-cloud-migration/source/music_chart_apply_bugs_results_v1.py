import csv
import shutil
from datetime import datetime
from pathlib import Path


SEED_FILE = Path("music_chart_seed_v1.csv")
RESULT_PATTERN = "music_chart_collect_bugs_v1_results_*.csv"


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def clean(value):
    return (value or "").strip()


def latest_result_file():
    files = sorted(Path(".").glob(RESULT_PATTERN), key=lambda p: p.stat().st_mtime)

    if not files:
        raise SystemExit("벅스 수집 결과 CSV를 찾지 못했습니다.")

    return files[-1]


def main():
    if not SEED_FILE.exists():
        raise SystemExit("music_chart_seed_v1.csv 파일이 없습니다.")

    result_file = latest_result_file()
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    today = datetime.now().strftime("%Y-%m-%d")

    seed_rows = read_csv(SEED_FILE)
    result_rows = read_csv(result_file)

    backup_file = Path(f"music_chart_seed_v1_backup_before_bugs_apply_{now}.csv")
    shutil.copy2(SEED_FILE, backup_file)

    result_map = {}

    for row in result_rows:
        key = (
            clean(row.get("artist")),
            clean(row.get("platform")).lower(),
            clean(row.get("targetTrackTitle")),
        )

        result_map[key] = row

    updated_rows = []
    changed_count = 0

    for row in seed_rows:
        new_row = dict(row)

        key = (
            clean(row.get("artist")),
            clean(row.get("platform")).lower(),
            clean(row.get("trackTitle")),
        )

        if clean(row.get("platform")).lower() == "bugs" and key in result_map:
            result = result_map[key]
            status = clean(result.get("status"))

            if status == "matched":
                new_row["rank"] = clean(result.get("matchedRank"))
                new_row["chartDate"] = today
                new_row["chartType"] = clean(new_row.get("chartType")) or "realtime"
                new_row["memo"] = (
                    f"auto_collected_bugs_v1; "
                    f"resultFile={result_file.name}; "
                    f"matchedTrack={clean(result.get('matchedTrackTitle'))}; "
                    f"matchedArtist={clean(result.get('matchedArtist'))}"
                )
                changed_count += 1

            elif status == "not_found":
                new_row["rank"] = ""
                new_row["chartDate"] = today
                new_row["chartType"] = clean(new_row.get("chartType")) or "realtime"
                new_row["memo"] = (
                    f"auto_collected_bugs_v1_not_found; "
                    f"resultFile={result_file.name}; "
                    f"previousRankCleared=TRUE"
                )
                changed_count += 1

        updated_rows.append(new_row)

    fieldnames = list(seed_rows[0].keys())
    write_csv(SEED_FILE, updated_rows, fieldnames)

    print()
    print("Bugs 수집 결과 seed 반영 완료")
    print("=" * 60)
    print(f"사용한 결과 파일: {result_file}")
    print(f"백업 파일: {backup_file}")
    print(f"수정 행 수: {changed_count}")
    print()
    print("반영 내용:")
    for row in updated_rows:
        if clean(row.get("platform")).lower() == "bugs":
            print(
                f"- {row.get('artist')} / {row.get('trackTitle')} / "
                f"rank={row.get('rank') or '없음'} / memo={row.get('memo')}"
            )


if __name__ == "__main__":
    main()