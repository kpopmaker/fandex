import csv
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_daily_python_only_v1_no_site_export"

BASE_STEPS = [
    {
        "step": "bugs_collect",
        "label": "1. Bugs chart 자동 수집",
        "script": "music_chart_collect_bugs_v1.py",
    },
    {
        "step": "bugs_apply",
        "label": "2. Bugs 수집 결과 seed 반영",
        "script": "music_chart_apply_bugs_results_v1.py",
    },
    {
        "step": "youtube_publish",
        "label": "3. YouTube v3 점수 생성",
        "script": "youtube_publish_v3.py",
    },
    {
        "step": "music_publish",
        "label": "4. Music chart v1 점수 생성",
        "script": "music_chart_publish_v1.py",
    },
    {
        "step": "master_score",
        "label": "5. FANDEX master v7 생성",
        "script": "fandex_master_score_v7.py",
    },
    {
        "step": "status_report",
        "label": "6. Python status report 생성",
        "script": "fandex_python_status_report_v1.py",
    },
]

YOUTUBE_REFRESH_STEP = {
    "step": "youtube_collect",
    "label": "0. YouTube video metrics 재수집",
    "script": "youtube_collect_video_metrics_v1.py",
}

BAD_API_KEY_VALUES = {
    "",
    "너의_실제_API_KEY",
    "새로_발급받은_실제_API_KEY",
    "실제_API_KEY",
    "새_실제_API_KEY",
    "YOUR_YOUTUBE_API_KEY",
    "YOUR_API_KEY",
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
    "파싱하지 못했습니다",
]


def configure_console_output():
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(errors="replace")
        except Exception:
            pass


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def should_refresh_youtube():
    return "--refresh-youtube" in sys.argv


def should_skip_bugs():
    return "--skip-bugs" in sys.argv


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
            "실제 YouTube API 키는 보통 AIza로 시작합니다."
        )

    if len(api_key) < 30:
        raise ValueError("YOUTUBE_API_KEY 길이가 너무 짧습니다.")


def build_steps():
    steps = []

    if should_refresh_youtube():
        steps.append(YOUTUBE_REFRESH_STEP)

    if should_skip_bugs():
        steps.extend([
            item for item in BASE_STEPS
            if item["step"] not in ["bugs_collect", "bugs_apply"]
        ])
    else:
        steps.extend(BASE_STEPS)

    return steps


def check_required_files(steps):
    missing = []

    for item in steps:
        if not Path(item["script"]).exists():
            missing.append(item["script"])

    required_inputs = [
        "music_chart_seed_v1.csv",
        "fandex_naver_ranking_v3_latest.json",
    ]

    if not should_refresh_youtube():
        required_inputs.append("youtube_video_metrics_v1.csv")

    for file_name in required_inputs:
        if not Path(file_name).exists():
            missing.append(file_name)

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


def main():
    configure_console_output()

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"fandex_daily_python_only_v1_log_{now}.csv"
    logs = []

    refresh_youtube = should_refresh_youtube()
    skip_bugs = should_skip_bugs()
    steps = build_steps()

    print()
    print("FANDEX daily python-only v1 시작")
    print("=" * 60)
    print(f"version: {VERSION}")
    print(f"YouTube 재수집: {'ON' if refresh_youtube else 'OFF'}")
    print(f"Bugs 갱신: {'OFF' if skip_bugs else 'ON'}")
    print("주의: 웹사이트 public/data export는 실행하지 않습니다.")
    print("=" * 60)

    try:
        if refresh_youtube:
            check_youtube_api_key()

        check_required_files(steps)
    except Exception as e:
        print()
        print("시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

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
            print("daily python-only 중단")
            print(f"실패 단계: {item['label']}")
            print(f"로그 파일: {log_file}")
            sys.exit(1)

    write_csv(
        log_file,
        logs,
        ["step", "script", "status", "returnCode", "message", "createdAt"],
    )

    print()
    print("=" * 60)
    print("FANDEX daily python-only v1 완료")
    print("=" * 60)
    print(f"로그 파일: {log_file}")
    print()
    print("웹사이트 public/data는 건드리지 않았습니다.")
    print()
    print("사용법:")
    print("일반 일일 갱신:")
    print("py fandex_daily_python_only_v1.py")
    print()
    print("YouTube API 재수집 포함:")
    print("set YOUTUBE_API_KEY=실제_API_KEY")
    print("py fandex_daily_python_only_v1.py --refresh-youtube")
    print()
    print("Bugs 갱신 없이 YouTube/음원/master/status만:")
    print("py fandex_daily_python_only_v1.py --skip-bugs")


if __name__ == "__main__":
    main()