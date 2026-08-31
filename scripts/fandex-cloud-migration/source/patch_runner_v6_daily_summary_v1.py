from pathlib import Path
from datetime import datetime
import shutil


DAILY = Path("fandex_daily_python_only_v2.py")
RUNNER = Path("run_fandex_daily_python_only.bat")
SUMMARY = Path("fandex_daily_summary_v1.py")

for path in [DAILY, RUNNER]:
    if not path.exists():
        raise RuntimeError(f"Missing: {path}")


timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

daily_backup = Path(
    f"fandex_daily_python_only_v2_before_summary_{timestamp}.py"
)

runner_backup = Path(
    f"run_fandex_daily_python_only_before_summary_{timestamp}.bat"
)


# ============================================================
# 1. Daily 안내 문구 수정
# ============================================================

daily_original = DAILY.read_text(
    encoding="utf-8"
)

daily = daily_original


old_notice = (
    "주의: Music chart stale decay와 explicit zero presence를 "
    "master 생성 전에 공식 반영합니다."
)

new_notice = (
    "주의: Music chart stale decay와 schema presence v3를 "
    "master 생성 전에 공식 반영합니다."
)


if old_notice in daily:
    daily = daily.replace(
        old_notice,
        new_notice,
        1,
    )
elif new_notice in daily:
    print("Daily notice already updated.")
else:
    print("WARN: Daily notice target not found.")


# ============================================================
# 2. Daily Summary v1 생성
# ============================================================

summary_code = r'''import json
from pathlib import Path


HEALTH_FILE = Path(
    "fandex_python_health_check_v2_latest.txt"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

LASTFM_ROLLING_FILE = Path(
    "fandex_lastfm_global_interest_rolling_v1_latest.json"
)

if not LASTFM_ROLLING_FILE.exists():
    LASTFM_ROLLING_FILE = Path(
        "lastfm_global_interest_rolling_v1_latest.json"
    )

MASTER_V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MASTER_V8_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)


def read_json(path):
    if not path.exists():
        return {}

    try:
        return json.loads(
            path.read_text(
                encoding="utf-8-sig"
            )
        )
    except Exception:
        return {}


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def health_status():
    if not HEALTH_FILE.exists():
        return (
            "MISSING",
            "?",
            "?",
        )

    text = HEALTH_FILE.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    if (
        "OK: FANDEX Python-only v2 healthy"
        in text
    ):
        status = "PASS"
    else:
        status = "FAIL"

    fail_count = "?"
    warn_count = "?"

    for line in text.splitlines():

        stripped = line.strip()

        if stripped.startswith(
            "failCount:"
        ):
            fail_count = (
                stripped.split(
                    ":",
                    1,
                )[1].strip()
            )

        elif stripped.startswith(
            "warnCount:"
        ):
            warn_count = (
                stripped.split(
                    ":",
                    1,
                )[1].strip()
            )

    return (
        status,
        fail_count,
        warn_count,
    )


def music_v2_summary():

    payload = read_json(
        MUSIC_V2_FILE
    )

    ranking = payload.get(
        "ranking",
        []
    )

    if not isinstance(
        ranking,
        list,
    ):
        ranking = []

    artist_count = len(
        {
            norm(
                row.get(
                    "artist"
                )
            )
            for row in ranking
            if isinstance(
                row,
                dict,
            )
            and norm(
                row.get(
                    "artist"
                )
            )
        }
    )

    ranked_platform_count = 0

    for row in ranking:

        if not isinstance(
            row,
            dict,
        ):
            continue

        try:
            ranked_platform_count += int(
                row.get(
                    "rankedPlatformCount",
                    0,
                )
                or 0
            )
        except Exception:
            pass

    snapshot_date = norm(
        payload.get(
            "snapshotDate"
        )
    )

    return (
        artist_count,
        ranked_platform_count,
        snapshot_date,
    )


def lastfm_latest_date():

    payload = read_json(
        LASTFM_ROLLING_FILE
    )

    latest_date = norm(
        payload.get(
            "latestDate"
        )
    )

    if latest_date:
        return latest_date

    rows = payload.get(
        "rows",
        []
    )

    if isinstance(
        rows,
        list,
    ):

        dates = {
            norm(
                row.get(
                    "latestDate"
                )
            )
            for row in rows
            if isinstance(
                row,
                dict,
            )
            and norm(
                row.get(
                    "latestDate"
                )
            )
        }

        if dates:
            return max(
                dates
            )

    return "-"


def main():

    (
        health,
        fail_count,
        warn_count,
    ) = health_status()

    (
        music_artist_count,
        ranked_platform_count,
        music_date,
    ) = music_v2_summary()

    lastfm_date = lastfm_latest_date()

    v7_ok = MASTER_V7_FILE.exists()
    v8_ok = MASTER_V8_FILE.exists()

    overall_pass = (
        health == "PASS"
        and fail_count == "0"
        and warn_count == "0"
        and music_artist_count == 10
        and v7_ok
        and v8_ok
    )

    print()
    print("=" * 60)
    print("FANDEX DAILY SUMMARY")
    print("=" * 60)

    print(
        f"Runner v6        : "
        f"{'PASS' if overall_pass else 'CHECK'}"
    )

    print(
        f"Health           : "
        f"{health} "
        f"(fail={fail_count}, warn={warn_count})"
    )

    print(
        f"Music v2         : "
        f"{music_artist_count}/10 artists"
    )

    print(
        f"Music v2 ranked  : "
        f"{ranked_platform_count}/30 platforms"
    )

    print(
        f"Music v2 latest  : "
        f"{music_date or '-'}"
    )

    print(
        f"Last.fm latest   : "
        f"{lastfm_date}"
    )

    print(
        f"Master v7        : "
        f"{'OK' if v7_ok else 'MISSING'}"
    )

    print(
        f"Master v8        : "
        f"{'OK' if v8_ok else 'MISSING'}"
    )

    print(
        "Website touched  : NO"
    )

    print("-" * 60)

    if overall_pass:
        print(
            "DAILY RUN SUCCESS"
        )
        print("=" * 60)
        return 0

    print(
        "DAILY RUN NEEDS REVIEW"
    )
    print("=" * 60)

    return 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
'''


