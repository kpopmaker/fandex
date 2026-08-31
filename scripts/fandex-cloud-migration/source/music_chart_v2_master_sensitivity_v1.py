from __future__ import annotations

import csv
import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path


# ============================================================
# FANDEX Music v2 -> Master Sensitivity Analysis v1
#
# 목적:
# production v7의 Music v1을 제거하고
# Music v2를 x0.25 / x0.50 / x1.00으로 넣었을 때
# Master 점수·순위·7-snapshot 변동성을 비교한다.
#
# READ-ONLY ANALYSIS
# production / Music v1 / Music v2 / website 수정 없음
# ============================================================


VERSION = "music_chart_v2_master_sensitivity_v1"


MASTER_V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MUSIC_V1_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

MUSIC_V2_HISTORY_FILE = Path(
    "music_chart_current_presence_history_v2.csv"
)


OUTPUT_JSON = Path(
    "music_chart_v2_master_sensitivity_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_v2_master_sensitivity_latest.csv"
)

OUTPUT_HISTORY_CSV = Path(
    "music_chart_v2_master_sensitivity_history_latest.csv"
)

OUTPUT_REPORT = Path(
    "MUSIC_CHART_V2_MASTER_SENSITIVITY_REPORT.txt"
)


SCALES = [
    0.25,
    0.50,
    1.00,
]


# ============================================================
# 투명한 "주의 신호" 기준
#
# 이것은 production 승격 기준이 아니라
# 시나리오 비교를 쉽게 하기 위한 heuristic이다.
# ============================================================

CAUTION_LATEST_RANK_SHIFT = 2
HIGH_LATEST_RANK_SHIFT = 3

CAUTION_HISTORY_RANK_RANGE = 3
HIGH_HISTORY_RANK_RANGE = 4

CAUTION_MUSIC_SHARE_PCT = 30.0
HIGH_MUSIC_SHARE_PCT = 40.0


# ============================================================
# Helpers
# ============================================================

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


