import csv
import json
import os
import subprocess
import sys
from datetime import datetime


VERSION = "fandex_publish_all_v3_youtube_music_master_v6"

STEPS = [
    {
        "step": "youtube_collect",
        "label": "1. YouTube video metrics 수집",
        "script": "youtube_collect_video_metrics_v1.py",
    },
    {
        "step": "youtube_publish_v2",
        "label": "2. YouTube v2 콘텐츠 타입 점수 생성",
        "script": "youtube_publish_v2.py",
    },
    {
        "step": "music_chart_publish_v1",
        "label": "3. Music chart v1 음원 차트 점수 생성",
        "script": "music_chart_publish_v1.py",
    },
    {
        "step": "master_score_v6",
        "label": "4. FANDEX master v6 음원 포함 무상한 누적 점수 생성",
        "script": "fandex_master_score_v6.py",
    },
]

REQUIRED_OUTPUTS = [
    "youtube_video_metrics_v1.csv",
    "fandex_youtube_ranking_v2_latest.json",
    "fandex_youtube_artist_reports_v2_latest.json",
    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_music_chart_artist_reports_v1_latest.json",
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
]

BAD_API_KEY_VALUES = {
    "",
    "너의_실제_API_KEY",
    "새로_발급받은_실제_API_KEY",
    "YOUR_YOUTUBE_API_KEY",
}

FAIL_KEYWORDS = [
    "Traceback",
    "Error",
    "Exception",
    "API key not valid",
    "INVALID_ARGUMENT",
    "실패",
    "파일이 없습니다",
    "데이터가 없습니다",
    "유효한 차트 데이터가 없습니다",
]


def configure_console_output():
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(errors="replace")
        except Exception:
            pass


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def check_youtube_api_key():
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()

    if api_key in BAD_API_KEY_VALUES:
        raise ValueError(
            "YOUTUBE_API_KEY가 설정되지 않았습니다. "
            "CMD에서 set YOUTUBE_API_KEY=실제_API_KEY 를 먼저 실행하세요."
        )

    if " " in api_key:
        raise ValueError("YOUTUBE_API_KEY 안에 공백이 들어가 있습니다.")


def check_music_seed():
    if not os.path.exists("music_chart_seed_v1.csv"):
        raise FileNotFoundError(
            "music_chart_seed_v1.csv 파일이 없습니다. "
            "먼저 음원 차트 seed CSV를 만들어야 합니다."
        )


