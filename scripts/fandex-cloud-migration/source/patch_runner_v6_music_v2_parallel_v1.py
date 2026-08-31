from pathlib import Path
from datetime import datetime
import shutil


RUNNER = Path(
    "run_fandex_daily_python_only.bat"
)

ARCHIVE = Path(
    "fandex_archive_generated_files_v1.py"
)


if not RUNNER.exists():
    raise RuntimeError(
        f"Missing: {RUNNER}"
    )

if not ARCHIVE.exists():
    raise RuntimeError(
        f"Missing: {ARCHIVE}"
    )


runner = RUNNER.read_text(
    encoding="utf-8"
)

archive = ARCHIVE.read_text(
    encoding="utf-8"
)


timestamp = datetime.now().strftime(
    "%Y%m%d_%H%M%S"
)

runner_backup = Path(
    "run_fandex_daily_python_only_"
    f"before_v6_music_v2_{timestamp}.bat"
)

archive_backup = Path(
    "fandex_archive_generated_files_v1_"
    f"before_music_v2_{timestamp}.py"
)


runner_changed = False
archive_changed = False


# ------------------------------------------------------------
# Runner v5 -> v6
# ------------------------------------------------------------

if (
    "FANDEX Daily Python-Only Runner v6"
    not in runner
):

    old_header = (
        "FANDEX Daily Python-Only Runner v5 "
        "- Cloud Last.fm + Rolling + v8 Parallel"
    )

    new_header = (
        "FANDEX Daily Python-Only Runner v6 "
        "- Music v2 Parallel + Cloud Last.fm "
        "+ Rolling + v8 Parallel"
    )

    if old_header not in runner:
        raise RuntimeError(
            "Runner v5 header not found."
        )

    runner = runner.replace(
        old_header,
        new_header,
        1,
    )


    old_complete = (
        "FANDEX Daily Python-Only "
        "Runner v5 Complete"
    )

    new_complete = (
        "FANDEX Daily Python-Only "
        "Runner v6 Complete"
    )

    runner = runner.replace(
        old_complete,
        new_complete,
        1,
    )


    runner = runner.replace(
        "echo [1/11] "
        "Run daily python-only v2 pipeline",
        "echo [1/16] "
        "Run daily python-only v2 pipeline",
        1,
    )


    anchor = '''if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)
'''

    if anchor not in runner:
        raise RuntimeError(
            "Runner step-1 anchor not found."
        )


    music_v2_block = r'''

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
'''


    runner = runner.replace(
        anchor,
        anchor + music_v2_block,
        1,
    )


    replacements = {
        "[2/11]": "[7/16]",
        "[3/11]": "[8/16]",
        "[4/11]": "[9/16]",
        "[5/11]": "[10/16]",
        "[6/11]": "[11/16]",
        "[7/11]": "[12/16]",
        "[8/11]": "[13/16]",
        "[9/11]": "[14/16]",
        "[10/11]": "[15/16]",
        "[11/11]": "[16/16]",
    }

    for old, new in replacements.items():

        if old not in runner:
            raise RuntimeError(
                f"Runner marker missing: {old}"
            )

        runner = runner.replace(
            old,
            new,
            1,
        )


    description_anchor = (
        "echo v8 Master is generated as "
        "a parallel Python-only candidate.\n"
    )

    if description_anchor in runner:

        runner = runner.replace(
            description_anchor,
            description_anchor
            + (
                "echo Music v2 current presence "
                "is generated as a parallel "
                "Python-only candidate.\n"
            ),
            1,
        )


    core_anchor = (
        "dir fandex_music_chart_ranking_v1_latest.json\n"
    )

    if core_anchor not in runner:
        raise RuntimeError(
            "Runner core-files anchor not found."
        )

    runner = runner.replace(
        core_anchor,
        core_anchor
        + (
            "dir fandex_music_chart_ranking_"
            "v2_current_presence_latest.json\n"
            "dir music_chart_current_presence_"
            "history_v2.csv\n"
            "dir music_chart_current_presence_"
            "preview_v1_latest.csv\n"
            "dir music_chart_check_history_"
            "v1_latest.csv\n"
        ),
        1,
    )


    summary_anchor = (
        "echo v8 = parallel Last.fm "
        "Rolling x0.25 candidate\n"
        "echo.\n"
    )

    if summary_anchor in runner:

        runner = runner.replace(
            summary_anchor,
            summary_anchor
            + (
                "echo Music chart:\n"
                "echo v1 = production/base Music\n"
                "echo v2 = parallel Melon + Genie "
                "+ Bugs current-presence candidate\n"
                "echo.\n"
            ),
            1,
        )


    runner_changed = True

