from pathlib import Path
from datetime import datetime
import shutil


HEALTH_CHECK = Path("fandex_python_health_check_v1.py")
BAT_FILE = Path("run_fandex_daily_python_only.bat")


def backup(path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = Path(f"{path.name}_backup_before_v7_health_bat_fix_{timestamp}")
    shutil.copy2(path, backup_path)
    return backup_path


def patch_health_check():
    if not HEALTH_CHECK.exists():
        print(f"SKIP 없음: {HEALTH_CHECK}")
        return False

    backup_path = backup(HEALTH_CHECK)
    text = HEALTH_CHECK.read_text(encoding="utf-8")

    changed = False

    replacements = [
        (
            "uncapped_cumulative_source_points",
            "uncapped_cumulative_source_points_with_youtube_v3",
        ),
        (
            "fandex_youtube_ranking_v2_latest.json",
            "fandex_youtube_ranking_v3_latest.json",
        ),
        (
            "fandex_youtube_artist_reports_v2_latest.json",
            "fandex_youtube_artist_reports_v3_latest.json",
        ),
    ]

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            changed = True

    HEALTH_CHECK.write_text(text, encoding="utf-8")

    print(f"health check 패치 완료: {HEALTH_CHECK}")
    print(f"백업: {backup_path}")
    return changed


def patch_bat():
    if not BAT_FILE.exists():
        print(f"SKIP 없음: {BAT_FILE}")
        return False

    backup_path = backup(BAT_FILE)
    lines = BAT_FILE.read_text(encoding="utf-8", errors="replace").splitlines()

    fixed = []
    changed = False

    for line in lines:
        stripped = line.strip()

        # errorlevel 분기에서 echo가 빠진 문장 방지
        if stripped.startswith("FANDEX ") and not stripped.lower().startswith("echo "):
            leading = line[: len(line) - len(line.lstrip())]
            fixed.append(leading + "echo " + stripped)
            changed = True
            continue

        fixed.append(line)

    BAT_FILE.write_text("\n".join(fixed) + "\n", encoding="utf-8")

    print(f"bat 패치 완료: {BAT_FILE}")
    print(f"백업: {backup_path}")
    return changed


def main():
    print()
    print("Patch v7 health check and batch error message")
    print("=" * 70)

    patch_health_check()
    patch_bat()

    print()
    print("=" * 70)
    print("패치 완료")
    print("=" * 70)
    print()
    print("다음 실행:")
    print("py fandex_python_health_check_v1.py")
    print("run_fandex_daily_python_only.bat")


if __name__ == "__main__":
    main()