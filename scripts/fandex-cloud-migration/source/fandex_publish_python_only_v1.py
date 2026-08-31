import csv
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_publish_python_only_v1_no_site_export"

BASE_STEPS = [
    {
        "step": "youtube_publish_v2",
        "label": "1. YouTube v3 점수 생성",
        "script": "youtube_publish_v3.py",
    },
    {
        "step": "music_chart_publish_v1",
        "label": "2. Music chart v1 점수 생성",
        "script": "music_chart_publish_v1.py",
    },
    {
        "step": "master_score_v6",
        "label": "3. FANDEX master v7 생성",
        "script": "fandex_master_score_v7.py",
    },
]

YOUTUBE_COLLECT_STEP = {
    "step": "youtube_collect",
    "label": "0. YouTube video metrics 재수집",
    "script": "youtube_collect_video_metrics_v1.py",
}

REQUIRED_OUTPUTS = [
    "fandex_youtube_ranking_v2_latest.json",
    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
]

BAD_API_KEY_VALUES = {
    "",
    "너의_실제_API_KEY",
    "새로_발급받은_실제_API_KEY",
    "YOUR_YOUTUBE_API_KEY",

    "실제_API_KEY",
    "새_실제_API_KEY",
    "새로_발급받은_API_KEY",
    "YOUR_API_KEY",}

FAIL_KEYWORDS = [
    "Traceback",
    "Error",
    "Exception",
    "API key not valid",
    "INVALID_ARGUMENT",
    "publish 중단",
    "publish 실패",
    "검증 실패",
    "파일이 없습니다",
    "데이터가 없습니다",
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


def should_refresh_youtube():
    return "--refresh-youtube" in sys.argv


def check_youtube_api_key():
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()

    if api_key in BAD_API_KEY_VALUES:
        raise ValueError(
            "YOUTUBE_API_KEY가 유효하지 않습니다. "
            "YouTube 재수집을 하려면 set YOUTUBE_API_KEY=실제_API_KEY 를 먼저 실행하세요."
        )

    if " " in api_key:
        raise ValueError("YOUTUBE_API_KEY 안에 공백이 들어가 있습니다.")

    if not api_key.startswith("AIza"):
        raise ValueError(
            "YOUTUBE_API_KEY 형식이 이상합니다. "
            "실제 YouTube API 키는 보통 AIza로 시작합니다. "
            "예시 문구를 그대로 넣지 말고 Google Cloud에서 발급받은 실제 키를 넣으세요."
        )

    if len(api_key) < 30:
        raise ValueError("YOUTUBE_API_KEY 길이가 너무 짧습니다. 실제 키를 다시 확인하세요.")


def check_required_files(refresh_youtube):
    missing = []

    scripts = list(BASE_STEPS)

    if refresh_youtube:
        scripts = [YOUTUBE_COLLECT_STEP] + scripts

    for item in scripts:
        if not Path(item["script"]).exists():
            missing.append(item["script"])

    if not refresh_youtube and not Path("youtube_video_metrics_v1.csv").exists():
        missing.append("youtube_video_metrics_v1.csv")

    if not Path("music_chart_seed_v1.csv").exists():
        missing.append("music_chart_seed_v1.csv")

    if not Path("fandex_naver_ranking_v3_latest.json").exists():
        missing.append("fandex_naver_ranking_v3_latest.json")

    if missing:
        raise FileNotFoundError("필수 파일 없음: " + ", ".join(missing))


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

    for file_name in REQUIRED_OUTPUTS:
        if not Path(file_name).exists():
            problems.append(f"output 없음: {file_name}")

    master_path = Path("fandex_master_ranking_latest.json")

    if master_path.exists():
        try:
            data = read_json(master_path)

            version = data.get("version", "")
            score_mode = data.get("scoreMode", "")
            ranking = data.get("ranking", [])

            if version != "fandex_master_v7_youtube_v3_uncapped_cumulative":
                problems.append(f"master version 이상: {version}")

            if score_mode != "uncapped_cumulative_source_points":
                problems.append(f"master scoreMode 이상: {score_mode}")

            if not ranking:
                problems.append("master ranking 데이터 없음")

        except Exception as e:
            problems.append(f"master JSON 읽기 실패: {e}")

    return problems


def print_master_preview():
    master_path = Path("fandex_master_ranking_latest.json")

    if not master_path.exists():
        return

    data = read_json(master_path)
    ranking = data.get("ranking", [])

    print()
    print("Python 내부 FANDEX master 미리보기")
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
    log_file = f"fandex_publish_python_only_v1_log_{now}.csv"
    logs = []

    refresh_youtube = should_refresh_youtube()

    print()
    print("FANDEX publish python-only v1 시작")
    print("=" * 60)

    if refresh_youtube:
        print("실행 모드: YouTube API 재수집 포함")
    else:
        print("실행 모드: 기존 YouTube CSV 재사용")

    print("주의: 웹사이트 public/data export는 실행하지 않습니다.")
    print("=" * 60)

    try:
        if refresh_youtube:
            check_youtube_api_key()

        check_required_files(refresh_youtube)
    except Exception as e:
        print()
        print("시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

    steps = []

    if refresh_youtube:
        steps.append(YOUTUBE_COLLECT_STEP)

    steps.extend(BASE_STEPS)

    for item in steps:
        print()
        print(f"[{item['label']}]")
        print(f"실행 파일: {item['script']}")

        ok, return_code, output = run_script(item["script"])

        if output.strip():
            print(output.strip())

        logs.append({
            "step": item["step"],
            "script": item["script"],
            "status": "success" if ok else "fail",
            "returnCode": return_code,
            "message": output[:1200],
            "createdAt": datetime.now().isoformat(timespec="seconds"),
        })

        if not ok:
            write_csv(
                log_file,
                logs,
                ["step", "script", "status", "returnCode", "message", "createdAt"],
            )

            print()
            print("python-only publish 중단")
            print(f"실패 단계: {item['label']}")
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
        print("결과 검증 실패")
        for problem in problems:
            print(f"- {problem}")
        print(f"로그 파일: {log_file}")
        sys.exit(1)

    logs.append({
        "step": "verify_outputs",
        "script": "",
        "status": "success",
        "returnCode": "",
        "message": "python-only outputs verified",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    write_csv(
        log_file,
        logs,
        ["step", "script", "status", "returnCode", "message", "createdAt"],
    )

    print_master_preview()

    print()
    print("=" * 60)
    print("FANDEX publish python-only v1 완료")
    print("=" * 60)
    print(f"publishVersion: {VERSION}")
    print(f"로그 파일: {log_file}")
    print()
    print("웹사이트 public/data는 건드리지 않았습니다.")


if __name__ == "__main__":
    main()