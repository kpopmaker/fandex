from pathlib import Path
import sys


VERSION = "fandex_clean_command_garbage_v1"

GARBAGE_NAMES = {
    "-",
    "cd",
    "dir",
    "notepad",
    "powershell",
    "py",
    "set",
    "type",
    "•",
}


def main():
    apply_mode = "--apply" in sys.argv

    candidates = []

    for name in GARBAGE_NAMES:
        path = Path(name)

        if path.exists() and path.is_file():
            size = path.stat().st_size

            if size == 0:
                candidates.append(path)
            else:
                print(f"스킵: {path} / 0바이트가 아님 / size={size}")

    print()
    print("FANDEX command garbage cleaner v1")
    print("=" * 60)
    print(f"version: {VERSION}")
    print("mode:", "APPLY" if apply_mode else "DRY-RUN")
    print(f"삭제 후보 수: {len(candidates)}")
    print()

    if not candidates:
        print("삭제할 0바이트 명령어 쓰레기 파일이 없습니다.")
        return

    print("삭제 후보:")
    print("-" * 60)

    for path in sorted(candidates, key=lambda p: p.name):
        print(f"- {path}")

    if not apply_mode:
        print()
        print("실제로 삭제하려면:")
        print("py fandex_clean_command_garbage_v1.py --apply")
        return

    for path in candidates:
        path.unlink()

    print()
    print("=" * 60)
    print("삭제 완료")
    print("=" * 60)
    print(f"삭제 파일 수: {len(candidates)}")


if __name__ == "__main__":
    main()