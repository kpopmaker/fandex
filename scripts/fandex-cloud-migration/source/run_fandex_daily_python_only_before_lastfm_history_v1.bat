@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v2
echo ============================================================
echo This runner does NOT export to website public/data.
echo.

echo [1/4] Run daily python-only v2 pipeline
py fandex_daily_python_only_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)

echo.
echo [2/4] Run Python health check
py fandex_python_health_check_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Python health check failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply

if errorlevel 1 (
    echo.
    echo Archive failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Current core files
dir fandex_master_ranking_latest.json
dir fandex_music_chart_ranking_v1_latest.json
dir fandex_youtube_ranking_v3_latest.json
dir music_chart_seed_v1.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_latest.txt

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
