from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


# ============================================================
# FANDEX Master v9 Promotion Readiness v1
#
# 목적:
# Master v9의 7일 병렬 history를 기반으로
# production 승격 가능성을 최종 평가한다.
#
# READ-ONLY
# production / v7 / v8 / v9 / Music / website 수정 없음
# ============================================================


VERSION = "fandex_master_v9_promotion_readiness_v1"


V9_HISTORY_FILE = Path(
    "fandex_master_v9_history_v1.csv"
)

V9_LATEST_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

MUSIC_V2_LATEST_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

V9_HEALTH_FILE = Path(
    "fandex_master_v9_health_check_latest.txt"
)

PYTHON_HEALTH_FILE = Path(
    "fandex_python_health_check_v2_latest.txt"
)


OUTPUT_JSON = Path(
    "fandex_master_v9_promotion_readiness_latest.json"
)

OUTPUT_CSV = Path(
    "fandex_master_v9_promotion_readiness_latest.csv"
)

OUTPUT_REPORT = Path(
    "FANDEX_MASTER_V9_PROMOTION_READINESS_REPORT.txt"
)


# ============================================================
# Policy
#
# HARD 조건:
# - 최소 7 snapshot
# - 최근 7 snapshot 모두 10명 완전
# - 최근 7일 연속
# - duplicate 0
# - Health PASS
#
# 변동성 정책:
#
# HOLD
# - v7 -> v9 순위 차이 >= 4
# - 하루 v9 순위 이동 >= 4
# - 단일 신규 소스 비중 >= 30%
# - Music v2 + Last.fm 합계 비중 >= 35%
# - 하루 v9 점수 변화율 >= 30%
#
# REVIEW
# - v7 -> v9 순위 차이 >= 3
# - 하루 v9 순위 이동 >= 3
# - 단일 신규 소스 비중 >= 20%
# - Music v2 + Last.fm 합계 비중 >= 25%
# - 하루 v9 점수 변화율 >= 20%
#
# 그 외 READY
# ============================================================


MIN_SNAPSHOTS = 7
EXPECTED_ARTISTS = 10


HOLD_V7_V9_RANK_SHIFT = 4
REVIEW_V7_V9_RANK_SHIFT = 3

HOLD_DAILY_RANK_MOVE = 4
REVIEW_DAILY_RANK_MOVE = 3

HOLD_SINGLE_SOURCE_SHARE = 30.0
REVIEW_SINGLE_SOURCE_SHARE = 20.0

HOLD_COMBINED_SOURCE_SHARE = 35.0
REVIEW_COMBINED_SOURCE_SHARE = 25.0

HOLD_DAILY_POINT_CHANGE_PCT = 30.0
REVIEW_DAILY_POINT_CHANGE_PCT = 20.0


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


def round2(value):
    return round(
        number(
            value
        ),
        2,
    )


def read_csv(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required CSV: {path}"
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


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required JSON: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_text(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    return path.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


def parse_date(value):
    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).date()

    except Exception:
        return None


def build_rank_map(
    score_map,
):
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
        ] = rank

    return result


def pct(
    part,
    total,
):
    total = number(
        total
    )

    if total <= 0:
        return 0.0

    return (
        number(
            part
        )
        / total
        * 100.0
    )


# ============================================================
# Main
# ============================================================

