from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


# ============================================================
# FANDEX Master v10 Production Promotion Precheck v1
#
# 목표:
# 현재 v9 READY 후보의 산식을 독립적으로 다시 계산해서
# 차기 production v10과 완전히 동일한지 검증한다.
#
# 차기 production 공식:
#
# Naver v3 latest
# + YouTube v3 latest
# + Music v2 current presence x 0.25
# + Last.fm Rolling x 0.25
#
# IMPORTANT
# - production 수정 없음
# - runner 수정 없음
# - website 수정 없음
# - preview JSON/CSV/report만 생성
# ============================================================


VERSION = (
    "fandex_master_v10_"
    "production_promotion_precheck_v1"
)

TARGET_VERSION = (
    "fandex_master_v10_"
    "music_v2_lastfm_rolling_v1"
)

TARGET_SCORE_MODE = (
    "uncapped_cumulative_source_points_"
    "with_youtube_v3_"
    "music_chart_v2_x0_25_"
    "lastfm_rolling_x0_25"
)


MUSIC_SCALE = 0.25
LASTFM_SCALE = 0.25

EXPECTED_ARTISTS = 10

EPSILON = 0.05


NAVER_FILE = Path(
    "fandex_naver_ranking_v3_latest.json"
)

YOUTUBE_FILE = Path(
    "fandex_youtube_ranking_v3_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

LASTFM_ROLLING_FILE = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

CURRENT_V9_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

READINESS_FILE = Path(
    "fandex_master_v9_promotion_readiness_latest.json"
)

PYTHON_HEALTH_FILE = Path(
    "fandex_python_health_check_v2_latest.txt"
)

V9_HEALTH_FILE = Path(
    "fandex_master_v9_health_check_latest.txt"
)

BUGS_LATEST_FILE = Path(
    "music_chart_bugs_all_targets_v1_latest.csv"
)


OUTPUT_JSON = Path(
    "fandex_master_v10_promotion_precheck_latest.json"
)

OUTPUT_CSV = Path(
    "fandex_master_v10_promotion_precheck_latest.csv"
)

OUTPUT_REPORT = Path(
    "FANDEX_MASTER_V10_PROMOTION_PRECHECK_REPORT.txt"
)


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
            str(
                value
            )
            .replace(
                ",",
                "",
            )
            .strip()
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


def read_text(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    return path.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


def extract_rows(payload):
    if isinstance(
        payload,
        list,
    ):

        return [
            row
            for row in payload
            if isinstance(
                row,
                dict,
            )
        ]


    if not isinstance(
        payload,
        dict,
    ):
        return []


    for key in [
        "ranking",
        "rankings",
        "artists",
        "items",
        "results",
        "data",
    ]:

        rows = payload.get(
            key
        )

        if isinstance(
            rows,
            list,
        ):

            return [
                row
                for row in rows
                if isinstance(
                    row,
                    dict,
                )
            ]


    return []


def artist_name(row):
    for key in [
        "artist",
        "artistName",
        "name",
        "displayName",
    ]:

        value = norm(
            row.get(
                key
            )
        )

        if value:
            return value


    return ""


def first_number(
    row,
    keys,
):
    for key in keys:

        if key not in row:
            continue

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


def naver_score(row):
    return first_number(
        row,
        [
            "fandexNaverFinalPoint",
            "fandexNaverPoint",
            "fandexNaverScore",
            "naverFinalPoint",
            "naverPoint",
            "naverScore",
            "naverTotalPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexFinalPoint",
        ],
    )


def youtube_score(row):
    return first_number(
        row,
        [
            "youtubePoint",
            "youtubeFinalPoint",
            "youtubeScore",
            "cumulativePoint",
            "totalPoint",
            "score",
        ],
    )


def music_v2_score(row):
    return first_number(
        row,
        [
            "fandexMusicChartFinalPoint",
            "musicChartFinalPoint",
            "musicChartPoint",
            "musicV2Point",
            "musicPoint",
            "musicScore",
            "finalPoint",
            "score",
        ],
    )


def v9_score(row):
    return first_number(
        row,
        [
            "fandexFinalPoint",
            "fandexPoint",
            "masterPoint",
            "finalPoint",
            "score",
        ],
    )


def make_json_map(
    payload,
    score_reader,
):
    result = {}

    for row in extract_rows(
        payload
    ):

        artist = artist_name(
            row
        )

        if not artist:
            continue


        result[
            artist
        ] = {
            "artist":
                artist,

            "score":
                score_reader(
                    row
                ),

            "row":
                row,
        }


    return result


def get_lastfm_artist(row):
    for key in [
        "artist",
        "artistName",
        "name",
    ]:

        value = norm(
            row.get(
                key
            )
        )

        if value:
            return value


    return ""


def get_lastfm_score(row):
    return first_number(
        row,
        [
            "rollingCombinedPreviewPoint",
            "rollingCombinedPoint",
            "rollingScore",
            "score",
        ],
    )


def make_lastfm_map(rows):
    result = {}

    for row in rows:

        artist = get_lastfm_artist(
            row
        )

        if not artist:
            continue


        result[
            artist
        ] = {
            "artist":
                artist,

            "score":
                get_lastfm_score(
                    row
                ),

            "row":
                row,
        }


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
                round2(
                    score
                ),
        }


    return result


def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )


    print()
    print("=" * 100)
    print(
        "FANDEX Master v10 "
        "Production Promotion Precheck v1"
    )
    print("=" * 100)

    print(
        f"version: {VERSION}"
    )

    print(
        f"targetVersion: {TARGET_VERSION}"
    )

    print(
        "mode: READ-ONLY PRECHECK"
    )

    print(
        "targetFormula:"
    )

    print(
        "  Naver v3"
    )

    print(
        "  + YouTube v3"
    )

    print(
        "  + Music v2 x0.25"
    )

    print(
        "  + Last.fm Rolling x0.25"
    )

    print()

    print(
        "productionModified: FALSE"
    )

    print(
        "runnerModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 100)


    # ========================================================
    # Required files
    # ========================================================

    required = [
        NAVER_FILE,
        YOUTUBE_FILE,
        MUSIC_V2_FILE,
        LASTFM_ROLLING_FILE,
        CURRENT_V9_FILE,
        READINESS_FILE,
        PYTHON_HEALTH_FILE,
        V9_HEALTH_FILE,
        BUGS_LATEST_FILE,
    ]


    for path in required:

        if not path.exists():

            raise RuntimeError(
                f"Missing required file: "
                f"{path}"
            )


    # ========================================================
    # Promotion readiness provenance
    # ========================================================

    readiness = read_json(
        READINESS_FILE
    )


    readiness_decision = norm(
        readiness.get(
            "decision"
        )
    ).upper()


    readiness_blockers = (
        readiness.get(
            "blockers"
        )
        or []
    )


    readiness_severe = (
        readiness.get(
            "severeRisks"
        )
        or []
    )


    readiness_warnings = (
        readiness.get(
            "warnings"
        )
        or []
    )


    readiness_ok = (
        readiness_decision
        == "READY"

        and not readiness_blockers

        and not readiness_severe

        and not readiness_warnings
    )


    # ========================================================
    # Existing health
    # ========================================================

    python_health = read_text(
        PYTHON_HEALTH_FILE
    )


    v9_health = read_text(
        V9_HEALTH_FILE
    )


    python_health_ok = (
        "OK: FANDEX Python-only v2 healthy"
        in python_health

        and
        "failCount: 0"
        in python_health

        and
        "warnCount: 0"
        in python_health
    )


    v9_health_ok = (
        "OK: FANDEX Master v9 healthy"
        in v9_health

        and
        "failCount: 0"
        in v9_health

        and
        "warnCount: 0"
        in v9_health
    )


    # ========================================================
    # Read current source files
    # ========================================================

    naver_payload = read_json(
        NAVER_FILE
    )

    youtube_payload = read_json(
        YOUTUBE_FILE
    )

    music_payload = read_json(
        MUSIC_V2_FILE
    )

    v9_payload = read_json(
        CURRENT_V9_FILE
    )

    lastfm_rows = read_csv(
        LASTFM_ROLLING_FILE
    )


    naver_map = make_json_map(
        naver_payload,
        naver_score,
    )

    youtube_map = make_json_map(
        youtube_payload,
        youtube_score,
    )

    music_map = make_json_map(
        music_payload,
        music_v2_score,
    )

    v9_map = make_json_map(
        v9_payload,
        v9_score,
    )

    lastfm_map = make_lastfm_map(
        lastfm_rows
    )


    # ========================================================
    # Artist-set safety
    # ========================================================

    artist_sets = {
        "naver":
            set(
                naver_map
            ),

        "youtube":
            set(
                youtube_map
            ),

        "musicV2":
            set(
                music_map
            ),

        "lastfm":
            set(
                lastfm_map
            ),

        "v9":
            set(
                v9_map
            ),
    }


    base_artist_set = (
        artist_sets[
            "v9"
        ]
    )


    artist_set_mismatch = {}


    for source, artist_set in (
        artist_sets.items()
    ):

        if artist_set != base_artist_set:

            artist_set_mismatch[
                source
            ] = {
                "missing":
                    sorted(
                        base_artist_set
                        - artist_set
                    ),

                "extra":
                    sorted(
                        artist_set
                        - base_artist_set
                    ),
            }


    artist_set_ok = (
        len(
            base_artist_set
        )
        == EXPECTED_ARTISTS

        and

        not artist_set_mismatch
    )


    artists = sorted(
        base_artist_set
    )


    # ========================================================
    # IVE semantic regression guard
    # ========================================================

    bugs_rows = read_csv(
        BUGS_LATEST_FILE
    )


    semantic_bad_rows = []


    for row in bugs_rows:

        artist = norm(
            row.get(
                "artist"
            )
        )

        if artist != "아이브":
            continue


        track = norm(
            row.get(
                "trackTitle"
            )
        ).casefold()


        matched_artist = norm(
            row.get(
                "matchedArtist"
            )
        ).casefold()


        if (
            "born dire"
            in track

            or

            "alpha drive one"
            in matched_artist
        ):

            semantic_bad_rows.append(
                row
            )


    semantic_guard_ok = (
        len(
            semantic_bad_rows
        )
        == 0
    )


    # ========================================================
    # Independently calculate production v10
    # ========================================================

    candidate_scores = {}

    calculations = []


    for artist in artists:

        if not all(
            artist in source_map

            for source_map in [
                naver_map,
                youtube_map,
                music_map,
                lastfm_map,
                v9_map,
            ]
        ):

            continue


        naver_point = number(
            naver_map[
                artist
            ][
                "score"
            ]
        )


        youtube_point = number(
            youtube_map[
                artist
            ][
                "score"
            ]
        )


        music_raw = number(
            music_map[
                artist
            ][
                "score"
            ]
        )


        lastfm_raw = number(
            lastfm_map[
                artist
            ][
                "score"
            ]
        )


        music_contribution = (
            music_raw
            * MUSIC_SCALE
        )


        lastfm_contribution = (
            lastfm_raw
            * LASTFM_SCALE
        )


        candidate_total = (
            naver_point
            + youtube_point
            + music_contribution
            + lastfm_contribution
        )


        current_v9 = number(
            v9_map[
                artist
            ][
                "score"
            ]
        )


        candidate_scores[
            artist
        ] = candidate_total


        calculations.append({
            "artist":
                artist,

            "naverPoint":
                round2(
                    naver_point
                ),

            "youtubePoint":
                round2(
                    youtube_point
                ),

            "musicV2RawPoint":
                round2(
                    music_raw
                ),

            "musicV2Scale":
                MUSIC_SCALE,

            "musicV2ContributionPoint":
                round2(
                    music_contribution
                ),

            "lastfmRawPoint":
                round2(
                    lastfm_raw
                ),

            "lastfmScale":
                LASTFM_SCALE,

            "lastfmContributionPoint":
                round2(
                    lastfm_contribution
                ),

            "v10CandidatePoint":
                round2(
                    candidate_total
                ),

            "currentV9Point":
                round2(
                    current_v9
                ),

            "deltaV10CandidateVsV9":
                round(
                    candidate_total
                    - current_v9,
                    4,
                ),
        })


    candidate_rank_map = build_rank_map(
        candidate_scores
    )


    v9_rank_map = build_rank_map({
        artist:
            number(
                v9_map[
                    artist
                ][
                    "score"
                ]
            )

        for artist in artists
    })


    # ========================================================
    # Parity validation
    # ========================================================

    score_mismatch_rows = []

    rank_mismatch_rows = []


    for row in calculations:

        artist = row[
            "artist"
        ]


        delta = abs(
            number(
                row[
                    "deltaV10CandidateVsV9"
                ]
            )
        )


        if delta > EPSILON:

            score_mismatch_rows.append({
                "artist":
                    artist,

                "v10Candidate":
                    row[
                        "v10CandidatePoint"
                    ],

                "v9":
                    row[
                        "currentV9Point"
                    ],

                "delta":
                    row[
                        "deltaV10CandidateVsV9"
                    ],
            })


        candidate_rank = (
            candidate_rank_map[
                artist
            ][
                "rank"
            ]
        )


        current_v9_rank = (
            v9_rank_map[
                artist
            ][
                "rank"
            ]
        )


        if (
            candidate_rank
            != current_v9_rank
        ):

            rank_mismatch_rows.append({
                "artist":
                    artist,

                "v10CandidateRank":
                    candidate_rank,

                "v9Rank":
                    current_v9_rank,
            })


        row[
            "v10CandidateRank"
        ] = candidate_rank


        row[
            "currentV9Rank"
        ] = current_v9_rank


    # ========================================================
    # Formula arithmetic validation
    # ========================================================

    formula_mismatch_rows = []


    for row in calculations:

        expected = (
            number(
                row[
                    "naverPoint"
                ]
            )
            +
            number(
                row[
                    "youtubePoint"
                ]
            )
            +
            number(
                row[
                    "musicV2ContributionPoint"
                ]
            )
            +
            number(
                row[
                    "lastfmContributionPoint"
                ]
            )
        )


        actual = number(
            row[
                "v10CandidatePoint"
            ]
        )


        if abs(
            expected
            - actual
        ) > 0.05:

            formula_mismatch_rows.append({
                "artist":
                    row[
                        "artist"
                    ],

                "expected":
                    round2(
                        expected
                    ),

                "actual":
                    round2(
                        actual
                    ),
            })


    # ========================================================
    # Safety conditions
    # ========================================================

    blockers = []


    if not readiness_ok:

        blockers.append(
            "v9_promotion_readiness_not_clean_READY"
        )


    if not python_health_ok:

        blockers.append(
            "python_health_not_clean"
        )


    if not v9_health_ok:

        blockers.append(
            "v9_health_not_clean"
        )


    if not artist_set_ok:

        blockers.append(
            "source_artist_set_mismatch"
        )


    if not semantic_guard_ok:

        blockers.append(
            "ive_semantic_alias_regression"
        )


    if len(
        calculations
    ) != EXPECTED_ARTISTS:

        blockers.append(
            (
                "calculated_artist_count:"
                f"{len(calculations)}/"
                f"{EXPECTED_ARTISTS}"
            )
        )


    if score_mismatch_rows:

        blockers.append(
            (
                "v10_v9_score_parity_mismatch:"
                f"{len(score_mismatch_rows)}"
            )
        )


    if rank_mismatch_rows:

        blockers.append(
            (
                "v10_v9_rank_parity_mismatch:"
                f"{len(rank_mismatch_rows)}"
            )
        )


    if formula_mismatch_rows:

        blockers.append(
            (
                "v10_formula_mismatch:"
                f"{len(formula_mismatch_rows)}"
            )
        )


    precheck_pass = (
        len(
            blockers
        )
        == 0
    )


    decision = (
        "PASS"
        if precheck_pass
        else "STOP"
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

        "targetProduction": {
            "version":
                TARGET_VERSION,

            "scoreMode":
                TARGET_SCORE_MODE,

            "formula":
                (
                    "Naver v3 latest "
                    "+ YouTube v3 latest "
                    "+ Music v2 x0.25 "
                    "+ Last.fm Rolling x0.25"
                ),

            "musicV2Scale":
                MUSIC_SCALE,

            "lastfmScale":
                LASTFM_SCALE,
        },

        "promotionReadiness": {
            "decision":
                readiness_decision,

            "blockers":
                readiness_blockers,

            "severeRisks":
                readiness_severe,

            "warnings":
                readiness_warnings,

            "cleanReady":
                readiness_ok,
        },

        "health": {
            "pythonHealthPass":
                python_health_ok,

            "v9HealthPass":
                v9_health_ok,
        },

        "artistSets": {
            source:
                sorted(
                    artist_set
                )

            for (
                source,
                artist_set
            )
            in artist_sets.items()
        },

        "artistSetMismatch":
            artist_set_mismatch,

        "semanticGuard": {
            "iveFalseMatchCount":
                len(
                    semantic_bad_rows
                ),

            "pass":
                semantic_guard_ok,
        },

        "validation": {
            "artistCount":
                len(
                    calculations
                ),

            "scoreParityMismatchCount":
                len(
                    score_mismatch_rows
                ),

            "rankParityMismatchCount":
                len(
                    rank_mismatch_rows
                ),

            "formulaMismatchCount":
                len(
                    formula_mismatch_rows
                ),
        },

        "candidateRanking":
            sorted(
                calculations,
                key=lambda row:
                    row[
                        "v10CandidateRank"
                    ],
            ),

        "scoreMismatchRows":
            score_mismatch_rows,

        "rankMismatchRows":
            rank_mismatch_rows,

        "formulaMismatchRows":
            formula_mismatch_rows,

        "blockers":
            blockers,

        "productionModified":
            False,

        "runnerModified":
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

    fields = [
        "v10CandidateRank",
        "artist",
        "v10CandidatePoint",
        "currentV9Rank",
        "currentV9Point",
        "deltaV10CandidateVsV9",
        "naverPoint",
        "youtubePoint",
        "musicV2RawPoint",
        "musicV2Scale",
        "musicV2ContributionPoint",
        "lastfmRawPoint",
        "lastfmScale",
        "lastfmContributionPoint",
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


        for row in sorted(
            calculations,
            key=lambda item:
                item[
                    "v10CandidateRank"
                ],
        ):

            writer.writerow({
                field:
                    row.get(
                        field,
                        ""
                    )

                for field in fields
            })


    # ========================================================
    # Report
    # ========================================================

    lines = [
        (
            "FANDEX Master v10 "
            "Production Promotion Precheck v1"
        ),
        "=" * 104,
        f"createdAt: {created_at}",
        f"version: {VERSION}",
        f"decision: {decision}",
        "",
        "Target production",
        "-" * 104,
        (
            "formula: Naver v3 "
            "+ YouTube v3 "
            "+ Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        (
            f"targetVersion: "
            f"{TARGET_VERSION}"
        ),
        (
            f"targetScoreMode: "
            f"{TARGET_SCORE_MODE}"
        ),
        "",
        "Safety checks",
        "-" * 104,
        (
            f"v9ReadinessREADY: "
            f"{str(readiness_ok).upper()}"
        ),
        (
            f"pythonHealthPASS: "
            f"{str(python_health_ok).upper()}"
        ),
        (
            f"v9HealthPASS: "
            f"{str(v9_health_ok).upper()}"
        ),
        (
            f"artistSetMATCH: "
            f"{str(artist_set_ok).upper()}"
        ),
        (
            f"IVEsemanticGuard: "
            f"{str(semantic_guard_ok).upper()}"
        ),
        (
            f"artistCount: "
            f"{len(calculations)}/10"
        ),
        (
            f"scoreParityMismatch: "
            f"{len(score_mismatch_rows)}"
        ),
        (
            f"rankParityMismatch: "
            f"{len(rank_mismatch_rows)}"
        ),
        (
            f"formulaMismatch: "
            f"{len(formula_mismatch_rows)}"
        ),
        "",
        "v10 Candidate Ranking",
        "-" * 104,
    ]


    for row in sorted(
        calculations,
        key=lambda item:
            item[
                "v10CandidateRank"
            ],
    ):

        lines.append(
            (
                f"{row['v10CandidateRank']}위 "
                f"{row['artist']} "
                f"| v10="
                f"{row['v10CandidatePoint']:.2f} "
                f"| v9="
                f"{row['currentV9Point']:.2f} "
                f"| delta="
                f"{row['deltaV10CandidateVsV9']:+.4f} "
                f"| Naver="
                f"{row['naverPoint']:.2f} "
                f"| YouTube="
                f"{row['youtubePoint']:.2f} "
                f"| MusicRaw="
                f"{row['musicV2RawPoint']:.2f} "
                f"| MusicX0.25="
                f"{row['musicV2ContributionPoint']:.2f} "
                f"| LastfmRaw="
                f"{row['lastfmRawPoint']:.2f} "
                f"| LastfmX0.25="
                f"{row['lastfmContributionPoint']:.2f}"
            )
        )


    lines.extend([
        "",
        "Blockers",
        "-" * 104,
    ])


    if blockers:

        for blocker in blockers:

            lines.append(
                f"- {blocker}"
            )

    else:

        lines.append(
            "NONE"
        )


    lines.extend([
        "",
        "Safety",
        "-" * 104,
        "productionModified: FALSE",
        "runnerModified: FALSE",
        "musicV1Modified: FALSE",
        "musicV2Modified: FALSE",
        "websiteModified: FALSE",
        "",
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
        "PROMOTION PROVENANCE"
    )
    print("-" * 100)

    print(
        f"v9 readiness             : "
        f"{readiness_decision}"
    )

    print(
        f"readiness blockers       : "
        f"{readiness_blockers or 'NONE'}"
    )

    print(
        f"readiness severe risks   : "
        f"{readiness_severe or 'NONE'}"
    )

    print(
        f"readiness warnings       : "
        f"{readiness_warnings or 'NONE'}"
    )

    print(
        f"Python Health            : "
        f"{'PASS' if python_health_ok else 'FAIL'}"
    )

    print(
        f"Master v9 Health         : "
        f"{'PASS' if v9_health_ok else 'FAIL'}"
    )


    print()
    print(
        "SOURCE VALIDATION"
    )
    print("-" * 100)

    print(
        f"artistCount              : "
        f"{len(calculations)}/10"
    )

    print(
        f"artistSetMatch           : "
        f"{str(artist_set_ok).upper()}"
    )

    print(
        f"IVE semantic guard       : "
        f"{'PASS' if semantic_guard_ok else 'FAIL'}"
    )


    if artist_set_mismatch:

        print(
            "artistSetMismatch:"
        )

        print(
            json.dumps(
                artist_set_mismatch,
                ensure_ascii=False,
                indent=2,
            )
        )


    print()
    print(
        "v10 / v9 PARITY"
    )
    print("-" * 100)

    print(
        f"scoreParityMismatch      : "
        f"{len(score_mismatch_rows)}"
    )

    print(
        f"rankParityMismatch       : "
        f"{len(rank_mismatch_rows)}"
    )

    print(
        f"formulaMismatch          : "
        f"{len(formula_mismatch_rows)}"
    )


    print()
    print(
        "v10 CANDIDATE RANKING"
    )
    print("-" * 100)


    for row in sorted(
        calculations,
        key=lambda item:
            item[
                "v10CandidateRank"
            ],
    ):

        print(
            f"{row['v10CandidateRank']}위 "
            f"{row['artist']} "
            f"| v10="
            f"{row['v10CandidatePoint']:.2f} "
            f"| v9="
            f"{row['currentV9Point']:.2f} "
            f"| delta="
            f"{row['deltaV10CandidateVsV9']:+.4f}"
        )


    print()
    print("=" * 100)

    if precheck_pass:

        print(
            "PROMOTION PRECHECK PASS"
        )

        print(
            "v10 direct-source formula "
            "matches READY v9."
        )

        print(
            "SAFE TO PREPARE PRODUCTION APPLY PATCH"
        )

    else:

        print(
            "PROMOTION PRECHECK STOP"
        )

        print(
            "DO NOT MODIFY PRODUCTION."
        )


    print("=" * 100)

    print(
        f"blockers: "
        f"{blockers or 'NONE'}"
    )

    print()

    print(
        "productionModified: FALSE"
    )

    print(
        "runnerModified: FALSE"
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

    print("=" * 100)


if __name__ == "__main__":
    main()