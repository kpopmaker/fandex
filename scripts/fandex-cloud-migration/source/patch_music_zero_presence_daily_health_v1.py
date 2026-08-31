from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


VERSION = "patch_music_zero_presence_daily_health_v1"

DAILY_FILE = Path(
    "fandex_daily_python_only_v2.py"
)

HEALTH_FILE = Path(
    "fandex_python_health_check_v2.py"
)


ZERO_SCRIPT = (
    "music_chart_zero_presence_from_history_v2.py"
)


HEALTH_MARKER = (
    "Music present: 10/10"
)


HEALTH_BLOCK = r'''
    # ------------------------------------------------------------
    # Music source presence / explicit-zero validation
    # ------------------------------------------------------------

    ranking = payload.get(
        "ranking",
        [],
    )

    if not isinstance(
        ranking,
        list,
    ):
        h.fail(
            "Music ranking is not a list"
        )
        return

    artists = []
    zero_count = 0

    for row in ranking:

        if not isinstance(
            row,
            dict,
        ):
            continue

        artist = norm(
            row.get(
                "artist"
            )
        )

        if artist:
            artists.append(
                artist
            )

        raw_point = row.get(
            "fandexMusicChartFinalPoint",
            row.get(
                "score",
                0.0,
            ),
        )

        try:
            point = float(
                raw_point
                if raw_point not in [
                    None,
                    "",
                ]
                else 0.0
            )

        except Exception:
            point = 0.0

        if abs(point) <= 1e-9:
            zero_count += 1

    unique_artists = set(
        artists
    )

    if (
        len(ranking) == 10
        and len(
            unique_artists
        ) == 10
    ):
        h.ok(
            "Music present: 10/10"
        )

    else:
        h.fail(
            "Music presence mismatch: "
            f"rows={len(ranking)}, "
            f"uniqueArtists="
            f"{len(unique_artists)}/10"
        )

    zero_version = norm(
        payload.get(
            "zeroPresenceVersion"
        )
    )

    if (
        zero_version
        == "music_chart_zero_presence_from_history_v2"
    ):
        h.ok(
            "zeroPresenceVersion: "
            f"{zero_version}"
        )

    else:
        h.fail(
            "unexpected zeroPresenceVersion: "
            f"{zero_version or '-'}"
        )

    explicit_zero = payload.get(
        "explicitZeroArtists",
        [],
    )

    if isinstance(
        explicit_zero,
        list,
    ):
        h.ok(
            "explicitZeroArtists: "
            f"{len(explicit_zero)}"
        )

    else:
        h.fail(
            "explicitZeroArtists "
            "is not a list"
        )

    h.ok(
        "Music zeroPresent count: "
        f"{zero_count}"
    )

    zero_script = Path(
        "music_chart_zero_presence_from_history_v2.py"
    )

    if zero_script.exists():
        h.ok(
            "zero presence v2 script exists"
        )

    else:
        h.fail(
            "missing: "
            f"{zero_script}"
        )

    reports_file = Path(
        "fandex_music_chart_artist_reports_v1_latest.json"
    )

    if not reports_file.exists():

        h.fail(
            f"missing: {reports_file}"
        )

    else:

        reports_payload = read_json(
            reports_file
        )

        reports = reports_payload.get(
            "reports",
            {},
        )

        if not isinstance(
            reports,
            dict,
        ):
            h.fail(
                "Music artist reports "
                "is not a dict"
            )

        else:

            report_artists = {
                norm(key)
                for key in reports.keys()
                if norm(key)
            }

            if (
                len(reports) == 10
                and report_artists
                == unique_artists
            ):
                h.ok(
                    "Music reports present: "
                    "10/10"
                )

            else:
                h.fail(
                    "Music reports presence "
                    "mismatch: "
                    f"reports={len(reports)}, "
                    f"rankingArtists="
                    f"{len(unique_artists)}"
                )
'''


def backup_file(
    path: Path,
    timestamp: str,
):
    backup = path.with_name(
        path.stem
        + "_backup_before_"
        + VERSION
        + "_"
        + timestamp
        + path.suffix
    )

    shutil.copy2(
        path,
        backup,
    )

    return backup


