from __future__ import annotations

import csv
import json
from pathlib import Path


VERSION = (
    "music_chart_current_presence_"
    "master_impact_preview_v1"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MUSIC_PREVIEW_FILE = Path(
    "music_chart_current_presence_preview_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "music_chart_current_presence_"
    "master_impact_preview_v1_latest.csv"
)

REPORT_FILE = Path(
    "FANDEX_MUSIC_CURRENT_PRESENCE_"
    "MASTER_IMPACT_PREVIEW_V1_REPORT.txt"
)


SCALES = [
    0.25,
    0.50,
    1.00,
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


def read_json(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        return json.load(file)


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(
            csv.DictReader(file)
        )


def proposed_music_points(rows):
    totals = {}

    for row in rows:

        artist = norm(
            row.get("artist")
        )

        if not artist:
            continue

        totals.setdefault(
            artist,
            0.0,
        )

        totals[artist] += (
            safe_float(
                row.get(
                    "proposedPoint"
                )
            )
        )

    return {
        artist:
            round(
                point,
                2,
            )
        for artist, point
        in totals.items()
    }


def current_music_point(row):

    source_points = (
        row.get(
            "sourcePoints"
        )
        or {}
    )

    music = (
        source_points.get(
            "musicChart"
        )
        or {}
    )

    return round(
        safe_float(
            music.get(
                "cumulativePoint"
            )
        ),
        2,
    )


def main():

    print()
    print(
        "FANDEX Music Current Presence "
        "Master Impact Preview v1"
    )
    print("=" * 88)
    print(
        "formula: current v7 + "
        "(proposed Music - current Music) "
        "* transition scale"
    )
    print(
        "scales: 0.25, 0.50, 1.00"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 88)


    master = read_json(
        MASTER_FILE
    )

    music_rows = read_csv(
        MUSIC_PREVIEW_FILE
    )

    proposed = (
        proposed_music_points(
            music_rows
        )
    )


    ranking = master.get(
        "ranking",
        []
    )

    if len(ranking) != 10:
        raise RuntimeError(
            "Master ranking must "
            "contain 10 artists."
        )


    base_rank = {
        norm(row.get("artist")):
            int(
                row.get("rank")
                or 0
            )
        for row in ranking
    }


    all_output = []

    report_lines = [
        (
            "FANDEX Music Current Presence "
            "Master Impact Preview v1"
        ),
        "=" * 88,
        (
            "formula: current v7 + "
            "(proposed Music - current Music) "
            "* transition scale"
        ),
        "",
    ]


    for scale in SCALES:

        scenario = []

        for row in ranking:

            artist = norm(
                row.get("artist")
            )

            master_point = (
                safe_float(
                    row.get(
                        "fandexFinalPoint",
                        row.get(
                            "score"
                        ),
                    )
                )
            )

            current_music = (
                current_music_point(
                    row
                )
            )

            proposed_music = round(
                proposed.get(
                    artist,
                    0.0,
                ),
                2,
            )

            music_delta = round(
                proposed_music
                - current_music,
                2,
            )

            applied_delta = round(
                music_delta
                * scale,
                2,
            )

            preview_master = round(
                master_point
                + applied_delta,
                2,
            )

            scenario.append({
                "scale":
                    scale,

                "artist":
                    artist,

                "baseRank":
                    base_rank[
                        artist
                    ],

                "baseMaster":
                    round(
                        master_point,
                        2,
                    ),

                "currentMusic":
                    current_music,

                "proposedMusic":
                    proposed_music,

                "musicDelta":
                    music_delta,

                "appliedDelta":
                    applied_delta,

                "previewMaster":
                    preview_master,
            })


        scenario.sort(
            key=lambda row:
                row[
                    "previewMaster"
                ],
            reverse=True,
        )


        for index, row in enumerate(
            scenario,
            start=1,
        ):
            row[
                "previewRank"
            ] = index

            row[
                "rankChange"
            ] = (
                row[
                    "baseRank"
                ]
                - index
            )


        print()
        print(
            f"Music methodology "
            f"transition x{scale:.2f}"
        )
        print("-" * 88)

        report_lines.extend([
            "",
            (
                f"Music methodology "
                f"transition x{scale:.2f}"
            ),
            "-" * 88,
        ])


        for row in scenario:

            line = (
                f"{row['previewRank']}위 "
                f"{row['artist']} | "
                f"v7={row['baseMaster']:.2f} | "
                f"Music "
                f"{row['currentMusic']:.2f}"
                f"→"
                f"{row['proposedMusic']:.2f} | "
                f"적용Δ="
                f"{row['appliedDelta']:+.2f} | "
                f"preview="
                f"{row['previewMaster']:.2f} | "
                f"rankChange="
                f"{row['rankChange']:+d}"
            )

            print(
                line
            )

            report_lines.append(
                line
            )

            all_output.append(
                row
            )


    fields = [
        "scale",
        "artist",
        "baseRank",
        "previewRank",
        "rankChange",
        "baseMaster",
        "currentMusic",
        "proposedMusic",
        "musicDelta",
        "appliedDelta",
        "previewMaster",
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
            all_output
        )


    report_lines.extend([
        "",
        "=" * 88,
        f"CSV: {OUTPUT_CSV}",
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
        f"CSV: {OUTPUT_CSV}"
    )
    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()