import subprocess
import sys
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "naver_v3_failure_diagnose_v1"

REPORT = Path("FANDEX_NAVER_V3_FAILURE_DIAGNOSE_REPORT.txt")

SCRIPTS_TO_CHECK = [
    "naver_publish_quality_v3.py",
    "naver_full_pipeline_v3.py",
    "naver_fandex_final_score_v3_batch.py",
    "naver_fandex_ranking_v3.py",
    "naver_fandex_export_v3_json.py",
    "naver_artist_report_v3.py",
]

LATEST_PATTERN = "fandex_naver_*_latest.json"


def backup_latest(backup_dir):
    backup_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(Path(".").glob(LATEST_PATTERN))

    for file in files:
        shutil.copy2(file, backup_dir / file.name)

    return files


def restore_latest(backup_dir, original_files):
    original_names = {file.name for file in original_files}

    for file in sorted(Path(".").glob(LATEST_PATTERN)):
        if file.name not in original_names:
            file.unlink()

    for file in sorted(backup_dir.glob(LATEST_PATTERN)):
        shutil.copy2(file, Path(file.name))


def read_text(path):
    path = Path(path)
    if not path.exists():
        return ""

    return path.read_text(encoding="utf-8", errors="replace")


def run_capture(script):
    result = subprocess.run(
        [sys.executable, script],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    return {
        "script": script,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def scan_script(script):
    path = Path(script)
    text = read_text(path)

    return {
        "script": script,
        "exists": path.exists(),
        "size": path.stat().st_size if path.exists() else 0,
        "mentionsArtistList": (
            "artist_list.txt" in text
            or "artist_list" in text
            or "ARTIST_LIST" in text
        ),
        "mentionsFullPipeline": "naver_full_pipeline_v3" in text,
        "mentionsPublishQuality": "naver_publish_quality_v3" in text,
        "mentionsFinalScoreBatch": "naver_fandex_final_score_v3_batch" in text,
        "mentionsRanking": "naver_fandex_ranking_v3" in text,
        "mentionsExport": "naver_fandex_export_v3_json" in text,
        "mentionsReport": "naver_artist_report_v3" in text,
    }


def main():
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    backup_dir = Path(f"naver_v3_failure_diagnose_backup_{timestamp}")

    print()
    print("Naver v3 failure diagnose 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 실행 후 Naver latest는 진단 전 상태로 복구합니다.")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    original_files = backup_latest(backup_dir)

    try:
        publish_result = run_capture("naver_publish_quality_v3.py")
    finally:
        restore_latest(backup_dir, original_files)

    script_scans = [scan_script(script) for script in SCRIPTS_TO_CHECK]

    lines = []
    lines.append("FANDEX Naver v3 Failure Diagnose Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: diagnose only / Naver latest restored / no website public-data export")
    lines.append("")
    lines.append("실행 진단")
    lines.append("-" * 70)
    lines.append(f"script: {publish_result['script']}")
    lines.append(f"returncode: {publish_result['returncode']}")
    lines.append("")
    lines.append("STDOUT")
    lines.append("-" * 70)
    lines.append(publish_result["stdout"] if publish_result["stdout"].strip() else "(empty)")
    lines.append("")
    lines.append("STDERR")
    lines.append("-" * 70)
    lines.append(publish_result["stderr"] if publish_result["stderr"].strip() else "(empty)")
    lines.append("")
    lines.append("관련 스크립트 스캔")
    lines.append("-" * 70)

    for item in script_scans:
        status = "OK" if item["exists"] else "MISSING"
        lines.append(
            f"{status} {item['script']} | "
            f"mentionsArtistList={item['mentionsArtistList']} | "
            f"mentionsFullPipeline={item['mentionsFullPipeline']} | "
            f"mentionsFinalScoreBatch={item['mentionsFinalScoreBatch']} | "
            f"mentionsRanking={item['mentionsRanking']} | "
            f"mentionsExport={item['mentionsExport']} | "
            f"mentionsReport={item['mentionsReport']}"
        )

    lines.append("")
    lines.append("판단 가이드")
    lines.append("-" * 70)
    lines.append("1. STDERR에 traceback이 있으면 해당 파일/라인을 먼저 패치한다.")
    lines.append("2. naver_publish_quality_v3.py가 full pipeline을 실행하지 않으면 엔트리포인트를 naver_full_pipeline_v3.py로 바꾼다.")
    lines.append("3. full pipeline이 artist_list를 읽지만 publish 단계가 4명 latest만 읽으면, final/ranking/export 단계 연결을 패치한다.")
    lines.append("4. 이 진단은 끝나면 Naver latest를 기존 상태로 복구한다.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Naver v3 failure diagnose 완료")
    print("=" * 70)
    print(f"returncode: {publish_result['returncode']}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_V3_FAILURE_DIAGNOSE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()