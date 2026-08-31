from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = (
    "fandex_music_chart_v2_"
    "current_presence_parallel_v1"
)

SCORE_MODE = (
    "best_current_entry_per_"
    "artist_x_platform_full_scale"
)

PREVIEW_FILE = Path(
    "music_chart_current_presence_preview_v1_latest.csv"
)

CHECK_HISTORY_JSON = Path(
    "music_chart_check_history_v1_latest.json"
)

LATEST_JSON = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

HISTORY_FILE = Path(
    "music_chart_current_presence_history_v2.csv"
)

REPORT_FILE = Path(
    "FANDEX_MUSIC_CHART_V2_CURRENT_PRESENCE_REPORT.txt"
)


TARGET_ARTISTS = [
    "아이유",
    "에스파",
    "에이티즈",
    "보이넥스트도어",
    "아이브",
    "르세라핌",
    "뉴진스",
    "세븐틴",
    "스트레이키즈",
    "투모로우바이투게더",
]


HISTORY_FIELDS = [
    "snapshotDate",
    "checkedAt",
    "artist",
    "musicV2Point",
    "rankedPlatformCount",
    "version",
]


def norm(value):
    if value is None:
        return ""

    return str(value).strip()


def safe_float(
    value,
    default=0.0,
):
    try:
        return float(
            value or 0
        )
    except Exception:
        return default


def read_csv(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(
            csv.DictReader(file)
        )


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        payload = json.load(file)

    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            f"Invalid JSON: {path}"
        )

    return payload


def write_json(
    path,
    payload,
):
    temp = path.with_suffix(
        path.suffix + ".tmp"
    )

    temp.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    temp.replace(
        path
    )


def write_history(
    rows,
):
    existing = []

    if HISTORY_FILE.exists():

        with HISTORY_FILE.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:

            existing = list(
                csv.DictReader(file)
            )


    merged = {}

    for row in existing:

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

        if all(key):
            merged[key] = row


    for row in rows:

        key = (
            row[
                "snapshotDate"
            ],
            row[
                "artist"
            ],
        )

        merged[key] = row


    output = list(
        merged.values()
    )

    output.sort(
        key=lambda row: (
            row[
                "snapshotDate"
            ],
            row[
                "artist"
            ],
        )
    )


    temp = HISTORY_FILE.with_suffix(
        ".csv.tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=HISTORY_FIELDS,
        )

        writer.writeheader()

        for row in output:

            writer.writerow({
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in HISTORY_FIELDS
            })


    temp.replace(
        HISTORY_FILE
    )

    return len(
        output
    )


