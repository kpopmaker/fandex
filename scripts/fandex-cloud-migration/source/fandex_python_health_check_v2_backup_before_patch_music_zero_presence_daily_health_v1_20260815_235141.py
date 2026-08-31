from __future__ import annotations

import csv
import json
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path


VERSION = "fandex_python_health_check_v2"

V1_SCRIPT = Path(
    "fandex_python_health_check_v1.py"
)

RUNNER_FILE = Path(
    "run_fandex_daily_python_only.bat"
)

MUSIC_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

LASTFM_HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

ROLLING_JSON = Path(
    "lastfm_global_interest_rolling_v1_latest.json"
)

ROLLING_CSV = Path(
    "lastfm_global_interest_rolling_v1_latest.csv"
)

ROLLING_SCORE_JSON = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.json"
)

ROLLING_SCORE_CSV = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

CLOUD_SYNC_SCRIPT = Path(
    "lastfm_sync_cloud_history_v1_1.py"
)

LATEST_REPORT = Path(
    "fandex_python_health_check_v2_latest.txt"
)


class Health:
    def __init__(self):
        self.lines = []
        self.fail_count = 0
        self.warn_count = 0

    def emit(self, text=""):
        print(text)
        self.lines.append(text)

    def section(self, title):
        self.emit()
        self.emit(title)
        self.emit("-" * 72)

    def ok(self, text):
        self.emit(f"OK   {text}")

    def info(self, text):
        self.emit(f"INFO {text}")

    def warn(self, text):
        self.warn_count += 1
        self.emit(f"WARN {text}")

    def fail(self, text):
        self.fail_count += 1
        self.emit(f"FAIL {text}")


