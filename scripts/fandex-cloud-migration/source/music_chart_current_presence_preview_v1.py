from __future__ import annotations

import csv
import json
import math
from pathlib import Path


VERSION = "music_chart_current_presence_preview_v1"

MG_JSON = Path(
    "music_chart_artist_candidates_v2_raw_latest.json"
)

BUGS_JSON = Path(
    "music_chart_bugs_all_targets_v1_latest.json"
)

CURRENT_MUSIC_JSON = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_current_presence_preview_v1_latest.csv"
)

REPORT = Path(
    "MUSIC_CHART_CURRENT_PRESENCE_PREVIEW_V1_REPORT.txt"
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


PLATFORM_WEIGHTS = {
    "melon": 1.20,
    "genie": 0.85,
    "bugs": 0.75,
}


CHART_TYPE_WEIGHTS = {
    "daily": 1.00,
    "realtime": 0.60,
}


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_rank(value):
    try:
        rank = int(
            float(
                norm(value)
            )
        )

        if rank <= 0:
            return 999999

        return rank

    except Exception:
        return 999999


def rank_base(rank):
    if rank == 1:
        return 100.0

    if rank <= 3:
        return 90.0

    if rank <= 10:
        return 75.0

    if rank <= 20:
        return 60.0

    if rank <= 50:
        return 40.0

    if rank <= 100:
        return 20.0

    if rank <= 200:
        return 8.0

    return 3.0


def entry_point(
    platform,
    chart_type,
    rank,
):
    base = rank_base(rank)

    platform_weight = (
        PLATFORM_WEIGHTS.get(
            platform,
            0.60,
        )
    )

    chart_weight = (
        CHART_TYPE_WEIGHTS.get(
            chart_type,
            1.00,
        )
    )

    return round(
        base
        * platform_weight
        * chart_weight,
        2,
    )


def read_json(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        return json.load(file)


def select_best(rows):
    best = {}

    for row in rows:
        artist = norm(
            row.get("artist")
        )

        platform = norm(
            row.get("platform")
        ).lower()

        rank = safe_rank(
            row.get("rank")
        )

        if (
            artist not in TARGET_ARTISTS
            or platform
            not in PLATFORM_WEIGHTS
            or rank == 999999
        ):
            continue

        key = (
            artist,
            platform,
        )

        previous = best.get(
            key
        )

        if (
            previous is None
            or rank
            < safe_rank(
                previous.get("rank")
            )
        ):
            best[key] = row

    return best


def current_music_points(payload):
    result = {}

    for row in payload.get(
        "ranking",
        [],
    ):
        artist = norm(
            row.get("artist")
        )

        try:
            point = float(
                row.get(
                    "fandexMusicChartFinalPoint",
                    0,
                )
                or 0
            )
        except Exception:
            point = 0.0

        result[artist] = round(
            point,
            2,
        )

    return result


def main():

    print()
    print(
        "FANDEX Music Chart "
        "Current Presence Preview v1"
    )
    print("=" * 84)
    print(
        "policy: best current entry "
        "per artist x platform"
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
    print("=" * 84)


    mg = read_json(
        MG_JSON
    )

    bugs = read_json(
        BUGS_JSON
    )

    current_music = read_json(
        CURRENT_MUSIC_JSON
    )


    rows = []

    rows.extend(
        mg.get(
            "candidates",
            []
        )
    )

    rows.extend(
        bugs.get(
            "candidates",
            []
        )
    )


    best = select_best(
        rows
    )

    current_points = (
        current_music_points(
            current_music
        )
    )


    preview_rows = []

    proposed_totals = {
        artist: 0.0
        for artist in TARGET_ARTISTS
    }


    for artist in TARGET_ARTISTS:

        for platform in [
            "melon",
            "genie",
            "bugs",
        ]:

            row = best.get(
                (
                    artist,
                    platform,
                )
            )

            if row is None:

                preview_rows.append({
                    "artist":
                        artist,

                    "platform":
                        platform,

                    "status":
                        "NOT_RANKED",

                    "trackTitle":
                        "",

                    "rank":
                        "",

                    "chartType":
                        "",

                    "proposedPoint":
                        0.0,
                })

                continue


            rank = safe_rank(
                row.get("rank")
            )

            chart_type = norm(
                row.get(
                    "chartType"
                )
            ).lower()

            point = entry_point(
                platform,
                chart_type,
                rank,
            )


            proposed_totals[
                artist
            ] += point


            preview_rows.append({
                "artist":
                    artist,

                "platform":
                    platform,

                "status":
                    "RANKED",

                "trackTitle":
                    norm(
                        row.get(
                            "trackTitle"
                        )
                    ),

                "rank":
                    rank,

                "chartType":
                    chart_type,

                "proposedPoint":
                    point,
            })


    for artist in proposed_totals:
        proposed_totals[
            artist
        ] = round(
            proposed_totals[
                artist
            ],
            2,
        )


    fields = [
        "artist",
        "platform",
        "status",
        "trackTitle",
        "rank",
        "chartType",
        "proposedPoint",
    ]


    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields,
        )

        writer.writeheader()
        writer.writerows(
            preview_rows
        )


    print()
    print(
        "Artist Music impact preview"
    )
    print("-" * 84)


    report_lines = [
        (
            "FANDEX Music Chart "
            "Current Presence Preview v1"
        ),
        "=" * 84,
        (
            "policy: best current entry "
            "per artist x platform"
        ),
        "",
    ]


    sorted_artists = sorted(
        TARGET_ARTISTS,
        key=lambda artist:
            proposed_totals[
                artist
            ],
        reverse=True,
    )


    for artist in sorted_artists:

        current = (
            current_points.get(
                artist,
                0.0,
            )
        )

        proposed = (
            proposed_totals[
                artist
            ]
        )

        delta = round(
            proposed - current,
            2,
        )

        line = (
            f"{artist} | "
            f"current={current:.2f} | "
            f"proposed={proposed:.2f} | "
            f"delta={delta:+.2f}"
        )

        print(
            line
        )

        report_lines.append(
            line
        )


    ranked_platform_count = sum(
        1
        for row in preview_rows
        if row["status"]
        == "RANKED"
    )

    zero_artist_count = sum(
        1
        for artist in TARGET_ARTISTS
        if proposed_totals[
            artist
        ] == 0
    )


    print()
    print("=" * 84)
    print(
        f"rankedPlatformCount: "
        f"{ranked_platform_count}/30"
    )
    print(
        f"zeroArtistCount: "
        f"{zero_artist_count}/10"
    )
    print(
        f"previewCSV: "
        f"{OUTPUT_CSV}"
    )
    print(
        f"report: "
        f"{REPORT}"
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


    report_lines.extend([
        "",
        (
            f"rankedPlatformCount: "
            f"{ranked_platform_count}/30"
        ),
        (
            f"zeroArtistCount: "
            f"{zero_artist_count}/10"
        ),
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])


    REPORT.write_text(
        "\n".join(
            report_lines
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()