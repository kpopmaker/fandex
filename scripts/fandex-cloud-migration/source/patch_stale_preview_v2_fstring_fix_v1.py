from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path("music_chart_stale_adjusted_preview_v2.py")


def main():
    print()
    print("Patch stale preview v2 f-string block")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_fstring_fix_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8", errors="replace")

    start_marker = "    for item in ranking_rows(preview_master_payload):"
    end_marker = '\n    lines.append("")\n    lines.append("생성 파일")'

    start = text.find(start_marker)
    if start == -1:
        raise SystemExit("시작 블록을 찾지 못했습니다.")

    end = text.find(end_marker, start)
    if end == -1:
        raise SystemExit("끝 블록을 찾지 못했습니다.")

    new_block = '''    for item in ranking_rows(preview_master_payload):
        sp = item.get("sourcePoints", {})
        naver = sp.get("naver", {}).get("cumulativePoint")
        youtube = sp.get("youtube", {}).get("cumulativePoint")
        music = sp.get("musicChart", {}).get("cumulativePoint")
        music_mode = sp.get("musicChart", {}).get("sourceReadMode")

        line = (
            str(item.get("rank")) + "위 " + str(item.get("artist")) + " | "
            + "FANDEX " + str(item.get("fandexFinalPoint")) + " | "
            + "네이버 " + str(naver) + " | "
            + "YouTube " + str(youtube) + " | "
            + "음원 " + str(music) + " "
            + "(" + str(music_mode) + ")"
        )
        lines.append(line)
'''

    patched = text[:start] + new_block + text[end:]

    TARGET.write_text(patched, encoding="utf-8")

    print(f"패치 완료: {TARGET}")
    print(f"백업: {backup}")
    print()
    print("다음 실행:")
    print("py music_chart_stale_adjusted_preview_v2.py")
    print('powershell -NoProfile -Command "Get-Content .\\FANDEX_MUSIC_CHART_STALE_ADJUSTED_PREVIEW_REPORT.txt -Encoding UTF8"')


if __name__ == "__main__":
    main()