def main():

    now = datetime.now()

    created_at = (
        now.isoformat(
            timespec="seconds"
        )
    )

    timestamp = (
        now.strftime(
            "%Y%m%d_%H%M%S"
        )
    )


    print()
    print(
        "FANDEX Music Chart v2 "
        "Current Presence Parallel"
    )
    print("=" * 88)
    print(
        f"version: {VERSION}"
    )
    print(
        f"scoreMode: {SCORE_MODE}"
    )
    print(
        "usage: PARALLEL CANDIDATE ONLY"
    )
    print(
        "seedModified: FALSE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 88)


    preview = read_csv(
        PREVIEW_FILE
    )

    history_meta = read_json(
        CHECK_HISTORY_JSON
    )


    snapshot_date = norm(
        history_meta.get(
            "latestCheckDate"
        )
    )

    if not snapshot_date:
        raise RuntimeError(
            "latestCheckDate missing."
        )


    if len(preview) != 30:
        raise RuntimeError(
            "Expected 30 "
            "artist-platform rows, "
            f"got {len(preview)}."
        )


    artist_data = {}

    for artist in TARGET_ARTISTS:

        artist_data[
            artist
        ] = {
            "point":
                0.0,

            "rankedPlatformCount":
                0,

            "platformPoints": {},

            "platformStatus": {},
        }


    for row in preview:

        artist = norm(
            row.get(
                "artist"
            )
        )

        platform = norm(
            row.get(
                "platform"
            )
        ).lower()

        status = norm(
            row.get(
                "status"
            )
        )

        if artist not in artist_data:
            raise RuntimeError(
                f"Unexpected artist: {artist}"
            )

        if platform not in {
            "melon",
            "genie",
            "bugs",
        }:
            raise RuntimeError(
                f"Unexpected platform: {platform}"
            )


        point = round(
            safe_float(
                row.get(
                    "proposedPoint"
                )
            ),
            2,
        )


        artist_data[
            artist
        ][
            "platformPoints"
        ][
            platform
        ] = point


        artist_data[
            artist
        ][
            "platformStatus"
        ][
            platform
        ] = {
            "status":
                status,

            "trackTitle":
                norm(
                    row.get(
                        "trackTitle"
                    )
                ),

            "rank":
                norm(
                    row.get(
                        "rank"
                    )
                ),

            "chartType":
                norm(
                    row.get(
                        "chartType"
                    )
                ),

            "point":
                point,
        }


        artist_data[
            artist
        ][
            "point"
        ] += point


        if status == "RANKED":

            artist_data[
                artist
            ][
                "rankedPlatformCount"
            ] += 1


    ranking = []

    for artist in TARGET_ARTISTS:

        data = artist_data[
            artist
        ]

        final_point = round(
            data[
                "point"
            ],
            2,
        )

        ranking.append({
            "artist":
                artist,

            "fandexMusicChartFinalPoint":
                final_point,

            "score":
                final_point,

            "rankedPlatformCount":
                data[
                    "rankedPlatformCount"
                ],

            "platformPoints":
                data[
                    "platformPoints"
                ],

            "platformStatus":
                data[
                    "platformStatus"
                ],
        })


    ranking.sort(
        key=lambda row: (
            row[
                "fandexMusicChartFinalPoint"
            ],
            row[
                "artist"
            ],
        ),
        reverse=True,
    )


    for index, row in enumerate(
        ranking,
        start=1,
    ):
        row[
            "rank"
        ] = index


    timestamp_json = Path(
        "fandex_music_chart_ranking_"
        "v2_current_presence_"
        f"{timestamp}.json"
    )


    payload = {
        "version":
            VERSION,

        "createdAt":
            created_at,

        "snapshotDate":
            snapshot_date,

        "pythonOnly":
            True,

        "touchesWebsitePublicData":
            False,

        "scoreMode":
            SCORE_MODE,

        "usage":
            "parallel_candidate_only",

        "sourceFiles": {
            "preview":
                str(
                    PREVIEW_FILE
                ),

            "checkHistory":
                str(
                    CHECK_HISTORY_JSON
                ),
        },

        "ranking":
            ranking,

        "seedModified":
            False,

        "masterModified":
            False,

        "websiteModified":
            False,
    }


    write_json(
        timestamp_json,
        payload,
    )

    write_json(
        LATEST_JSON,
        payload,
    )


    history_rows = []

    for row in ranking:

        history_rows.append({
            "snapshotDate":
                snapshot_date,

            "checkedAt":
                created_at,

            "artist":
                row[
                    "artist"
                ],

            "musicV2Point":
                row[
                    "fandexMusicChartFinalPoint"
                ],

            "rankedPlatformCount":
                row[
                    "rankedPlatformCount"
                ],

            "version":
                VERSION,
        })


    history_count = write_history(
        history_rows
    )


    print()
    print(
        "Music v2 parallel ranking"
    )
    print("-" * 88)


    report_lines = [
        (
            "FANDEX Music Chart v2 "
            "Current Presence Parallel"
        ),
        "=" * 88,
        (
            f"snapshotDate: "
            f"{snapshot_date}"
        ),
        "",
    ]


    for row in ranking:

        line = (
            f"{row['rank']}위 "
            f"{row['artist']} | "
            f"Music v2="
            f"{row['fandexMusicChartFinalPoint']:.2f} | "
            f"platforms="
            f"{row['rankedPlatformCount']}/3"
        )

        print(
            line
        )

        report_lines.append(
            line
        )


    zero_count = sum(
        1
        for row in ranking
        if row[
            "fandexMusicChartFinalPoint"
        ] == 0
    )


    report_lines.extend([
        "",
        (
            f"artistCount: "
            f"{len(ranking)}"
        ),
        (
            f"zeroArtistCount: "
            f"{zero_count}"
        ),
        (
            f"historyRowCount: "
            f"{history_count}"
        ),
        "usage: parallel_candidate_only",
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])


    REPORT_FILE.write_text(
        "\n".join(
            report_lines
        ),
        encoding="utf-8",
    )


    print()
    print("=" * 88)
    print(
        f"snapshotDate: "
        f"{snapshot_date}"
    )
    print(
        f"artistCount: "
        f"{len(ranking)}"
    )
    print(
        f"zeroArtistCount: "
        f"{zero_count}"
    )
    print(
        f"historyRowCount: "
        f"{history_count}"
    )
    print(
        f"latestJSON: "
        f"{LATEST_JSON}"
    )
    print(
        f"historyCSV: "
        f"{HISTORY_FILE}"
    )
    print(
        f"report: "
        f"{REPORT_FILE}"
    )
    print(
        "seedModified: FALSE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()