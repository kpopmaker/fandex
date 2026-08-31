import csv
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_publish_all_v5_safe_reuse_youtube_metrics"

DEFAULT_SITE_DATA_DIR = Path.home() / "Desktop" / "fandex" / "public" / "data"

BASE_STEPS = [
    {
        "step": "youtube_publish_v2",
        "label": "1. YouTube v2 콘텐츠 타입 점수 생성",
        "script": "youtube_publish_v2.py",
    },
    {
        "step": "music_chart_publish_v1",
        "label": "2. Music chart v1 음원 차트 점수 생성",
        "script": "music_chart_publish_v1.py",
    },
    {
        "step": "master_score_v6",
        "label": "3. FANDEX master v6 음원 포함 무상한 누적 점수 생성",
        "script": "fandex_master_score_v6.py",
    },
    {
        "step": "export_to_site",
        "label": "4. FANDEX site public/data export",
        "script": "fandex_export_to_site_v1.py",
    },
]

YOUTUBE_COLLECT_STEP = {
    "step": "youtube_collect",
    "label": "0. YouTube video metrics 재수집",
    "script": "youtube_collect_video_metrics_v1.py",
}

REQUIRED_INPUTS = [
    "youtube_video_metrics_v1.csv",
    "music_chart_seed_v1.csv",
]

REQUIRED_SITE_OUTPUTS = [
    "fandex_data_manifest_latest.json",
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
    "fandex_naver_ranking_v3_latest.json",
    "fandex_youtube_ranking_v2_latest.json",
    "fandex_music_chart_ranking_v1_latest.json",
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
    "export 시작 전 검증 실패",
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


def get_site_data_dir():
    if len(sys.argv) >= 2 and not sys.argv[1].startswith("--"):
        return Path(sys.argv[1]).expanduser().resolve()

    return DEFAULT_SITE_DATA_DIR


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

    if refresh_youtube:
        required_scripts = [YOUTUBE_COLLECT_STEP["script"]] + [
            item["script"] for item in BASE_STEPS
        ]
    else:
        required_scripts = [item["script"] for item in BASE_STEPS]

    for script in required_scripts:
        if not Path(script).exists():
            missing.append(script)

    for file_name in REQUIRED_INPUTS:
        if file_name == "youtube_video_metrics_v1.csv" and refresh_youtube:
            continue

        if not Path(file_name).exists():
            missing.append(file_name)

    if missing:
        raise FileNotFoundError("필수 파일 없음: " + ", ".join(missing))


def run_script(script, args=None):
    args = args or []

    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8:replace"

    process = subprocess.run(
        [sys.executable, script] + args,
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


def verify_site_outputs(site_data_dir):
    problems = []

    if not site_data_dir.exists():
        problems.append(f"site data dir 없음: {site_data_dir}")
        return problems

    for file_name in REQUIRED_SITE_OUTPUTS:
        path = site_data_dir / file_name
        if not path.exists():
            problems.append(f"site output 없음: {file_name}")

    master_path = site_data_dir / "fandex_master_ranking_latest.json"

    if master_path.exists():
        try:
            data = read_json(master_path)
            version = data.get("version", "")
            score_mode = data.get("scoreMode", "")
            ranking = data.get("ranking", [])

            if version != "fandex_master_v6_music_chart_uncapped_cumulative":
                problems.append(f"site master version 이상: {version}")

            if score_mode != "uncapped_cumulative_source_points":
                problems.append(f"site master scoreMode 이상: {score_mode}")

            if not ranking:
                problems.append("site master ranking 데이터 없음")

        except Exception as e:
            problems.append(f"site master JSON 읽기 실패: {e}")

    return problems


def print_final_preview(site_data_dir):
    master_path = site_data_dir / "fandex_master_ranking_latest.json"

    if not master_path.exists():
        return

    data = read_json(master_path)
    ranking = data.get("ranking", [])

    print()
    print("웹사이트 export 기준 FANDEX master 미리보기")
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
    log_file = f"fandex_publish_all_v5_log_{now}.csv"
    logs = []

    site_data_dir = get_site_data_dir()
    refresh_youtube = should_refresh_youtube()

    print()
    print("FANDEX publish all v5 시작")
    print("=" * 60)

    if refresh_youtube:
        print("실행 모드: YouTube API 재수집 포함")
    else:
        print("실행 모드: 기존 youtube_video_metrics_v1.csv 재사용")

    print("실행 순서:")
    if refresh_youtube:
        print("0. YouTube 수집")
    print("1. YouTube v2")
    print("2. Music chart v1")
    print("3. master v6")
    print("4. website public/data export")
    print("=" * 60)
    print(f"site data dir: {site_data_dir}")

    try:
        if refresh_youtube:
            check_youtube_api_key()

        check_required_files(refresh_youtube)
    except Exception as e:
        print()
        print("publish 시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

    steps = []

    if refresh_youtube:
        steps.append(YOUTUBE_COLLECT_STEP)

    steps.extend(BASE_STEPS)

    for item in steps:
        step = item["step"]
        label = item["label"]
        script = item["script"]

        print()
        print(f"[{label}]")
        print(f"실행 파일: {script}")

        args = []
        if script == "fandex_export_to_site_v1.py":
            args = [str(site_data_dir)]

        ok, return_code, output = run_script(script, args=args)

        if output.strip():
            print(output.strip())

        logs.append({
            "step": step,
            "script": script,
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
            print("publish 중단")
            print(f"실패 단계: {label}")
            print(f"로그 파일: {log_file}")
            sys.exit(1)

    problems = verify_site_outputs(site_data_dir)

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
        print("publish/export 결과 검증 실패")
        for problem in problems:
            print(f"- {problem}")
        print(f"로그 파일: {log_file}")
        sys.exit(1)

    logs.append({
        "step": "verify_outputs",
        "script": "",
        "status": "success",
        "returnCode": "",
        "message": "site outputs verified",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })

    write_csv(
        log_file,
        logs,
        ["step", "script", "status", "returnCode", "message", "createdAt"],
    )

    print_final_preview(site_data_dir)

    print()
    print("=" * 60)
    print("FANDEX publish all v5 완료")
    print("=" * 60)
    print(f"publishVersion: {VERSION}")
    print(f"로그 파일: {log_file}")

    print()
    print("사용법:")
    print("기존 YouTube 수집값 재사용:")
    print("py fandex_publish_all_v5.py")
    print()
    print("YouTube API 재수집 포함:")
    print("set YOUTUBE_API_KEY=실제_API_KEY")
    print("py fandex_publish_all_v5.py --refresh-youtube")


if __name__ == "__main__":
    main()