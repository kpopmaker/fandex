@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v6 - Music v2 Parallel + Cloud Last.fm + Rolling + v8 Parallel
echo ============================================================
echo This runner does NOT export to website public/data.
echo Last.fm daily history source: GitHub Cloud History.
echo v7 Master remains the production/base Master.
echo v8 Master is generated as a parallel Python-only candidate.
echo Music v2 current presence is generated as a parallel Python-only candidate.
echo.

echo [1/16] Run daily python-only v2 pipeline
py fandex_daily_python_only_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)


echo.
echo [2/16] Discover Melon + Genie current presence for all 10 artists
py music_chart_discover_artist_candidates_v2.py

if errorlevel 1 (
    echo.
    echo Music v2 Melon/Genie discovery failed.
    pause
    exit /b 1
)

echo.
echo [3/16] Discover Bugs current presence for all 10 artists
py music_chart_discover_bugs_all_targets_v1.py

if errorlevel 1 (
    echo.
    echo Music v2 Bugs discovery failed.
    pause
    exit /b 1
)

echo.
echo [4/16] Update Music chart check history
py music_chart_check_history_v1.py

if errorlevel 1 (
    echo.
    echo Music chart check-history update failed.
    pause
    exit /b 1
)

echo.
echo [5/16] Build Music v2 current-presence preview
py music_chart_current_presence_preview_v1.py

if errorlevel 1 (
    echo.
    echo Music v2 current-presence preview failed.
    pause
    exit /b 1
)

echo.
echo [6/16] Publish parallel Music v2 current-presence snapshot
py music_chart_current_presence_publish_v2.py

if errorlevel 1 (
    echo.
    echo Music v2 parallel publish failed.
    pause
    exit /b 1
)

echo.
echo [7/16] Sync GitHub Cloud Last.fm history to local
py lastfm_sync_cloud_history_v1_1.py --apply

if errorlevel 1 (
    echo.
    echo Last.fm Cloud history sync failed.
    echo Local Last.fm collector was NOT used as fallback.
    pause
    exit /b 1
)

echo.
echo [8/16] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm delta failed.
    pause
    exit /b 1
)

echo.
echo [9/16] Build Last.fm 1-day score preview
py lastfm_global_interest_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm score preview failed.
    pause
    exit /b 1
)

echo.
echo [10/16] Build Last.fm rolling windows
py lastfm_global_interest_rolling_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling calculation failed.
    pause
    exit /b 1
)

echo.
echo [11/16] Build Last.fm rolling score preview
py lastfm_global_interest_rolling_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm rolling score preview failed.
    pause
    exit /b 1
)

echo.
echo [12/16] Build parallel FANDEX Master v8 candidate
py fandex_master_v8_build_v1.py

if errorlevel 1 (
    echo.
    echo FANDEX Master v8 parallel build failed.
    pause
    exit /b 1
)

echo.
echo [13/16] Build Last.fm Rolling Master impact preview
py lastfm_rolling_master_impact_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm Rolling Master impact preview failed.
    pause
    exit /b 1
)

echo.
echo [14/16] Run Python health check v2
py fandex_python_health_check_v2.py

if errorlevel 1 (
    echo.
    echo FANDEX Python health check failed.
    pause
    exit /b 1
)

echo.
echo [15/16] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply

if errorlevel 1 (
    echo.
    echo Archive failed.
    pause
    exit /b 1
)

echo.
echo [16/16] Current core files
dir fandex_master_ranking_latest.json
dir fandex_master_v8_ranking_latest.json
dir fandex_music_chart_ranking_v1_latest.json
dir fandex_music_chart_ranking_v2_current_presence_latest.json
dir music_chart_current_presence_history_v2.csv
dir music_chart_current_presence_preview_v1_latest.csv
dir music_chart_check_history_v1_latest.csv
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
echo FANDEX Daily Python-Only Runner v6 Complete
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
echo Music chart:
echo v1 = production/base Music
echo v2 = parallel Melon + Genie + Bugs current-presence candidate
echo.
echo Local Last.fm collector:
echo MANUAL FALLBACK ONLY
echo.
echo Production v7 Master was NOT modified by Last.fm.
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
