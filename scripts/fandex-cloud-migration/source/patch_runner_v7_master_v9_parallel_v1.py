from __future__ import annotations

import py_compile
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


# ============================================================
# FANDEX Runner v7 - Master v9 Parallel Integration Patch v1
#
# 생성:
# 1. fandex_master_v9_daily_parallel_v1.py
# 2. fandex_master_v9_health_check_v1.py
# 3. fandex_daily_summary_v2.py
#
# 수정:
# 4. run_fandex_daily_python_only.bat
#
# 목적:
# - 기존 v7 production은 그대로 유지
# - Music v2 x0.25 + Last.fm x0.25 기반 v9 병렬 생성
# - v9 일별 history 저장
# - v9 전용 health
# - Daily Summary에 v9 상태 추가
#
# production / Music v1 / website 수정 없음
# ============================================================


VERSION = "patch_runner_v7_master_v9_parallel_v1"

RUNNER = Path(
    "run_fandex_daily_python_only.bat"
)

V9_BUILDER = Path(
    "fandex_master_v9_music_v2_lastfm_build_v1.py"
)

V9_DAILY = Path(
    "fandex_master_v9_daily_parallel_v1.py"
)

V9_HEALTH = Path(
    "fandex_master_v9_health_check_v1.py"
)

SUMMARY_V1 = Path(
    "fandex_daily_summary_v1.py"
)

SUMMARY_V2 = Path(
    "fandex_daily_summary_v2.py"
)


TIMESTAMP = datetime.now().strftime(
    "%Y%m%d_%H%M%S"
)


# ============================================================
# Helpers
# ============================================================

def stop(message):
    print()
    print("=" * 80)
    print("STOP - NEEDS FIX")
    print("=" * 80)
    print(message)
    raise SystemExit(1)


def require(path):
    if not path.exists():
        stop(
            f"Missing required file: {path}"
        )


def write_text(
    path,
    text,
):
    path.write_text(
        text.strip()
        + "\n",
        encoding="utf-8",
    )


def compile_file(path):
    try:
        py_compile.compile(
            str(path),
            doraise=True,
        )

    except Exception as exc:
        stop(
            f"py_compile failed: "
            f"{path} / {exc}"
        )


def run_python(path):
    print()
    print("=" * 80)
    print(
        f"RUN: {path}"
    )
    print("=" * 80)

    result = subprocess.run(
        [
            sys.executable,
            str(path),
        ],
        check=False,
    )

    if result.returncode != 0:
        stop(
            f"{path} failed "
            f"with exit code "
            f"{result.returncode}"
        )


# ============================================================
# Required files
# ============================================================

for required in [
    RUNNER,
    V9_BUILDER,
    SUMMARY_V1,
    Path(
        "fandex_master_ranking_latest.json"
    ),
    Path(
        "fandex_master_v8_ranking_latest.json"
    ),
    Path(
        "fandex_music_chart_ranking_v1_latest.json"
    ),
    Path(
        "fandex_music_chart_ranking_v2_current_presence_latest.json"
    ),
]:
    require(
        required
    )


# ============================================================
# Child script 1
# v9 daily builder + history upsert
# ============================================================

