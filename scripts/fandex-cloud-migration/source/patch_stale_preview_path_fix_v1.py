from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path("music_chart_stale_adjusted_preview_v1.py")


def main():
    print()
    print("Patch stale adjusted preview Path fix")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_path_fix_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8")

    old = '''def read_json(path):
    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)
'''

    new = '''def read_json(path):
    path = Path(path)

    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)
'''

    if old not in text:
        raise SystemExit("교체 대상 read_json 함수를 찾지 못했습니다.")

    text = text.replace(old, new)

    TARGET.write_text(text, encoding="utf-8")

    print(f"패치 완료: {TARGET}")
    print(f"백업: {backup}")
    print()
    print("다음 실행:")
    print("py music_chart_stale_adjusted_preview_v1.py")
    print("notepad FANDEX_MUSIC_CHART_STALE_ADJUSTED_PREVIEW_REPORT.txt")


if __name__ == "__main__":
    main()