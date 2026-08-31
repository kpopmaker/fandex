from __future__ import annotations

import csv
import json
import math
from datetime import date, datetime
from pathlib import Path


VERSION = "music_chart_high_priority_impact_preview_v1"

PREVIEW_SEED = Path(
    "music_chart_seed_v1_high_priority_preview_latest.csv"
)

CURRENT_MUSIC = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

CURRENT_MASTER = Path(
    "fandex_master_ranking_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_high_priority_impact_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_high_priority_impact_preview_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_HIGH_PRIORITY_IMPACT_PREVIEW_V1.txt"
)


PLATFORM_WEIGHTS = {
    "melon": 1.20,
    "circle": 1.35,
    "spotify": 1.10,
    "youtube_music": 1.00,
    "genie": 0.85,
    "bugs": 0.75,
    "flo": 0.75,
    "other": 0.60,
}


CHART_TYPE_WEIGHTS = {
    "realtime": 0.60,
    "daily": 1.00,
    "weekly": 1.15,
    "monthly": 1.25,
    "peak": 0.80,
    "other": 1.00,
}


OUTPUT_FIELDS = [
    "currentRank",
    "projectedRank",
    "rankChange",
    "artist",
    "currentMusicPoint",
    "projectedMusicPoint",
    "musicDelta",
    "currentMasterPoint",
    "projectedMasterPoint",
    "masterDelta",
    "seedRankedEntryCount",
    "approvedPreviewEntryCount",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_float(value, default=0.0):
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


def safe_rank(value):
    try:
        rank = int(
            float(
                norm(value)
            )
        )

        if rank <= 0:
            return None

        return rank

    except Exception:
        return None


def parse_date(value):
    try:
        return date.fromisoformat(
            norm(value)
        )
    except Exception:
        return None


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


def decay_factor(age_days):
    if age_days is None:
        return 0.0

    if age_days <= 3:
        return 1.0

    if age_days <= 7:
        return 0.7

    if age_days <= 14:
        return 0.4

    if age_days <= 30:
        return 0.2

    return 0.0


def metric_bonus(value):
    value = safe_float(
        value,
        0.0,
    )

    if value <= 0:
        return 0.0

    return min(
        math.log10(
            value + 1
        ) * 2.0,
        30.0,
    )


def platform_weight(value):
    key = norm(value).lower()

    return PLATFORM_WEIGHTS.get(
        key,
        PLATFORM_WEIGHTS["other"],
    )


def chart_type_weight(value):
    key = norm(value).lower()

    return CHART_TYPE_WEIGHTS.get(
        key,
        CHART_TYPE_WEIGHTS["other"],
    )


def read_csv(path):
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


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def ranking_rows(payload):
    if (
        isinstance(payload, dict)
        and isinstance(
            payload.get("ranking"),
            list,
        )
    ):
        return [
            row
            for row in payload["ranking"]
            if isinstance(row, dict)
        ]

    if isinstance(payload, list):
        return [
            row
            for row in payload
            if isinstance(row, dict)
        ]

    return []


def artist_name(row):
    for key in [
        "artist",
        "artistName",
        "name",
    ]:
        value = norm(
            row.get(key)
        )

        if value:
            return value

    return ""


def current_music_point(row):
    if not row:
        return 0.0

    for key in [
        "fandexMusicChartFinalPoint",
        "musicChartFinalPoint",
        "musicChartPoint",
        "musicPoint",
        "musicScore",
        "music",
        "score",
    ]:
        if key in row:
            return safe_float(
                row.get(key)
            )

    return 0.0


def master_point(row):
    preferred = [
        "fandexFinalPoint",
        "fandexTotalPoint",
        "finalPoint",
        "totalPoint",
        "finalScore",
        "totalScore",
        "fandexScore",
        "score",
        "total",
    ]

    for key in preferred:
        if key in row:
            value = row.get(key)

            if isinstance(
                value,
                (int, float, str),
            ):
                try:
                    return float(value)
                except Exception:
                    pass

    raise RuntimeError(
        "Master total score field not found. "
        f"artist={artist_name(row)}, "
        f"keys={list(row.keys())}"
    )


def current_rank(row, fallback):
    for key in [
        "rank",
        "fandexRank",
        "ranking",
    ]:
        try:
            value = int(
                float(
                    norm(
                        row.get(key)
                    )
                )
            )

            if value > 0:
                return value

        except Exception:
            pass

    return fallback


def write_csv(
    path,
    rows,
):
    temp = path.with_suffix(
        path.suffix + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(path)


def main():
    print()
    print(
        "FANDEX Music Chart "
        "HIGH Priority Impact Preview v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: IMPACT PREVIEW ONLY")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    as_of = date.today()

    seed_rows = read_csv(
        PREVIEW_SEED
    )

    music_payload = read_json(
        CURRENT_MUSIC
    )

    master_payload = read_json(
        CURRENT_MASTER
    )

    music_rows = ranking_rows(
        music_payload
    )

    master_rows = ranking_rows(
        master_payload
    )

    if len(master_rows) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(master_rows)}"
        )

    artists = [
        artist_name(row)
        for row in master_rows
    ]

    if (
        len(set(artists)) != 10
        or "" in artists
    ):
        raise RuntimeError(
            "Master artist set invalid."
        )

    music_map = {
        artist_name(row):
            row
        for row in music_rows
        if artist_name(row)
    }

    master_map = {
        artist_name(row):
            row
        for row in master_rows
        if artist_name(row)
    }

    projected_music = {
        artist: 0.0
        for artist in artists
    }

    ranked_entry_count = {
        artist: 0
        for artist in artists
    }

    approved_entry_count = {
        artist: 0
        for artist in artists
    }

    print()
    print("Seed entry calculation")
    print("-" * 72)

    for row in seed_rows:
        artist = norm(
            row.get("artist")
        )

        if artist not in projected_music:
            continue

        rank = safe_rank(
            row.get("rank")
        )

        if rank is None:
            continue

        chart_date = parse_date(
            row.get("chartDate")
        )

        if chart_date is None:
            age_days = None
        else:
            age_days = max(
                0,
                (
                    as_of
                    - chart_date
                ).days,
            )

        factor = decay_factor(
            age_days
        )

        raw_point = (
            rank_base(rank)
            * platform_weight(
                row.get("platform")
            )
            * chart_type_weight(
                row.get("chartType")
            )
            + metric_bonus(
                row.get("metricValue")
            )
        )

        final_point = (
            raw_point
            * factor
        )

        projected_music[
            artist
        ] += final_point

        ranked_entry_count[
            artist
        ] += 1

        memo = norm(
            row.get("memo")
        )

        if (
            "approved_by="
            "music_chart_apply_high_priority_candidates_v1"
            in memo
        ):
            approved_entry_count[
                artist
            ] += 1

            print(
                f"APPROVED | "
                f"{artist} | "
                f"{row.get('platform')} | "
                f"rank={rank} | "
                f"{row.get('trackTitle')} | "
                f"raw={raw_point:.2f} | "
                f"decay={factor:.2f} | "
                f"final={final_point:.2f}"
            )

    current_master_points = {}

    current_master_ranks = {}

    for index, row in enumerate(
        master_rows,
        start=1,
    ):
        artist = artist_name(row)

        current_master_points[
            artist
        ] = master_point(row)

        current_master_ranks[
            artist
        ] = current_rank(
            row,
            index,
        )

    projected_master_points = {}

    for artist in artists:
        current_music = (
            current_music_point(
                music_map.get(
                    artist
                )
            )
        )

        new_music = round(
            projected_music[
                artist
            ],
            2,
        )

        current_master = (
            current_master_points[
                artist
            ]
        )

        projected_master_points[
            artist
        ] = round(
            current_master
            - current_music
            + new_music,
            2,
        )

    projected_order = sorted(
        artists,
        key=lambda artist: (
            -projected_master_points[
                artist
            ],
            artist,
        ),
    )

    projected_ranks = {
        artist: index
        for index, artist
        in enumerate(
            projected_order,
            start=1,
        )
    }

    output = []

    for artist in artists:
        current_music = round(
            current_music_point(
                music_map.get(
                    artist
                )
            ),
            2,
        )

        new_music = round(
            projected_music[
                artist
            ],
            2,
        )

        current_master = round(
            current_master_points[
                artist
            ],
            2,
        )

        new_master = round(
            projected_master_points[
                artist
            ],
            2,
        )

        old_rank = (
            current_master_ranks[
                artist
            ]
        )

        new_rank = (
            projected_ranks[
                artist
            ]
        )

        output.append({
            "currentRank":
                old_rank,

            "projectedRank":
                new_rank,

            "rankChange":
                old_rank - new_rank,

            "artist":
                artist,

            "currentMusicPoint":
                current_music,

            "projectedMusicPoint":
                new_music,

            "musicDelta":
                round(
                    new_music
                    - current_music,
                    2,
                ),

            "currentMasterPoint":
                current_master,

            "projectedMasterPoint":
                new_master,

            "masterDelta":
                round(
                    new_master
                    - current_master,
                    2,
                ),

            "seedRankedEntryCount":
                ranked_entry_count[
                    artist
                ],

            "approvedPreviewEntryCount":
                approved_entry_count[
                    artist
                ],
        })

    output.sort(
        key=lambda row:
            row["projectedRank"]
    )

    write_csv(
        OUTPUT_CSV,
        output,
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "asOfDate":
            as_of.isoformat(),

        "previewSeed":
            str(PREVIEW_SEED),

        "artistCount":
            len(output),

        "approvedPreviewEntryCount":
            sum(
                approved_entry_count.values()
            ),

        "ranking":
            output,

        "seedModified":
            False,

        "masterModified":
            False,

        "websiteModified":
            False,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("Projected Master ranking")
    print("-" * 72)

    lines = [
        (
            "FANDEX Music Chart "
            "HIGH Priority Impact Preview v1"
        ),
        "=" * 72,
        f"asOfDate: {as_of.isoformat()}",
        "",
    ]

    for row in output:
        rank_arrow = (
            f"{row['currentRank']}"
            f"->{row['projectedRank']}"
        )

        line = (
            f"{row['projectedRank']} | "
            f"{row['artist']} | "
            f"rank {rank_arrow} | "
            f"Music "
            f"{row['currentMusicPoint']}"
            f"->{row['projectedMusicPoint']} "
            f"({row['musicDelta']:+.2f}) | "
            f"Master "
            f"{row['currentMasterPoint']}"
            f"->{row['projectedMasterPoint']} "
            f"({row['masterDelta']:+.2f})"
        )

        print(line)
        lines.append(line)

    lines.extend([
        "",
        (
            "approvedPreviewEntryCount: "
            f"{sum(approved_entry_count.values())}"
        ),
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print(
        "approvedPreviewEntryCount: "
        f"{sum(approved_entry_count.values())}"
    )
    print(
        f"output: {OUTPUT_CSV}"
    )
    print(
        f"json: {OUTPUT_JSON}"
    )
    print(
        f"report: {REPORT_FILE}"
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