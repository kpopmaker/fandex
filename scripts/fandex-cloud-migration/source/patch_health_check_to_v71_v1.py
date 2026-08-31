from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path("fandex_python_health_check_v1.py")


def main():
    print()
    print("Patch health check to v7.1 daily v2 stale decay")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_v71_stale_decay_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8", errors="replace")

    required_files_to_add = [
        "fandex_daily_python_only_v2.py",
        "music_chart_seed_freshness_audit_v1.py",
        "music_chart_apply_stale_decay_v1.py",
    ]

    changed = False

    for filename in required_files_to_add:
        if filename not in text:
            marker = '"fandex_daily_python_only_v1.py",'
            replacement = marker + f'\n        "{filename}",'
            if marker in text:
                text = text.replace(marker, replacement)
                changed = True
            else:
                print(f"주의: 삽입 기준 marker를 찾지 못함: {marker}")

    if "fandex_daily_python_only_v2_stale_decay_no_site_export" not in text:
        old_phrase = "Python-only 운영 상태 정상"
        new_phrase = "Python-only v7.1 stale decay 운영 상태 정상"
        if old_phrase in text:
            text = text.replace(old_phrase, new_phrase)
            changed = True

    TARGET.write_text(text, encoding="utf-8")

    print(f"패치 완료: {TARGET}")
    print(f"백업: {backup}")
    print(f"변경 여부: {changed}")
    print()
    print("다음 실행:")
    print("py fandex_python_health_check_v1.py")


if __name__ == "__main__":
    main()