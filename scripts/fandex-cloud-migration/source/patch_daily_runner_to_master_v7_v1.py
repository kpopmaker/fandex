from pathlib import Path
from datetime import datetime
import shutil


TARGETS = [
    Path("fandex_daily_python_only_v1.py"),
    Path("fandex_publish_python_only_v1.py"),
]

HEALTH_CHECK = Path("fandex_python_health_check_v1.py")


REPLACEMENTS = [
    ("youtube_publish_v2.py", "youtube_publish_v3.py"),
    ("fandex_master_score_v6.py", "fandex_master_score_v7.py"),
    ("YouTube v2 점수 생성", "YouTube v3 점수 생성"),
    ("FANDEX master v6 생성", "FANDEX master v7 생성"),
    ("master v6", "master v7"),
    ("YouTube v2", "YouTube v3"),
    ("fandex_master_v6_music_chart_uncapped_cumulative", "fandex_master_v7_youtube_v3_uncapped_cumulative"),
]


def patch_file(path):
    if not path.exists():
        print(f"SKIP 없음: {path}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{path.name}_backup_before_v7_patch_{timestamp}")

    shutil.copy2(path, backup)

    text = path.read_text(encoding="utf-8")

    changed = False

    for old, new in REPLACEMENTS:
        if old in text:
            text = text.replace(old, new)
            changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
        print(f"PATCH 완료: {path}")
        print(f"백업: {backup}")
    else:
        print(f"변경 없음: {path}")
        print(f"백업만 생성: {backup}")

    return changed


def patch_health_check():
    path = HEALTH_CHECK

    if not path.exists():
        print(f"SKIP health check 없음: {path}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{path.name}_backup_before_v7_patch_{timestamp}")

    shutil.copy2(path, backup)

    text = path.read_text(encoding="utf-8")

    replacements = [
        ("fandex_master_v6_music_chart_uncapped_cumulative", "fandex_master_v7_youtube_v3_uncapped_cumulative"),
        ("master v6", "master v7"),
        ("v6", "v7"),
    ]

    changed = False

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
        print(f"PATCH 완료: {path}")
        print(f"백업: {backup}")
    else:
        print(f"변경 없음: {path}")
        print(f"백업만 생성: {backup}")

    return changed


def main():
    print()
    print("Patch daily runner to master v7")
    print("=" * 70)

    changed_count = 0

    for target in TARGETS:
        if patch_file(target):
            changed_count += 1

    if patch_health_check():
        changed_count += 1

    print()
    print("=" * 70)
    print("v7 runner patch 완료")
    print("=" * 70)
    print(f"변경 파일 수: {changed_count}")
    print()
    print("다음 확인 명령:")
    print("findstr /n \"youtube_publish_v3 fandex_master_score_v7 master_v7\" fandex_daily_python_only_v1.py")
    print("findstr /n \"fandex_master_v7\" fandex_python_health_check_v1.py")


if __name__ == "__main__":
    main()