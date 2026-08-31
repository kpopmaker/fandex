import csv
import os
import subprocess
import sys
from datetime import datetime


ARTIST_LIST_FILE = "artist_list.txt"


def read_artist_list():
    if not os.path.exists(ARTIST_LIST_FILE):
        return []

    artists = []

    with open(ARTIST_LIST_FILE, "r", encoding="utf-8-sig") as f:
        for line in f:
            name = line.strip()
            if name:
                artists.append(name)

    return artists


def ask_text(message, default_value):
    raw = input(f"{message} 기본값 {default_value}: ").strip()
    return raw if raw else default_value


def ask_yes_no(message, default_value="y"):
    raw = input(f"{message} y/n 기본값 {default_value}: ").strip().lower()

    if not raw:
        raw = default_value

    return raw in ["y", "yes", "ㅇ", "예", "네"]


def run_script(script, input_text=""):
    if not os.path.exists(script):
        return {
            "status": "failed",
            "script": script,
            "returncode": "",
            "stdout": "",
            "stderr": f"{script} 파일이 없습니다.",
        }

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        [sys.executable, script],
        input=input_text,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    status = "success" if result.returncode == 0 else "failed"

    return {
        "status": status,
        "script": script,
        "returncode": result.returncode,
        "stdout": result.stdout or "",
        "stderr": result.stderr or "",
    }


def tail(text, limit=1500):
    text = (text or "").strip()

    if len(text) <= limit:
        return text

    return text[-limit:]


def write_log(rows):
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"naver_full_pipeline_v2_log_{now}.csv"

    fieldnames = [
        "step",
        "script",
        "status",
        "returncode",
        "stdoutTail",
        "stderrTail",
        "finishedAt",
    ]

    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return filename


def main():
    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        print("예시:")
        print("아이유")
        print("에스파")
        print("아이브")
        return

    print()
    print("네이버 FANDEX 통합 파이프라인 v2 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()

    run_collect = ask_yes_no("원본 수집부터 실행할까요?", "y")

    logs = []

    if run_collect:
        print()
        print("[1단계] 네이버 원본 수집 실행")
        print("수집 조건을 입력하세요. 그냥 엔터 치면 기본값으로 갑니다.")
        print()

        news_count = ask_text("뉴스 수집 개수", "1000")
        blog_count = ask_text("블로그 수집 개수", "1000")
        sort_type = ask_text("정렬 방식 sim/date 중 선택", "date")
        trend_days = ask_text("검색트렌드 기간, 최근 N일", "90")
        time_unit = ask_text("검색트렌드 단위 date/week/month 중 선택", "date")

        collector_input = "\n".join([
            news_count,
            blog_count,
            sort_type,
            trend_days,
            time_unit,
        ]) + "\n"

        result = run_script("naver_multi_collector_v2.py", collector_input)

        print(f"원본 수집 결과: {result['status']}")
        print(tail(result["stdout"]))

        if result["stderr"]:
            print("오류:")
            print(tail(result["stderr"]))

        logs.append({
            "step": "collect",
            "script": "naver_multi_collector_v2.py",
            "status": result["status"],
            "returncode": result["returncode"],
            "stdoutTail": tail(result["stdout"]),
            "stderrTail": tail(result["stderr"]),
            "finishedAt": datetime.now().isoformat(timespec="seconds"),
        })

        if result["status"] != "success":
            log_file = write_log(logs)
            print()
            print("원본 수집 단계에서 실패해서 중단합니다.")
            print(f"로그 파일: {log_file}")
            return
    else:
        print()
        print("[1단계] 원본 수집 건너뜀")
        logs.append({
            "step": "collect",
            "script": "naver_multi_collector_v2.py",
            "status": "skipped",
            "returncode": "",
            "stdoutTail": "사용자가 원본 수집을 건너뜀",
            "stderrTail": "",
            "finishedAt": datetime.now().isoformat(timespec="seconds"),
        })

    print()
    print("[2단계] 후처리 + 랭킹 생성 실행")

    result = run_script("naver_batch_pipeline_safe_v2.py")

    print(f"후처리 결과: {result['status']}")
    print(tail(result["stdout"]))

    if result["stderr"]:
        print("오류:")
        print(tail(result["stderr"]))

    logs.append({
        "step": "postprocess_and_ranking",
        "script": "naver_batch_pipeline_safe_v2.py",
        "status": result["status"],
        "returncode": result["returncode"],
        "stdoutTail": tail(result["stdout"]),
        "stderrTail": tail(result["stderr"]),
        "finishedAt": datetime.now().isoformat(timespec="seconds"),
    })

    log_file = write_log(logs)

    print()
    print("네이버 FANDEX 통합 파이프라인 v2 종료")
    print(f"로그 파일: {log_file}")

    if result["status"] == "success":
        print()
        print("다음 확인 명령어:")
        print(
            'powershell -NoProfile -Command "Import-Csv '
            '(Get-ChildItem \'naver_fandex_ranking_v2_*.csv\' | '
            'Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName | '
            'Format-Table rank,artist,fandexNaverFinalPoint,newsIssueClusterPoint,blogTopicClusterPoint,searchDemandPoint -AutoSize"'
        )


if __name__ == "__main__":
    main()