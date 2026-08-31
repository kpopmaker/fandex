import subprocess
import sys
import os
import csv
from datetime import datetime


ARTIST_LIST_FILE = "artist_list.txt"


FAIL_KEYWORDS = [
    "필요한 파일이 부족합니다",
    "파일이 없습니다",
    "데이터가 없습니다",
    "아티스트명이 없습니다",
    "오류",
    "실패",
    "Traceback",
    "Error",
    "Exception",
]


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


def write_log(path, rows):
    fieldnames = [
        "step",
        "target",
        "status",
        "message",
        "createdAt",
    ]

    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)




def safe_console_text(value):
    text = str(value or "")
    try:
        encoding = getattr(__import__("sys").stdout, "encoding", None) or "cp949"
        return text.encode(encoding, errors="replace").decode(encoding, errors="replace")
    except Exception:
        return text.encode("cp949", errors="replace").decode("cp949", errors="replace")


def safe_print(value=""):
    print(safe_console_text(value))


def run_script(script_name, input_text="", step_name="", target=""):
    print()
    print(f"[실행] {step_name or script_name}")
    print(f"- 파일: {script_name}")

    process = subprocess.run(
        [sys.executable, script_name],
        input=input_text,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )

    output = (process.stdout or "") + "\n" + (process.stderr or "")

    if output.strip():
        safe_print(output.strip())

    if process.returncode != 0:
        return False, output

    if any(keyword in output for keyword in FAIL_KEYWORDS):
        return False, output

    return True, output


def ask_yes_no(message, default_value="y"):
    raw = input(f"{message} y/n 기본값 {default_value}: ").strip().lower()

    if not raw:
        return default_value

    if raw in ["y", "yes"]:
        return "y"

    if raw in ["n", "no"]:
        return "n"

    return default_value


def ask_text(message, default_value):
    raw = input(f"{message} 기본값 {default_value}: ").strip()
    return raw if raw else default_value


def main():
    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        return

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"naver_full_pipeline_v3_log_{now}.csv"
    logs = []

    print()
    print("네이버 FANDEX 통합 파이프라인 v3 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()
    print("v3 실행 순서")
    print("1. 원본 수집 선택")
    print("2. 후처리 safe v2")
    print("3. 검색트렌드 비교 v2")
    print("4. final v3 자동 생성")
    print("5. ranking v3 생성")
    print()

    collect_answer = ask_yes_no("원본 수집부터 실행할까요?", "n")

    if collect_answer == "y":
        print()
        print("[1단계] 네이버 원본 수집 실행")
        print("수집 조건을 입력하세요. 그냥 엔터 치면 기본값으로 갑니다.")
        print()

        news_count = ask_text("뉴스 수집 개수", "1000")
        blog_count = ask_text("블로그 수집 개수", "1000")
        sort_type = ask_text("정렬 방식 sim/date 중 선택", "date")
        trend_days = ask_text("검색트렌드 기간, 최근 N일", "30")
        time_unit = ask_text("검색트렌드 단위 date/week/month 중 선택", "date")

        collector_input = "\n".join([
            news_count,
            blog_count,
            sort_type,
            trend_days,
            time_unit,
            "",
        ])

        ok, output = run_script(
            "naver_multi_collector_v2.py",
            input_text=collector_input,
            step_name="1단계 원본 수집",
            target="all",
        )

        logs.append({
            "step": "collect_raw",
            "target": "all",
            "status": "success" if ok else "fail",
            "message": output[:500],
            "createdAt": datetime.now().isoformat(timespec="seconds"),
        })

        if not ok:
            write_log(log_file, logs)
            print("원본 수집 단계에서 실패했습니다.")
            print(f"로그 파일: {log_file}")
            return
    else:
        print()
        print("[1단계] 원본 수집 건너뜀")
        logs.append({
            "step": "collect_raw",
            "target": "all",
            "status": "skipped",
            "message": "원본 수집 건너뜀",
            "createdAt": datetime.now().isoformat(timespec="seconds"),
        })

    print()
    print("[2단계] 후처리 safe v2 실행")

    ok, output = run_script(
        "naver_batch_pipeline_safe_v2.py",
        input_text="",
        step_name="2단계 후처리 safe v2",
        target="all",
    )

    logs.append({
        "step": "postprocess_safe_v2",
        "target": "all",
        "status": "success" if ok else "fail",
        "message": output[:500],
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    if not ok:
        write_log(log_file, logs)
        print("후처리 safe v2 단계에서 실패했습니다.")
        print(f"로그 파일: {log_file}")
        return

    print()
    print("[3단계] 검색트렌드 비교 v2 실행")

    compare_days = ask_text("비교 검색트렌드 기간, 최근 N일", "30")
    compare_unit = ask_text("비교 검색트렌드 단위 date/week/month 중 선택", "date")

    compare_input = "\n".join([
        compare_days,
        compare_unit,
        "",
    ])

    ok, output = run_script(
        "naver_search_trend_compare_v2.py",
        input_text=compare_input,
        step_name="3단계 검색트렌드 비교 v2",
        target="all",
    )

    logs.append({
        "step": "search_compare_v2",
        "target": "all",
        "status": "success" if ok else "fail",
        "message": output[:500],
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    if not ok:
        write_log(log_file, logs)
        print("검색트렌드 비교 v2 단계에서 실패했습니다.")
        print(f"로그 파일: {log_file}")
        return

    print()
    print("[4단계] final v3 아티스트별 자동 생성")

    final_success = 0
    final_fail = 0

    for artist in artists:
        ok, output = run_script(
            "naver_fandex_final_score_v3.py",
            input_text=artist + "\n",
            step_name=f"4단계 final v3 생성 - {artist}",
            target=artist,
        )

        logs.append({
            "step": "final_v3",
            "target": artist,
            "status": "success" if ok else "fail",
            "message": output[:500],
            "createdAt": datetime.now().isoformat(timespec="seconds"),
        })

        if ok:
            final_success += 1
        else:
            final_fail += 1

    print()
    print(f"final v3 생성 결과: 성공 {final_success}명 / 실패 {final_fail}명")

    if final_fail > 0:
        write_log(log_file, logs)
        print("final v3 생성 실패가 있습니다.")
        print(f"로그 파일: {log_file}")
        return

    print()
    print("[5단계] ranking v3 생성")

    ok, output = run_script(
        "naver_fandex_ranking_v3.py",
        input_text="",
        step_name="5단계 ranking v3 생성",
        target="all",
    )

    logs.append({
        "step": "ranking_v3",
        "target": "all",
        "status": "success" if ok else "fail",
        "message": output[:500],
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    write_log(log_file, logs)

    if not ok:
        print("ranking v3 생성 단계에서 실패했습니다.")
        print(f"로그 파일: {log_file}")
        return

    print()
    print("네이버 FANDEX 통합 파이프라인 v3 종료")
    print(f"로그 파일: {log_file}")
    print()
    print("최신 ranking v3 확인 명령어:")
    print(
        'powershell -NoProfile -Command "Import-Csv '
        "(Get-ChildItem 'naver_fandex_ranking_v3_*.csv' | "
        "Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName | "
        'Format-List rank,artist,fandexNaverFinalPoint,newsIssueClusterPoint,blogTopicClusterPoint,searchDemandComparePoint"'
    )


if __name__ == "__main__":
    main()