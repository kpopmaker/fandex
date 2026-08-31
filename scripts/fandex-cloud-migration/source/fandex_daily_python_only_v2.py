import argparse
import csv
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_daily_python_only_v2_stale_decay_schema_presence_no_site_export"


def run_step(step_no, title, script, args=None, log_rows=None):
    if args is None:
        args = []

    if log_rows is None:
        log_rows = []

    cmd = [sys.executable, script] + args

    print()
    print(f"[{step_no}. {title}]")
    print(f"실행 파일: {script}")
    if args:
        print(f"args: {' '.join(args)}")

    started_at = datetime.now().isoformat(timespec="seconds")

    result = subprocess.run(cmd)

    ended_at = datetime.now().isoformat(timespec="seconds")

    status = "OK" if result.returncode == 0 else "FAIL"

    log_rows.append({
        "step": step_no,
        "title": title,
        "script": script,
        "args": " ".join(args),
        "status": status,
        "returncode": result.returncode,
        "startedAt": started_at,
        "endedAt": ended_at,
    })

    if result.returncode != 0:
        print()
        print("=" * 60)
        print(f"ERROR: {title} 실패")
        print(f"script: {script}")
        print(f"returncode: {result.returncode}")
        print("=" * 60)
        raise SystemExit(result.returncode)


def write_log(log_rows, timestamp):
    log_file = Path(f"fandex_daily_python_only_v2_log_{timestamp}.csv")

    fieldnames = [
        "step",
        "title",
        "script",
        "args",
        "status",
        "returncode",
        "startedAt",
        "endedAt",
    ]

    with open(log_file, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(log_rows)

    return log_file


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-youtube", action="store_true")
    parser.add_argument("--skip-bugs", action="store_true")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_rows = []

    print()
    print("FANDEX daily python-only v2 시작")
    print("=" * 60)
    print(f"version: {VERSION}")
    print(f"YouTube 재수집: {'ON' if args.refresh_youtube else 'OFF'}")
    print(f"Bugs 갱신: {'OFF' if args.skip_bugs else 'ON'}")
    print("주의: 웹사이트 public/data export는 실행하지 않습니다.")
    print("주의: Music chart stale decay와 schema presence v3를 master 생성 전에 공식 반영합니다.")
    print("=" * 60)

    step = 1

    if not args.skip_bugs:
        run_step(step, "Bugs chart 자동 수집", "music_chart_collect_bugs_v1.py", log_rows=log_rows)
        step += 1

        run_step(step, "Bugs 수집 결과 seed 반영", "music_chart_apply_bugs_results_v1.py", log_rows=log_rows)
        step += 1

    if args.refresh_youtube:
        run_step(step, "YouTube metrics 재수집", "youtube_collect_video_metrics_v1.py", log_rows=log_rows)
        step += 1

    run_step(step, "YouTube v3 점수 생성", "youtube_publish_v3.py", log_rows=log_rows)
    step += 1

    run_step(step, "Music chart v1 원점수 생성", "music_chart_publish_v1.py", log_rows=log_rows)
    step += 1

    run_step(step, "Music chart seed 신선도 감사", "music_chart_seed_freshness_audit_v1.py", log_rows=log_rows)
    step += 1

    run_step(step, "Music chart stale decay 공식 반영", "music_chart_apply_stale_decay_v2.py", ["--apply"], log_rows=log_rows)
    step += 1

    run_step(step, "Music chart schema presence v3 공식 반영", "music_chart_schema_presence_v3.py", ["--apply"], log_rows=log_rows)
    step += 1

    run_step(step, "FANDEX master v7 생성", "fandex_master_score_v7.py", log_rows=log_rows)
    step += 1

    run_step(step, "Python status report 생성", "fandex_python_status_report_v1.py", log_rows=log_rows)

    log_file = write_log(log_rows, timestamp)

    print()
    print("=" * 60)
    print("FANDEX daily python-only v2 완료")
    print("=" * 60)
    print(f"로그 파일: {log_file}")
    print()
    print("웹사이트 public/data는 건드리지 않았습니다.")
    print()
    print("사용법:")
    print("일반 일일 갱신:")
    print("py fandex_daily_python_only_v2.py")
    print()
    print("YouTube API 재수집 포함:")
    print("set YOUTUBE_API_KEY=실제_API_KEY")
    print("py fandex_daily_python_only_v2.py --refresh-youtube")
    print()
    print("Bugs 갱신 없이 YouTube/음원/master/status만:")
    print("py fandex_daily_python_only_v2.py --skip-bugs")


if __name__ == "__main__":
    main()
