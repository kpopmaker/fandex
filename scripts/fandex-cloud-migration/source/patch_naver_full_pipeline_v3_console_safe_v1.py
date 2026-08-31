from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path("naver_full_pipeline_v3.py")


SAFE_FUNC = '''

def safe_console_text(value):
    text = str(value or "")
    try:
        encoding = getattr(__import__("sys").stdout, "encoding", None) or "cp949"
        return text.encode(encoding, errors="replace").decode(encoding, errors="replace")
    except Exception:
        return text.encode("cp949", errors="replace").decode("cp949", errors="replace")


def safe_print(value=""):
    print(safe_console_text(value))
'''


def main():
    print()
    print("Patch naver_full_pipeline_v3 console safe print")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_console_safe_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8", errors="replace")

    changed = False

    if "def safe_console_text(" not in text:
        marker = "def run_script("
        if marker not in text:
            raise SystemExit("def run_script( 위치를 찾지 못했습니다.")

        text = text.replace(marker, SAFE_FUNC + "\n\n" + marker, 1)
        changed = True

    replacements = [
        ("print(output.strip())", "safe_print(output.strip())"),
        ("print(result.stdout.strip())", "safe_print(result.stdout.strip())"),
        ("print(result.stderr.strip())", "safe_print(result.stderr.strip())"),
        ("print(stderr.strip())", "safe_print(stderr.strip())"),
        ("print(stdout.strip())", "safe_print(stdout.strip())"),
    ]

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
    print("py naver_v3_expand_full_then_publish_safe_v1.py")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_V3_EXPAND_FULL_THEN_PUBLISH_SAFE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()