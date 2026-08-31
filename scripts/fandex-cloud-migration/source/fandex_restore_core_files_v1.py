import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_restore_core_files_v1"
BACKUP_ROOT = Path("backup")
SAFETY_ROOT = Path("restore_safety_backup")


def find_latest_backup_dir():
    if not BACKUP_ROOT.exists():
        raise SystemExit("backup 폴더가 없습니다.")

    dirs = [p for p in BACKUP_ROOT.iterdir() if p.is_dir()]
    dirs = sorted(dirs, key=lambda p: p.name, reverse=True)

    if not dirs:
        raise SystemExit("backup 안에 백업 폴더가 없습니다.")

    return dirs[0]


def load_manifest(backup_dir):
    manifest_path = backup_dir / "backup_manifest.json"

    if not manifest_path.exists():
        raise SystemExit(f"backup_manifest.json이 없습니다: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    apply_mode = "--apply" in sys.argv

    backup_arg = None
    for arg in sys.argv[1:]:
        if not arg.startswith("--"):
            backup_arg = arg

    if backup_arg:
        backup_dir = Path(backup_arg)
    else:
        backup_dir = find_latest_backup_dir()

    if not backup_dir.exists():
        raise SystemExit(f"백업 폴더가 없습니다: {backup_dir}")

    manifest = load_manifest(backup_dir)
    files = manifest.get("files", [])

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    safety_dir = SAFETY_ROOT / now

    print()
    print("FANDEX core files restore v1")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("mode:", "APPLY" if apply_mode else "DRY-RUN")
    print(f"restore source: {backup_dir}")
    print(f"file count: {len(files)}")
    print()

    if not files:
        print("복구할 파일이 없습니다.")
        return

    print("복구 대상:")
    print("-" * 70)

    restore_plan = []

    for item in files:
        source_name = Path(item["source"]).name
        backup_file = backup_dir / source_name
        target_file = Path(source_name)

        if not backup_file.exists():
            print(f"MISS backup file: {backup_file}")
            continue

        restore_plan.append((backup_file, target_file))
        print(f"- {backup_file} -> {target_file}")

    if not apply_mode:
        print()
        print("실제 복구 명령:")
        print(f"py fandex_restore_core_files_v1.py {backup_dir} --apply")
        print()
        print("최신 백업에서 복구하려면:")
        print("py fandex_restore_core_files_v1.py --apply")
        return

    safety_dir.mkdir(parents=True, exist_ok=True)

    restored = 0
    safety_saved = 0

    for backup_file, target_file in restore_plan:
        if target_file.exists():
            shutil.copy2(target_file, safety_dir / target_file.name)
            safety_saved += 1

        shutil.copy2(backup_file, target_file)
        restored += 1

    print()
    print("=" * 70)
    print("restore 완료")
    print("=" * 70)
    print(f"복구 파일 수: {restored}")
    print(f"복구 전 안전 백업 파일 수: {safety_saved}")
    print(f"복구 전 안전 백업 폴더: {safety_dir}")
    print()
    print("복구 후 확인 권장:")
    print("py fandex_python_health_check_v1.py")
    print("notepad fandex_python_health_check_latest.txt")


if __name__ == "__main__":
    main()