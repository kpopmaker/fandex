from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path("fandex_python_status_report_v1.py")


def main():
    print()
    print("Patch status report command guide to daily v2")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_daily_v2_command_guide_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8", errors="replace")

    replacements = [
        ("py fandex_daily_python_only_v1.py --refresh-youtube", "py fandex_daily_python_only_v2.py --refresh-youtube"),
        ("py fandex_daily_python_only_v1.py --skip-bugs", "py fandex_daily_python_only_v2.py --skip-bugs"),
        ("py fandex_daily_python_only_v1.py", "py fandex_daily_python_only_v2.py"),
        ("Python 내부 전체 갱신:", "Python 내부 전체 갱신 v2:"),
    ]

    changed = False

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new)
            changed = True

    TARGET.write_text(text, encoding="utf-8")

    print(f"패치 완료: {TARGET}")
    print(f"백업: {backup}")
    print(f"변경 여부: {changed}")
    print()
    print("다음 실행:")
    print("py fandex_python_status_report_v1.py")
    print("powershell -NoProfile -Command \"Get-Content .\\fandex_python_status_report_latest.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()