def read_json(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def check_required_files(h):
    h.section(
        "v2 필수 파일 확인"
    )

    files = [
        V1_SCRIPT,
        RUNNER_FILE,
        MUSIC_FILE,
        CLOUD_SYNC_SCRIPT,
        LASTFM_HISTORY_FILE,
        ROLLING_JSON,
        ROLLING_CSV,
        ROLLING_SCORE_JSON,
        ROLLING_SCORE_CSV,
    ]

    for path in files:
        if path.exists():
            h.ok(str(path))
        else:
            h.fail(
                f"missing: {path}"
            )


def check_music_v2(h):
    h.section(
        "Music stale decay v2 확인"
    )

    if not MUSIC_FILE.exists():
        h.fail(
            f"missing: {MUSIC_FILE}"
        )
        return

    payload = read_json(
        MUSIC_FILE
    )

    version = norm(
        payload.get(
            "staleDecayVersion"
        )
    )

    if (
        version
        == "music_chart_apply_stale_decay_v2"
    ):
        h.ok(
            f"staleDecayVersion: {version}"
        )
    else:
        h.fail(
            "unexpected staleDecayVersion: "
            f"{version}"
        )

    policy = payload.get(
        "staleDecayPolicy",
        {},
    )

    if (
        policy.get(
            "sourceTypeIndependent"
        )
        is True
    ):
        h.ok(
            "sourceTypeIndependent: TRUE"
        )
    else:
        h.fail(
            "sourceTypeIndependent is not TRUE"
        )

    expected = {
        "days0To3": 1.0,
        "days4To7": 0.7,
        "days8To14": 0.4,
        "days15To30": 0.2,
        "daysOver30": 0.0,
    }

    for key, expected_value in (
        expected.items()
    ):
        actual = policy.get(key)

        if actual == expected_value:
            h.ok(
                f"{key}: {actual}"
            )
        else:
            h.fail(
                f"{key}: "
                f"expected={expected_value}, "
                f"actual={actual}"
            )


def history_summary(h):
    h.section(
        "Last.fm Cloud-synced history 확인"
    )

    if not LASTFM_HISTORY_FILE.exists():
        h.fail(
            f"missing: {LASTFM_HISTORY_FILE}"
        )
        return None

    rows = read_csv(
        LASTFM_HISTORY_FILE
    )

    if not rows:
        h.fail(
            "Last.fm history is empty"
        )
        return None

    keys = set()
    duplicate_count = 0

    by_date = {}

    for row in rows:
        snapshot_date = norm(
            row.get("snapshotDate")
        )

        artist = norm(
            row.get("artist")
        )

        key = (
            snapshot_date,
            artist,
        )

        if key in keys:
            duplicate_count += 1

        keys.add(key)

        by_date.setdefault(
            snapshot_date,
            [],
        ).append(row)

    if duplicate_count == 0:
        h.ok(
            "snapshotDate/artist duplicate: 0"
        )
    else:
        h.fail(
            f"duplicate count: {duplicate_count}"
        )

    dates = sorted(
        by_date
    )

    latest_date = dates[-1]

    incomplete_dates = []

    for snapshot_date in dates:
        artist_count = len({
            norm(row.get("artist"))
            for row in by_date[
                snapshot_date
            ]
        })

        if artist_count != 10:
            incomplete_dates.append(
                (
                    snapshot_date,
                    artist_count,
                )
            )

    if not incomplete_dates:
        h.ok(
            "all snapshots complete: 10/10"
        )
    else:
        for (
            snapshot_date,
            artist_count,
        ) in incomplete_dates:
            h.fail(
                f"incomplete snapshot "
                f"{snapshot_date}: "
                f"{artist_count}/10"
            )

    h.ok(
        f"history rowCount: {len(rows)}"
    )

    h.ok(
        f"snapshotDateCount: {len(dates)}"
    )

    h.ok(
        f"latestDate: {latest_date}"
    )

    try:
        latest = date.fromisoformat(
            latest_date
        )

        age_days = (
            date.today() - latest
        ).days

        if age_days <= 1:
            h.ok(
                f"historyAgeDays: {age_days}"
            )
        elif age_days == 2:
            h.warn(
                f"historyAgeDays: {age_days}"
            )
        else:
            h.fail(
                f"historyAgeDays: {age_days}"
            )

    except Exception:
        h.fail(
            f"invalid latestDate: "
            f"{latest_date}"
        )

    return {
        "rows":
            rows,

        "dates":
            dates,

        "latestDate":
            latest_date,

        "snapshotDateCount":
            len(dates),
    }


def check_runner_cloud_source(h):
    h.section(
        "Daily runner Cloud Last.fm 구조 확인"
    )

    if not RUNNER_FILE.exists():
        h.fail(
            f"missing: {RUNNER_FILE}"
        )
        return

    text = RUNNER_FILE.read_text(
        encoding="utf-8-sig"
    )

    required_tokens = [
        (
            "lastfm_sync_cloud_history_v1_1.py --apply",
            "Cloud history sync",
        ),
        (
            "lastfm_global_interest_rolling_v1.py",
            "rolling calculation",
        ),
        (
            "lastfm_global_interest_rolling_score_preview_v1.py",
            "rolling score preview",
        ),
    ]

    for token, label in required_tokens:
        if token in text:
            h.ok(
                f"{label}: configured"
            )
        else:
            h.fail(
                f"{label}: missing"
            )

    forbidden_daily_tokens = [
        "lastfm_run_auto_v1.py",
        "lastfm_run_secure_v2.py",
        "lastfm_interest_history_v1.py",
    ]

    found = [
        token
        for token in forbidden_daily_tokens
        if token in text
    ]

    if not found:
        h.ok(
            "local Last.fm collector/history "
            "not used by daily runner"
        )
    else:
        h.fail(
            "local Last.fm fallback unexpectedly "
            "configured in daily runner: "
            + ", ".join(found)
        )


def check_rolling(h, history):
    h.section(
        "Last.fm rolling 계산 확인"
    )

    if history is None:
        h.fail(
            "history unavailable"
        )
        return

    if not ROLLING_JSON.exists():
        h.fail(
            f"missing: {ROLLING_JSON}"
        )
        return

    payload = read_json(
        ROLLING_JSON
    )

    snapshot_count = (
        history[
            "snapshotDateCount"
        ]
    )

    latest_date = (
        history[
            "latestDate"
        ]
    )

    rolling_latest = norm(
        payload.get(
            "latestDate"
        )
    )

    if rolling_latest == latest_date:
        h.ok(
            f"rolling latestDate: "
            f"{rolling_latest}"
        )
    else:
        h.fail(
            "rolling latestDate mismatch: "
            f"history={latest_date}, "
            f"rolling={rolling_latest}"
        )

    artist_count = safe_int(
        payload.get(
            "artistCount"
        )
    )

    if artist_count == 10:
        h.ok(
            "rolling artistCount: 10"
        )
    else:
        h.fail(
            f"rolling artistCount: "
            f"{artist_count}"
        )

    ready3 = safe_int(
        payload.get(
            "rolling3ReadyCount"
        )
    )

    ready7 = safe_int(
        payload.get(
            "rolling7ReadyCount"
        )
    )

    expected3 = (
        10
        if snapshot_count >= 3
        else 0
    )

    expected7 = (
        10
        if snapshot_count >= 7
        else 0
    )

    if ready3 == expected3:
        h.ok(
            f"rolling3ReadyCount: "
            f"{ready3}/10"
        )
    else:
        h.fail(
            "rolling3ReadyCount mismatch: "
            f"expected={expected3}, "
            f"actual={ready3}"
        )

    if ready7 == expected7:
        h.ok(
            f"rolling7ReadyCount: "
            f"{ready7}/10"
        )
    else:
        h.fail(
            "rolling7ReadyCount mismatch: "
            f"expected={expected7}, "
            f"actual={ready7}"
        )

    review_count = safe_int(
        payload.get(
            "needsReviewCount"
        )
    )

    if review_count == 0:
        h.ok(
            "rolling needsReviewCount: 0"
        )
    else:
        h.warn(
            f"rolling needsReviewCount: "
            f"{review_count}"
        )

    if (
        payload.get(
            "masterModified"
        )
        is False
    ):
        h.ok(
            "rolling masterModified: FALSE"
        )
    else:
        h.fail(
            "rolling masterModified "
            "is not FALSE"
        )

    if (
        payload.get(
            "websiteModified"
        )
        is False
    ):
        h.ok(
            "rolling websiteModified: FALSE"
        )
    else:
        h.fail(
            "rolling websiteModified "
            "is not FALSE"
        )


def check_rolling_score(
    h,
    history,
):
    h.section(
        "Last.fm rolling score preview 확인"
    )

    if history is None:
        h.fail(
            "history unavailable"
        )
        return

    if not ROLLING_SCORE_JSON.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_JSON}"
        )
        return

    payload = read_json(
        ROLLING_SCORE_JSON
    )

    snapshot_count = (
        history[
            "snapshotDateCount"
        ]
    )

    latest_date = (
        history[
            "latestDate"
        ]
    )

    score_latest = norm(
        payload.get(
            "latestDate"
        )
    )

    if score_latest == latest_date:
        h.ok(
            f"score latestDate: "
            f"{score_latest}"
        )
    else:
        h.fail(
            "score latestDate mismatch: "
            f"history={latest_date}, "
            f"score={score_latest}"
        )

    if snapshot_count < 3:
        expected_mode = (
            "insufficient_history"
        )
        expected_ready = 0

    elif snapshot_count < 7:
        expected_mode = (
            "rolling3_only"
        )
        expected_ready = 10

    else:
        expected_mode = (
            "rolling3_50_rolling7_50"
        )
        expected_ready = 10

    actual_mode = norm(
        payload.get(
            "activeMode"
        )
    )

    if actual_mode == expected_mode:
        h.ok(
            f"activeMode: "
            f"{actual_mode}"
        )
    else:
        h.fail(
            "activeMode mismatch: "
            f"expected={expected_mode}, "
            f"actual={actual_mode}"
        )

    actual_ready = safe_int(
        payload.get(
            "scoreReadyCount"
        )
    )

    if actual_ready == expected_ready:
        h.ok(
            f"scoreReadyCount: "
            f"{actual_ready}/10"
        )
    else:
        h.fail(
            "scoreReadyCount mismatch: "
            f"expected={expected_ready}, "
            f"actual={actual_ready}"
        )

    review_count = safe_int(
        payload.get(
            "needsReviewCount"
        )
    )

    if review_count == 0:
        h.ok(
            "score needsReviewCount: 0"
        )
    else:
        h.warn(
            f"score needsReviewCount: "
            f"{review_count}"
        )

    if (
        payload.get(
            "masterModified"
        )
        is False
    ):
        h.ok(
            "score masterModified: FALSE"
        )
    else:
        h.fail(
            "score masterModified "
            "is not FALSE"
        )

    if (
        payload.get(
            "websiteModified"
        )
        is False
    ):
        h.ok(
            "score websiteModified: FALSE"
        )
    else:
        h.fail(
            "score websiteModified "
            "is not FALSE"
        )