# ============================================================
# 3. Runner 마지막에 Summary 실행 추가
# ============================================================

runner_original = RUNNER.read_text(
    encoding="utf-8"
)

runner = runner_original


summary_command = (
    "py fandex_daily_summary_v1.py"
)


if summary_command not in runner:

    anchor = '''echo Production v7 Master was NOT modified by Last.fm.
echo Website public/data was NOT touched.
echo.

pause
'''

    if anchor not in runner:
        raise RuntimeError(
            "Runner final anchor not found."
        )


    replacement = '''echo Production v7 Master was NOT modified by Last.fm.
echo Website public/data was NOT touched.
echo.

echo ============================================================
echo Daily Summary
echo ============================================================
py fandex_daily_summary_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Daily Summary needs review.
    pause
    exit /b 1
)

echo.
pause
'''

    runner = runner.replace(
        anchor,
        replacement,
        1,
    )

else:
    print(
        "Runner summary already configured."
    )


# ============================================================
# 4. 백업 + 저장
# ============================================================

if daily != daily_original:

    shutil.copy2(
        DAILY,
        daily_backup,
    )

    DAILY.write_text(
        daily,
        encoding="utf-8",
    )


if runner != runner_original:

    shutil.copy2(
        RUNNER,
        runner_backup,
    )

    RUNNER.write_text(
        runner,
        encoding="utf-8",
    )


SUMMARY.write_text(
    summary_code,
    encoding="utf-8",
)


print()
print("=" * 72)
print("PATCH COMPLETE")
print("=" * 72)

print(
    f"dailyChanged: "
    f"{str(daily != daily_original).upper()}"
)

print(
    f"runnerChanged: "
    f"{str(runner != runner_original).upper()}"
)

print(
    f"summaryCreated: "
    f"{SUMMARY}"
)

print(
    "masterModified: FALSE"
)

print(
    "websiteModified: FALSE"
)