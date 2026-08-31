import csv
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_apply_melon_genie_fallback_v1"

SEED_FILE = Path("music_chart_seed_v1.csv")
RESULT_FILE = Path("music_chart_collect_melon_genie_fallback_v1_results_latest.csv")


def normalize(value):
    return str(value or "").strip().lower()


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def make_key(row):
    return (
        normalize(row.get("artist")),
        normalize(row.get("platform")),
        normalize(row.get("chartName")),
        normalize(row.get("trackTitle")),
    )


def main():
    import sys

    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Melon/Genie fallback 결과 seed 반영")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}")
    print()

    seed_rows = read_csv(SEED_FILE)
    result_rows = read_csv(RESULT_FILE)

    ok_results = [row for row in result_rows if row.get("status") == "OK"]

    result_map = {}
    for row in ok_results:
        result_map[make_key(row)] = row

    updated_rows = []
    changed = []

    for row in seed_rows:
        new_row = dict(row)
        key = make_key(row)
        result = result_map.get(key)

        if result:
            old_rank = row.get("rank", "")
            old_date = row.get("chartDate", "")
            old_memo = row.get("memo", "")

            new_rank = result.get("rank", "")
            new_date = result.get("chartDate", "")
            matched_track = result.get("matchedTrack", "")
            matched_artist = result.get("matchedArtist", "")
            source_url = result.get("sourceUrl", "")
            memo = result.get("memo", "")

            new_row["rank"] = new_rank
            new_row["chartDate"] = new_date
            new_row["memo"] = (
                f"{memo}; "
                f"resultFile={RESULT_FILE}; "
                f"matchedTrack={matched_track}; "
                f"matchedArtist={matched_artist}; "
                f"sourceUrl={source_url}; "
                f"previousRank={old_rank}; "
                f"previousDate={old_date}; "
                f"previousMemo={old_memo}"
            )

            changed.append({
                "artist": row.get("artist", ""),
                "platform": row.get("platform", ""),
                "chartName": row.get("chartName", ""),
                "trackTitle": row.get("trackTitle", ""),
                "oldRank": old_rank,
                "newRank": new_rank,
                "oldDate": old_date,
                "newDate": new_date,
                "matchedTrack": matched_track,
                "matchedArtist": matched_artist,
            })

        updated_rows.append(new_row)

    print("반영 예정")
    print("-" * 70)

    if not changed:
        print("반영할 OK 결과가 없습니다.")
    else:
        for item in changed:
            print(
                f"- {item['artist']} / {item['platform']} / {item['trackTitle']} | "
                f"rank {item['oldRank']} → {item['newRank']} | "
                f"date {item['oldDate']} → {item['newDate']} | "
                f"matched={item['matchedTrack']} / {item['matchedArtist']}"
            )

    preview_file = Path(f"music_chart_seed_v1_melon_genie_apply_preview_{timestamp}.csv")
    fieldnames = list(seed_rows[0].keys()) if seed_rows else []

    write_csv(preview_file, updated_rows, fieldnames)

    print()
    print(f"preview 파일: {preview_file}")

    if not apply_mode:
        print()
        print("DRY-RUN 완료. 원본 seed는 아직 수정하지 않았습니다.")
        print("실제 반영하려면:")
        print("py music_chart_apply_melon_genie_fallback_v1.py --apply")
        return

    backup_file = Path(f"music_chart_seed_v1_backup_before_melon_genie_apply_{timestamp}.csv")
    shutil.copy2(SEED_FILE, backup_file)

    write_csv(SEED_FILE, updated_rows, fieldnames)

    print()
    print("=" * 70)
    print("Melon/Genie fallback 결과 seed 반영 완료")
    print("=" * 70)
    print(f"백업 파일: {backup_file}")
    print(f"수정 행 수: {len(changed)}")
    print()
    print("다음 실행:")
    print("py music_chart_publish_v1.py")
    print("py fandex_master_score_v7.py")
    print("py fandex_python_health_check_v1.py")


if __name__ == "__main__":
    main()