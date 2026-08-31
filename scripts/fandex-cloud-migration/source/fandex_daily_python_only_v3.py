from __future__ import annotations
import argparse
import csv
import subprocess
import sys
from datetime import datetime
from pathlib import Path

VERSION = "fandex_daily_python_only_v3_source_prep_no_master_no_site_export"


def run_step(step_no, title, script, args=None, log_rows=None):
    args = args or []
    log_rows = log_rows if log_rows is not None else []
    cmd = [sys.executable, script] + args

    print()
    print(f"[{step_no}. {title}]")
    print(f"실행 파일: {script}")
    if args:
        print(f"args: {' '.join(args)}")

    started_at = datetime.now().isoformat(timespec="seconds")
    result = subprocess.run(cmd, check=False)
    ended_at = datetime.now().isoformat(timespec="seconds")

    log_rows.append({
        "step": step_no,
        "title": title,
        "script": script,
        "args": " ".join(args),
        "status": "OK" if result.returncode == 0 else "FAIL",
        "returncode": result.returncode,
        "startedAt": started_at,
        "endedAt": ended_at,
    })

    if result.returncode != 0:
        raise SystemExit(result.returncode)


def write_log(rows, timestamp):
    path = Path(f"fandex_daily_python_only_v3_log_{timestamp}.csv")
    fields = [
        "step", "title", "script", "args", "status",
        "returncode", "startedAt", "endedAt"
    ]

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-youtube", action="store_true")
    parser.add_argument("--skip-bugs", action="store_true")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    rows = []

    print()
    print("FANDEX daily python-only v3 source preparation")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("production Master는 이 스크립트에서 생성하지 않습니다.")
    print("website public/data export는 실행하지 않습니다.")
    print("=" * 72)

    step = 1

    if not args.skip_bugs:
        run_step(
            step,
            "Bugs chart 자동 수집",
            "music_chart_collect_bugs_v1.py",
            log_rows=rows,
        )
        step += 1

        run_step(
            step,
            "Bugs 수집 결과 seed 반영",
            "music_chart_apply_bugs_results_v1.py",
            log_rows=rows,
        )
        step += 1

    if args.refresh_youtube:
        run_step(
            step,
            "YouTube metrics 재수집",
            "youtube_collect_video_metrics_v1.py",
            log_rows=rows,
        )
        step += 1

    run_step(
        step,
        "YouTube v3 점수 생성",
        "youtube_publish_v3.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 원점수 생성",
        "music_chart_publish_v1.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 seed 신선도 감사",
        "music_chart_seed_freshness_audit_v1.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 stale decay 반영",
        "music_chart_apply_stale_decay_v2.py",
        ["--apply"],
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 schema presence v3 반영",
        "music_chart_schema_presence_v3.py",
        ["--apply"],
        log_rows=rows,
    )

    log = write_log(rows, timestamp)

    print()
    print("FANDEX daily python-only v3 source preparation complete")
    print(f"log: {log}")
    print("production Master modified here: FALSE")
    print("website public/data touched: FALSE")


if __name__ == "__main__":
    main()
