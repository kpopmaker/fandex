import csv
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_publish_all_v4_publish_and_site_export"

DEFAULT_SITE_DATA_DIR = Path.home() / "Desktop" / "fandex" / "public" / "data"

STEPS = [
    {
        "step": "publish_all_v3",
        "label": "1. FANDEX publish all v3 실행",
        "script": "fandex_publish_all_v3.py",
        "kind": "publish",
    },
    {
        "step": "export_to_site",
        "label": "2. FANDEX site public/data export",
        "script": "fandex_export_to_site_v1.py",
        "kind": "export",
    },
]

REQUIRED_LOCAL_OUTPUTS = [
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
    "fandex_youtube_ranking_v2_latest.json",
    "fandex_music_chart_ranking_v1_latest.json",
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
}

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
    "실패",
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
    if len(sys.argv) >= 2:
        return Path(sys.argv[1]).expanduser().resolve()

    return DEFAULT_SITE_DATA_DIR


def check_youtube_api_key():
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()

    if api_key in BAD_API_KEY_VALUES:
        raise ValueError(
            "YOUTUBE_API_KEY가 설정되지 않았습니다. "
            "CMD에서 set YOUTUBE_API_KEY=실제_API_KEY 를 먼저 실행하세요."
        )

    if " " in api_key:
        raise ValueError("YOUTUBE_API_KEY 안에 공백이 들어가 있습니다.")


def check_required_scripts():
    missing = []

    for item in STEPS:
        script = item["script"]
        if not Path(script).exists():
            missing.append(script)

    if missing:
        raise FileNotFoundError("필수 실행 파일 없음: " + ", ".join(missing))


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


def verify_local_outputs():
    problems = []

    for file_name in REQUIRED_LOCAL_OUTPUTS:
        if not Path(file_name).exists():
            problems.append(f"local output 없음: {file_name}")

    master_path = Path("fandex_master_ranking_latest.json")

    if master_path.exists():
        try:
            data = read_json(master_path)
            version = data.get("version", "")
            score_mode = data.get("scoreMode", "")
            ranking = data.get("ranking", [])

            if version != "fandex_master_v6_music_chart_uncapped_cumulative":
                problems.append(f"local master version 이상: {version}")

            if score_mode != "uncapped_cumulative_source_points":
                problems.append(f"local master scoreMode 이상: {score_mode}")

            if not ranking:
                problems.append("local master ranking 데이터 없음")

        except Exception as e:
            problems.append(f"local master JSON 읽기 실패: {e}")

    return problems


def verify_site_outputs(site_data_dir):
    problems = []

    if not site_data_dir.exists():
        problems.append(f"site data dir 없음: {site_data_dir}")
        return problems

    for file_name in REQUIRED_SITE_OUTPUTS:
        path = site_data_dir / file_name
        if not path.exists():
            problems.append(f"site output 없음: {file_name}")

    site_master_path = site_data_dir / "fandex_master_ranking_latest.json"

    if site_master_path.exists():
        try:
            data = read_json(site_master_path)
            version = data.get("version", "")
            score_mode = data.get("scoreMode", "")
            ranking = data.get("ranking", [])

            if version != "fandex_master_v6_music_chart_uncapped_cumulative":
                problems.append(f"site master version 이상: {version}")

            if score_mode != "uncapped_cumulative_source_points":
                problems.append(f"site master scoreMode 이상: {score_mode}")

            if not ranking:
                problems.append("site master ranking 데이터 없음")

            for item in ranking:
                artist = item.get("artist", "")
                point = item.get("fandexFinalPoint", "")

                if not artist:
                    problems.append("site master artist 누락")

                if point in [None, ""]:
                    problems.append(f"{artist or '-'}: site FANDEX 점수 누락")

        except Exception as e:
            problems.append(f"site master JSON 읽기 실패: {e}")

    manifest_path = site_data_dir / "fandex_data_manifest_latest.json"

    if manifest_path.exists():
        try:
            manifest = read_json(manifest_path)

            if manifest.get("sourceVersion") != "fandex_master_v6_music_chart_uncapped_cumulative":
                problems.append(
                    f"manifest sourceVersion 이상: {manifest.get('sourceVersion')}"
                )

        except Exception as e:
            problems.append(f"manifest JSON 읽기 실패: {e}")

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
    log_file = f"fandex_publish_all_v4_log_{now}.csv"
    logs = []
    site_data_dir = get_site_data_dir()

    print()
    print("FANDEX publish all v4 시작")
    print("=" * 60)
    print("실행 순서:")
    print("1. YouTube 수집 → YouTube v2 → Music chart v1 → master v6")
    print("2. master/latest JSON을 FANDEX 웹사이트 public/data로 export")
    print("=" * 60)
    print(f"site data dir: {site_data_dir}")

    try:
        check_youtube_api_key()
        check_required_scripts()
    except Exception as e:
        print()
        print("publish 시작 전 검증 실패")
        print(f"원인: {e}")
        sys.exit(1)

    for item in STEPS:
        step = item["step"]
        label = item["label"]
        script = item["script"]
        kind = item["kind"]

        print()
        print(f"[{label}]")
        print(f"실행 파일: {script}")

        args = []

        if kind == "export" and len(sys.argv) >= 2:
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

    problems = []
    problems.extend(verify_local_outputs())
    problems.extend(verify_site_outputs(site_data_dir))

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
        "message": "local and site outputs verified",
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
    print("FANDEX publish all v4 완료")
    print("=" * 60)
    print("publishVersion: fandex_publish_all_v4_publish_and_site_export")
    print(f"로그 파일: {log_file}")
    print()
    print("웹사이트 갱신 파일 위치:")
    print(site_data_dir)
    print()
    print("Codex 확인 권장:")
    print("cd %USERPROFILE%\\Desktop\\fandex")
    print("git status --short")
    print("npm run lint")
    print("npm run build")


if __name__ == "__main__":
    main()