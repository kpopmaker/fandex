import csv
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "naver_search_trend_split_test_v1"

ARTIST_LIST = Path("artist_list.txt")
REPORT = Path("FANDEX_NAVER_SEARCH_TREND_SPLIT_TEST_REPORT.txt")


def read_artist_list():
    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def write_artist_list(artists):
    ARTIST_LIST.write_text("\n".join(artists) + "\n", encoding="utf-8")


def run_trend_for_group(group_name, artists):
    print()
    print(f"[{group_name}] 검색트렌드 비교 실행")
    print("-" * 70)
    print(", ".join(artists))

    write_artist_list(artists)

    result = subprocess.run(
        [sys.executable, "naver_search_trend_compare_v2.py"],
        input="\n\n",
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    print(f"returncode: {result.returncode}")

    if result.stdout.strip():
        print(result.stdout[-2000:])

    if result.stderr.strip():
        print(result.stderr[-2000:])

    return {
        "group": group_name,
        "artists": artists,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def newest_files(pattern, before_set):
    files = sorted(Path(".").glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return [str(p) for p in files if str(p) not in before_set]


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Naver search trend split test 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: artist_list.txt는 실행 후 원상복구합니다.")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    original_artists = read_artist_list()
    backup = Path(f"artist_list_backup_before_search_trend_split_test_{timestamp}.txt")
    shutil.copy2(ARTIST_LIST, backup)

    before_files = {str(p) for p in Path(".").glob("naver_search_trend_compare_v2*")}
    before_files.update({str(p) for p in Path(".").glob("*search_trend*")})

    groups = [
        ("group_1", original_artists[:5]),
        ("group_2", original_artists[5:10]),
    ]

    results = []

    try:
        for group_name, artists in groups:
            results.append(run_trend_for_group(group_name, artists))
    finally:
        shutil.copy2(backup, ARTIST_LIST)

    after_new_files = newest_files("*search_trend*", before_files)

    lines = []
    lines.append("FANDEX Naver Search Trend Split Test Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: search trend split test only / artist_list restored / no website export")
    lines.append("")
    lines.append("원래 artist_list")
    lines.append("-" * 70)

    for artist in original_artists:
        lines.append(f"- {artist}")

    lines.append("")
    lines.append("실행 결과")
    lines.append("-" * 70)

    for item in results:
        lines.append(
            f"{item['group']} | returncode={item['returncode']} | artists={', '.join(item['artists'])}"
        )

    lines.append("")
    lines.append("생성/갱신된 search trend 관련 파일 후보")
    lines.append("-" * 70)

    if after_new_files:
        for file in after_new_files[:30]:
            lines.append(f"- {file}")
    else:
        lines.append("감지 안 됨")

    lines.append("")
    lines.append("STDOUT tail")
    lines.append("-" * 70)

    for item in results:
        lines.append(f"[{item['group']}]")
        lines.append(item["stdout"][-4000:] if item["stdout"].strip() else "(empty)")
        lines.append("")

    lines.append("STDERR tail")
    lines.append("-" * 70)

    for item in results:
        lines.append(f"[{item['group']}]")
        lines.append(item["stderr"][-2000:] if item["stderr"].strip() else "(empty)")
        lines.append("")

    lines.append("판단")
    lines.append("-" * 70)

    if all(item["returncode"] == 0 for item in results):
        lines.append("OK: 검색트렌드 비교는 5명씩 분할 실행 가능.")
        lines.append("다음 단계: split 결과를 final v3가 읽을 수 있게 merge/adapter 생성.")
    else:
        lines.append("WARN: 검색트렌드 분할 실행 중 실패가 있음.")
        lines.append("다음 단계: 실패 group의 stdout/stderr 확인 후 패치.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Naver search trend split test 완료")
    print("=" * 70)
    print(f"report: {REPORT}")
    print("artist_list.txt 복구 완료")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_SEARCH_TREND_SPLIT_TEST_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()