V9_DAILY_CODE = r'''
from __future__ import annotations

import csv
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v9_daily_parallel_v1"

BUILDER = Path(
    "fandex_master_v9_music_v2_lastfm_build_v1.py"
)

V9_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

HISTORY_FILE = Path(
    "fandex_master_v9_history_v1.csv"
)

LATEST_HISTORY_FILE = Path(
    "fandex_master_v9_history_latest.csv"
)


FIELDS = [
    "snapshotDate",
    "snapshotAt",
    "artist",
    "rank",
    "v9Point",
    "v7Point",
    "v8Point",
    "musicV1Point",
    "musicV2RawPoint",
    "musicV2ContributionPoint",
    "lastfmContributionPoint",
    "sourceVersion",
]


def norm(value):
    if value is None:
        return ""

    return str(
        value
    ).strip()


def number(
    value,
    default=0.0,
):
    try:
        if value in [
            None,
            "",
        ]:
            return default

        return float(
            value
        )

    except Exception:
        return default


def run_builder():
    if not BUILDER.exists():
        raise RuntimeError(
            f"Missing builder: {BUILDER}"
        )

    result = subprocess.run(
        [
            sys.executable,
            str(BUILDER),
        ],
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Master v9 builder failed "
            f"with exit code "
            f"{result.returncode}"
        )


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing JSON: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_history():
    if not HISTORY_FILE.exists():
        return []

    with HISTORY_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        return list(
            csv.DictReader(
                file
            )
        )


def write_csv(
    path,
    rows,
):
    temp = Path(
        str(path) + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=FIELDS,
        )

        writer.writeheader()

        for row in rows:

            writer.writerow({
                field:
                    row.get(
                        field,
                        ""
                    )
                for field in FIELDS
            })

    temp.replace(
        path
    )


def main():
    print()
    print("=" * 88)
    print(
        "FANDEX Master v9 Daily Parallel v1"
    )
    print("=" * 88)

    print(
        f"version: {VERSION}"
    )

    print(
        "usage: PARALLEL CANDIDATE ONLY"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


    run_builder()


    v9 = read_json(
        V9_FILE
    )

    music_v2 = read_json(
        MUSIC_V2_FILE
    )


    snapshot_date = norm(
        music_v2.get(
            "snapshotDate"
        )
    )


    if not snapshot_date:
        raise RuntimeError(
            "Music v2 snapshotDate missing."
        )


    ranking = v9.get(
        "ranking",
        []
    )


    if (
        not isinstance(
            ranking,
            list,
        )
        or len(
            ranking
        )
        != 10
    ):
        raise RuntimeError(
            "Expected v9 ranking 10 artists."
        )


    snapshot_at = datetime.now().isoformat(
        timespec="seconds"
    )


    latest_rows = []


    for row in ranking:

        latest_rows.append({
            "snapshotDate":
                snapshot_date,

            "snapshotAt":
                snapshot_at,

            "artist":
                norm(
                    row.get(
                        "artist"
                    )
                ),

            "rank":
                row.get(
                    "rank",
                    "",
                ),

            "v9Point":
                row.get(
                    "fandexFinalPoint",
                    row.get(
                        "score",
                        "",
                    ),
                ),

            "v7Point":
                row.get(
                    "productionV7Point",
                    "",
                ),

            "v8Point":
                row.get(
                    "parallelV8Point",
                    "",
                ),

            "musicV1Point":
                row.get(
                    "musicV1ReferencePoint",
                    "",
                ),

            "musicV2RawPoint":
                row.get(
                    "musicV2RawPoint",
                    "",
                ),

            "musicV2ContributionPoint":
                row.get(
                    "musicV2ContributionPoint",
                    "",
                ),

            "lastfmContributionPoint":
                row.get(
                    "lastfmContributionPoint",
                    "",
                ),

            "sourceVersion":
                v9.get(
                    "version",
                    "",
                ),
        })


    artists = {
        row[
            "artist"
        ]
        for row in latest_rows
    }


    if len(
        artists
    ) != 10:
        raise RuntimeError(
            "v9 latest artist set "
            "is not 10 unique artists."
        )


    history = read_history()


    if HISTORY_FILE.exists():

        backup = Path(
            "fandex_master_v9_history_v1_"
            "backup_before_upsert_"
            + datetime.now().strftime(
                "%Y%m%d_%H%M%S"
            )
            + ".csv"
        )

        shutil.copy2(
            HISTORY_FILE,
            backup,
        )

        print(
            f"historyBackup: {backup}"
        )


    kept = []


    for row in history:

        row_date = norm(
            row.get(
                "snapshotDate"
            )
        )

        artist = norm(
            row.get(
                "artist"
            )
        )


        if (
            row_date
            == snapshot_date
            and artist
            in artists
        ):
            continue


        kept.append(
            row
        )


    merged = (
        kept
        + latest_rows
    )


    merged.sort(
        key=lambda row: (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            int(
                number(
                    row.get(
                        "rank"
                    ),
                    999999,
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )
    )


    seen = set()


    for row in merged:

        key = (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )


        if key in seen:
            raise RuntimeError(
                "v9 history duplicate: "
                f"{key}"
            )


        seen.add(
            key
        )


    write_csv(
        HISTORY_FILE,
        merged,
    )

    write_csv(
        LATEST_HISTORY_FILE,
        sorted(
            latest_rows,
            key=lambda row:
                int(
                    number(
                        row.get(
                            "rank"
                        ),
                        999999,
                    )
                ),
        ),
    )


    snapshot_dates = sorted({
        norm(
            row.get(
                "snapshotDate"
            )
        )
        for row in merged
        if norm(
            row.get(
                "snapshotDate"
            )
        )
    })


    latest_count = sum(
        1
        for row in merged
        if norm(
            row.get(
                "snapshotDate"
            )
        )
        == snapshot_date
    )


    print()
    print(
        "v9 history"
    )
    print("-" * 88)

    print(
        f"snapshotDate: "
        f"{snapshot_date}"
    )

    print(
        f"latestArtistCount: "
        f"{latest_count}/10"
    )

    print(
        f"historyRowCount: "
        f"{len(merged)}"
    )

    print(
        f"historySnapshotCount: "
        f"{len(snapshot_dates)}"
    )

    print(
        "historyDuplicateCount: 0"
    )

    print(
        f"history: {HISTORY_FILE}"
    )

    print(
        f"latestHistory: "
        f"{LATEST_HISTORY_FILE}"
    )

    print()
    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


if __name__ == "__main__":
    main()
'''