def run_v1(h):
    h.section(
        "기존 Health Check v1 실행"
    )

    if not V1_SCRIPT.exists():
        h.fail(
            f"missing: {V1_SCRIPT}"
        )
        return

    result = subprocess.run(
        [
            sys.executable,
            str(V1_SCRIPT),
        ],
        check=False,
    )

    if result.returncode == 0:
        h.ok(
            "Health Check v1 passed"
        )
    else:
        h.fail(
            "Health Check v1 failed "
            f"with code "
            f"{result.returncode}"
        )


def main():
    h = Health()

    created_at = (
        datetime.now()
        .isoformat(
            timespec="seconds"
        )
    )

    h.emit()
    h.emit(
        "FANDEX Python Health Check v2"
    )
    h.emit("=" * 72)
    h.emit(
        f"createdAt: {created_at}"
    )
    h.emit(
        f"version: {VERSION}"
    )
    h.emit(
        "scope: Python-only / "
        "Cloud Last.fm + Rolling / "
        "no website export"
    )
    h.emit("=" * 72)

    run_v1(h)

    check_required_files(h)

    check_music_v2(h)

    history = history_summary(h)

    check_runner_cloud_source(h)

    check_rolling(
        h,
        history,
    )

    check_rolling_score(
        h,
        history,
    )


    h.section(
        "Health Check v2 final result"
    )

    if h.fail_count == 0:
        if h.warn_count == 0:
            h.emit(
                "OK: FANDEX Python-only v2 healthy"
            )
        else:
            h.emit(
                "OK WITH WARNINGS: "
                "FANDEX Python-only v2 operational"
            )
    else:
        h.emit(
            "FAIL: FANDEX Python-only v2 needs review"
        )

    h.emit(
        f"failCount: {h.fail_count}"
    )

    h.emit(
        f"warnCount: {h.warn_count}"
    )

    h.emit(
        "masterModified: FALSE"
    )

    h.emit(
        "websiteModified: FALSE"
    )

    h.emit("=" * 72)

    timestamp_report = Path(
        "fandex_python_health_check_v2_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
        + ".txt"
    )

    report_text = "\n".join(
        h.lines
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print(
        f"report: {timestamp_report}"
    )

    print(
        f"latest: {LATEST_REPORT}"
    )

    if h.fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()