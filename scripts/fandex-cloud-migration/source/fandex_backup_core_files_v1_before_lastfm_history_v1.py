import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_backup_core_files_v1"

BACKUP_ROOT = Path("backup")

INCLUDE_EXACT = {
    "run_fandex_daily_python_only.bat",

    "FANDEX_PYTHON_ONLY_RUNBOOK.txt",
    "FANDEX_NAVER_V3_QUALITY_RUNBOOK.txt",
    "FANDEX_YOUTUBE_V2_README.txt",
    "MUSIC_CHART_PIPELINE_README.txt",

    "artist_list.txt",

    "music_chart_seed_v1.csv",
    "music_chart_targets_v1.csv",
    "youtube_seed_videos_v1.csv",
    "youtube_video_metrics_v1.csv",

    "fandex_python_status_report_latest.txt",
    "fandex_python_health_check_latest.txt",

    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",

    "fandex_naver_ranking_v3_latest.json",
    "fandex_naver_artist_reports_v3_latest.json",
    "fandex_naver_artist_report_v3_아이유_latest.json",
    "fandex_naver_artist_report_v3_에이티즈_latest.json",
    "fandex_naver_artist_report_v3_보이넥스트도어_latest.json",
    "fandex_naver_artist_report_v3_에스파_latest.json",

    "fandex_youtube_ranking_v2_latest.json",
    "fandex_youtube_artist_reports_v2_latest.json",

    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_music_chart_artist_reports_v1_latest.json",
}

INCLUDE_SUFFIXES = {
    ".py",
}

EXCLUDE_NAMES = {
    "fandex_backup_core_files_v1.py",
}

EXCLUDE_DIRS = {
    "archive",
    "backup",
    "__pycache__",
}


def should_backup(path):
    if not path.is_file():
        return False

    if path.name in EXCLUDE_NAMES:
        return False

    if path.parts and path.parts[0] in EXCLUDE_DIRS:
        return False

    if path.name in INCLUDE_EXACT:
        return True

    if path.suffix in INCLUDE_SUFFIXES:
        return True

    return False


def copy_file(source, backup_dir):
    destination = backup_dir / source.name
    shutil.copy2(source, destination)
    return destination


def main():
    apply_mode = "--apply" in sys.argv

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = BACKUP_ROOT / now

    candidates = []

    for path in Path(".").iterdir():
        if should_backup(path):
            candidates.append(path)

    candidates = sorted(candidates, key=lambda p: p.name.lower())

    print()
    print("FANDEX core files backup v1")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("mode:", "APPLY" if apply_mode else "DRY-RUN")
    print(f"backup target: {backup_dir}")
    print(f"backup candidate count: {len(candidates)}")
    print()

    if not candidates:
        print("백업할 핵심 파일이 없습니다.")
        return

    print("백업 대상:")
    print("-" * 70)
    for path in candidates:
        print(f"- {path}")

    if not apply_mode:
        print()
        print("실제 백업 명령:")
        print("py fandex_backup_core_files_v1.py --apply")
        return

    backup_dir.mkdir(parents=True, exist_ok=True)

    copied = []

    for source in candidates:
        destination = copy_file(source, backup_dir)
        copied.append({
            "source": str(source),
            "destination": str(destination),
            "sizeBytes": source.stat().st_size,
        })

    manifest = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "backupDir": str(backup_dir),
        "fileCount": len(copied),
        "files": copied,
    }

    manifest_path = backup_dir / "backup_manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print()
    print("=" * 70)
    print("core backup 완료")
    print("=" * 70)
    print(f"백업 파일 수: {len(copied)}")
    print(f"백업 폴더: {backup_dir}")
    print(f"manifest: {manifest_path}")
    print()
    print("확인 명령:")
    print(f"dir {backup_dir}")


if __name__ == "__main__":
    main()