# ============================================================
# Child script 2
# v9 health
# ============================================================

V9_HEALTH_CODE = r'''
from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v9_health_check_v1"

EXPECTED_V9_VERSION = (
    "fandex_master_v9_music_v2_"
    "lastfm_rolling_v1"
)

EXPECTED_SCORE_MODE = (
    "parallel_music_v2_x0_25_"
    "lastfm_rolling_x0_25"
)


V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

V8_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)

V9_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

MUSIC_V1_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

V9_HISTORY_FILE = Path(
    "fandex_master_v9_history_v1.csv"
)


LATEST_REPORT = Path(
    "fandex_master_v9_health_check_latest.txt"
)


MUSIC_V2_SCALE = 0.25
LASTFM_SCALE = 0.25

EPSILON = 0.04


def norm(value):
    if value is None:
        return ""

    return str(
        value
    ).strip()


def number(
    value,
    default=0.0,
):
    try:
        if value in [
            None,
            "",
        ]:
            return default

        return float(
            value
        )

    except Exception:
        return default


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def ranking_rows(payload):
    rows = payload.get(
        "ranking",
        []
    )

    if not isinstance(
        rows,
        list,
    ):
        return []

    return [
        row
        for row in rows
        if isinstance(
            row,
            dict,
        )
    ]


def artist_name(row):
    return norm(
        row.get(
            "artist"
        )
        or row.get(
            "artistName"
        )
    )


def first_number(
    row,
    keys,
):
    for key in keys:

        if key in row:

            value = row.get(
                key
            )

            if value not in [
                None,
                "",
            ]:

                return number(
                    value
                )

    return 0.0


def master_point(row):
    return first_number(
        row,
        [
            "fandexFinalPoint",
            "fandexPoint",
            "finalPoint",
            "masterPoint",
            "score",
        ],
    )


def music_point(row):
    return first_number(
        row,
        [
            "fandexMusicChartFinalPoint",
            "fandexMusicChartPoint",
            "musicChartPoint",
            "musicV2Point",
            "musicPoint",
            "finalPoint",
            "score",
        ],
    )


def build_map(rows):
    return {
        artist_name(
            row
        ):
            row

        for row in rows

        if artist_name(
            row
        )
    }


def add_check(
    lines,
    failures,
    condition,
    ok_message,
    fail_message,
):
    if condition:

        line = (
            "OK   "
            + ok_message
        )

        print(
            line
        )

        lines.append(
            line
        )

    else:

        line = (
            "FAIL "
            + fail_message
        )

        print(
            line
        )

        lines.append(
            line
        )

        failures.append(
            fail_message
        )


def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )

    failures = []

    warnings = []

    lines = []


    print()
    print("=" * 84)
    print(
        "FANDEX Master v9 Health Check v1"
    )
    print("=" * 84)

    print(
        f"createdAt: {created_at}"
    )

    print(
        f"version: {VERSION}"
    )

    print("=" * 84)


    required = [
        V7_FILE,
        V8_FILE,
        V9_FILE,
        MUSIC_V1_FILE,
        MUSIC_V2_FILE,
        V9_HISTORY_FILE,
    ]


    print()
    print(
        "Required files"
    )
    print("-" * 84)


    for path in required:

        add_check(
            lines,
            failures,
            path.exists(),
            f"{path}",
            f"missing {path}",
        )


    if failures:

        finalize(
            created_at,
            lines,
            failures,
            warnings,
        )

        return


    v7 = read_json(
        V7_FILE
    )

    v8 = read_json(
        V8_FILE
    )

    v9 = read_json(
        V9_FILE
    )

    music_v1 = read_json(
        MUSIC_V1_FILE
    )

    music_v2 = read_json(
        MUSIC_V2_FILE
    )


    v7_rows = ranking_rows(
        v7
    )

    v8_rows = ranking_rows(
        v8
    )

    v9_rows = ranking_rows(
        v9
    )

    v1_rows = ranking_rows(
        music_v1
    )

    v2_rows = ranking_rows(
        music_v2
    )


    v7_map = build_map(
        v7_rows
    )

    v8_map = build_map(
        v8_rows
    )

    v9_map = build_map(
        v9_rows
    )

    v1_map = build_map(
        v1_rows
    )

    v2_map = build_map(
        v2_rows
    )


    print()
    print(
        "v9 structure"
    )
    print("-" * 84)


    add_check(
        lines,
        failures,
        v9.get(
            "version"
        )
        == EXPECTED_V9_VERSION,
        (
            "v9 version: "
            f"{EXPECTED_V9_VERSION}"
        ),
        (
            "unexpected v9 version: "
            f"{v9.get('version')}"
        ),
    )


    add_check(
        lines,
        failures,
        v9.get(
            "scoreMode"
        )
        == EXPECTED_SCORE_MODE,
        (
            "v9 scoreMode: "
            f"{EXPECTED_SCORE_MODE}"
        ),
        (
            "unexpected v9 scoreMode: "
            f"{v9.get('scoreMode')}"
        ),
    )


    add_check(
        lines,
        failures,
        norm(
            v9.get(
                "usage"
            )
        ).casefold()
        == "parallel candidate only",
        "v9 usage: PARALLEL CANDIDATE ONLY",
        "v9 is not parallel-only",
    )


    add_check(
        lines,
        failures,
        v9.get(
            "pythonOnly"
        )
        is True,
        "v9 pythonOnly: TRUE",
        "v9 pythonOnly is not TRUE",
    )


    add_check(
        lines,
        failures,
        v9.get(
            "touchesWebsitePublicData"
        )
        is False,
        "v9 touchesWebsitePublicData: FALSE",
        "v9 touchesWebsitePublicData is not FALSE",
    )


    add_check(
        lines,
        failures,
        abs(
            number(
                v9.get(
                    "musicV2Scale"
                )
            )
            - MUSIC_V2_SCALE
        )
        <= 0.0001,
        "v9 Music v2 scale: 0.25",
        "v9 Music v2 scale mismatch",
    )


    add_check(
        lines,
        failures,
        abs(
            number(
                v9.get(
                    "lastfmScale"
                )
            )
            - LASTFM_SCALE
        )
        <= 0.0001,
        "v9 Last.fm scale: 0.25",
        "v9 Last.fm scale mismatch",
    )


    add_check(
        lines,
        failures,
        len(
            v9_rows
        )
        == 10,
        "v9 artistCount: 10/10",
        (
            "v9 artistCount: "
            f"{len(v9_rows)}/10"
        ),
    )


    sets = [
        set(
            v7_map
        ),
        set(
            v8_map
        ),
        set(
            v9_map
        ),
        set(
            v1_map
        ),
        set(
            v2_map
        ),
    ]


    artist_sets_match = all(
        artist_set
        == sets[
            0
        ]
        for artist_set
        in sets[
            1:
        ]
    )


    add_check(
        lines,
        failures,
        artist_sets_match
        and len(
            sets[
                0
            ]
        )
        == 10,
        "v7/v8/v9/Music v1/Music v2 artist set: MATCH 10/10",
        "artist set mismatch",
    )


    print()
    print(
        "v9 arithmetic"
    )
    print("-" * 84)


    formula_mismatch = 0

    v7_reference_mismatch = 0

    v8_reference_mismatch = 0

    v1_reference_mismatch = 0

    v2_reference_mismatch = 0

    lastfm_mismatch = 0


    for artist in sorted(
        v9_map
    ):

        row = v9_map[
            artist
        ]


        current_v7 = master_point(
            v7_map[
                artist
            ]
        )

        current_v8 = master_point(
            v8_map[
                artist
            ]
        )

        current_v1 = music_point(
            v1_map[
                artist
            ]
        )

        current_v2 = music_point(
            v2_map[
                artist
            ]
        )


        row_v7 = number(
            row.get(
                "productionV7Point"
            )
        )

        row_v8 = number(
            row.get(
                "parallelV8Point"
            )
        )

        row_v1 = number(
            row.get(
                "musicV1ReferencePoint"
            )
        )

        row_v2 = number(
            row.get(
                "musicV2RawPoint"
            )
        )

        row_music_contribution = number(
            row.get(
                "musicV2ContributionPoint"
            )
        )

        row_lastfm = number(
            row.get(
                "lastfmContributionPoint"
            )
        )

        row_final = master_point(
            row
        )


        if abs(
            row_v7
            - current_v7
        ) > EPSILON:

            v7_reference_mismatch += 1


        if abs(
            row_v8
            - current_v8
        ) > EPSILON:

            v8_reference_mismatch += 1


        if abs(
            row_v1
            - current_v1
        ) > EPSILON:

            v1_reference_mismatch += 1


        if abs(
            row_v2
            - current_v2
        ) > EPSILON:

            v2_reference_mismatch += 1


        expected_lastfm = (
            current_v8
            - current_v7
        )


        if abs(
            row_lastfm
            - expected_lastfm
        ) > EPSILON:

            lastfm_mismatch += 1


        expected_music = (
            current_v2
            * MUSIC_V2_SCALE
        )


        expected_final = (
            current_v7
            - current_v1
            + expected_music
            + expected_lastfm
        )


        if (
            abs(
                row_music_contribution
                - expected_music
            )
            > EPSILON

            or

            abs(
                row_final
                - expected_final
            )
            > EPSILON
        ):

            formula_mismatch += 1


    add_check(
        lines,
        failures,
        v7_reference_mismatch
        == 0,
        "v9 production v7 reference mismatch: 0",
        (
            "v9 production v7 reference mismatch: "
            f"{v7_reference_mismatch}"
        ),
    )


    add_check(
        lines,
        failures,
        v8_reference_mismatch
        == 0,
        "v9 v8 reference mismatch: 0",
        (
            "v9 v8 reference mismatch: "
            f"{v8_reference_mismatch}"
        ),
    )


    add_check(
        lines,
        failures,
        v1_reference_mismatch
        == 0,
        "v9 Music v1 reference mismatch: 0",
        (
            "v9 Music v1 reference mismatch: "
            f"{v1_reference_mismatch}"
        ),
    )


    add_check(
        lines,
        failures,
        v2_reference_mismatch
        == 0,
        "v9 Music v2 reference mismatch: 0",
        (
            "v9 Music v2 reference mismatch: "
            f"{v2_reference_mismatch}"
        ),
    )


    add_check(
        lines,
        failures,
        lastfm_mismatch
        == 0,
        "v9 Last.fm contribution mismatch: 0",
        (
            "v9 Last.fm contribution mismatch: "
            f"{lastfm_mismatch}"
        ),
    )


    add_check(
        lines,
        failures,
        formula_mismatch
        == 0,
        "v9 final formula mismatch: 0",
        (
            "v9 final formula mismatch: "
            f"{formula_mismatch}"
        ),
    )


    ordered = sorted(
        v9_rows,
        key=lambda row:
            int(
                number(
                    row.get(
                        "rank"
                    ),
                    999999,
                )
            ),
    )


    rank_sequence = [
        int(
            number(
                row.get(
                    "rank"
                )
            )
        )
        for row in ordered
    ]


    add_check(
        lines,
        failures,
        rank_sequence
        == list(
            range(
                1,
                11,
            )
        ),
        "v9 rank sequence: 1-10",
        (
            "v9 invalid rank sequence: "
            f"{rank_sequence}"
        ),
    )


    scores = [
        master_point(
            row
        )
        for row in ordered
    ]


    descending = all(
        scores[
            index
        ]
        >= scores[
            index + 1
        ]

        for index in range(
            len(
                scores
            )
            - 1
        )
    )


    add_check(
        lines,
        failures,
        descending,
        "v9 ranking score order: DESC",
        "v9 ranking is not DESC",
    )


    print()
    print(
        "v9 history"
    )
    print("-" * 84)


    with V9_HISTORY_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        history_rows = list(
            csv.DictReader(
                file
            )
        )


    seen = set()

    duplicate_count = 0


    for row in history_rows:

        key = (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )


        if key in seen:
            duplicate_count += 1

        seen.add(
            key
        )


    add_check(
        lines,
        failures,
        duplicate_count
        == 0,
        "v9 history duplicate: 0",
        (
            "v9 history duplicate: "
            f"{duplicate_count}"
        ),
    )


    snapshot_dates = sorted({
        norm(
            row.get(
                "snapshotDate"
            )
        )
        for row in history_rows
        if norm(
            row.get(
                "snapshotDate"
            )
        )
    })


    latest_date = (
        snapshot_dates[
            -1
        ]
        if snapshot_dates
        else ""
    )


    music_v2_date = norm(
        music_v2.get(
            "snapshotDate"
        )
    )


    latest_rows = [
        row
        for row in history_rows
        if norm(
            row.get(
                "snapshotDate"
            )
        )
        == latest_date
    ]


    add_check(
        lines,
        failures,
        latest_date
        == music_v2_date,
        (
            "v9 latest history/Music v2 date match: "
            f"{latest_date}"
        ),
        (
            "v9 latest date mismatch: "
            f"history={latest_date}, "
            f"MusicV2={music_v2_date}"
        ),
    )


    add_check(
        lines,
        failures,
        len(
            latest_rows
        )
        == 10,
        "v9 latest history snapshot: 10/10",
        (
            "v9 latest history snapshot: "
            f"{len(latest_rows)}/10"
        ),
    )


    print(
        f"INFO v9 history rowCount: "
        f"{len(history_rows)}"
    )

    print(
        f"INFO v9 history snapshotDateCount: "
        f"{len(snapshot_dates)}"
    )

    lines.append(
        f"INFO v9 history rowCount: "
        f"{len(history_rows)}"
    )

    lines.append(
        f"INFO v9 history snapshotDateCount: "
        f"{len(snapshot_dates)}"
    )


    add_check(
        lines,
        failures,
        v9.get(
            "productionV7Modified"
        )
        is False,
        "productionV7Modified: FALSE",
        "productionV7Modified is not FALSE",
    )


    add_check(
        lines,
        failures,
        v9.get(
            "productionMusicV1Modified"
        )
        is False,
        "productionMusicV1Modified: FALSE",
        "productionMusicV1Modified is not FALSE",
    )


    add_check(
        lines,
        failures,
        v9.get(
            "musicV2Modified"
        )
        is False,
        "musicV2Modified: FALSE",
        "musicV2Modified is not FALSE",
    )


    add_check(
        lines,
        failures,
        v9.get(
            "websiteModified"
        )
        is False,
        "websiteModified: FALSE",
        "websiteModified is not FALSE",
    )


    finalize(
        created_at,
        lines,
        failures,
        warnings,
    )


def finalize(
    created_at,
    lines,
    failures,
    warnings,
):
    fail_count = len(
        failures
    )

    warn_count = len(
        warnings
    )


    result_lines = [
        "",
        "Health Check v9 final result",
        "-" * 84,
    ]


    if fail_count == 0:

        result_lines.append(
            "OK: FANDEX Master v9 healthy"
        )

    else:

        result_lines.append(
            "FAIL: FANDEX Master v9 unhealthy"
        )


    result_lines.extend([
        f"failCount: {fail_count}",
        f"warnCount: {warn_count}",
        "productionV7Modified: FALSE",
        "productionMusicV1Modified: FALSE",
        "musicV2Modified: FALSE",
        "websiteModified: FALSE",
    ])


    for line in result_lines:
        print(
            line
        )


    report = [
        "FANDEX Master v9 Health Check v1",
        "=" * 84,
        f"createdAt: {created_at}",
        f"version: {VERSION}",
        "",
    ]

    report.extend(
        lines
    )

    report.extend(
        result_lines
    )


    timestamp_file = Path(
        "fandex_master_v9_health_check_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
        + ".txt"
    )


    text = (
        "\n".join(
            report
        )
        + "\n"
    )


    timestamp_file.write_text(
        text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        text,
        encoding="utf-8",
    )


    print()
    print(
        f"report: {timestamp_file}"
    )

    print(
        f"latest: {LATEST_REPORT}"
    )

    print("=" * 84)


    if fail_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
'''


