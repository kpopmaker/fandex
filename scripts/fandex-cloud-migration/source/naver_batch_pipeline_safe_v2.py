import csv
import os
import subprocess
import sys
from datetime import datetime


ARTIST_LIST_FILE = "artist_list.txt"

ARTIST_STEPS = [
    ("중심성 필터", "naver_relevance_filter.py"),
    ("뉴스 감성 점수 v2", "naver_fandex_cumulative_score_v2.py"),
    ("뉴스 이슈 묶음 v2", "naver_news_issue_cluster_v2.py"),
    ("블로그 주제 묶음 v2", "naver_blog_topic_cluster_v2.py"),
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
    "찾을 수 없습니다",
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


def detect_failure(stdout, stderr, returncode):
    text = f"{stdout or ''}\n{stderr or ''}"

    if returncode != 0:
        return True, "returncode"

    for keyword in FAIL_KEYWORDS:
        if keyword in text:
            return True, keyword

    return False, ""


def run_script(script, input_text=""):
    if not os.path.exists(script):
        return {
            "status": "failed",
            "returncode": "",
            "failKeyword": "파일이 없습니다",
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

    failed, keyword = detect_failure(result.stdout, result.stderr, result.returncode)

    return {
        "status": "failed" if failed else "success",
        "returncode": result.returncode,
        "failKeyword": keyword,
        "stdout": result.stdout or "",
        "stderr": result.stderr or "",
    }


def tail(text, limit=800):
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[-limit:]


def write_log(rows):
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"naver_batch_pipeline_safe_v2_log_{now}.csv"

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

            if result["failKeyword"]:
                print(f"  감지 문구: {result['failKeyword']}")

            logs.append({
                "artist": artist,
                "step": step_name,
                "script": script,
                "status": result["status"],
                "returncode": result["returncode"],
                "failKeyword": result["failKeyword"],
                "stdoutTail": tail(result["stdout"]),
                "stderrTail": tail(result["stderr"]),
                "finishedAt": datetime.now().isoformat(timespec="seconds"),
            })

            if result["status"] != "success":
                print("  이 단계에서 중단합니다.")
                print(tail(result["stdout"], 500))
                print(tail(result["stderr"], 500))
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

        if result["failKeyword"]:
            print(f"  감지 문구: {result['failKeyword']}")

        logs.append({
            "artist": "ALL",
            "step": step_name,
            "script": script,
            "status": result["status"],
            "returncode": result["returncode"],
            "failKeyword": result["failKeyword"],
            "stdoutTail": tail(result["stdout"]),
            "stderrTail": tail(result["stderr"]),
            "finishedAt": datetime.now().isoformat(timespec="seconds"),
        })

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
