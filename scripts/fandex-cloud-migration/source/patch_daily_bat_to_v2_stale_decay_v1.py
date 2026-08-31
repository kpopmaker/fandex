from pathlib import Path
from datetime import datetime
import shutil


BAT_FILE = Path("run_fandex_daily_python_only.bat")


def main():
    print()
    print("Patch daily batch to python-only v2 stale decay")
    print("=" * 70)

    if not BAT_FILE.exists():
        raise SystemExit(f"파일 없음: {BAT_FILE}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{BAT_FILE.name}_backup_before_daily_v2_stale_decay_{timestamp}")
    shutil.copy2(BAT_FILE, backup)

    text = BAT_FILE.read_text(encoding="utf-8", errors="replace")

    text = text.replace("fandex_daily_python_only_v1.py", "fandex_daily_python_only_v2.py")
    text = text.replace("[1/4] Run daily python-only pipeline", "[1/4] Run daily python-only v2 pipeline")
    text = text.replace("FANDEX Daily Python-Only Runner", "FANDEX Daily Python-Only Runner v2")

    BAT_FILE.write_text(text, encoding="utf-8")

    print(f"패치 완료: {BAT_FILE}")
    print(f"백업: {backup}")
    print()
    print("확인:")
    print('findstr /n "fandex_daily_python_only_v2 fandex_daily_python_only_v1" run_fandex_daily_python_only.bat')


if __name__ == "__main__":
    main()