# ============================================================
# Child script 3
# Daily Summary v2
#
# 기존 Summary v1 출력을 재사용하고,
# Runner 이름과 v9 정보만 안전하게 추가한다.
# ============================================================

SUMMARY_V2_CODE = r'''
from __future__ import annotations

import csv
import subprocess
import sys
from pathlib import Path


SUMMARY_V1 = Path(
    "fandex_daily_summary_v1.py"
)

V9_HEALTH = Path(
    "fandex_master_v9_health_check_latest.txt"
)

V9_HISTORY = Path(
    "fandex_master_v9_history_v1.csv"
)

V9_LATEST = Path(
    "fandex_master_v9_ranking_latest.json"
)


def v9_health_ok():
    if not V9_HEALTH.exists():
        return False

    text = V9_HEALTH.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    return (
        "OK: FANDEX Master v9 healthy"
        in text
        and
        "failCount: 0"
        in text
    )


def v9_history_state():
    if not V9_HISTORY.exists():
        return (
            0,
            "",
        )

    with V9_HISTORY.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        rows = list(
            csv.DictReader(
                file
            )
        )


    dates = sorted({
        str(
            row.get(
                "snapshotDate",
                ""
            )
            or ""
        ).strip()

        for row in rows

        if str(
            row.get(
                "snapshotDate",
                ""
            )
            or ""
        ).strip()
    })


    latest = (
        dates[
            -1
        ]
        if dates
        else ""
    )


    return (
        len(
            dates
        ),
        latest,
    )


def main():
    if not SUMMARY_V1.exists():
        raise RuntimeError(
            f"Missing: {SUMMARY_V1}"
        )


    result = subprocess.run(
        [
            sys.executable,
            str(
                SUMMARY_V1
            ),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


    if result.returncode != 0:

        print(
            result.stdout
        )

        print(
            result.stderr
        )

        raise SystemExit(
            result.returncode
        )


    text = result.stdout


    text = text.replace(
        "Runner v6",
        "Runner v7",
    )


    health_ok = (
        v9_health_ok()
    )


    (
        history_count,
        latest_date,
    ) = v9_history_state()


    v9_line = (
        "Master v9        : "
        + (
            "OK"
            if (
                health_ok
                and V9_LATEST.exists()
            )
            else "FAIL"
        )
    )


    history_line = (
        "v9 history       : "
        f"{history_count} snapshots"
    )


    if latest_date:

        history_line += (
            f" / latest "
            f"{latest_date}"
        )


    lines = text.splitlines()

    output = []

    inserted = False


    for line in lines:

        if (
            not inserted
            and line.strip().startswith(
                "Website touched"
            )
        ):

            output.append(
                v9_line
            )

            output.append(
                history_line
            )

            inserted = True


        output.append(
            line
        )


    if not inserted:

        output.append(
            v9_line
        )

        output.append(
            history_line
        )


    if not health_ok:

        output = [
            line.replace(
                "DAILY RUN SUCCESS",
                "DAILY RUN FAIL",
            )
            for line in output
        ]


    print(
        "\n".join(
            output
        )
    )


    if not health_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
'''