else:

    print(
        "Runner already appears to be v6."
    )


# ------------------------------------------------------------
# Archive protection for Music v2 active files
# ------------------------------------------------------------

music_v2_keep = [
    "music_chart_artist_candidates_v2_latest.csv",
    "music_chart_artist_candidates_v2_raw_latest.json",
    "MUSIC_CHART_ARTIST_CANDIDATES_V2_REPORT_latest.txt",

    "music_chart_bugs_all_targets_v1_latest.csv",
    "music_chart_bugs_all_targets_v1_latest.json",
    "MUSIC_CHART_BUGS_ALL_TARGETS_V1_REPORT.txt",

    "music_chart_check_history_v1.csv",
    "music_chart_check_history_v1_latest.csv",
    "music_chart_check_history_v1_latest.json",
    "MUSIC_CHART_CHECK_HISTORY_V1_REPORT.txt",

    "music_chart_current_presence_preview_v1_latest.csv",
    "MUSIC_CHART_CURRENT_PRESENCE_PREVIEW_V1_REPORT.txt",

    "fandex_music_chart_ranking_v2_current_presence_latest.json",
    "music_chart_current_presence_history_v2.csv",
    "FANDEX_MUSIC_CHART_V2_CURRENT_PRESENCE_REPORT.txt",
]


missing_keep = [
    name
    for name in music_v2_keep
    if f'"{name}"' not in archive
]


if missing_keep:

    archive_anchor = '''    "fandex_music_chart_ranking_v1_latest.json",
    "fandex_music_chart_artist_reports_v1_latest.json",
'''

    if archive_anchor not in archive:
        raise RuntimeError(
            "Archive KEEP_EXACT anchor not found."
        )


    new_keep_block = (
        archive_anchor
        + "\n"
        + "    # Music v2 parallel current-presence active files\n"
        + "".join(
            f'    "{name}",\n'
            for name in music_v2_keep
        )
    )


    archive = archive.replace(
        archive_anchor,
        new_keep_block,
        1,
    )

    archive_changed = True

else:

    print(
        "Archive Music v2 KEEP_EXACT "
        "already configured."
    )


# ------------------------------------------------------------
# Write backups + files
# ------------------------------------------------------------

if runner_changed:

    shutil.copy2(
        RUNNER,
        runner_backup,
    )

    RUNNER.write_text(
        runner,
        encoding="utf-8",
    )


if archive_changed:

    shutil.copy2(
        ARCHIVE,
        archive_backup,
    )

    ARCHIVE.write_text(
        archive,
        encoding="utf-8",
    )


print()
print("=" * 84)
print("PATCH COMPLETE")
print("=" * 84)

print(
    f"runnerChanged: "
    f"{str(runner_changed).upper()}"
)

print(
    f"archiveChanged: "
    f"{str(archive_changed).upper()}"
)

if runner_changed:
    print(
        f"runnerBackup: "
        f"{runner_backup}"
    )

if archive_changed:
    print(
        f"archiveBackup: "
        f"{archive_backup}"
    )

print(
    "runnerVersion: v6"
)

print(
    "runnerSteps: 16"
)

print(
    "MusicV2Mode: "
    "PARALLEL_CANDIDATE_ONLY"
)

print(
    "productionV7Modified: FALSE"
)

print(
    "masterModified: FALSE"
)

print(
    "websiteModified: FALSE"
)