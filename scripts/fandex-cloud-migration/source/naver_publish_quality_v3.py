import csv
import json
import locale
import os
import subprocess
import sys
from datetime import datetime


STEPS = [
    {
        "step": "quality_audit",
        "label": "1. 데이터 품질 감사",
        "script": "naver_data_quality_audit_v3.py",
    },
    {
        "step": "quality_reason_summary",
        "label": "2. 품질 reason 요약",
        "script": "naver_quality_reason_summary_v3.py",
    },
    {
        "step": "quality_blocklist",
        "label": "3. 품질 blocklist 생성",
        "script": "naver_quality_blocklist_v3.py",
    },
    {
        "step": "apply_quality_blocklist",
        "label": "4. 품질 blocklist 적용",
        "script": "naver_apply_quality_blocklist_v3.py",
    },
    {
        "step": "final_v3_batch",
        "label": "5. final v3 일괄 생성",
        "script": "naver_fandex_final_score_v3_batch.py",
    },
    {
        "step": "ranking_v3",
        "label": "6. ranking v3 생성",
        "script": "naver_fandex_ranking_v3.py",
    },
    {
        "step": "export_ranking_json",
        "label": "7. 사이트용 ranking JSON 생성",
        "script": "naver_fandex_export_v3_json.py",
    },
    {
        "step": "artist_report_json",
        "label": "8. 아티스트 상세 report JSON 생성",
        "script": "naver_artist_report_v3.py",
    },
]


FAIL_KEYWORDS = [
    "Traceback",
    "Error",
    "Exception",
    "파일이 없습니다",
    "필요한 파일이 부족합니다",
    "데이터가 없습니다",
    "아티스트명이 없습니다",
    "실패했습니다",
    "실패 감지",
]


REQUIRED_OUTPUTS = [
    "fandex_naver_ranking_v3_latest.json",
    "fandex_naver_artist_reports_v3_latest.json",
]


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_script(script):
    console_encoding = locale.getpreferredencoding(False) or "utf-8"

    process = subprocess.run(
        [sys.executable, script],
        text=True,
        capture_output=True,
        encoding=console_encoding,
        errors="replace",
    )

    output = (process.stdout or "") + "\n" + (process.stderr or "")

    ok = process.returncode == 0

    for keyword in FAIL_KEYWORDS:
        if keyword in output:
            ok = False
            break

    return ok, process.returncode, output


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_outputs():
    problems = []

    for path in REQUIRED_OUTPUTS:
        if not os.path.exists(path):
            problems.append(f"{path} 파일 없음")

    ranking_path = "fandex_naver_ranking_v3_latest.json"

    if os.path.exists(ranking_path):
        try:
            data = read_json(ranking_path)
            version = data.get("version", "")
            ranking = data.get("ranking", [])

            if version != "v3_compare_search_quality":
                problems.append(f"ranking JSON version 이상: {version}")

            if not ranking:
                problems.append("ranking JSON 안에 ranking 데이터 없음")

            for item in ranking:
                if not item.get("artist"):
                    problems.append("ranking item artist 누락")

                if item.get("fandexNaverFinalPoint") in [None, ""]:
                    problems.append(f"{item.get('artist', '-')}: 최종점수 누락")

        except Exception as e:
            problems.append(f"ranking JSON 읽기 실패: {e}")

    report_path = "fandex_naver_artist_reports_v3_latest.json"

    if os.path.exists(report_path):
        try:
            data = read_json(report_path)
            version = data.get("version", "")
            reports = data.get("reports", [])

            if version != "v3_compare_search_quality":
                problems.append(f"artist report JSON version 이상: {version}")

            if not reports:
                problems.append("artist report JSON 안에 reports 데이터 없음")

        except Exception as e:
            problems.append(f"artist report JSON 읽기 실패: {e}")

    return problems


def print_final_preview():
    ranking_path = "fandex_naver_ranking_v3_latest.json"

    if not os.path.exists(ranking_path):
        return

    data = read_json(ranking_path)
    ranking = data.get("ranking", [])

    print()
    print("최종 ranking JSON 미리보기")
    print("-" * 60)

    for item in ranking:
        components = item.get("components", {})
        print(
            f"{item.get('rank')}위. {item.get('artist')} "
            f"- {item.get('fandexNaverFinalPoint')}점 "
            f"(뉴스 {components.get('newsIssueClusterPoint')} / "
            f"블로그 {components.get('blogTopicClusterPoint')} / "
            f"검색 {components.get('searchDemandComparePoint')})"
        )


def main():
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"naver_publish_quality_v3_log_{now}.csv"

    logs = []

    print()
    print("네이버 FANDEX v3 Quality 공식 publish 시작")
    print("=" * 60)
    print("이 파이프라인은 기존 수집 데이터를 기준으로 공식 JSON을 갱신합니다.")
    print("새 원본 수집은 하지 않습니다.")
    print("=" * 60)

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
    print("네이버 FANDEX v3 Quality 공식 publish 완료")
    print("=" * 60)
    print(f"로그 파일: {log_file}")
    print()
    print("생성/갱신된 공식 파일:")
    print("- fandex_naver_ranking_v3_latest.json")
    print("- fandex_naver_artist_reports_v3_latest.json")
    print()
    print("확인 명령어:")
    print(
        'powershell -NoProfile -Command "Get-Content '
        '.\\fandex_naver_ranking_v3_latest.json -Encoding UTF8 | '
        'Select-Object -First 40"'
    )


if __name__ == "__main__":
    main()