# ============================================================
# Write generated scripts
# ============================================================

write_text(
    V9_DAILY,
    V9_DAILY_CODE,
)

write_text(
    V9_HEALTH,
    V9_HEALTH_CODE,
)

write_text(
    SUMMARY_V2,
    SUMMARY_V2_CODE,
)


print()
print("=" * 80)
print(
    "Generated scripts"
)
print("=" * 80)

print(
    f"created: {V9_DAILY}"
)

print(
    f"created: {V9_HEALTH}"
)

print(
    f"created: {SUMMARY_V2}"
)


# ============================================================
# Compile generated scripts
# ============================================================

for path in [
    V9_DAILY,
    V9_HEALTH,
    SUMMARY_V2,
]:

    compile_file(
        path
    )


print(
    "generated scripts py_compile: PASS"
)


# ============================================================
# Patch Runner
# ============================================================

runner_text = RUNNER.read_text(
    encoding="utf-8-sig",
    errors="replace",
)


runner_backup = Path(
    "run_fandex_daily_python_only_"
    "before_v9_runner_v7_patch_"
    f"{TIMESTAMP}.bat"
)


shutil.copy2(
    RUNNER,
    runner_backup,
)


print()
print("=" * 80)
print(
    "Patch Runner"
)
print("=" * 80)

