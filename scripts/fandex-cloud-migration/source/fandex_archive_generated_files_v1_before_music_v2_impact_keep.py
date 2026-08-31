import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_archive_generated_files_v1"

ARCHIVE_ROOT = Path("archive")

KEEP_EXACT = {
    "youtube_video_metrics_v1.csv",
    "youtube_seed_videos_v1.csv",
    "music_chart_seed_v1.csv",
    "music_chart_targets_v1.csv",
    "fandex_python_status_report_latest.txt",
    "lastfm_global_interest_score_preview_v1_latest.csv",
    "lastfm_master_impact_preview_v1_latest.csv",

    "lastfm_global_interest_rolling_v1_latest.csv",
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv",
    "lastfm_rolling_master_impact_preview_v1_latest.csv",

    "fandex_master_v8_ranking_latest.json",
    "FANDEX_MASTER_V8_BUILD_REPORT.txt",

    "fandex_naver_ranking_v3_latest.json",
    "fandex_naver_artist_reports_v3_latest.json",

    "fandex_youtube_ranking_v2_latest.json",
    "fandex_youtube_artist_reports_v2_latest.json",

    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_music_chart_artist_reports_v1_latest.json",

    # Music v2 parallel current-presence active files
    "music_chart_artist_candidates_v2_latest.csv",
    "music_chart_artist_candidates_v2_raw_latest.json",
    "MUSIC_CHART_ARTIST_CANDIDATES_V2_REPORT_latest.txt",
    "music_chart_bugs_all_targets_v1_latest.csv",
    "music_chart_bugs_all_targets_v1_latest.json",
    "MUSIC_CHART_BUGS_ALL_TARGETS_V1_REPORT.txt",
    "music_chart_check_history_v1.csv",
    "music_chart_check_history_v1_latest.csv",
    "music_chart_check_history_v1_latest.json",
    "MUSIC_CHART_CHECK_HISTORY_V1_REPORT.txt",
    "music_chart_current_presence_preview_v1_latest.csv",
    "MUSIC_CHART_CURRENT_PRESENCE_PREVIEW_V1_REPORT.txt",
    "fandex_music_chart_ranking_v2_current_presence_latest.json",
    "music_chart_current_presence_history_v2.csv",
    "FANDEX_MUSIC_CHART_V2_CURRENT_PRESENCE_REPORT.txt",

    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
}

KEEP_SUFFIXES = {
    ".py",
}

ARCHIVE_PATTERNS = [
    "*_20*.json",
    "*_20*.csv",
    "*_20*.txt",

    "*_audit_*.csv",
    "*_log_*.csv",
    "*_raw_*.json",
    "*_backup_*.csv",
    "*_preview_*.csv",
    "*_results_*.csv",
    "*_skipped_*.json",

    "music_chart_seed_v1_backup_before_bugs_apply_*.csv",
    "music_chart_seed_v1_bugs_preview_*.csv",
    "music_chart_collect_bugs_v1_results_*.csv",

    "fandex_python_status_report_v1_*.txt",
    "fandex_daily_python_only_v1_log_*.csv",
    "fandex_publish_python_only_v1_log_*.csv",
    "fandex_music_refresh_bugs_python_only_v1_log_*.csv",
]


def is_archive_candidate(path):
    if not path.is_file():
        return False

    if path.name in KEEP_EXACT:
        return False

    if path.suffix in KEEP_SUFFIXES:
        return False

    if path.parts and path.parts[0] == ARCHIVE_ROOT.name:
        return False

    for pattern in ARCHIVE_PATTERNS:
        if path.match(pattern):
            return True

    return False


def unique_destination(path, archive_dir):
    destination = archive_dir / path.name

    if not destination.exists():
        return destination

    stem = path.stem
    suffix = path.suffix
    index = 2

    while True:
        candidate = archive_dir / f"{stem}_{index}{suffix}"

        if not candidate.exists():
            return candidate

        index += 1


def main():
    apply_mode = "--apply" in sys.argv

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_dir = ARCHIVE_ROOT / now

    candidates = []

    for path in Path(".").iterdir():
        if is_archive_candidate(path):
            candidates.append(path)

    candidates = sorted(candidates, key=lambda p: p.name.lower())

    print()
    print("FANDEX generated files archive v1")
    print("=" * 70)
    print(f"version: {VERSION}")

    if apply_mode:
        print("mode: APPLY")
    else:
        print("mode: DRY-RUN")
        print("실제로 이동하지 않습니다. 이동하려면 --apply를 붙이세요.")

    print(f"archive target: {archive_dir}")
    print(f"archive candidate count: {len(candidates)}")
    print()

    if not candidates:
        print("정리할 생성 파일이 없습니다.")
        return

    print("이동 대상:")
    print("-" * 70)

    for path in candidates:
        print(f"- {path}")

    if not apply_mode:
        print()
        print("실제 이동 명령:")
        print("py fandex_archive_generated_files_v1.py --apply")
        return

    archive_dir.mkdir(parents=True, exist_ok=True)

    moved = []

    for path in candidates:
        destination = unique_destination(path, archive_dir)
        shutil.move(str(path), str(destination))
        moved.append((path, destination))

    print()
    print("이동 완료:")
    print("-" * 70)

    for source, destination in moved:
        print(f"- {source} -> {destination}")

    print()
    print("=" * 70)
    print("archive 완료")
    print("=" * 70)
    print(f"이동 파일 수: {len(moved)}")
    print(f"보관 폴더: {archive_dir}")
    print()
    print("유지한 핵심 파일:")
    print("- latest JSON")
    print("- seed CSV")
    print("- youtube_video_metrics_v1.csv")
    print("- 실행용 .py 파일")


if __name__ == "__main__":
    main()