def patch_daily(
    text: str,
):
    if ZERO_SCRIPT in text:
        return (
            text,
            False,
            "ALREADY_PATCHED",
        )

    lines = text.splitlines()

    stale_index = None

    for i, line in enumerate(
        lines
    ):
        if (
            "run_step" in line
            and "music_chart_apply_stale_decay_v2.py"
            in line
        ):
            stale_index = i
            break

    if stale_index is None:
        raise RuntimeError(
            "Daily stale-decay step "
            "not found."
        )

    increment_index = None

    for i in range(
        stale_index + 1,
        min(
            stale_index + 8,
            len(lines),
        ),
    ):
        if (
            lines[i].strip()
            == "step += 1"
        ):
            increment_index = i
            break

    if increment_index is None:
        raise RuntimeError(
            "step += 1 after stale "
            "decay not found."
        )

    indent = (
        lines[stale_index]
        [:len(lines[stale_index])
          - len(
              lines[stale_index]
              .lstrip()
          )]
    )

    insert_lines = [
        "",
        (
            indent
            + 'run_step('
            'step, '
            '"Music chart explicit zero presence 공식 반영", '
            '"music_chart_zero_presence_from_history_v2.py", '
            '["--apply"], '
            'log_rows=log_rows'
            ')'
        ),
        (
            indent
            + "step += 1"
        ),
    ]

    lines[
        increment_index + 1:
        increment_index + 1
    ] = insert_lines

    result = "\n".join(
        lines
    ) + "\n"

    old_version = (
        'VERSION = '
        '"fandex_daily_python_only_v2_stale_decay_no_site_export"'
    )

    new_version = (
        'VERSION = '
        '"fandex_daily_python_only_v2_'
        'stale_decay_zero_presence_no_site_export"'
    )

    result = result.replace(
        old_version,
        new_version,
    )

    result = result.replace(
        (
            "주의: Music chart stale decay를 "
            "master 생성 전에 공식 반영합니다."
        ),
        (
            "주의: Music chart stale decay와 "
            "explicit zero presence를 "
            "master 생성 전에 공식 반영합니다."
        ),
    )

    return (
        result,
        True,
        "PATCHED",
    )


def patch_health(
    text: str,
):
    if HEALTH_MARKER in text:
        return (
            text,
            False,
            "ALREADY_PATCHED",
        )

    lines = text.splitlines()

    start = None

    for i, line in enumerate(
        lines
    ):
        if line.startswith(
            "def check_music_v2("
        ):
            start = i
            break

    if start is None:
        raise RuntimeError(
            "check_music_v2() "
            "not found."
        )

    end = None

    for i in range(
        start + 1,
        len(lines),
    ):
        if lines[i].startswith(
            "def "
        ):
            end = i
            break

    if end is None:
        raise RuntimeError(
            "End of check_music_v2() "
            "not found."
        )

    block_lines = (
        HEALTH_BLOCK
        .strip("\n")
        .splitlines()
    )

    lines[
        end:end
    ] = (
        [""]
        + block_lines
        + [""]
    )

    result = "\n".join(
        lines
    ) + "\n"

    return (
        result,
        True,
        "PATCHED",
    )


def main():
    print()
    print(
        "FANDEX Music Zero Presence "
        "Daily + Health Patch v1"
    )
    print("=" * 84)
    print(
        f"version: {VERSION}"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 84)

    for path in [
        DAILY_FILE,
        HEALTH_FILE,
        Path(ZERO_SCRIPT),
    ]:
        if not path.exists():
            raise RuntimeError(
                f"Missing file: {path}"
            )

    timestamp = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    daily_text = (
        DAILY_FILE.read_text(
            encoding="utf-8"
        )
    )

    health_text = (
        HEALTH_FILE.read_text(
            encoding="utf-8"
        )
    )

    (
        new_daily,
        daily_changed,
        daily_status,
    ) = patch_daily(
        daily_text
    )

    (
        new_health,
        health_changed,
        health_status,
    ) = patch_health(
        health_text
    )

    daily_backup = None
    health_backup = None

    if daily_changed:

        daily_backup = backup_file(
            DAILY_FILE,
            timestamp,
        )

        DAILY_FILE.write_text(
            new_daily,
            encoding="utf-8",
        )

    if health_changed:

        health_backup = backup_file(
            HEALTH_FILE,
            timestamp,
        )

        HEALTH_FILE.write_text(
            new_health,
            encoding="utf-8",
        )

    print()
    print(
        "Daily pipeline"
    )
    print("-" * 84)
    print(
        f"status: {daily_status}"
    )

    if daily_backup:
        print(
            f"backup: {daily_backup}"
        )

    print()
    print(
        "Health check"
    )
    print("-" * 84)
    print(
        f"status: {health_status}"
    )

    if health_backup:
        print(
            f"backup: {health_backup}"
        )

    print()
    print("=" * 84)
    print(
        "dailyPipelineModified: "
        f"{'TRUE' if daily_changed else 'FALSE'}"
    )
    print(
        "healthCheckModified: "
        f"{'TRUE' if health_changed else 'FALSE'}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()