print(
    f"backup: {runner_backup}"
)


already_patched = (
    "fandex_master_v9_daily_parallel_v1.py"
    in runner_text
    and
    "fandex_master_v9_health_check_v1.py"
    in runner_text
)


if not already_patched:

    # --------------------------------------------------------
    # Runner name v6 -> v7
    # --------------------------------------------------------

    runner_text = runner_text.replace(
        "Runner v6",
        "Runner v7",
    )


    # --------------------------------------------------------
    # Add header explanation
    # --------------------------------------------------------

    if (
        "v9 Master is generated"
        not in runner_text
    ):

        anchor = (
            "v8 Master is generated as a "
            "parallel Python-only candidate."
        )


        if anchor in runner_text:

            runner_text = runner_text.replace(
                anchor,
                (
                    anchor
                    + "\n"
                    + (
                        "v9 Master is generated as a "
                        "parallel Music v2 x0.25 + "
                        "Last.fm x0.25 candidate."
                    )
                ),
                1,
            )


    # --------------------------------------------------------
    # Existing 16-step labels -> 18-step labels
    #
    # old:
    # 1~12 = 그대로
    # 13    = 14
    # 14    = 15
    # 15    = 17
    # 16    = 18
    #
    # new:
    # 13 v9 daily
    # 16 v9 health
    # --------------------------------------------------------

    def renumber(match):
        old = int(
            match.group(
                1
            )
        )

        if old <= 12:
            new = old

        elif old == 13:
            new = 14

        elif old == 14:
            new = 15

        elif old == 15:
            new = 17

        elif old == 16:
            new = 18

        else:
            new = old


        return (
            f"[{new}/18]"
        )


    runner_text = re.sub(
        r"\[(\d+)/16\]",
        renumber,
        runner_text,
    )


    # --------------------------------------------------------
    # Insert v9 build/history before Last.fm impact
    # --------------------------------------------------------

    impact_marker = (
        "[14/18] Build Last.fm "
        "Rolling Master impact preview"
    )


    if impact_marker not in runner_text:
        stop(
            "Could not locate renumbered "
            "Last.fm impact marker."
        )


    v9_daily_block = r'''
echo.
echo [13/18] Build parallel FANDEX Master v9 + history
py fandex_master_v9_daily_parallel_v1.py
if errorlevel 1 (
    echo.
    echo ERROR: Master v9 daily parallel failed.
    exit /b 1
)

'''


    runner_text = runner_text.replace(
        (
            "echo "
            + impact_marker
        ),
        (
            v9_daily_block
            + "echo "
            + impact_marker
        ),
        1,
    )


    # --------------------------------------------------------
    # Insert v9 health before archive
    # --------------------------------------------------------

    archive_marker = (
        "[17/18] Archive generated "
        "timestamp/log/audit files"
    )


    if archive_marker not in runner_text:
        stop(
            "Could not locate renumbered "
            "archive marker."
        )


    v9_health_block = r'''
echo.
echo [16/18] Run Master v9 health check
py fandex_master_v9_health_check_v1.py
if errorlevel 1 (
    echo.
    echo ERROR: Master v9 health check failed.
    exit /b 1
)

'''


    runner_text = runner_text.replace(
        (
            "echo "
            + archive_marker
        ),
        (
            v9_health_block
            + "echo "
            + archive_marker
        ),
        1,
    )


    # --------------------------------------------------------
    # Daily Summary v1 -> v2
    # --------------------------------------------------------

    if (
        "py fandex_daily_summary_v1.py"
        not in runner_text
    ):
        stop(
            "Could not locate Daily Summary v1 call."
        )


    runner_text = runner_text.replace(
        "py fandex_daily_summary_v1.py",
        "py fandex_daily_summary_v2.py",
        1,
    )


    # --------------------------------------------------------
    # Save Runner as UTF-8 BOM
    # --------------------------------------------------------

    RUNNER.write_text(
        runner_text,
        encoding="utf-8-sig",
    )


    print(
        "runnerChanged: TRUE"
    )


