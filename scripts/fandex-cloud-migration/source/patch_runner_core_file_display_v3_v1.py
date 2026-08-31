from pathlib import Path
from datetime import datetime
import shutil


BAT_FILE = Path("run_fandex_daily_python_only.bat")


def main():
    print()
    print("Patch runner core file display to YouTube v3")
    print("=" * 70)

    if not BAT_FILE.exists():
        raise SystemExit(f"파일 없음: {BAT_FILE}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{BAT_FILE.name}_backup_before_core_display_v3_{timestamp}")
    shutil.copy2(BAT_FILE, backup)

    text = BAT_FILE.read_text(encoding="utf-8", errors="replace")

    replacements = [
        ("fandex_youtube_ranking_v2_latest.json", "fandex_youtube_ranking_v3_latest.json"),
        ("fandex_youtube_artist_reports_v2_latest.json", "fandex_youtube_artist_reports_v3_latest.json"),
    ]

    changed = False

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            changed = True

    BAT_FILE.write_text(text, encoding="utf-8")

    print(f"패치 완료: {BAT_FILE}")
    print(f"백업: {backup}")
    print(f"변경 여부: {changed}")
    print()
    print("확인:")
    print('findstr /n "fandex_youtube_ranking_v3_latest fandex_youtube_ranking_v2_latest" run_fandex_daily_python_only.bat')


if __name__ == "__main__":
    main()