def run_script(script):
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8:replace"

    process = subprocess.run(
        [sys.executable, script],
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    output = (process.stdout or "") + "\n" + (process.stderr or "")
    ok = process.returncode == 0

    for keyword in FAIL_KEYWORDS:
        if keyword in output:
            ok = False
            break

    return ok, process.returncode, output


def verify_outputs():
    problems = []

    for path in REQUIRED_OUTPUTS:
        if not os.path.exists(path):
            problems.append(f"{path} 파일 없음")

    master_path = "fandex_master_ranking_latest.json"

    if os.path.exists(master_path):
        try:
            data = read_json(master_path)
            version = data.get("version", "")
            score_mode = data.get("scoreMode", "")
            ranking = data.get("ranking", [])

            if version != "fandex_master_v6_music_chart_uncapped_cumulative":
                problems.append(f"master ranking version 이상: {version}")

            if score_mode != "uncapped_cumulative_source_points":
                problems.append(f"master ranking scoreMode 이상: {score_mode}")

            if not ranking:
                problems.append("master ranking 데이터 없음")

            for item in ranking:
                if not item.get("artist"):
                    problems.append("master ranking artist 누락")

                if item.get("fandexFinalPoint") in [None, ""]:
                    problems.append(f"{item.get('artist', '-')}: FANDEX 점수 누락")

        except Exception as e:
            problems.append(f"master ranking JSON 읽기 실패: {e}")

    return problems


def print_final_preview():
    master_path = "fandex_master_ranking_latest.json"

    if not os.path.exists(master_path):
        return

    data = read_json(master_path)
    ranking = data.get("ranking", [])

    print()
    print("FANDEX master latest 미리보기")
    print("-" * 60)

    for item in ranking:
        source_points = item.get("sourcePoints", {})
        naver = source_points.get("naver", {})
        youtube = source_points.get("youtube", {})
        music_chart = source_points.get("musicChart", {})

        print(
            f"{item.get('rank')}위. {item.get('artist')} "
            f"- FANDEX {item.get('fandexFinalPoint')}점 "
            f"(네이버 +{naver.get('cumulativePoint', 0)} / "
            f"유튜브 +{youtube.get('cumulativePoint', 0)} / "
            f"음원 +{music_chart.get('cumulativePoint', 0)})"
        )


def main():
    configure_console_output()

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"fandex_publish_all_v3_log_{now}.csv"
    logs = []

    print()
    print("FANDEX publish all v3 시작")
    print("=" * 60)
    print("실행 순서: YouTube 수집 → YouTube v2 → Music chart v1 → FANDEX master v6")
    print("master v6는 네이버 + 유튜브 + 음원 차트를 무상한 누적 점수로 합산합니다.")
    print("=" * 60)

    try:
        check_youtube_api_key()
        check_music_seed()
    except Exception as e:
        print()
        print("publish 시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

    for item in STEPS:
        step = item["step"]
        label = item["label"]
        script = item["script"]

        print()
        print(f"[{label}]")
        print(f"실행 파일: {script}")

        if not os.path.exists(script):
            message = f"{script} 파일 없음"
            print(message)

            logs.append({
                "step": step,
                "script": script,
                "status": "fail",
                "returnCode": "",
                "message": message,
                "createdAt": datetime.now().isoformat(timespec="seconds"),
            })

            write_csv(
                log_file,
                logs,
                ["step", "script", "status", "returnCode", "message", "createdAt"],
            )

            print()
            print("publish 실패")
            print(f"로그 파일: {log_file}")
            sys.exit(1)

        ok, return_code, output = run_script(script)

        if output.strip():
            print(output.strip())

        logs.append({
            "step": step,
            "script": script,
            "status": "success" if ok else "fail",
            "returnCode": return_code,
            "message": output[:1000],
            "createdAt": datetime.now().isoformat(timespec="seconds"),
        })

        if not ok:
            write_csv(
                log_file,
                logs,
                ["step", "script", "status", "returnCode", "message", "createdAt"],
            )

            print()
            print("publish 중단")
            print(f"실패 단계: {label}")
            print(f"로그 파일: {log_file}")
            sys.exit(1)

    problems = verify_outputs()

    if problems:
        for problem in problems:
            logs.append({
                "step": "verify_outputs",
                "script": "",
                "status": "fail",
                "returnCode": "",
                "message": problem,
                "createdAt": datetime.now().isoformat(timespec="seconds"),
            })

        write_csv(
            log_file,
            logs,
            ["step", "script", "status", "returnCode", "message", "createdAt"],
        )

        print()
        print("publish 결과 검증 실패")
        for problem in problems:
            print(f"- {problem}")
        print(f"로그 파일: {log_file}")
        sys.exit(1)

    logs.append({
        "step": "verify_outputs",
        "script": "",
        "status": "success",
        "returnCode": "",
        "message": "required outputs verified",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    write_csv(
        log_file,
        logs,
        ["step", "script", "status", "returnCode", "message", "createdAt"],
    )

    print_final_preview()

    print()
    print("=" * 60)
    print("FANDEX publish all v3 완료")
    print("=" * 60)
    print(f"publishVersion: {VERSION}")
    print(f"로그 파일: {log_file}")
    print()
    print("생성/갱신된 공식 파일:")
    print("- youtube_video_metrics_v1.csv")
    print("- fandex_youtube_ranking_v2_latest.json")
    print("- fandex_youtube_artist_reports_v2_latest.json")
    print("- fandex_music_chart_ranking_v1_latest.json")
    print("- fandex_music_chart_artist_reports_v1_latest.json")
    print("- fandex_master_ranking_latest.json")
    print("- fandex_master_artist_reports_latest.json")


if __name__ == "__main__":
    main()