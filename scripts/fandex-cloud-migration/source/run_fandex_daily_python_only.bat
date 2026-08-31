@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v8 - Production Master v10
echo ============================================================
echo This runner does NOT export to website public/data.
echo Production formula: Naver v3 + YouTube v3 + Music v2 x0.25 + Last.fm Rolling x0.25
echo Last.fm daily history source: GitHub Cloud History.
echo Legacy v7/v8/v9 builders are preserved but NOT executed.
echo.

echo [1/16] Prepare Python-only sources
py fandex_daily_python_only_v3.py
if errorlevel 1 goto :fail

echo.
echo [2/16] Discover Melon + Genie current presence for all 10 artists
py music_chart_discover_artist_candidates_v2.py
if errorlevel 1 goto :fail

echo.
echo [3/16] Discover Bugs current presence for all 10 artists
py music_chart_discover_bugs_all_targets_v1.py
if errorlevel 1 goto :fail

echo.
echo [4/16] Update Music chart check history
py music_chart_check_history_v1.py
if errorlevel 1 goto :fail

echo.
echo [5/16] Build Music v2 current-presence preview
py music_chart_current_presence_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [6/16] Publish Music v2 current-presence snapshot
py music_chart_current_presence_publish_v2.py
if errorlevel 1 goto :fail

echo.
echo [7/16] Sync GitHub Cloud Last.fm history to local
py lastfm_sync_cloud_history_v1_1.py --apply
if errorlevel 1 goto :fail

echo.
echo [8/16] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py
if errorlevel 1 goto :fail

echo.
echo [9/16] Build Last.fm 1-day score preview
py lastfm_global_interest_score_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [10/16] Build Last.fm rolling windows
py lastfm_global_interest_rolling_v1.py
if errorlevel 1 goto :fail

echo.
echo [11/16] Build Last.fm rolling score
py lastfm_global_interest_rolling_score_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [12/16] Build production FANDEX Master v10
py fandex_master_score_v10.py
if errorlevel 1 goto :fail

echo.
echo [13/16] Build production status report
py fandex_python_status_report_v2.py
if errorlevel 1 goto :fail

echo.
echo [14/16] Run production Health v3
py fandex_python_health_check_v3.py
if errorlevel 1 goto :fail

echo.
echo [15/16] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply
if errorlevel 1 goto :fail

echo.
echo [16/16] Current core files
dir fandex_master_ranking_latest.json
dir fandex_master_artist_reports_latest.json
dir fandex_music_chart_ranking_v2_current_presence_latest.json
dir music_chart_current_presence_history_v2.csv
dir lastfm_global_interest_rolling_score_preview_v1_latest.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_v3_latest.txt

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v8 Complete
echo ============================================================
echo Production Master: v10
echo Music source: Music v2 current presence x0.25
echo Last.fm source: rolling x0.25
echo Website public/data was NOT touched.
echo.
echo ============================================================
echo Daily Summary
echo ============================================================
py fandex_daily_summary_v3.py
if errorlevel 1 goto :fail

echo.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo FANDEX DAILY RUN FAILED
echo ============================================================
echo Review the failed step above.
pause
exit /b 1
