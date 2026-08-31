import csv
import os
import subprocess
import sys
from datetime import datetime


ARTIST_LIST_FILE = "artist_list.txt"

ARTIST_STEPS = [
    ("중심성 필터", "naver_relevance_filter.py"),
    ("뉴스 감성 점수", "naver_fandex_cumulative_score.py"),
    ("뉴스 이슈 묶음", "naver_news_issue_cluster.py"),
    ("블로그 주제 묶음", "naver_blog_topic_cluster.py"),
    ("최종 점수 v2", "naver_fandex_final_score_v2.py"),
]

GLOBAL_STEPS = [
    ("랭킹 v2", "naver_fandex_ranking_v2.py"),
    ("상태 점검 v2", "naver_fandex_status_check_v2.py"),
]

FAIL_KEYWORDS = [
    "파일이 없습니다",
    "필요한 파일이 부족합니다",
    "부족합니다",
    "없습니다",
    "오류",
    "실패",
    "Traceback",
    "Error",
    "Exception",
    "missing",
    "failed",
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


def has_fail_message(stdout, stderr):
    combined = f"{stdout or ''}\n{stderr or ''}"

    for keyword in FAIL_KEYWORDS:
        if keyword in combined:
            return True, keyword

    return False, ""


def run_script(script, input_text="", timeout_seconds=900):
    if not os.path.exists(script):
        return {
            "status": "missing_script",
            "returncode": "",
            "stdout": "",
            "stderr": f"{script} 파일이 없습니다.",
            "failKeyword": "파일이 없습니다",
        }

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    try:
        result = subprocess.run(
            [sys.executable, script],
            input=input_text,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            encoding="utf-8",
            errors="replace",
            env=env,
        )

        stdout = result.stdout or ""
        stderr = result.stderr or ""

        fail_by_message, keyword = has_fail_message(stdout, stderr)

        if result.returncode != 0:
            status = "failed_returncode"
        elif fail_by_message:
            status = "failed_message"
        else:
            status = "success"

        return {
            "status": status,
            "returncode": result.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "failKeyword": keyword,
        }

    except subprocess.TimeoutExpired as e:
        return {
            "status": "timeout",
            "returncode": "",
            "stdout": e.stdout or "",
            "stderr": e.stderr or f"{timeout_seconds}초 안에 끝나지 않았습니다.",
            "failKeyword": "timeout",
        }

    except Exception as e:
        return {
            "status": "error",
            "returncode": "",
            "stdout": "",
            "stderr": str(e),
            "failKeyword": "Exception",
        }


def short_text(text, limit=1200):
    text = (text or "").strip()

    if len(text) <= limit:
        return text

    return text[-limit:]


def write_log(rows):
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"naver_batch_pipeline_v2_log_{now}.csv"

    fieldnames = [
        "artist",
        "step",
        "script",
        "status",
        "returncode",
        "failKeyword",
        "stdoutTail",
        "stderrTail",
        "finishedAt",
    ]

    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return filename


def print_failure_detail(result):
    if result.get("failKeyword"):
        print(f"  감지된 실패 문구: {result['failKeyword']}")

    stdout_tail = short_text(result.get("stdout", ""), 500)
    stderr_tail = short_text(result.get("stderr", ""), 500)

    if stdout_tail:
        print("  출력 일부:")
        print(stdout_tail)

    if stderr_tail:
        print("  오류 일부:")
        print(stderr_tail)


def main():
    artists = read_artist_list()

    if not artists:
        print("artist_list.txt에 아티스트명이 없습니다.")
        print("예시: 아이유")
        return

    logs = []
    failed_artists = []

    print()
    print("네이버 FANDEX 배치 파이프라인 v2 안전버전 시작")
    print(f"대상 아티스트: {', '.join(artists)}")
    print()

    for artist in artists:
        print("=" * 60)
        print(f"[{artist}] 처리 시작")
        print("=" * 60)

        artist_failed = False

        for step_name, script in ARTIST_STEPS:
            print(f"- {step_name} 실행 중: {script}")

            result = run_script(script, input_text=f"{artist}\n")

            print(f"  결과: {result['status']}")

            logs.append({
                "artist": artist,
                "step": step_name,
                "script": script,
                "status": result["status"],
                "returncode": result["returncode"],
                "failKeyword": result["failKeyword"],
                "stdoutTail": short_text(result["stdout"]),
                "stderrTail": short_text(result["stderr"]),
                "finishedAt": datetime.now().isoformat(timespec="seconds"),
            })

            if result["status"] != "success":
                print("  이 단계에서 문제가 감지되어 해당 아티스트 처리를 중단합니다.")
                print_failure_detail(result)
                failed_artists.append(artist)
                artist_failed = True
                break

        if not artist_failed:
            print(f"[{artist}] 전체 후처리 완료")

        print()

    print("=" * 60)
    print("전체 랭킹/상태 점검 실행")
    print("=" * 60)

    for step_name, script in GLOBAL_STEPS:
        print(f"- {step_name} 실행 중: {script}")

        result = run_script(script)

        print(f"  결과: {result['status']}")

        logs.append({
            "artist": "ALL",
            "step": step_name,
            "script": script,
            "status": result["status"],
            "returncode": result["returncode"],
            "failKeyword": result["failKeyword"],
            "stdoutTail": short_text(result["stdout"]),
            "stderrTail": short_text(result["stderr"]),
            "finishedAt": datetime.now().isoformat(timespec="seconds"),
        })

        if result["status"] != "success":
            print("  전체 단계에서 문제가 감지되었습니다.")
            print_failure_detail(result)

    log_file = write_log(logs)

    print()
    print("배치 파이프라인 종료")
    print(f"로그 파일: {log_file}")

    if failed_artists:
        print()
        print("문제가 감지된 아티스트:")
        for artist in sorted(set(failed_artists)):
            print(f"- {artist}")
    else:
        print()
        print("모든 아티스트 처리 성공")


if __name__ == "__main__":
    main()