from __future__ import annotations

import csv
import copy
import json
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "fandex_master_v8_lastfm_rolling_v1"

BASE_MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

LASTFM_ROLLING_FILE = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_master_v8_ranking_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_MASTER_V8_BUILD_REPORT.txt"
)

LASTFM_SCALE = 0.25


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in [None, ""]:
            return default

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return default


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise RuntimeError(
            f"Expected JSON object: {path}"
        )

    return data


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def detect_score_field(
    rows: list[dict[str, str]]
) -> str:

    if not rows:
        raise RuntimeError(
            "Last.fm rolling CSV is empty."
        )

    candidates = [
        "rollingCombinedPreviewPoint",
        "rollingCombinedPoint",
        "rollingScore",
        "score",
    ]

    fields = set(
        rows[0].keys()
    )

    for field in candidates:
        if field in fields:
            return field

    raise RuntimeError(
        "Could not detect Last.fm rolling score field. "
        f"fields={sorted(fields)}"
    )


def main():
    print()
    print(
        "FANDEX Master v8 Build v1"
    )
    print("=" * 88)
    print(
        f"version: {VERSION}"
    )
    print(
        "formula: "
        "Naver + YouTube + Music "
        "+ Last.fm Rolling × 0.25"
    )
    print(
        "baseMaster: "
        "fandex_master_ranking_latest.json"
    )
    print(
        "outputMaster: "
        "fandex_master_v8_ranking_latest.json"
    )
    print(
        "baseMasterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 88)

    base = read_json(
        BASE_MASTER_FILE
    )

    base_rows = base.get(
        "ranking"
    )

    if not isinstance(
        base_rows,
        list,
    ):
        raise RuntimeError(
            "Base Master ranking not found."
        )

    if len(base_rows) != 10:
        raise RuntimeError(
            f"Expected 10 Master artists, got {len(base_rows)}"
        )

    rolling_rows = read_csv(
        LASTFM_ROLLING_FILE
    )

    rolling_score_field = (
        detect_score_field(
            rolling_rows
        )
    )

    print()
    print(
        "detectedRollingScoreField: "
        f"{rolling_score_field}"
    )

    rolling_map: dict[str, dict[str, Any]] = {}

    for row in rolling_rows:
        artist = str(
            row.get(
                "artist",
                ""
            )
        ).strip()

        if not artist:
            continue

        if artist in rolling_map:
            raise RuntimeError(
                f"Duplicate Last.fm artist: {artist}"
            )

        rolling_map[artist] = {
            "rollingPoint":
                safe_float(
                    row.get(
                        rolling_score_field
                    )
                ),

            "activeMode":
                str(
                    row.get(
                        "activeMode",
                        "rolling3_50_rolling7_50"
                    )
                ).strip()
                or
                "rolling3_50_rolling7_50",
        }

    base_artists = [
        str(
            row.get(
                "artist",
                ""
            )
        ).strip()
        for row in base_rows
    ]

    missing = [
        artist
        for artist in base_artists
        if artist not in rolling_map
    ]

    if missing:
        raise RuntimeError(
            "Missing Last.fm Rolling artists: "
            + ", ".join(missing)
        )

    extra = [
        artist
        for artist in rolling_map
        if artist not in base_artists
    ]

    if extra:
        raise RuntimeError(
            "Unexpected Last.fm artists: "
            + ", ".join(extra)
        )

    new_rows: list[dict[str, Any]] = []

    for base_row in base_rows:
        artist = str(
            base_row.get(
                "artist",
                ""
            )
        ).strip()

        if not artist:
            raise RuntimeError(
                "Master artist missing."
            )

        row = copy.deepcopy(
            base_row
        )

        v7_score = safe_float(
            base_row.get(
                "fandexFinalPoint",
                base_row.get(
                    "score",
                    0
                )
            )
        )

        source_points = copy.deepcopy(
            base_row.get(
                "sourcePoints",
                {}
            )
        )

        if not isinstance(
            source_points,
            dict,
        ):
            raise RuntimeError(
                f"{artist}: sourcePoints must be dict."
            )

        naver_point = safe_float(
            source_points
            .get(
                "naver",
                {}
            )
            .get(
                "cumulativePoint",
                0
            )
        )

        youtube_point = safe_float(
            source_points
            .get(
                "youtube",
                {}
            )
            .get(
                "cumulativePoint",
                0
            )
        )

        music_point = safe_float(
            source_points
            .get(
                "musicChart",
                {}
            )
            .get(
                "cumulativePoint",
                0
            )
        )

        rolling_raw = safe_float(
            rolling_map[
                artist
            ][
                "rollingPoint"
            ]
        )

        rolling_point = round(
            rolling_raw,
            2,
        )

        lastfm_contribution = round(
            rolling_raw
            * LASTFM_SCALE,
            2,
        )

        v8_score = round(
            v7_score
            + lastfm_contribution,
            2,
        )

        source_points[
            "lastfm"
        ] = {
            "cumulativePoint":
                lastfm_contribution,

            "rollingPoint":
                rolling_point,

            "scale":
                LASTFM_SCALE,

            "activeMode":
                rolling_map[
                    artist
                ][
                    "activeMode"
                ],

            "sourceVersion":
                (
                    "lastfm_global_interest_rolling_"
                    "score_preview_v1"
                ),

            "sourceReadMode":
                (
                    "rolling3_50_rolling7_50_"
                    "scaled_x0_25"
                ),

            "scoreMode":
                (
                    "rolling_combined_preview_point_"
                    "scaled"
                ),
        }

        source_total = round(
            naver_point
            + youtube_point
            + music_point
            + lastfm_contribution,
            2,
        )

        if abs(
            source_total
            - v8_score
        ) > 0.01:
            raise RuntimeError(
                f"{artist}: source total mismatch "
                f"{source_total} != {v8_score}"
            )

        row[
            "fandexFinalPoint"
        ] = v8_score

        row[
            "score"
        ] = v8_score

        row[
            "previousMasterPoint"
        ] = round(
            v7_score,
            2,
        )

        row[
            "deltaFromPreviousMaster"
        ] = round(
            lastfm_contribution,
            2,
        )

        row[
            "sourcePoints"
        ] = source_points

        row[
            "sourceTotalCheck"
        ] = source_total

        new_rows.append(
            row
        )

    new_rows.sort(
        key=lambda row: (
            -safe_float(
                row.get(
                    "fandexFinalPoint"
                )
            ),
            str(
                row.get(
                    "artist",
                    ""
                )
            ),
        )
    )

    for rank, row in enumerate(
        new_rows,
        start=1,
    ):
        row[
            "rank"
        ] = rank

    output = copy.deepcopy(
        base
    )

    output[
        "version"
    ] = VERSION

    output[
        "buildPatch"
    ] = (
        "parallel_v8_add_lastfm_"
        "rolling_x0_25"
    )

    output[
        "createdAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    output[
        "pythonOnly"
    ] = True

    output[
        "touchesWebsitePublicData"
    ] = False

    output[
        "scoreMode"
    ] = (
        "uncapped_cumulative_source_points_"
        "with_youtube_v3_music_chart_v1_"
        "lastfm_rolling_x0_25"
    )

    source_files = copy.deepcopy(
        base.get(
            "sourceFiles",
            []
        )
    )

    if isinstance(
        source_files,
        list,
    ):
        if str(
            LASTFM_ROLLING_FILE
        ) not in source_files:
            source_files.append(
                str(
                    LASTFM_ROLLING_FILE
                )
            )

    elif isinstance(
        source_files,
        dict,
    ):
        source_files[
            "lastfmRolling"
        ] = str(
            LASTFM_ROLLING_FILE
        )

    else:
        source_files = {
            "baseMaster":
                str(
                    BASE_MASTER_FILE
                ),

            "lastfmRolling":
                str(
                    LASTFM_ROLLING_FILE
                ),
        }

    output[
        "sourceFiles"
    ] = source_files

    output[
        "ranking"
    ] = new_rows

    OUTPUT_JSON.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        "Master v8 parallel ranking"
    )
    print("-" * 88)

    report_lines = [
        "FANDEX Master v8 Build v1",
        "=" * 88,
        f"version: {VERSION}",
        (
            "formula: "
            "Master v7 + Last.fm Rolling × 0.25"
        ),
        (
            f"rollingScoreField: "
            f"{rolling_score_field}"
        ),
        "",
        "Ranking",
        "-" * 88,
    ]

    for row in new_rows:
        artist = row[
            "artist"
        ]

        v8_score = safe_float(
            row[
                "fandexFinalPoint"
            ]
        )

        v7_score = safe_float(
            row[
                "previousMasterPoint"
            ]
        )

        delta = safe_float(
            row[
                "deltaFromPreviousMaster"
            ]
        )

        rolling_point = safe_float(
            row[
                "sourcePoints"
            ][
                "lastfm"
            ][
                "rollingPoint"
            ]
        )

        print(
            f"{row['rank']}위 "
            f"{artist} | "
            f"v7={v7_score:.2f} | "
            f"Last.fm Rolling="
            f"{rolling_point:.2f} | "
            f"+{delta:.2f} | "
            f"v8={v8_score:.2f}"
        )

        report_lines.append(
            f"{row['rank']}위 "
            f"{artist} | "
            f"v7={v7_score:.2f} | "
            f"Last.fm Rolling="
            f"{rolling_point:.2f} | "
            f"+{delta:.2f} | "
            f"v8={v8_score:.2f}"
        )

    report_lines.extend([
        "",
        f"artistCount: {len(new_rows)}",
        "baseMasterModified: FALSE",
        "websiteModified: FALSE",
    ])

    OUTPUT_REPORT.write_text(
        "\n".join(
            report_lines
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print(
        f"artistCount: {len(new_rows)}"
    )
    print(
        f"JSON: {OUTPUT_JSON}"
    )
    print(
        f"report: {OUTPUT_REPORT}"
    )
    print(
        "baseMasterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()