from __future__ import annotations

import csv
import json
import subprocess
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

VERSION = "fandex_cloud_runner_v1_pc_independent"
KST = timezone(timedelta(hours=9))

LASTFM_CLOUD_URL = (
    "https://raw.githubusercontent.com/kpopmaker/fandex/main/"
    "data/lastfm-cloud/lastfm_artist_interest_history_v1.csv"
)
LASTFM_LOCAL = Path("lastfm_artist_interest_history_v1.csv")
CLOUD_RUN_LATEST = Path("fandex_cloud_run_latest.json")

EXPECTED_ARTISTS = {
    "아이유",
    "에스파",
    "에이티즈",
    "보이넥스트도어",
    "아이브",
    "르세라핌",
    "뉴진스",
    "세븐틴",
    "스트레이키즈",
    "투모로우바이투게더",
}


def norm(value):
    return "" if value is None else str(value).strip()


def bootstrap_lastfm_history():
    print()
    print("[Cloud bootstrap] Last.fm cloud history -> local runtime")

    request = urllib.request.Request(
        LASTFM_CLOUD_URL,
        headers={
            "User-Agent": "FANDEX-Cloud-v10/1.0",
            "Cache-Control": "no-cache",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8-sig")

    reader = csv.DictReader(text.splitlines())
    cloud_rows = list(reader)
    fields = set(reader.fieldnames or [])

    required = {
        "snapshotDate",
        "artist",
        "lastfmName",
        "listeners",
        "playcount",
        "collectedAt",
    }

    missing = sorted(required - fields)
    if missing:
        raise RuntimeError(
            "Last.fm cloud history missing fields: " + ", ".join(missing)
        )

    if not cloud_rows:
        raise RuntimeError("Last.fm cloud history is empty")

    counts = Counter(row["snapshotDate"] for row in cloud_rows)
    by_date_artists = {}
    for row in cloud_rows:
        by_date_artists.setdefault(row["snapshotDate"], set()).add(
            norm(row.get("artist"))
        )

    for snapshot_date in sorted(counts):
        artists = by_date_artists[snapshot_date]
        if counts[snapshot_date] != 10 or artists != EXPECTED_ARTISTS:
            raise RuntimeError(
                f"Incomplete Last.fm cloud snapshot: {snapshot_date} "
                f"rows={counts[snapshot_date]} artists={len(artists)}"
            )

    output_rows = []
    for row in cloud_rows:
        collected_at = norm(row.get("collectedAt"))
        try:
            dt = datetime.fromisoformat(collected_at.replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                dt = dt.astimezone(KST).replace(tzinfo=None)
            snapshot_at = dt.isoformat(timespec="seconds")
        except Exception:
            snapshot_at = collected_at

        output_rows.append(
            {
                "snapshotDate": norm(row.get("snapshotDate")),
                "snapshotAt": snapshot_at,
                "artist": norm(row.get("artist")),
                "lastfmName": norm(row.get("lastfmName")),
                "listeners": norm(row.get("listeners")),
                "playcount": norm(row.get("playcount")),
                "sourceVersion": "lastfm_cloud_history_v1",
            }
        )

    output_rows.sort(key=lambda row: (row["snapshotDate"], row["artist"]))

    with LASTFM_LOCAL.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "snapshotDate",
                "snapshotAt",
                "artist",
                "lastfmName",
                "listeners",
                "playcount",
                "sourceVersion",
            ],
        )
        writer.writeheader()
        writer.writerows(output_rows)

    print(
        f"Last.fm bootstrap OK | rows={len(output_rows)} | "
        f"latest={max(counts)}"
    )


def run_step(step_no, title, script, args=None):
    args = args or []
    cmd = [sys.executable, script, *args]

    print()
    print("=" * 88)
    print(f"[{step_no}] {title}")
    print("command:", " ".join(cmd))
    print("=" * 88)

    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"Cloud runner failed at step {step_no}: {title} "
            f"(returncode={result.returncode})"
        )


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def main():
    started = datetime.now(KST)

    print()
    print("FANDEX Cloud v10 Daily Runner")
    print("=" * 88)
    print(f"version: {VERSION}")
    print("runtime: GitHub Actions / Linux / PC independent")
    print("production formula: Naver v3 + YouTube v3 + Music v2 x0.25 + Last.fm Rolling x0.25")
    print("Naver/YouTube mode: cutover snapshot parity (no new API collection in cloud v1)")
    print("website public/data touched: FALSE")
    print("=" * 88)

    required_seed_files = [
        Path("fandex_naver_ranking_v3_latest.json"),
        Path("fandex_youtube_ranking_v3_latest.json"),
        Path("fandex_music_chart_ranking_v1_latest.json"),
        Path("fandex_master_ranking_latest.json"),
    ]

    missing = [str(path) for path in required_seed_files if not path.exists()]
    if missing:
        raise RuntimeError("Missing cloud runtime seed/state: " + ", ".join(missing))

    bootstrap_lastfm_history()

    steps = [
        (1, "Discover Melon + Genie current presence for all 10 artists", "music_chart_discover_artist_candidates_v2.py", []),
        (2, "Discover Bugs current presence for all 10 artists", "music_chart_discover_bugs_all_targets_v1.py", []),
        (3, "Update Music chart check history", "music_chart_check_history_v1.py", []),
        (4, "Build Music v2 current-presence preview", "music_chart_current_presence_preview_v1.py", []),
        (5, "Publish Music v2 current-presence snapshot", "music_chart_current_presence_publish_v2.py", []),
        (6, "Validate/sync GitHub Cloud Last.fm history", "lastfm_sync_cloud_history_v1_1.py", ["--apply"]),
        (7, "Build Last.fm global-interest delta", "lastfm_global_interest_delta_v1.py", []),
        (8, "Build Last.fm 1-day score preview", "lastfm_global_interest_score_preview_v1.py", []),
        (9, "Build Last.fm rolling windows", "lastfm_global_interest_rolling_v1.py", []),
        (10, "Build Last.fm rolling score", "lastfm_global_interest_rolling_score_preview_v1.py", []),
        (11, "Build production FANDEX Master v10", "fandex_master_score_v10.py", []),
        (12, "Build production status report", "fandex_python_status_report_v2.py", []),
        (13, "Run production Health v3", "fandex_python_health_check_v3.py", []),
        (14, "Build Daily Summary v3", "fandex_daily_summary_v3.py", []),
    ]

    for step_no, title, script, args in steps:
        run_step(step_no, title, script, args)

    master = read_json("fandex_master_ranking_latest.json")
    music = read_json("fandex_music_chart_ranking_v2_current_presence_latest.json")
    lastfm = read_json("lastfm_global_interest_rolling_score_preview_v1_latest.json")

    finished = datetime.now(KST)
    payload = {
        "version": VERSION,
        "status": "SUCCESS",
        "startedAtKST": started.isoformat(timespec="seconds"),
        "finishedAtKST": finished.isoformat(timespec="seconds"),
        "productionVersion": master.get("version"),
        "musicVersion": music.get("version"),
        "musicSnapshotDate": music.get("snapshotDate"),
        "lastfmActiveMode": lastfm.get("activeMode"),
        "lastfmLatestDate": lastfm.get("latestDate"),
        "websiteTouched": False,
        "pcRequired": False,
    }

    CLOUD_RUN_LATEST.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print("FANDEX CLOUD DAILY RUN SUCCESS")
    print("PC required: NO")
    print("Website touched: NO")
    print(f"cloudRun: {CLOUD_RUN_LATEST}")
    print("=" * 88)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print()
        print("=" * 88)
        print("FANDEX CLOUD DAILY RUN FAILED")
        print(f"error: {exc}")
        print("=" * 88)
        raise
