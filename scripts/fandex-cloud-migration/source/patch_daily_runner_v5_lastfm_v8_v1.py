from pathlib import Path


TARGET = Path(
    "run_fandex_daily_python_only.bat"
)

BACKUP = Path(
    "run_fandex_daily_python_only_v4_before_v5_lastfm_v8.bat"
)


new_text = r'''@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v5 - Cloud Last.fm + Rolling + v8 Parallel
echo ============================================================
echo This runner does NOT export to website public/data.
echo Last.fm daily history source: GitHub Cloud History.
echo v7 Master remains the production/base Master.
echo v8 Master is generated as a parallel Python-only candidate.
echo.

echo [1/11] Run daily python-only v2 pipeline
py fandex_daily_python_only_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)

echo.
echo [2/11] Sync GitHub Cloud Last.fm history to local
py lastfm_sync_cloud_history_v1_1.py --apply

if errorlevel 1 (
    echo.
    echo Last.fm Cloud history sync failed.
    echo Local Last.fm collector was NOT used as fallback.
    pause
    exit /b 1
)

echo.
echo [3/11] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm delta failed.
    pause
    exit /b 1
)

echo.
echo [4/11] Build Last.fm 1-day score preview
py lastfm_global_interest_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm score preview failed.
    pause
    exit /b 1
)

echo.
echo [5/11] Build Last.fm rolling windows
py lastfm_global_interest_rolling_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling calculation failed.
    pause
    exit /b 1
)

echo.
echo [6/11] Build Last.fm rolling score preview
py lastfm_global_interest_rolling_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling score preview failed.
    pause
    exit /b 1
)

echo.
echo [7/11] Build parallel FANDEX Master v8 candidate
py fandex_master_v8_build_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Master v8 parallel build failed.
    pause
    exit /b 1
)

echo.
echo [8/11] Build Last.fm Rolling Master impact preview
py lastfm_rolling_master_impact_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm Rolling Master impact preview failed.
    pause
    exit /b 1
)

echo.
echo [9/11] Run Python health check v2
py fandex_python_health_check_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX Python health check failed.
    pause
    exit /b 1
)

echo.
echo [10/11] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply

if errorlevel 1 (
    echo.
    echo Archive failed.
    pause
    exit /b 1
)

echo.
echo [11/11] Current core files
dir fandex_master_ranking_latest.json
dir fandex_master_v8_ranking_latest.json
dir fandex_music_chart_ranking_v1_latest.json
dir fandex_youtube_ranking_v3_latest.json
dir music_chart_seed_v1.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_latest.txt
dir fandex_python_health_check_v2_latest.txt
dir lastfm_artist_interest_history_v1.csv
dir lastfm_global_interest_delta_v1_latest.csv
dir lastfm_global_interest_score_preview_v1_latest.csv
dir lastfm_global_interest_rolling_v1_latest.csv
dir lastfm_global_interest_rolling_score_preview_v1_latest.csv
dir lastfm_rolling_master_impact_preview_v1_latest.csv

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v5 Complete
echo ============================================================
echo.
echo Latest status report:
echo fandex_python_status_report_latest.txt
echo.
echo Latest health check:
echo fandex_python_health_check_v2_latest.txt
echo.
echo Last.fm history source:
echo GitHub Cloud History
echo.
echo Rolling mode:
echo 3-day activates with 3 snapshots
echo 7-day activates with 7 snapshots
echo.
echo FANDEX Master:
echo v7 = production/base Master
echo v8 = parallel Last.fm Rolling x0.25 candidate
echo.
echo Local Last.fm collector:
echo MANUAL FALLBACK ONLY
echo.
echo Production v7 Master was NOT modified by Last.fm.
echo Website public/data was NOT touched.
echo.

pause
'''


if not TARGET.exists():
    raise RuntimeError(
        f"Missing file: {TARGET}"
    )


old_text = TARGET.read_text(
    encoding="utf-8"
)

BACKUP.write_text(
    old_text,
    encoding="utf-8"
)

TARGET.write_text(
    new_text,
    encoding="utf-8"
)

print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("runnerVersion: v5")
print("stepCount: 11")
print("v8ParallelBuild: configured")
print("rollingMasterImpact: configured")
print("productionMasterModified: FALSE")
print("websiteModified: FALSE")