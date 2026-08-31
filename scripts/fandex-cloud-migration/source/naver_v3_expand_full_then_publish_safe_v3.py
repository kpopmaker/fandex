import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "naver_v3_expand_full_then_publish_safe_v3_auto_yes_defaults"

ARTIST_LIST = Path("artist_list.txt")
FULL_PIPELINE_SCRIPT = "naver_full_pipeline_v3.py"
PUBLISH_SCRIPT = "naver_publish_quality_v3.py"

REPORT = Path("FANDEX_NAVER_V3_EXPAND_FULL_THEN_PUBLISH_SAFE_REPORT.txt")
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

    for file in sorted(Path(".").glob("fandex_naver_*_latest.json")):
        if file.name not in original_names:
            file.unlink()

    for backup_file in backup_dir.glob("fandex_naver_*_latest.json"):
        shutil.copy2(backup_file, Path(backup_file.name))


def run_capture(script, input_text=None):
    print()
    print(f"실행: {script}")
    print("-" * 70)

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    result = subprocess.run(
        [sys.executable, script],
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    print(f"returncode: {result.returncode}")

    if result.stdout.strip():
        print("[STDOUT tail]")
        print(result.stdout[-4000:])

    if result.stderr.strip():
        print("[STDERR tail]")
        print(result.stderr[-4000:])

    return {
        "script": script,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-partial", action="store_true")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    expected_artists = read_artist_list()
    before_artists = ranking_artists(LATEST_RANKING)

    backup_dir = Path(f"naver_v3_backup_before_full_expand_auto_defaults_{timestamp}")
    original_files = backup_naver_latest_files(backup_dir)

    print()
    print("Naver v3 expand full then publish safe runner v3")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"expected artist count: {len(expected_artists)}")
    print(f"before naver ranking count: {len(before_artists)}")
    print(f"backup dir: {backup_dir}")
    print("원본 데이터 수집 질문에는 y를 입력하고, 이후 질문은 엔터로 기본값 사용합니다.")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    # y = 원본 수집 실행
    # 이후 여러 번 엔터 = 뉴스 수집 개수, 블로그 수집 개수 등 모든 질문 기본값
    default_input = "y\n" + ("\n" * 50)

    full_result = run_capture(FULL_PIPELINE_SCRIPT, input_text=default_input)

    if full_result["returncode"] == 0:
        publish_result = run_capture(PUBLISH_SCRIPT)
    else:
        publish_result = {
            "script": PUBLISH_SCRIPT,
            "returncode": "SKIPPED",
            "stdout": "",
            "stderr": "Skipped because full pipeline failed.",
        }

    after_artists = ranking_artists(LATEST_RANKING)
    after_set = set(after_artists)

    missing = [artist for artist in expected_artists if artist not in after_set]
    added = [artist for artist in after_artists if artist not in set(before_artists)]

    full_success = (
        full_result["returncode"] == 0
        and publish_result["returncode"] == 0
        and len(after_artists) >= len(expected_artists)
        and len(missing) == 0
    )

    restored = False

    if not full_success and not args.keep_partial:
        restore_naver_latest_files(backup_dir, original_files)
        restored = True

    final_artists = ranking_artists(LATEST_RANKING)

    lines = []
    lines.append("FANDEX Naver v3 Expand Full Then Publish Safe Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Naver latest only / no website public-data export")
    lines.append("")
    lines.append("실행 결과")
    lines.append("-" * 70)
    lines.append(f"fullPipelineScript: {FULL_PIPELINE_SCRIPT}")
    lines.append("fullPipelineInput: y + 50 default enters")
    lines.append(f"fullPipelineReturncode: {full_result['returncode']}")
    lines.append(f"publishScript: {PUBLISH_SCRIPT}")
    lines.append(f"publishReturncode: {publish_result['returncode']}")
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
    lines.append("FULL PIPELINE STDOUT tail")
    lines.append("-" * 70)
    lines.append(full_result["stdout"][-8000:] if str(full_result["stdout"]).strip() else "(empty)")

    lines.append("")
    lines.append("FULL PIPELINE STDERR tail")
    lines.append("-" * 70)
    lines.append(full_result["stderr"][-8000:] if str(full_result["stderr"]).strip() else "(empty)")

    lines.append("")
    lines.append("PUBLISH STDOUT tail")
    lines.append("-" * 70)
    lines.append(str(publish_result["stdout"])[-8000:] if str(publish_result["stdout"]).strip() else "(empty)")

    lines.append("")
    lines.append("PUBLISH STDERR tail")
    lines.append("-" * 70)
    lines.append(str(publish_result["stderr"])[-8000:] if str(publish_result["stderr"]).strip() else "(empty)")

    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)

    if full_success:
        lines.append("OK: Naver v3 latest가 artist_list 10명 기준으로 확장되었습니다.")
        lines.append("다음 단계: artist expansion readiness 재실행 후 YouTube seed discovery 확장.")
    else:
        lines.append("WARN: Naver v3 10명 full expansion이 완전 성공하지 않았습니다.")
        if restored:
            lines.append("이전 Naver latest 파일로 자동 복구했습니다.")
        else:
            lines.append("--keep-partial 옵션으로 partial 결과를 유지했습니다.")
        lines.append("다음 단계: FULL/PUBLISH stdout tail을 보고 실패 단계 패치.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Naver v3 expand full then publish safe runner v3 완료")
    print("=" * 70)
    print(f"fullSuccess: {full_success}")
    print(f"restoredPreviousLatest: {restored}")
    print(f"final naver ranking count: {len(final_artists)}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_V3_EXPAND_FULL_THEN_PUBLISH_SAFE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()