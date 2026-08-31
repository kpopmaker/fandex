import csv
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_music_refresh_bugs_python_only_v1"

STEPS = [
    {
        "step": "collect_bugs",
        "label": "1. Bugs chart 자동 수집",
        "script": "music_chart_collect_bugs_v1.py",
    },
    {
        "step": "apply_bugs",
        "label": "2. Bugs 수집 결과 seed 반영",
        "script": "music_chart_apply_bugs_results_v1.py",
    },
    {
        "step": "music_publish",
        "label": "3. Music chart v1 점수 생성",
        "script": "music_chart_publish_v1.py",
    },
    {
        "step": "master_score",
        "label": "4. FANDEX master v6 생성",
        "script": "fandex_master_score_v6.py",
    },
]

REQUIRED_OUTPUTS = [
    "music_chart_seed_v1.csv",
    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_music_chart_artist_reports_v1_latest.json",
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
]

FAIL_KEYWORDS = [
    "Traceback",
    "Error",
    "Exception",
    "실패",
    "파일이 없습니다",
    "데이터가 없습니다",
    "파싱하지 못했습니다",
    "not found script",
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


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def check_required_scripts():
    missing = []

    for item in STEPS:
        script = Path(item["script"])
        if not script.exists():
            missing.append(item["script"])

    if not Path("music_chart_seed_v1.csv").exists():
        missing.append("music_chart_seed_v1.csv")

    if not Path("fandex_naver_ranking_v3_latest.json").exists():
        missing.append("fandex_naver_ranking_v3_latest.json")

    if not Path("fandex_youtube_ranking_v2_latest.json").exists():
        missing.append("fandex_youtube_ranking_v2_latest.json")

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

            if version != "fandex_master_v6_music_chart_uncapped_cumulative":
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
    log_file = f"fandex_music_refresh_bugs_python_only_v1_log_{now}.csv"
    logs = []

    print()
    print("FANDEX music refresh bugs python-only v1 시작")
    print("=" * 60)
    print("실행 순서:")
    print("1. Bugs chart 자동 수집")
    print("2. Bugs 결과 seed 반영")
    print("3. Music chart v1 점수 생성")
    print("4. FANDEX master v6 생성")
    print()
    print("주의: 웹사이트 public/data export는 실행하지 않습니다.")
    print("=" * 60)

    try:
        check_required_scripts()
    except Exception as e:
        print()
        print("시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

    for item in STEPS:
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
            print("Bugs music refresh 중단")
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
        "message": "bugs music refresh outputs verified",
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
    print("FANDEX music refresh bugs python-only v1 완료")
    print("=" * 60)
    print(f"publishVersion: {VERSION}")
    print(f"로그 파일: {log_file}")
    print()
    print("웹사이트 public/data는 건드리지 않았습니다.")


if __name__ == "__main__":
    main()