def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )


    print()
    print("=" * 96)
    print(
        "FANDEX Master v9 Promotion Readiness v1"
    )
    print("=" * 96)

    print(
        f"version: {VERSION}"
    )

    print(
        "mode: READ-ONLY FINAL REVIEW"
    )

    print(
        "productionModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 96)


    # ========================================================
    # Load
    # ========================================================

    history_rows = read_csv(
        V9_HISTORY_FILE
    )

    v9_latest = read_json(
        V9_LATEST_FILE
    )

    music_v2_latest = read_json(
        MUSIC_V2_LATEST_FILE
    )

    v9_health_text = read_text(
        V9_HEALTH_FILE
    )

    python_health_text = read_text(
        PYTHON_HEALTH_FILE
    )


    # ========================================================
    # Health
    # ========================================================

    v9_health_pass = (
        "OK: FANDEX Master v9 healthy"
        in v9_health_text
        and
        "failCount: 0"
        in v9_health_text
    )


    python_health_pass = (
        "OK: FANDEX Python-only v2 healthy"
        in python_health_text
        and
        "failCount: 0"
        in python_health_text
        and
        "warnCount: 0"
        in python_health_text
    )


    # ========================================================
    # History grouping
    # ========================================================

    by_date = defaultdict(
        dict
    )

    duplicate_keys = []

    seen = set()


    for row in history_rows:

        snapshot_date = norm(
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
            not snapshot_date
            or not artist
        ):
            continue


        key = (
            snapshot_date,
            artist,
        )


        if key in seen:
            duplicate_keys.append(
                key
            )

        seen.add(
            key
        )


        by_date[
            snapshot_date
        ][
            artist
        ] = row


    snapshot_dates = sorted(
        by_date.keys()
    )


    complete_dates = [
        snapshot_date
        for snapshot_date in snapshot_dates
        if len(
            by_date[
                snapshot_date
            ]
        )
        == EXPECTED_ARTISTS
    ]


    # 최근 7 snapshot만 최종 심사에 사용
    review_dates = (
        snapshot_dates[
            -MIN_SNAPSHOTS:
        ]
        if len(
            snapshot_dates
        )
        >= MIN_SNAPSHOTS
        else snapshot_dates
    )


    # ========================================================
    # Consecutive day validation
    # ========================================================

    gaps = []


    for index in range(
        1,
        len(
            review_dates
        ),
    ):

        previous = parse_date(
            review_dates[
                index - 1
            ]
        )

        current = parse_date(
            review_dates[
                index
            ]
        )


        if (
            previous is None
            or current is None
        ):
            gaps.append({
                "from":
                    review_dates[
                        index - 1
                    ],

                "to":
                    review_dates[
                        index
                    ],

                "reason":
                    "invalid_date",
            })

            continue


        days_between = (
            current - previous
        ).days


        if days_between != 1:

            gaps.append({
                "from":
                    previous.isoformat(),

                "to":
                    current.isoformat(),

                "daysBetween":
                    days_between,
            })


    consecutive = (
        len(
            review_dates
        )
        == MIN_SNAPSHOTS
        and
        len(
            gaps
        )
        == 0
    )


    complete_review_dates = [
        snapshot_date
        for snapshot_date
        in review_dates
        if len(
            by_date[
                snapshot_date
            ]
        )
        == EXPECTED_ARTISTS
    ]


    # ========================================================
    # Latest date alignment
    # ========================================================

    latest_history_date = (
        snapshot_dates[
            -1
        ]
        if snapshot_dates
        else ""
    )


    music_v2_latest_date = norm(
        music_v2_latest.get(
            "snapshotDate"
        )
    )


    latest_date_match = (
        latest_history_date
        == music_v2_latest_date
    )


    # ========================================================
    # Artist set
    # ========================================================

    artist_set = set()


    for snapshot_date in review_dates:

        artist_set.update(
            by_date[
                snapshot_date
            ].keys()
        )


    artists = sorted(
        artist_set
    )


    # ========================================================
    # Reconstruct ranks per date
    # ========================================================

    date_metrics = {}

    artist_history = defaultdict(
        list
    )


    for snapshot_date in review_dates:

        rows = (
            by_date[
                snapshot_date
            ]
        )


        v7_scores = {}

        v8_scores = {}

        v9_scores = {}


        for artist, row in rows.items():

            v7_scores[
                artist
            ] = number(
                row.get(
                    "v7Point"
                )
            )

            v8_scores[
                artist
            ] = number(
                row.get(
                    "v8Point"
                )
            )

            v9_scores[
                artist
            ] = number(
                row.get(
                    "v9Point"
                )
            )


        v7_ranks = build_rank_map(
            v7_scores
        )

        v8_ranks = build_rank_map(
            v8_scores
        )

        v9_ranks = build_rank_map(
            v9_scores
        )


        date_metrics[
            snapshot_date
        ] = {
            "v7Ranks":
                v7_ranks,

            "v8Ranks":
                v8_ranks,

            "v9Ranks":
                v9_ranks,
        }


        for artist, row in rows.items():

            v9_point = number(
                row.get(
                    "v9Point"
                )
            )

            music_contribution = number(
                row.get(
                    "musicV2ContributionPoint"
                )
            )

            lastfm_contribution = number(
                row.get(
                    "lastfmContributionPoint"
                )
            )


            artist_history[
                artist
            ].append({
                "snapshotDate":
                    snapshot_date,

                "v7Rank":
                    v7_ranks.get(
                        artist,
                        0,
                    ),

                "v8Rank":
                    v8_ranks.get(
                        artist,
                        0,
                    ),

                "v9Rank":
                    v9_ranks.get(
                        artist,
                        0,
                    ),

                "v7Point":
                    number(
                        row.get(
                            "v7Point"
                        )
                    ),

                "v8Point":
                    number(
                        row.get(
                            "v8Point"
                        )
                    ),

                "v9Point":
                    v9_point,

                "musicV2RawPoint":
                    number(
                        row.get(
                            "musicV2RawPoint"
                        )
                    ),

                "musicContribution":
                    music_contribution,

                "lastfmContribution":
                    lastfm_contribution,

                "musicSharePct":
                    pct(
                        music_contribution,
                        v9_point,
                    ),

                "lastfmSharePct":
                    pct(
                        lastfm_contribution,
                        v9_point,
                    ),

                "combinedNewSharePct":
                    pct(
                        (
                            music_contribution
                            + lastfm_contribution
                        ),
                        v9_point,
                    ),
            })


    # ========================================================
    # Per-artist volatility
    # ========================================================

    artist_results = []


    global_max_v7_v9_shift = 0
    global_max_v8_v9_shift = 0

    global_max_daily_rank_move = 0

    global_max_music_share = 0.0
    global_max_lastfm_share = 0.0
    global_max_single_source_share = 0.0
    global_max_combined_share = 0.0

    global_max_daily_point_change = 0.0
    global_max_daily_point_change_pct = 0.0


    for artist in artists:

        entries = sorted(
            artist_history[
                artist
            ],
            key=lambda row:
                row[
                    "snapshotDate"
                ],
        )


        v9_ranks = [
            row[
                "v9Rank"
            ]
            for row in entries
        ]


        v9_points = [
            row[
                "v9Point"
            ]
            for row in entries
        ]


        max_v7_v9_shift = max(
            (
                abs(
                    row[
                        "v7Rank"
                    ]
                    - row[
                        "v9Rank"
                    ]
                )
                for row in entries
            ),
            default=0,
        )


        max_v8_v9_shift = max(
            (
                abs(
                    row[
                        "v8Rank"
                    ]
                    - row[
                        "v9Rank"
                    ]
                )
                for row in entries
            ),
            default=0,
        )


        daily_rank_moves = []

        daily_point_changes = []

        daily_point_change_pcts = []


        for index in range(
            1,
            len(
                entries
            ),
        ):

            previous = entries[
                index - 1
            ]

            current = entries[
                index
            ]


            daily_rank_move = abs(
                current[
                    "v9Rank"
                ]
                - previous[
                    "v9Rank"
                ]
            )


            point_change = abs(
                current[
                    "v9Point"
                ]
                - previous[
                    "v9Point"
                ]
            )


            previous_point = (
                previous[
                    "v9Point"
                ]
            )


            if previous_point > 0:

                point_change_pct = (
                    point_change
                    / previous_point
                    * 100.0
                )

            else:

                point_change_pct = 0.0


            daily_rank_moves.append(
                daily_rank_move
            )

            daily_point_changes.append(
                point_change
            )

            daily_point_change_pcts.append(
                point_change_pct
            )


        max_daily_rank_move = max(
            daily_rank_moves,
            default=0,
        )


        max_daily_point_change = max(
            daily_point_changes,
            default=0.0,
        )


        max_daily_point_change_pct = max(
            daily_point_change_pcts,
            default=0.0,
        )


        max_music_share = max(
            (
                row[
                    "musicSharePct"
                ]
                for row in entries
            ),
            default=0.0,
        )


        max_lastfm_share = max(
            (
                row[
                    "lastfmSharePct"
                ]
                for row in entries
            ),
            default=0.0,
        )


        max_single_source_share = max(
            max_music_share,
            max_lastfm_share,
        )


        max_combined_share = max(
            (
                row[
                    "combinedNewSharePct"
                ]
                for row in entries
            ),
            default=0.0,
        )


        result = {
            "artist":
                artist,

            "snapshotCount":
                len(
                    entries
                ),

            "bestV9Rank":
                min(
                    v9_ranks
                )
                if v9_ranks
                else 0,

            "worstV9Rank":
                max(
                    v9_ranks
                )
                if v9_ranks
                else 0,

            "v9RankRange":
                (
                    max(
                        v9_ranks
                    )
                    - min(
                        v9_ranks
                    )
                )
                if v9_ranks
                else 0,

            "maxDailyRankMove":
                max_daily_rank_move,

            "maxAbsV7toV9RankShift":
                max_v7_v9_shift,

            "maxAbsV8toV9RankShift":
                max_v8_v9_shift,

            "minV9Point":
                round2(
                    min(
                        v9_points
                    )
                    if v9_points
                    else 0
                ),

            "maxV9Point":
                round2(
                    max(
                        v9_points
                    )
                    if v9_points
                    else 0
                ),

            "v9PointRange":
                round2(
                    (
                        max(
                            v9_points
                        )
                        - min(
                            v9_points
                        )
                    )
                    if v9_points
                    else 0
                ),

            "maxDailyPointChange":
                round2(
                    max_daily_point_change
                ),

            "maxDailyPointChangePct":
                round2(
                    max_daily_point_change_pct
                ),

            "maxMusicSharePct":
                round2(
                    max_music_share
                ),

            "maxLastfmSharePct":
                round2(
                    max_lastfm_share
                ),

            "maxSingleSourceSharePct":
                round2(
                    max_single_source_share
                ),

            "maxCombinedNewSourceSharePct":
                round2(
                    max_combined_share
                ),
        }


        artist_results.append(
            result
        )


        global_max_v7_v9_shift = max(
            global_max_v7_v9_shift,
            max_v7_v9_shift,
        )


        global_max_v8_v9_shift = max(
            global_max_v8_v9_shift,
            max_v8_v9_shift,
        )


        global_max_daily_rank_move = max(
            global_max_daily_rank_move,
            max_daily_rank_move,
        )


        global_max_music_share = max(
            global_max_music_share,
            max_music_share,
        )


        global_max_lastfm_share = max(
            global_max_lastfm_share,
            max_lastfm_share,
        )


        global_max_single_source_share = max(
            global_max_single_source_share,
            max_single_source_share,
        )


        global_max_combined_share = max(
            global_max_combined_share,
            max_combined_share,
        )


        global_max_daily_point_change = max(
            global_max_daily_point_change,
            max_daily_point_change,
        )


        global_max_daily_point_change_pct = max(
            global_max_daily_point_change_pct,
            max_daily_point_change_pct,
        )


    # ========================================================
    # Structural blockers
    # ========================================================

    blockers = []

    warnings = []

    notes = []


    if len(
        snapshot_dates
    ) < MIN_SNAPSHOTS:

        blockers.append(
            (
                "insufficient_history:"
                f"{len(snapshot_dates)}/"
                f"{MIN_SNAPSHOTS}"
            )
        )


    if len(
        review_dates
    ) != MIN_SNAPSHOTS:

        blockers.append(
            "review_window_not_7_snapshots"
        )


    if len(
        complete_review_dates
    ) != MIN_SNAPSHOTS:

        blockers.append(
            (
                "incomplete_snapshots:"
                f"{len(complete_review_dates)}/"
                f"{MIN_SNAPSHOTS}"
            )
        )


    if duplicate_keys:

        blockers.append(
            (
                "history_duplicates:"
                f"{len(duplicate_keys)}"
            )
        )


    if not consecutive:

        blockers.append(
            "latest_7_snapshots_not_consecutive"
        )


    if len(
        artists
    ) != EXPECTED_ARTISTS:

        blockers.append(
            (
                "artist_set_mismatch:"
                f"{len(artists)}/"
                f"{EXPECTED_ARTISTS}"
            )
        )


    if not latest_date_match:

        blockers.append(
            (
                "latest_date_mismatch:"
                f"history={latest_history_date},"
                f"musicV2={music_v2_latest_date}"
            )
        )


    if not python_health_pass:

        blockers.append(
            "python_health_not_clean"
        )


    if not v9_health_pass:

        blockers.append(
            "v9_health_not_clean"
        )


    # ========================================================
    # Severe risk -> HOLD
    # ========================================================

    severe_risks = []


    if (
        global_max_v7_v9_shift
        >= HOLD_V7_V9_RANK_SHIFT
    ):

        severe_risks.append(
            (
                "large_v7_v9_rank_shift:"
                f"{global_max_v7_v9_shift}"
            )
        )


    if (
        global_max_daily_rank_move
        >= HOLD_DAILY_RANK_MOVE
    ):

        severe_risks.append(
            (
                "large_daily_rank_move:"
                f"{global_max_daily_rank_move}"
            )
        )


    if (
        global_max_single_source_share
        >= HOLD_SINGLE_SOURCE_SHARE
    ):

        severe_risks.append(
            (
                "single_source_share_too_high:"
                f"{global_max_single_source_share:.2f}%"
            )
        )


    if (
        global_max_combined_share
        >= HOLD_COMBINED_SOURCE_SHARE
    ):

        severe_risks.append(
            (
                "combined_new_source_share_too_high:"
                f"{global_max_combined_share:.2f}%"
            )
        )


    if (
        global_max_daily_point_change_pct
        >= HOLD_DAILY_POINT_CHANGE_PCT
    ):

        severe_risks.append(
            (
                "daily_point_change_too_high:"
                f"{global_max_daily_point_change_pct:.2f}%"
            )
        )


    # ========================================================
    # Review-level warnings
    # ========================================================

    if (
        REVIEW_V7_V9_RANK_SHIFT
        <= global_max_v7_v9_shift
        < HOLD_V7_V9_RANK_SHIFT
    ):

        warnings.append(
            (
                "review_v7_v9_rank_shift:"
                f"{global_max_v7_v9_shift}"
            )
        )


    if (
        REVIEW_DAILY_RANK_MOVE
        <= global_max_daily_rank_move
        < HOLD_DAILY_RANK_MOVE
    ):

        warnings.append(
            (
                "review_daily_rank_move:"
                f"{global_max_daily_rank_move}"
            )
        )


    if (
        REVIEW_SINGLE_SOURCE_SHARE
        <= global_max_single_source_share
        < HOLD_SINGLE_SOURCE_SHARE
    ):

        warnings.append(
            (
                "review_single_source_share:"
                f"{global_max_single_source_share:.2f}%"
            )
        )


    if (
        REVIEW_COMBINED_SOURCE_SHARE
        <= global_max_combined_share
        < HOLD_COMBINED_SOURCE_SHARE
    ):

        warnings.append(
            (
                "review_combined_new_source_share:"
                f"{global_max_combined_share:.2f}%"
            )
        )


    if (
        REVIEW_DAILY_POINT_CHANGE_PCT
        <= global_max_daily_point_change_pct
        < HOLD_DAILY_POINT_CHANGE_PCT
    ):

        warnings.append(
            (
                "review_daily_point_change:"
                f"{global_max_daily_point_change_pct:.2f}%"
            )
        )


    # ========================================================
    # Decision
    # ========================================================

    if blockers:

        decision = "HOLD"

        decision_reason = (
            "structural_or_health_blocker"
        )


    elif severe_risks:

        decision = "HOLD"

        decision_reason = (
            "severe_volatility_or_source_concentration"
        )


    elif warnings:

        decision = "REVIEW"

        decision_reason = (
            "review_level_risk_signal"
        )


    else:

        decision = "READY"

        decision_reason = (
            "7_day_parallel_validation_passed"
        )


    # ========================================================
    # Notes
    # ========================================================

    if consecutive:

        notes.append(
            "latest_7_snapshots_are_consecutive"
        )


    if (
        len(
            complete_review_dates
        )
        == MIN_SNAPSHOTS
    ):

        notes.append(
            "latest_7_snapshots_complete_10_of_10"
        )


    if not duplicate_keys:

        notes.append(
            "history_duplicate_zero"
        )


    if python_health_pass:

        notes.append(
            "python_health_pass"
        )


    if v9_health_pass:

        notes.append(
            "v9_health_pass"
        )


    # ========================================================
    # JSON
    # ========================================================

    payload = {
        "version":
            VERSION,

        "createdAt":
            created_at,

        "decision":
            decision,

        "decisionReason":
            decision_reason,

        "policy": {
            "minSnapshots":
                MIN_SNAPSHOTS,

            "expectedArtists":
                EXPECTED_ARTISTS,

            "holdV7V9RankShift":
                HOLD_V7_V9_RANK_SHIFT,

            "reviewV7V9RankShift":
                REVIEW_V7_V9_RANK_SHIFT,

            "holdDailyRankMove":
                HOLD_DAILY_RANK_MOVE,

            "reviewDailyRankMove":
                REVIEW_DAILY_RANK_MOVE,

            "holdSingleSourceSharePct":
                HOLD_SINGLE_SOURCE_SHARE,

            "reviewSingleSourceSharePct":
                REVIEW_SINGLE_SOURCE_SHARE,

            "holdCombinedSourceSharePct":
                HOLD_COMBINED_SOURCE_SHARE,

            "reviewCombinedSourceSharePct":
                REVIEW_COMBINED_SOURCE_SHARE,

            "holdDailyPointChangePct":
                HOLD_DAILY_POINT_CHANGE_PCT,

            "reviewDailyPointChangePct":
                REVIEW_DAILY_POINT_CHANGE_PCT,
        },

        "history": {
            "totalRowCount":
                len(
                    history_rows
                ),

            "snapshotCount":
                len(
                    snapshot_dates
                ),

            "snapshotDates":
                snapshot_dates,

            "reviewDates":
                review_dates,

            "completeReviewSnapshots":
                len(
                    complete_review_dates
                ),

            "consecutiveReviewWindow":
                consecutive,

            "duplicateCount":
                len(
                    duplicate_keys
                ),

            "latestHistoryDate":
                latest_history_date,

            "musicV2LatestDate":
                music_v2_latest_date,

            "latestDateMatch":
                latest_date_match,

            "artistCount":
                len(
                    artists
                ),
        },

        "health": {
            "pythonHealthPass":
                python_health_pass,

            "v9HealthPass":
                v9_health_pass,
        },

        "overallMetrics": {
            "maxAbsV7toV9RankShift":
                global_max_v7_v9_shift,

            "maxAbsV8toV9RankShift":
                global_max_v8_v9_shift,

            "maxDailyV9RankMove":
                global_max_daily_rank_move,

            "maxMusicSharePct":
                round2(
                    global_max_music_share
                ),

            "maxLastfmSharePct":
                round2(
                    global_max_lastfm_share
                ),

            "maxSingleSourceSharePct":
                round2(
                    global_max_single_source_share
                ),

            "maxCombinedNewSourceSharePct":
                round2(
                    global_max_combined_share
                ),

            "maxDailyV9PointChange":
                round2(
                    global_max_daily_point_change
                ),

            "maxDailyV9PointChangePct":
                round2(
                    global_max_daily_point_change_pct
                ),
        },

        "artistResults":
            artist_results,

        "blockers":
            blockers,

        "severeRisks":
            severe_risks,

        "warnings":
            warnings,

        "notes":
            notes,

        "productionModified":
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
    # CSV
    # ========================================================

    csv_fields = [
        "artist",
        "snapshotCount",
        "bestV9Rank",
        "worstV9Rank",
        "v9RankRange",
        "maxDailyRankMove",
        "maxAbsV7toV9RankShift",
        "maxAbsV8toV9RankShift",
        "minV9Point",
        "maxV9Point",
        "v9PointRange",
        "maxDailyPointChange",
        "maxDailyPointChangePct",
        "maxMusicSharePct",
        "maxLastfmSharePct",
        "maxSingleSourceSharePct",
        "maxCombinedNewSourceSharePct",
    ]


    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=csv_fields,
        )

        writer.writeheader()

        writer.writerows(
            sorted(
                artist_results,
                key=lambda row:
                    row[
                        "bestV9Rank"
                    ],
            )
        )


    # ========================================================
    # Report
    # ========================================================

    lines = [
        "FANDEX Master v9 Promotion Readiness v1",
        "=" * 104,
        f"createdAt: {created_at}",
        f"version: {VERSION}",
        "",
        f"decision: {decision}",
        f"decisionReason: {decision_reason}",
        "",
        "History / Health",
        "-" * 104,
        (
            f"historyRows: "
            f"{len(history_rows)}"
        ),
        (
            f"snapshotCount: "
            f"{len(snapshot_dates)}"
        ),
        (
            "reviewDates: "
            + ", ".join(
                review_dates
            )
        ),
        (
            f"completeReviewSnapshots: "
            f"{len(complete_review_dates)}/7"
        ),
        (
            f"consecutiveReviewWindow: "
            f"{str(consecutive).upper()}"
        ),
        (
            f"duplicateCount: "
            f"{len(duplicate_keys)}"
        ),
        (
            f"latestDateMatch: "
            f"{str(latest_date_match).upper()}"
        ),
        (
            f"pythonHealthPass: "
            f"{str(python_health_pass).upper()}"
        ),
        (
            f"v9HealthPass: "
            f"{str(v9_health_pass).upper()}"
        ),
        "",
        "Overall metrics",
        "-" * 104,
        (
            "maxAbsV7toV9RankShift: "
            f"{global_max_v7_v9_shift}"
        ),
        (
            "maxAbsV8toV9RankShift: "
            f"{global_max_v8_v9_shift}"
        ),
        (
            "maxDailyV9RankMove: "
            f"{global_max_daily_rank_move}"
        ),
        (
            "maxMusicSharePct: "
            f"{global_max_music_share:.2f}%"
        ),
        (
            "maxLastfmSharePct: "
            f"{global_max_lastfm_share:.2f}%"
        ),
        (
            "maxSingleSourceSharePct: "
            f"{global_max_single_source_share:.2f}%"
        ),
        (
            "maxCombinedNewSourceSharePct: "
            f"{global_max_combined_share:.2f}%"
        ),
        (
            "maxDailyV9PointChange: "
            f"{global_max_daily_point_change:.2f}"
        ),
        (
            "maxDailyV9PointChangePct: "
            f"{global_max_daily_point_change_pct:.2f}%"
        ),
        "",
        "Artist results",
        "-" * 104,
    ]


    for row in sorted(
        artist_results,
        key=lambda item:
            item[
                "bestV9Rank"
            ],
    ):

        lines.append(
            (
                f"{row['artist']} "
                f"| rank="
                f"{row['bestV9Rank']}"
                f"~{row['worstV9Rank']} "
                f"| range="
                f"{row['v9RankRange']} "
                f"| dailyRankMoveMax="
                f"{row['maxDailyRankMove']} "
                f"| v7-v9Max="
                f"{row['maxAbsV7toV9RankShift']} "
                f"| v9Point="
                f"{row['minV9Point']:.2f}"
                f"~{row['maxV9Point']:.2f} "
                f"| dailyPointPctMax="
                f"{row['maxDailyPointChangePct']:.2f}% "
                f"| musicShareMax="
                f"{row['maxMusicSharePct']:.2f}% "
                f"| lastfmShareMax="
                f"{row['maxLastfmSharePct']:.2f}% "
                f"| combinedMax="
                f"{row['maxCombinedNewSourceSharePct']:.2f}%"
            )
        )


    lines.extend([
        "",
        "Blockers",
        "-" * 104,
    ])


    if blockers:

        for item in blockers:
            lines.append(
                f"- {item}"
            )

    else:

        lines.append(
            "NONE"
        )


    lines.extend([
        "",
        "Severe risks",
        "-" * 104,
    ])


    if severe_risks:

        for item in severe_risks:
            lines.append(
                f"- {item}"
            )

    else:

        lines.append(
            "NONE"
        )


    lines.extend([
        "",
        "Warnings",
        "-" * 104,
    ])


    if warnings:

        for item in warnings:
            lines.append(
                f"- {item}"
            )

    else:

        lines.append(
            "NONE"
        )


    lines.extend([
        "",
        "=" * 104,
        (
            "IMPORTANT: this evaluator does "
            "NOT modify production."
        ),
        (
            "READY means promotion review may "
            "proceed; it does not automatically "
            "replace v7."
        ),
        "=" * 104,
    ])


    OUTPUT_REPORT.write_text(
        "\n".join(
            lines
        )
        + "\n",
        encoding="utf-8",
    )


    # ========================================================
    # Console
    # ========================================================

    print()
    print(
        "7-DAY VALIDATION"
    )
    print("-" * 96)

    print(
        f"historyRows              : "
        f"{len(history_rows)}"
    )

    print(
        f"snapshotCount            : "
        f"{len(snapshot_dates)}"
    )

    print(
        f"reviewDates              : "
        + ", ".join(
            review_dates
        )
    )

    print(
        f"completeSnapshots        : "
        f"{len(complete_review_dates)}/7"
    )

    print(
        f"consecutive7Days         : "
        f"{str(consecutive).upper()}"
    )

    print(
        f"duplicateCount           : "
        f"{len(duplicate_keys)}"
    )

    print(
        f"artistCount              : "
        f"{len(artists)}/10"
    )

    print(
        f"latestDateMatch          : "
        f"{str(latest_date_match).upper()}"
    )

    print(
        f"Python Health            : "
        f"{'PASS' if python_health_pass else 'FAIL'}"
    )

    print(
        f"Master v9 Health         : "
        f"{'PASS' if v9_health_pass else 'FAIL'}"
    )


    print()
    print(
        "VOLATILITY / SOURCE IMPACT"
    )
    print("-" * 96)

    print(
        f"maxAbsV7toV9RankShift    : "
        f"{global_max_v7_v9_shift}"
    )

    print(
        f"maxAbsV8toV9RankShift    : "
        f"{global_max_v8_v9_shift}"
    )

    print(
        f"maxDailyV9RankMove       : "
        f"{global_max_daily_rank_move}"
    )

    print(
        f"maxMusicShare            : "
        f"{global_max_music_share:.2f}%"
    )

    print(
        f"maxLastfmShare           : "
        f"{global_max_lastfm_share:.2f}%"
    )

    print(
        f"maxSingleSourceShare     : "
        f"{global_max_single_source_share:.2f}%"
    )

    print(
        f"maxCombinedNewShare      : "
        f"{global_max_combined_share:.2f}%"
    )

    print(
        f"maxDailyV9PointChange    : "
        f"{global_max_daily_point_change:.2f}"
    )

    print(
        f"maxDailyV9PointChangePct : "
        f"{global_max_daily_point_change_pct:.2f}%"
    )


    print()
    print(
        "ARTIST VOLATILITY"
    )
    print("-" * 96)


    for row in sorted(
        artist_results,
        key=lambda item:
            item[
                "bestV9Rank"
            ],
    ):

        print(
            f"{row['artist']} "
            f"| v9 rank "
            f"{row['bestV9Rank']}"
            f"~{row['worstV9Rank']} "
            f"| range="
            f"{row['v9RankRange']} "
            f"| dailyMove="
            f"{row['maxDailyRankMove']} "
            f"| v7-v9="
            f"{row['maxAbsV7toV9RankShift']} "
            f"| combinedShare="
            f"{row['maxCombinedNewSourceSharePct']:.2f}%"
        )


    print()
    print("=" * 96)
    print(
        "FINAL PROMOTION DECISION"
    )
    print("=" * 96)

    print(
        f"decision: {decision}"
    )

    print(
        f"reason: {decision_reason}"
    )

    print(
        f"blockers: "
        f"{blockers if blockers else 'NONE'}"
    )

    print(
        f"severeRisks: "
        f"{severe_risks if severe_risks else 'NONE'}"
    )

    print(
        f"warnings: "
        f"{warnings if warnings else 'NONE'}"
    )

    print()

    if decision == "READY":

        print(
            "RESULT: MASTER v9 IS READY "
            "FOR PRODUCTION PROMOTION REVIEW"
        )

    elif decision == "REVIEW":

        print(
            "RESULT: MASTER v9 NEEDS "
            "ADDITIONAL REVIEW"
        )

    else:

        print(
            "RESULT: MASTER v9 PROMOTION "
            "SHOULD BE HELD"
        )


    print()
    print(
        "productionModified: FALSE"
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

    print()
    print(
        f"json: {OUTPUT_JSON}"
    )

    print(
        f"csv: {OUTPUT_CSV}"
    )

    print(
        f"report: {OUTPUT_REPORT}"
    )

    print("=" * 96)


if __name__ == "__main__":
    main()