else:

    print(
        "runnerChanged: FALSE "
        "(already patched)"
    )


# ============================================================
# Runner structural verification
# ============================================================

runner_check = RUNNER.read_text(
    encoding="utf-8-sig",
    errors="replace",
)


required_runner_tokens = [
    "Runner v7",
    "[13/18]",
    "fandex_master_v9_daily_parallel_v1.py",
    "[16/18]",
    "fandex_master_v9_health_check_v1.py",
    "[18/18]",
    "fandex_daily_summary_v2.py",
]


missing_tokens = [
    token
    for token in required_runner_tokens
    if token
    not in runner_check
]


if missing_tokens:
    stop(
        "Runner verification failed. "
        "Missing: "
        + ", ".join(
            missing_tokens
        )
    )


print(
    "runnerStructure: PASS"
)


# ============================================================
# Seed today's v9 history using already collected data.
#
# IMPORTANT:
# Full Runner is NOT rerun here.
# ============================================================

run_python(
    V9_DAILY
)


# ============================================================
# v9 health
# ============================================================

run_python(
    V9_HEALTH
)


# ============================================================
# Daily Summary v2 preview
# ============================================================

run_python(
    SUMMARY_V2
)


# ============================================================
# Final
# ============================================================

print()
print()
print("=" * 80)
print(
    "FANDEX Runner v7 + Master v9 Patch Complete"
)
print("=" * 80)

print(
    "Runner version          : v7"
)

print(
    "Runner steps            : 18"
)

print(
    "Master v7               : production unchanged"
)

print(
    "Master v8               : parallel unchanged"
)

print(
    "Master v9               : parallel connected"
)

print(
    "Music v2 scale          : 0.25"
)

print(
    "Last.fm scale           : 0.25"
)

print(
    "v9 history              : enabled"
)

print(
    "v9 health               : enabled"
)

print(
    "Daily Summary v2        : enabled"
)

print(
    "productionV7Modified    : FALSE"
)

print(
    "productionMusicV1Modified: FALSE"
)

print(
    "websiteModified         : FALSE"
)

print()
print(
    "NEXT DAILY COMMAND:"
)

print(
    "run_fandex_daily_python_only.bat"
)

print("=" * 80)