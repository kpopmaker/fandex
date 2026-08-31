import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "naver_v3_expand_to_artist_list_safe_v1"

ARTIST_LIST = Path("artist_list.txt")
NAVER_SCRIPT = "naver_publish_quality_v3.py"

REPORT = Path("FANDEX_NAVER_V3_EXPAND_TO_ARTIST_LIST_SAFE_REPORT.txt")
LATEST_RANKING = Path("fandex_naver_ranking_v3_latest.json")


def read_artist_list():
    if not ARTIST_LIST.exists():
        raise SystemExit(f"파일 없음: {ARTIST_LIST}")

    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def read_json(path):
    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def ranking_artists(path):
    payload = read_json(path)
    ranking = payload.get("ranking", [])

    result = []

    if isinstance(ranking, list):
        for row in ranking:
            if isinstance(row, dict) and row.get("artist"):
                result.append(str(row["artist"]).strip())

    return result


def backup_naver_latest_files(backup_dir):
    backup_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(Path(".").glob("fandex_naver_*_latest.json"))

    for file in files:
        shutil.copy2(file, backup_dir / file.name)

    return files


def restore_naver_latest_files(backup_dir, original_files):
    original_names = {file.name for file in original_files}

    current_files = sorted(Path(".").glob("fandex_naver_*_latest.json"))

    # 확장 실행 중 생긴 신규 latest 파일 제거
    for file in current_files:
        if file.name not in original_names:
            file.unlink()

    # 기존 latest 복구
    for backup_file in backup_dir.glob("fandex_naver_*_latest.json"):
        shutil.copy2(backup_file, Path(backup_file.name))


def run_naver_pipeline():
    return subprocess.run(
        [sys.executable, NAVER_SCRIPT],
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-partial", action="store_true")
    args = parser.parse_args()

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")

    expected_artists = read_artist_list()
    expected_set = set(expected_artists)

    before_artists = ranking_artists(LATEST_RANKING)

    backup_dir = Path(f"naver_v3_backup_before_artist_expansion_{timestamp}")
    original_files = backup_naver_latest_files(backup_dir)

    print()
    print("Naver v3 expand to artist_list safe runner")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"expected artist count: {len(expected_artists)}")
    print(f"before naver ranking count: {len(before_artists)}")
    print(f"backup dir: {backup_dir}")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    result = run_naver_pipeline()

    after_artists = ranking_artists(LATEST_RANKING)
    after_set = set(after_artists)

    missing = [artist for artist in expected_artists if artist not in after_set]
    added = [artist for artist in after_artists if artist not in set(before_artists)]

    full_success = (
        result.returncode == 0
        and len(after_artists) >= len(expected_artists)
        and len(missing) == 0
    )

    restored = False

    if not full_success and not args.keep_partial:
        restore_naver_latest_files(backup_dir, original_files)
        restored = True

    final_artists = ranking_artists(LATEST_RANKING)

    lines = []
    lines.append("FANDEX Naver v3 Expand To Artist List Safe Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Naver latest only / no website public-data export")
    lines.append("")
    lines.append("실행 결과")
    lines.append("-" * 70)
    lines.append(f"naverScript: {NAVER_SCRIPT}")
    lines.append(f"returncode: {result.returncode}")
    lines.append(f"fullSuccess: {full_success}")
    lines.append(f"restoredPreviousLatest: {restored}")
    lines.append(f"backupDir: {backup_dir}")
    lines.append("")
    lines.append("artist count")
    lines.append("-" * 70)
    lines.append(f"expected artist_list count: {len(expected_artists)}")
    lines.append(f"before naver ranking count: {len(before_artists)}")
    lines.append(f"after pipeline naver ranking count: {len(after_artists)}")
    lines.append(f"final naver ranking count: {len(final_artists)}")
    lines.append("")
    lines.append("expected artist_list")
    lines.append("-" * 70)
    for artist in expected_artists:
        lines.append(f"- {artist}")
    lines.append("")
    lines.append("after pipeline naver ranking artists")
    lines.append("-" * 70)
    for artist in after_artists:
        lines.append(f"- {artist}")
    lines.append("")
    lines.append("missing from after pipeline")
    lines.append("-" * 70)
    if missing:
        for artist in missing:
            lines.append(f"- {artist}")
    else:
        lines.append("없음")
    lines.append("")
    lines.append("newly added in naver ranking")
    lines.append("-" * 70)
    if added:
        for artist in added:
            lines.append(f"- {artist}")
    else:
        lines.append("없음")
    lines.append("")
    lines.append("final active naver ranking artists")
    lines.append("-" * 70)
    for artist in final_artists:
        lines.append(f"- {artist}")
    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)

    if full_success:
        lines.append("OK: Naver v3 latest가 artist_list 10명 기준으로 확장되었습니다.")
        lines.append("다음 단계: artist expansion readiness 재실행 후 YouTube seed discovery 확장.")
    else:
        lines.append("WARN: Naver v3 10명 확장이 완전 성공하지 않았습니다.")
        if restored:
            lines.append("이전 Naver latest 파일로 자동 복구했습니다.")
        else:
            lines.append("--keep-partial 옵션으로 partial 결과를 유지했습니다.")
        lines.append("다음 단계: 리포트에서 missing artist 확인 후 Naver pipeline 패치.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Naver v3 expand safe runner 완료")
    print("=" * 70)
    print(f"fullSuccess: {full_success}")
    print(f"restoredPreviousLatest: {restored}")
    print(f"final naver ranking count: {len(final_artists)}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_V3_EXPAND_TO_ARTIST_LIST_SAFE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()