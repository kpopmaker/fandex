@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v4 - Cloud Last.fm + Rolling
echo ============================================================
echo This runner does NOT export to website public/data.
echo Last.fm daily history source: GitHub Cloud History.
echo.

echo [1/10] Run daily python-only v2 pipeline
py fandex_daily_python_only_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)

echo.
echo [2/10] Sync GitHub Cloud Last.fm history to local
py lastfm_sync_cloud_history_v1_1.py --apply

if errorlevel 1 (
    echo.
    echo Last.fm Cloud history sync failed.
    echo Local Last.fm collector was NOT used as fallback.
    pause
    exit /b 1
)

echo.
echo [3/10] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm delta failed.
    pause
    exit /b 1
)

echo.
echo [4/10] Build Last.fm score preview
py lastfm_global_interest_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm score preview failed.
    pause
    exit /b 1
)

echo.
echo [5/10] Build Last.fm rolling windows
py lastfm_global_interest_rolling_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling calculation failed.
    pause
    exit /b 1
)

echo.
echo [6/10] Build Last.fm rolling score preview
py lastfm_global_interest_rolling_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling score preview failed.
    pause
    exit /b 1
)

echo.
echo [7/10] Build Last.fm Master impact preview
py lastfm_master_impact_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm Master impact preview failed.
    pause
    exit /b 1
)

echo.
echo [8/10] Run Python health check
py fandex_python_health_check_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Python health check failed.
    pause
    exit /b 1
)

echo.
echo [9/10] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply

if errorlevel 1 (
    echo.
    echo Archive failed.
    pause
    exit /b 1
)

echo.
echo [10/10] Current core files
dir fandex_master_ranking_latest.json
dir fandex_music_chart_ranking_v1_latest.json
dir fandex_youtube_ranking_v3_latest.json
dir music_chart_seed_v1.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_latest.txt
dir lastfm_artist_interest_history_v1.csv
dir lastfm_global_interest_delta_v1_latest.csv
dir lastfm_global_interest_score_preview_v1_latest.csv
dir lastfm_global_interest_rolling_v1_latest.csv
dir lastfm_global_interest_rolling_score_preview_v1_latest.csv
dir lastfm_master_impact_preview_v1_latest.csv

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v4 Complete
echo ============================================================
echo.
echo Latest status report:
echo fandex_python_status_report_latest.txt
echo.
echo Latest health check:
echo fandex_python_health_check_latest.txt
echo.
echo Last.fm history source:
echo GitHub Cloud History
echo.
echo Rolling mode:
echo 3-day activates with 3 snapshots
echo 7-day activates with 7 snapshots
echo.
echo Local Last.fm collector:
echo MANUAL FALLBACK ONLY
echo.
echo Master was NOT modified by Last.fm rolling preview.
echo Website public/data was NOT touched.
echo.

pause