def integer(
    value,
    default=0,
):
    try:
        return int(
            float(
                value
            )
        )

    except Exception:
        return default


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_csv(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        return list(
            csv.DictReader(
                file
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
        row.get("artist")
        or row.get("artistName")
        or row.get("name")
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


def history_date(row):
    return norm(
        row.get("snapshotDate")
        or row.get("checkDate")
        or row.get("chartDate")
        or row.get("date")
    )


def history_artist(row):
    return norm(
        row.get("artist")
        or row.get("artistName")
        or row.get("name")
    )


def history_point(row):
    return first_number(
        row,
        [
            "musicV2Point",
            "fandexMusicChartFinalPoint",
            "fandexMusicChartPoint",
            "musicChartPoint",
            "musicPoint",
            "score",
        ],
    )


def build_artist_map(rows):
    result = {}

    for row in rows:

        artist = artist_name(
            row
        )

        if artist:
            result[
                artist
            ] = row

    return result


def build_rank_map(score_map):
    ordered = sorted(
        score_map.items(),
        key=lambda item: (
            -item[1],
            item[0],
        ),
    )

    result = {}

    for rank, (
        artist,
        score,
    ) in enumerate(
        ordered,
        start=1,
    ):

        result[
            artist
        ] = {
            "rank":
                rank,

            "score":
                round(
                    score,
                    4,
                ),
        }

    return result


def round2(value):
    return round(
        number(
            value
        ),
        2,
    )


def mean(values):
    if not values:
        return 0.0

    return sum(
        values
    ) / len(
        values
    )


def stddev(values):
    if len(
        values
    ) <= 1:
        return 0.0

    avg = mean(
        values
    )

    variance = sum(
        (
            value - avg
        ) ** 2
        for value in values
    ) / len(
        values
    )

    return math.sqrt(
        variance
    )


def parse_iso_date(value):
    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).date()

    except Exception:
        return None


def history_gaps(snapshot_dates):
    gaps = []

    for index in range(
        1,
        len(
            snapshot_dates
        ),
    ):

        previous = parse_iso_date(
            snapshot_dates[
                index - 1
            ]
        )

        current = parse_iso_date(
            snapshot_dates[
                index
            ]
        )

        if (
            previous is None
            or current is None
        ):
            continue

        days = (
            current - previous
        ).days

        if days > 1:

            gaps.append({
                "from":
                    previous.isoformat(),

                "to":
                    current.isoformat(),

                "daysBetween":
                    days,

                "missingDays":
                    days - 1,
            })

    return gaps


def risk_level(
    max_latest_rank_shift,
    max_history_rank_range,
    max_music_share_pct,
):
    if (
        max_latest_rank_shift
        >= HIGH_LATEST_RANK_SHIFT

        or
        max_history_rank_range
        >= HIGH_HISTORY_RANK_RANGE

        or
        max_music_share_pct
        >= HIGH_MUSIC_SHARE_PCT
    ):
        return "HIGH"

    if (
        max_latest_rank_shift
        >= CAUTION_LATEST_RANK_SHIFT

        or
        max_history_rank_range
        >= CAUTION_HISTORY_RANK_RANGE

        or
        max_music_share_pct
        >= CAUTION_MUSIC_SHARE_PCT
    ):
        return "MEDIUM"

    return "LOW"


# ============================================================
# Main
# ============================================================

def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )

    print()
    print("=" * 88)
    print(
        "FANDEX Music v2 -> Master "
        "Sensitivity Analysis v1"
    )
    print("=" * 88)

    print(
        f"version: {VERSION}"
    )

    print(
        "mode: READ-ONLY ANALYSIS"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "musicV2Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


    # ========================================================
    # Load
    # ========================================================

    master_payload = read_json(
        MASTER_V7_FILE
    )

    v1_payload = read_json(
        MUSIC_V1_FILE
    )

    v2_payload = read_json(
        MUSIC_V2_FILE
    )

    history_rows = read_csv(
        MUSIC_V2_HISTORY_FILE
    )


    master_rows = ranking_rows(
        master_payload
    )

    v1_rows = ranking_rows(
        v1_payload
    )

    v2_rows = ranking_rows(
        v2_payload
    )


    master_map = build_artist_map(
        master_rows
    )

    v1_map = build_artist_map(
        v1_rows
    )

    v2_map = build_artist_map(
        v2_rows
    )


    artists = sorted(
        set(
            master_map
        )
        | set(
            v1_map
        )
        | set(
            v2_map
        )
    )


    if len(
        artists
    ) != 10:

        raise RuntimeError(
            "Expected 10 artists, "
            f"found {len(artists)}"
        )


    # ========================================================
    # Current production baseline
    #
    # current v7 = non-music base + Music v1
    # 따라서:
    #
    # nonMusicBase = v7 - Music v1
    # ========================================================

    current_master_scores = {}

    current_v1_scores = {}

    current_v2_scores = {}

    non_music_base = {}


    for artist in artists:

        current_master = master_point(
            master_map.get(
                artist,
                {},
            )
        )

        v1 = music_point(
            v1_map.get(
                artist,
                {},
            )
        )

        v2 = music_point(
            v2_map.get(
                artist,
                {},
            )
        )


        current_master_scores[
            artist
        ] = current_master

        current_v1_scores[
            artist
        ] = v1

        current_v2_scores[
            artist
        ] = v2

        non_music_base[
            artist
        ] = (
            current_master
            - v1
        )


    current_rank_map = build_rank_map(
        current_master_scores
    )


    # ========================================================
    # Music v2 history
    # ========================================================

    history_by_date = defaultdict(
        dict
    )

    history_duplicate_count = 0

    seen_history_keys = set()


    for row in history_rows:

        snapshot_date = history_date(
            row
        )

        artist = history_artist(
            row
        )

        if (
            not snapshot_date
            or not artist
        ):
            continue


        key = (
            snapshot_date,
            artist,
        )


        if key in seen_history_keys:
            history_duplicate_count += 1

        seen_history_keys.add(
            key
        )


        history_by_date[
            snapshot_date
        ][
            artist
        ] = history_point(
            row
        )


    snapshot_dates = sorted(
        history_by_date.keys()
    )


    complete_snapshot_dates = [
        snapshot_date

        for snapshot_date
        in snapshot_dates

        if len(
            history_by_date[
                snapshot_date
            ]
        )
        == 10
    ]


    gaps = history_gaps(
        snapshot_dates
    )


    continuous_daily = (
        len(
            gaps
        )
        == 0
    )


    print()
    print(
        "History state"
    )
    print("-" * 88)

    print(
        f"snapshotCount: "
        f"{len(snapshot_dates)}"
    )

    print(
        f"completeSnapshotCount: "
        f"{len(complete_snapshot_dates)}"
    )

    print(
        f"historyDuplicateCount: "
        f"{history_duplicate_count}"
    )

    print(
        "snapshotDates: "
        + ", ".join(
            snapshot_dates
        )
    )

    print(
        "continuousDaily: "
        + (
            "TRUE"
            if continuous_daily
            else "FALSE"
        )
    )


    if gaps:

        print(
            "dateGaps:"
        )

        for gap in gaps:

            print(
                f"- {gap['from']} "
                f"-> {gap['to']} "
                f"(missingDays="
                f"{gap['missingDays']})"
            )


    if history_duplicate_count:
        raise RuntimeError(
            "Music v2 history duplicate "
            "detected."
        )


    if len(
        complete_snapshot_dates
    ) < 7:

        raise RuntimeError(
            "Need at least 7 complete "
            "Music v2 snapshots."
        )


    # ========================================================
    # Per-artist Music v2 history statistics
    # ========================================================

    music_history_stats = {}


    for artist in artists:

        values = []

        for snapshot_date in snapshot_dates:

            if artist in history_by_date[
                snapshot_date
            ]:

                values.append(
                    history_by_date[
                        snapshot_date
                    ][
                        artist
                    ]
                )


        if values:

            minimum = min(
                values
            )

            maximum = max(
                values
            )

            average = mean(
                values
            )

            sigma = stddev(
                values
            )

        else:

            minimum = 0.0
            maximum = 0.0
            average = 0.0
            sigma = 0.0


        music_history_stats[
            artist
        ] = {
            "snapshotCount":
                len(
                    values
                ),

            "min":
                round2(
                    minimum
                ),

            "max":
                round2(
                    maximum
                ),

            "mean":
                round2(
                    average
                ),

            "stdDev":
                round2(
                    sigma
                ),

            "range":
                round2(
                    maximum
                    - minimum
                ),
        }


    # ========================================================
    # Scenario analysis
    # ========================================================

    scenarios = []

    latest_csv_rows = []

    history_csv_rows = []


    for scale in SCALES:

        # ----------------------------------------------------
        # Latest snapshot
        # ----------------------------------------------------

        proposed_scores = {}


        for artist in artists:

            proposed_scores[
                artist
            ] = (
                non_music_base[
                    artist
                ]
                +
                current_v2_scores[
                    artist
                ]
                * scale
            )


        proposed_rank_map = build_rank_map(
            proposed_scores
        )


        artist_results = []


        for artist in artists:

            current_rank = (
                current_rank_map[
                    artist
                ][
                    "rank"
                ]
            )

            proposed_rank = (
                proposed_rank_map[
                    artist
                ][
                    "rank"
                ]
            )

            rank_change = (
                current_rank
                - proposed_rank
            )


            current_master = (
                current_master_scores[
                    artist
                ]
            )

            v1 = (
                current_v1_scores[
                    artist
                ]
            )

            v2 = (
                current_v2_scores[
                    artist
                ]
            )

            scaled_v2 = (
                v2
                * scale
            )

            proposed_master = (
                proposed_scores[
                    artist
                ]
            )

            master_delta = (
                proposed_master
                - current_master
            )


            if proposed_master > 0:

                music_share_pct = (
                    scaled_v2
                    / proposed_master
                    * 100.0
                )

            else:

                music_share_pct = 0.0


            row = {
                "artist":
                    artist,

                "scale":
                    scale,

                "currentRank":
                    current_rank,

                "proposedRank":
                    proposed_rank,

                "rankChange":
                    rank_change,

                "currentMaster":
                    round2(
                        current_master
                    ),

                "nonMusicBase":
                    round2(
                        non_music_base[
                            artist
                        ]
                    ),

                "musicV1":
                    round2(
                        v1
                    ),

                "musicV2":
                    round2(
                        v2
                    ),

                "scaledMusicV2":
                    round2(
                        scaled_v2
                    ),

                "proposedMaster":
                    round2(
                        proposed_master
                    ),

                "masterDelta":
                    round2(
                        master_delta
                    ),

                "musicSharePct":
                    round2(
                        music_share_pct
                    ),
            }


            artist_results.append(
                row
            )

            latest_csv_rows.append(
                row.copy()
            )


        # ----------------------------------------------------
        # Historical rank simulation
        # ----------------------------------------------------

        historical_rank_by_artist = defaultdict(
            list
        )

        top1_by_date = {}

        date_results = []


        for snapshot_date in snapshot_dates:

            snapshot_music = (
                history_by_date[
                    snapshot_date
                ]
            )


            snapshot_scores = {}


            for artist in artists:

                v2_history_point = (
                    snapshot_music.get(
                        artist,
                        0.0,
                    )
                )


                snapshot_scores[
                    artist
                ] = (
                    non_music_base[
                        artist
                    ]
                    +
                    v2_history_point
                    * scale
                )


            snapshot_rank_map = build_rank_map(
                snapshot_scores
            )


            top_artist = min(
                artists,
                key=lambda artist:
                    snapshot_rank_map[
                        artist
                    ][
                        "rank"
                    ],
            )


            top1_by_date[
                snapshot_date
            ] = top_artist


            date_row = {
                "snapshotDate":
                    snapshot_date,

                "scale":
                    scale,

                "topArtist":
                    top_artist,
            }


            date_results.append(
                date_row
            )


            for artist in artists:

                rank = (
                    snapshot_rank_map[
                        artist
                    ][
                        "rank"
                    ]
                )

                score = (
                    snapshot_rank_map[
                        artist
                    ][
                        "score"
                    ]
                )

                historical_rank_by_artist[
                    artist
                ].append(
                    rank
                )


                history_csv_rows.append({
                    "snapshotDate":
                        snapshot_date,

                    "scale":
                        scale,

                    "artist":
                        artist,

                    "musicV2Point":
                        round2(
                            snapshot_music.get(
                                artist,
                                0.0,
                            )
                        ),

                    "scaledMusicV2":
                        round2(
                            snapshot_music.get(
                                artist,
                                0.0,
                            )
                            * scale
                        ),

                    "simulatedMaster":
                        round2(
                            score
                        ),

                    "simulatedRank":
                        rank,
                })


        # ----------------------------------------------------
        # Historical volatility
        # ----------------------------------------------------

        historical_artist_stats = []


        for artist in artists:

            ranks = (
                historical_rank_by_artist[
                    artist
                ]
            )


            rank_min = min(
                ranks
            )

            rank_max = max(
                ranks
            )

            rank_range = (
                rank_max
                - rank_min
            )


            historical_artist_stats.append({
                "artist":
                    artist,

                "bestRank":
                    rank_min,

                "worstRank":
                    rank_max,

                "rankRange":
                    rank_range,

                "averageRank":
                    round2(
                        mean(
                            ranks
                        )
                    ),
            })


        latest_rank_shifts = [
            abs(
                row[
                    "rankChange"
                ]
            )
            for row in artist_results
        ]


        history_rank_ranges = [
            row[
                "rankRange"
            ]
            for row
            in historical_artist_stats
        ]


        music_shares = [
            row[
                "musicSharePct"
            ]
            for row in artist_results
        ]


        master_deltas = [
            abs(
                row[
                    "masterDelta"
                ]
            )
            for row in artist_results
        ]


        max_latest_rank_shift = max(
            latest_rank_shifts
        )

        max_history_rank_range = max(
            history_rank_ranges
        )

        average_history_rank_range = mean(
            history_rank_ranges
        )

        max_music_share_pct = max(
            music_shares
        )

        max_master_delta = max(
            master_deltas
        )


        risk = risk_level(
            max_latest_rank_shift,
            max_history_rank_range,
            max_music_share_pct,
        )


        unique_top1 = sorted(
            set(
                top1_by_date.values()
            )
        )


        scenario = {
            "scale":
                scale,

            "heuristicRisk":
                risk,

            "latest": {
                "maxAbsRankChange":
                    max_latest_rank_shift,

                "maxMusicSharePct":
                    round2(
                        max_music_share_pct
                    ),

                "maxAbsMasterDelta":
                    round2(
                        max_master_delta
                    ),

                "artistResults":
                    artist_results,
            },

            "history": {
                "snapshotCount":
                    len(
                        snapshot_dates
                    ),

                "maxRankRange":
                    max_history_rank_range,

                "averageRankRange":
                    round2(
                        average_history_rank_range
                    ),

                "uniqueTop1Artists":
                    unique_top1,

                "top1ByDate":
                    top1_by_date,

                "artistStats":
                    historical_artist_stats,
            },
        }


        scenarios.append(
            scenario
        )


    # ========================================================
    # Scenario ranking / suggested review order
    #
    # 이건 자동 승격 결정이 아니다.
    # LOW -> MEDIUM -> HIGH 순으로만 정렬한다.
    # 같은 risk에서는 높은 scale보다 낮은 scale을 먼저 본다.
    # ========================================================

    risk_order = {
        "LOW":
            0,

        "MEDIUM":
            1,

        "HIGH":
            2,
    }


    review_order = sorted(
        scenarios,
        key=lambda scenario: (
            risk_order.get(
                scenario[
                    "heuristicRisk"
                ],
                99,
            ),
            scenario[
                "scale"
            ],
        ),
    )


    # ========================================================
    # JSON
    # ========================================================

    payload = {
        "version":
            VERSION,

        "createdAt":
            created_at,

        "purpose":
            (
                "compare replacement of production "
                "Music v1 with scaled Music v2"
            ),

        "formula":
            (
                "proposedMaster = "
                "(productionV7 - MusicV1) "
                "+ MusicV2 * scale"
            ),

        "scales":
            SCALES,

        "history": {
            "snapshotCount":
                len(
                    snapshot_dates
                ),

            "completeSnapshotCount":
                len(
                    complete_snapshot_dates
                ),

            "snapshotDates":
                snapshot_dates,

            "continuousDaily":
                continuous_daily,

            "dateGaps":
                gaps,

            "duplicateCount":
                history_duplicate_count,
        },

        "musicV2HistoryStats":
            music_history_stats,

        "heuristicThresholds": {
            "cautionLatestRankShift":
                CAUTION_LATEST_RANK_SHIFT,

            "highLatestRankShift":
                HIGH_LATEST_RANK_SHIFT,

            "cautionHistoryRankRange":
                CAUTION_HISTORY_RANK_RANGE,

            "highHistoryRankRange":
                HIGH_HISTORY_RANK_RANGE,

            "cautionMusicSharePct":
                CAUTION_MUSIC_SHARE_PCT,

            "highMusicSharePct":
                HIGH_MUSIC_SHARE_PCT,

            "note":
                (
                    "These thresholds are analysis "
                    "heuristics only, not production "
                    "promotion rules."
                ),
        },

        "scenarios":
            scenarios,

        "reviewOrder": [
            {
                "scale":
                    scenario[
                        "scale"
                    ],

                "heuristicRisk":
                    scenario[
                        "heuristicRisk"
                    ],
            }

            for scenario in review_order
        ],

        "productionV7Modified":
            False,

        "musicV1Modified":
            False,

        "musicV2Modified":
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


    # ========================================================
    # Latest comparison CSV
    # ========================================================

    latest_fields = [
        "scale",
        "artist",
        "currentRank",
        "proposedRank",
        "rankChange",
        "currentMaster",
        "nonMusicBase",
        "musicV1",
        "musicV2",
        "scaledMusicV2",
        "proposedMaster",
        "masterDelta",
        "musicSharePct",
    ]


    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=latest_fields,
        )

        writer.writeheader()

        writer.writerows(
            latest_csv_rows
        )


    # ========================================================
    # Historical simulation CSV
    # ========================================================

    history_fields = [
        "snapshotDate",
        "scale",
        "artist",
        "musicV2Point",
        "scaledMusicV2",
        "simulatedMaster",
        "simulatedRank",
    ]


    with OUTPUT_HISTORY_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=history_fields,
        )

        writer.writeheader()

        writer.writerows(
            history_csv_rows
        )


    # ========================================================
    # Text report
    # ========================================================

    lines = []

    lines.append(
        "FANDEX Music v2 -> Master Sensitivity Analysis v1"
    )

    lines.append(
        "=" * 96
    )

    lines.append(
        f"createdAt: {created_at}"
    )

    lines.append(
        f"version: {VERSION}"
    )

    lines.append(
        (
            "formula: proposedMaster = "
            "(productionV7 - MusicV1) "
            "+ MusicV2 * scale"
        )
    )

    lines.append(
        "productionV7Modified: FALSE"
    )

    lines.append(
        "musicV1Modified: FALSE"
    )

    lines.append(
        "musicV2Modified: FALSE"
    )

    lines.append(
        "websiteModified: FALSE"
    )

    lines.append(
        ""
    )


    lines.append(
        "History"
    )

    lines.append(
        "-" * 96
    )

    lines.append(
        f"snapshotCount: "
        f"{len(snapshot_dates)}"
    )

    lines.append(
        f"completeSnapshotCount: "
        f"{len(complete_snapshot_dates)}"
    )

    lines.append(
        f"continuousDaily: "
        f"{str(continuous_daily).upper()}"
    )

    lines.append(
        "snapshotDates: "
        + ", ".join(
            snapshot_dates
        )
    )


    if gaps:

        lines.append(
            "dateGaps:"
        )

        for gap in gaps:

            lines.append(
                f"- {gap['from']} "
                f"-> {gap['to']} "
                f"/ missingDays="
                f"{gap['missingDays']}"
            )


    lines.append(
        ""
    )

    lines.append(
        "Scenario summary"
    )

    lines.append(
        "-" * 96
    )


    for scenario in scenarios:

        lines.append(
            (
                f"x{scenario['scale']:.2f} "
                f"| risk="
                f"{scenario['heuristicRisk']} "
                f"| latestMaxRankShift="
                f"{scenario['latest']['maxAbsRankChange']} "
                f"| historyMaxRankRange="
                f"{scenario['history']['maxRankRange']} "
                f"| historyAvgRankRange="
                f"{scenario['history']['averageRankRange']:.2f} "
                f"| maxMusicShare="
                f"{scenario['latest']['maxMusicSharePct']:.2f}% "
                f"| maxMasterDelta="
                f"{scenario['latest']['maxAbsMasterDelta']:.2f}"
            )
        )


    for scenario in scenarios:

        lines.append(
            ""
        )

        lines.append(
            f"Music v2 x{scenario['scale']:.2f}"
        )

        lines.append(
            "-" * 96
        )


        ordered_latest = sorted(
            scenario[
                "latest"
            ][
                "artistResults"
            ],
            key=lambda row:
                row[
                    "proposedRank"
                ],
        )


        for row in ordered_latest:

            lines.append(
                (
                    f"{row['proposedRank']:>2}. "
                    f"{row['artist']} "
                    f"| currentRank="
                    f"{row['currentRank']} "
                    f"-> proposedRank="
                    f"{row['proposedRank']} "
                    f"| rankChange="
                    f"{row['rankChange']:+d} "
                    f"| Music "
                    f"{row['musicV1']:.2f} "
                    f"-> "
                    f"{row['scaledMusicV2']:.2f} "
                    f"| Master "
                    f"{row['currentMaster']:.2f} "
                    f"-> "
                    f"{row['proposedMaster']:.2f} "
                    f"| musicShare="
                    f"{row['musicSharePct']:.2f}%"
                )
            )


        lines.append(
            ""
        )

        lines.append(
            "Historical rank range"
        )


        history_stats_sorted = sorted(
            scenario[
                "history"
            ][
                "artistStats"
            ],
            key=lambda row: (
                -row[
                    "rankRange"
                ],
                row[
                    "artist"
                ],
            ),
        )


        for row in history_stats_sorted:

            lines.append(
                (
                    f"{row['artist']} "
                    f"| best="
                    f"{row['bestRank']} "
                    f"| worst="
                    f"{row['worstRank']} "
                    f"| range="
                    f"{row['rankRange']} "
                    f"| avg="
                    f"{row['averageRank']:.2f}"
                )
            )


    lines.append(
        ""
    )

    lines.append(
        "=" * 96
    )

    lines.append(
        "IMPORTANT: heuristicRisk is not a production promotion decision."
    )

    lines.append(
        "Use this report to choose which Music v2 scale should move to the next review."
    )

    lines.append(
        "=" * 96
    )


    OUTPUT_REPORT.write_text(
        "\n".join(
            lines
        )
        + "\n",
        encoding="utf-8",
    )


    # ========================================================
    # Console summary
    # ========================================================

    print()
    print("=" * 88)
    print(
        "SCENARIO SUMMARY"
    )
    print("=" * 88)


    for scenario in scenarios:

        print(
            f"Music v2 x"
            f"{scenario['scale']:.2f}"
        )

        print(
            f"  heuristicRisk        : "
            f"{scenario['heuristicRisk']}"
        )

        print(
            f"  latestMaxRankShift   : "
            f"{scenario['latest']['maxAbsRankChange']}"
        )

        print(
            f"  historyMaxRankRange  : "
            f"{scenario['history']['maxRankRange']}"
        )

        print(
            f"  historyAvgRankRange  : "
            f"{scenario['history']['averageRankRange']:.2f}"
        )

        print(
            f"  maxMusicShare        : "
            f"{scenario['latest']['maxMusicSharePct']:.2f}%"
        )

        print(
            f"  maxMasterDelta       : "
            f"{scenario['latest']['maxAbsMasterDelta']:.2f}"
        )

        print(
            "  historicalTop1       : "
            + ", ".join(
                scenario[
                    "history"
                ][
                    "uniqueTop1Artists"
                ]
            )
        )

        print()


    print(
        "Review order"
    )
    print("-" * 88)


    for index, scenario in enumerate(
        review_order,
        start=1,
    ):

        print(
            f"{index}. "
            f"Music v2 x"
            f"{scenario['scale']:.2f} "
            f"/ "
            f"{scenario['heuristicRisk']}"
        )


    print()
    print("=" * 88)

    print(
        f"json: {OUTPUT_JSON}"
    )

    print(
        f"latestCSV: {OUTPUT_CSV}"
    )

    print(
        f"historyCSV: {OUTPUT_HISTORY_CSV}"
    )

    print(
        f"report: {OUTPUT_REPORT}"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "musicV2Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


if __name__ == "__main__":
    main()