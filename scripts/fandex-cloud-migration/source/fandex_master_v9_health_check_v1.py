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
