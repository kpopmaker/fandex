import csv
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "apply_artist_expansion_targets_to_artist_list_v1"

TARGETS_CSV = Path("artist_expansion_targets_v1.csv")
ARTIST_LIST = Path("artist_list.txt")
REPORT = Path("FANDEX_ARTIST_LIST_EXPANSION_APPLY_REPORT.txt")


def read_targets():
    if not TARGETS_CSV.exists():
        raise SystemExit(f"파일이 없습니다: {TARGETS_CSV}")

    with open(TARGETS_CSV, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    targets = []

    for row in rows:
        artist = str(row.get("artist", "")).strip()
        status = str(row.get("status", "")).strip().lower()

        if artist and status in ["proposed", "approved", ""]:
            targets.append({
                "artist": artist,
                "englishName": row.get("englishName", ""),
                "priority": row.get("priority", ""),
                "type": row.get("type", ""),
                "reason": row.get("reason", ""),
            })

    return targets


def read_artist_list():
    if not ARTIST_LIST.exists():
        return []

    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def write_artist_list(artists):
    ARTIST_LIST.write_text("\n".join(artists) + "\n", encoding="utf-8")


def main():
    import sys

    apply_mode = "--apply" in sys.argv
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")

    print()
    print("Apply artist expansion targets to artist_list")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    current_artists = read_artist_list()
    targets = read_targets()

    current_set = set(current_artists)

    to_add = []
    skipped = []

    for item in targets:
        artist = item["artist"]

        if artist in current_set:
            skipped.append(item)
        else:
            to_add.append(item)

    new_artist_list = current_artists + [item["artist"] for item in to_add]

    lines = []
    lines.append("FANDEX Artist List Expansion Apply Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now.isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append(f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}")
    lines.append("websitePublicDataTouched: FALSE")
    lines.append("")
    lines.append("현재 artist_list")
    lines.append("-" * 70)

    for artist in current_artists:
        lines.append(f"- {artist}")

    lines.append("")
    lines.append("추가 예정 artist")
    lines.append("-" * 70)

    if to_add:
        for item in to_add:
            lines.append(
                f"- {item['artist']} / {item['englishName']} / "
                f"priority={item['priority']} / {item['type']} / {item['reason']}"
            )
    else:
        lines.append("없음")

    lines.append("")
    lines.append("중복으로 스킵")
    lines.append("-" * 70)

    if skipped:
        for item in skipped:
            lines.append(f"- {item['artist']}")
    else:
        lines.append("없음")

    lines.append("")
    lines.append("반영 후 artist_list preview")
    lines.append("-" * 70)

    for artist in new_artist_list:
        lines.append(f"- {artist}")

    if apply_mode:
        backup = Path(f"artist_list_backup_before_expansion_{timestamp}.txt")
        if ARTIST_LIST.exists():
            shutil.copy2(ARTIST_LIST, backup)

        write_artist_list(new_artist_list)

        lines.append("")
        lines.append("APPLY 결과")
        lines.append("-" * 70)
        lines.append(f"artist_list updated: {ARTIST_LIST}")
        lines.append(f"backup: {backup}")
        lines.append(f"old count: {len(current_artists)}")
        lines.append(f"new count: {len(new_artist_list)}")
        lines.append(f"added count: {len(to_add)}")
    else:
        lines.append("")
        lines.append("DRY-RUN 결과")
        lines.append("-" * 70)
        lines.append("artist_list.txt는 아직 수정하지 않았습니다.")
        lines.append("실제 반영:")
        lines.append("py apply_artist_expansion_targets_to_artist_list_v1.py --apply")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print("현재 artist 수:", len(current_artists))
    print("추가 예정 수:", len(to_add))
    print("반영 후 artist 수:", len(new_artist_list))
    print()

    if to_add:
        print("추가 예정:")
        for item in to_add:
            print(f"- {item['artist']}")

    print()
    print("=" * 70)

    if apply_mode:
        print("artist_list 확장 APPLY 완료")
    else:
        print("artist_list 확장 DRY-RUN 완료")

    print("=" * 70)
    print(f"리포트: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_ARTIST_LIST_EXPANSION_APPLY_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()