@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v2
echo ============================================================
echo This runner does NOT export to website public/data.
echo.

echo [1/7] Run daily python-only v2 pipeline
py fandex_daily_python_only_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)

echo.
echo [2/7] Run Last.fm collector v2
py lastfm_run_secure_v2.py

if errorlevel 1 (
    echo.
    echo Last.fm collector failed.
    pause
    exit /b 1
)

echo.
echo [3/7] Append Last.fm daily history
py lastfm_interest_history_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm history failed.
    pause
    exit /b 1
)

echo.
echo [4/7] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm delta failed.
    pause
    exit /b 1
)

echo.
echo [5/7] Run Python health check
py fandex_python_health_check_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Python health check failed.
    pause
    exit /b 1
)

echo.
echo [6/7] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply

if errorlevel 1 (
    echo.
    echo Archive failed.
    pause
    exit /b 1
)

echo.
echo [7/7] Current core files
dir fandex_master_ranking_latest.json
dir fandex_music_chart_ranking_v1_latest.json
dir fandex_youtube_ranking_v3_latest.json
dir music_chart_seed_v1.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_latest.txt
dir lastfm_artist_interest_history_v1.csv
dir lastfm_global_interest_delta_v1_latest.csv

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v2 Complete
echo ============================================================
echo.
echo Latest status report:
echo fandex_python_status_report_latest.txt
echo.
echo Latest health check:
echo fandex_python_health_check_latest.txt
echo.
echo Website public/data was NOT touched.
echo.

pause
