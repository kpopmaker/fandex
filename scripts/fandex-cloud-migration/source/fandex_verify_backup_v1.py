import json
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_verify_backup_v1"
BACKUP_ROOT = Path("backup")


def find_latest_backup_dir():
    if not BACKUP_ROOT.exists():
        raise SystemExit("backup 폴더가 없습니다.")

    dirs = [p for p in BACKUP_ROOT.iterdir() if p.is_dir()]
    dirs = sorted(dirs, key=lambda p: p.name, reverse=True)

    if not dirs:
        raise SystemExit("backup 안에 백업 폴더가 없습니다.")

    return dirs[0]


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def main():
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

    manifest_path = backup_dir / "backup_manifest.json"

    if not manifest_path.exists():
        raise SystemExit(f"backup_manifest.json이 없습니다: {manifest_path}")

    manifest = read_json(manifest_path)
    manifest_files = manifest.get("files", [])

    problems = []
    checked = []

    for item in manifest_files:
        source_name = Path(item.get("source", "")).name
        expected_size = item.get("sizeBytes")

        if not source_name:
            problems.append("manifest 안에 source가 비어 있는 항목이 있습니다.")
            continue

        backup_file = backup_dir / source_name

        if not backup_file.exists():
            problems.append(f"MISS file: {backup_file}")
            continue

        actual_size = backup_file.stat().st_size

        if expected_size is not None and actual_size != expected_size:
            problems.append(
                f"SIZE mismatch: {backup_file} / "
                f"manifest={expected_size} / actual={actual_size}"
            )

        checked.append({
            "file": backup_file.name,
            "sizeBytes": actual_size,
        })

    actual_files = [
        p for p in backup_dir.iterdir()
        if p.is_file() and p.name != "backup_manifest.json"
    ]

    manifest_names = {Path(item.get("source", "")).name for item in manifest_files}
    actual_names = {p.name for p in actual_files}

    extra_files = sorted(actual_names - manifest_names)

    for name in extra_files:
        problems.append(f"EXTRA file not in manifest: {name}")

    print()
    print("FANDEX backup verify v1")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"checkedAt: {datetime.now().isoformat(timespec='seconds')}")
    print(f"backupDir: {backup_dir}")
    print(f"manifest fileCount: {manifest.get('fileCount')}")
    print(f"manifest entries: {len(manifest_files)}")
    print(f"actual files excluding manifest: {len(actual_files)}")
    print()

    print("검증 파일:")
    print("-" * 70)

    for item in checked:
        print(f"OK {item['file']} / {item['sizeBytes']} bytes")

    print()
    print("검증 결과")
    print("-" * 70)

    if problems:
        print("WARN: 확인 필요한 항목 있음")
        for problem in problems:
            print(f"- {problem}")
        raise SystemExit(1)

    print("OK: 백업 manifest와 실제 파일이 일치합니다.")
    print()
    print("복구 dry-run:")
    print(f"py fandex_restore_core_files_v1.py {backup_dir}")
    print()
    print("실제 복구가 필요할 때만:")
    print(f"py fandex_restore_core_files_v1.py {backup_dir} --apply")


if __name__ == "__main__":
    main()