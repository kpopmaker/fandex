import re
import shutil
from pathlib import Path
from datetime import datetime


TARGET = Path("naver_apply_quality_blocklist_v3.py")


def main():
    print()
    print("Patch missing negative cap constants")
    print("=" * 70)

    if not TARGET.exists():
        raise SystemExit(f"파일 없음: {TARGET}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = Path(f"{TARGET.name}_backup_before_missing_negative_caps_{timestamp}")
    shutil.copy2(TARGET, backup)

    text = TARGET.read_text(encoding="utf-8", errors="replace")

    used_names = sorted(set(re.findall(r"\b([A-Z0-9_]+_NEGATIVE_CAP)\.get\(", text)))
    defined_names = set(re.findall(r"^([A-Z0-9_]+_NEGATIVE_CAP)\s*=", text, flags=re.MULTILINE))

    missing = [name for name in used_names if name not in defined_names]

    if not missing:
        print("누락된 *_NEGATIVE_CAP 상수가 없습니다.")
        print(f"백업: {backup}")
        return

    insert_lines = []
    insert_lines.append("")
    insert_lines.append("# Auto-added by patch_naver_apply_quality_missing_negative_caps_v1.py")
    insert_lines.append("# Empty dict keeps existing .get(..., default) behavior and prevents NameError.")
    for name in missing:
        insert_lines.append(f"{name} = {{}}")
    insert_lines.append("")

    insert_block = "\n".join(insert_lines)

    marker_candidates = [
        "def apply_news_cap(",
        "def rebuild_news_cluster(",
        "def main(",
    ]

    insert_at = -1
    marker_used = None

    for marker in marker_candidates:
        insert_at = text.find(marker)
        if insert_at != -1:
            marker_used = marker
            break

    if insert_at == -1:
        raise SystemExit("삽입 위치를 찾지 못했습니다.")

    text = text[:insert_at] + insert_block + "\n" + text[insert_at:]

    TARGET.write_text(text, encoding="utf-8")

    print(f"패치 완료: {TARGET}")
    print(f"백업: {backup}")
    print(f"삽입 위치: {marker_used}")
    print("추가한 상수:")
    for name in missing:
        print(f"- {name}")
    print()
    print("다음 실행:")
    print("py naver_apply_quality_blocklist_v3.py")


if __name__ == "__main__":
    main()