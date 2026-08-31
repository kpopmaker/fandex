from __future__ import annotations

import csv
import hashlib
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v9_music_v2_lastfm_rolling_v1"

SCORE_MODE = (
    "parallel_music_v2_x0_25_"
    "lastfm_rolling_x0_25"
)

MUSIC_V2_SCALE = 0.25
LASTFM_SCALE = 0.25


V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

V8_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)

MUSIC_V1_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)


V9_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

V9_REPORT = Path(
    "FANDEX_MASTER_V9_BUILD_REPORT.txt"
)

COMPARE_CSV = Path(
    "fandex_master_v7_v8_v9_compare_latest.csv"
)

COMPARE_JSON = Path(
    "fandex_master_v7_v8_v9_compare_latest.json"
)

COMPARE_REPORT = Path(
    "FANDEX_MASTER_V7_V8_V9_COMPARE_REPORT.txt"
)


INPUT_FILES = [
    V7_FILE,
    V8_FILE,
    MUSIC_V1_FILE,
    MUSIC_V2_FILE,
]


def norm(value):
    if value is None:
        return ""

    return str(
        value
    ).strip()


def num(
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


def round2(value):
    return round(
        num(
            value
        ),
        2,
    )


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


def ranking_rows(payload):
    rows = payload.get(
        "ranking",
        []
    )

    if not isinstance(
        rows,
        list,
    ):
        raise RuntimeError(
            "ranking is not a list."
        )

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

        if key not in row:
            continue

        value = row.get(
            key
        )

        if value not in [
            None,
            "",
        ]:
            return num(
                value
            )

    return 0.0


def master_score(row):
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


def music_score(row):
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
    result = {}

    for row in rows:

        artist = artist_name(
            row
        )

        if not artist:
            continue

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
                round2(
                    score
                ),
        }

    return result


def file_hash(path):
    sha = hashlib.sha256()

    with path.open(
        "rb"
    ) as file:

        while True:

            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            sha.update(
                chunk
            )

    return sha.hexdigest()


def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )

    print()
    print("=" * 92)
    print(
        "FANDEX Master v9 "
        "Music v2 + Last.fm Parallel Build v1"
    )
    print("=" * 92)

    print(
        f"version: {VERSION}"
    )

    print(
        "formula:"
    )

    print(
        "  (v7 - Music v1)"
    )

    print(
        "  + Music v2 x0.25"
    )

    print(
        "  + existing v8 Last.fm contribution"
    )

    print()

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "productionMusicV1Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 92)


    # ========================================================
    # Input integrity snapshot
    # ========================================================

    before_hashes = {}

    for path in INPUT_FILES:

        if not path.exists():
            raise RuntimeError(
                f"Missing required file: {path}"
            )

        before_hashes[
            str(path)
        ] = file_hash(
            path
        )


    # ========================================================
    # Load inputs
    # ========================================================

    v7_payload = read_json(
        V7_FILE
    )

    v8_payload = read_json(
        V8_FILE
    )

    music_v1_payload = read_json(
        MUSIC_V1_FILE
    )

    music_v2_payload = read_json(
        MUSIC_V2_FILE
    )


    v7_rows = ranking_rows(
        v7_payload
    )

    v8_rows = ranking_rows(
        v8_payload
    )

    music_v1_rows = ranking_rows(
        music_v1_payload
    )

    music_v2_rows = ranking_rows(
        music_v2_payload
    )


    v7_map = build_map(
        v7_rows
    )

    v8_map = build_map(
        v8_rows
    )

    music_v1_map = build_map(
        music_v1_rows
    )

    music_v2_map = build_map(
        music_v2_rows
    )


    artist_sets = [
        set(
            v7_map
        ),
        set(
            v8_map
        ),
        set(
            music_v1_map
        ),
        set(
            music_v2_map
        ),
    ]


    base_set = artist_sets[
        0
    ]


    if len(
        base_set
    ) != 10:

        raise RuntimeError(
            "Expected v7 artistCount=10, "
            f"found {len(base_set)}"
        )


    for index, artist_set in enumerate(
        artist_sets[
            1:
        ],
        start=2,
    ):

        if artist_set != base_set:

            raise RuntimeError(
                "Artist-set mismatch "
                f"at source #{index}"
            )


    artists = sorted(
        base_set
    )


    # ========================================================
    # Current rankings
    # ========================================================

    v7_scores = {
        artist:
            master_score(
                v7_map[
                    artist
                ]
            )

        for artist in artists
    }


    v8_scores = {
        artist:
            master_score(
                v8_map[
                    artist
                ]
            )

        for artist in artists
    }


    v7_rank_map = build_rank_map(
        v7_scores
    )

    v8_rank_map = build_rank_map(
        v8_scores
    )


    # ========================================================
    # Build v9
    # ========================================================

    calculations = []

    v9_scores = {}


    for artist in artists:

        v7_point = (
            v7_scores[
                artist
            ]
        )

        v8_point = (
            v8_scores[
                artist
            ]
        )

        music_v1_point = music_score(
            music_v1_map[
                artist
            ]
        )

        music_v2_raw = music_score(
            music_v2_map[
                artist
            ]
        )


        # v8 - v7 = 기존 Last.fm x0.25 기여분
        lastfm_contribution = (
            v8_point
            - v7_point
        )


        non_music_base = (
            v7_point
            - music_v1_point
        )


        music_v2_scaled = (
            music_v2_raw
            * MUSIC_V2_SCALE
        )


        v9_point = (
            non_music_base
            + music_v2_scaled
            + lastfm_contribution
        )


        v9_scores[
            artist
        ] = v9_point


        calculations.append({
            "artist":
                artist,

            "v7Point":
                round2(
                    v7_point
                ),

            "v8Point":
                round2(
                    v8_point
                ),

            "nonMusicBasePoint":
                round2(
                    non_music_base
                ),

            "musicV1Point":
                round2(
                    music_v1_point
                ),

            "musicV2RawPoint":
                round2(
                    music_v2_raw
                ),

            "musicV2Scale":
                MUSIC_V2_SCALE,

            "musicV2ScaledPoint":
                round2(
                    music_v2_scaled
                ),

            "lastfmContributionPoint":
                round2(
                    lastfm_contribution
                ),

            "lastfmScale":
                LASTFM_SCALE,

            "v9Point":
                round2(
                    v9_point
                ),

            "deltaV9FromV7":
                round2(
                    v9_point
                    - v7_point
                ),

            "deltaV9FromV8":
                round2(
                    v9_point
                    - v8_point
                ),
        })


    v9_rank_map = build_rank_map(
        v9_scores
    )


    # ========================================================
    # Final ranking rows
    # ========================================================

    ranking = []


    for artist in artists:

        calc = next(
            row
            for row in calculations
            if row[
                "artist"
            ]
            == artist
        )


        v7_rank = (
            v7_rank_map[
                artist
            ][
                "rank"
            ]
        )

        v8_rank = (
            v8_rank_map[
                artist
            ][
                "rank"
            ]
        )

        v9_rank = (
            v9_rank_map[
                artist
            ][
                "rank"
            ]
        )


        final_point = (
            v9_rank_map[
                artist
            ][
                "score"
            ]
        )


        row = {
            "rank":
                v9_rank,

            "artist":
                artist,

            "fandexFinalPoint":
                final_point,

            "score":
                final_point,

            "nonMusicBasePoint":
                calc[
                    "nonMusicBasePoint"
                ],

            "musicV1ReferencePoint":
                calc[
                    "musicV1Point"
                ],

            "musicV2RawPoint":
                calc[
                    "musicV2RawPoint"
                ],

            "musicV2Scale":
                MUSIC_V2_SCALE,

            "musicV2ContributionPoint":
                calc[
                    "musicV2ScaledPoint"
                ],

            "lastfmScale":
                LASTFM_SCALE,

            "lastfmContributionPoint":
                calc[
                    "lastfmContributionPoint"
                ],

            "productionV7Point":
                calc[
                    "v7Point"
                ],

            "parallelV8Point":
                calc[
                    "v8Point"
                ],

            "deltaFromV7":
                calc[
                    "deltaV9FromV7"
                ],

            "deltaFromV8":
                calc[
                    "deltaV9FromV8"
                ],

            "v7Rank":
                v7_rank,

            "v8Rank":
                v8_rank,

            "v9Rank":
                v9_rank,

            "rankChangeFromV7":
                v7_rank
                - v9_rank,

            "rankChangeFromV8":
                v8_rank
                - v9_rank,
        }


        ranking.append(
            row
        )


    ranking.sort(
        key=lambda row:
            row[
                "rank"
            ]
    )


    # ========================================================
    # Formula validation
    # ========================================================

    formula_mismatch = 0


    for row in ranking:

        expected = (
            row[
                "nonMusicBasePoint"
            ]
            + row[
                "musicV2ContributionPoint"
            ]
            + row[
                "lastfmContributionPoint"
            ]
        )


        if abs(
            expected
            - row[
                "fandexFinalPoint"
            ]
        ) > 0.03:

            formula_mismatch += 1


    if formula_mismatch:
        raise RuntimeError(
            "v9 formula mismatch count: "
            f"{formula_mismatch}"
        )


    # ========================================================
    # v9 JSON
    # ========================================================

    v9_payload = {
        "version":
            VERSION,

        "createdAt":
            created_at,

        "scoreMode":
            SCORE_MODE,

        "usage":
            "PARALLEL CANDIDATE ONLY",

        "pythonOnly":
            True,

        "touchesWebsitePublicData":
            False,

        "formula":
            (
                "(production v7 - Music v1) "
                "+ Music v2 x0.25 "
                "+ Last.fm Rolling x0.25"
            ),

        "baseProductionMaster":
            str(
                V7_FILE
            ),

        "baseParallelMasterV8":
            str(
                V8_FILE
            ),

        "musicV1Reference":
            str(
                MUSIC_V1_FILE
            ),

        "musicV2Source":
            str(
                MUSIC_V2_FILE
            ),

        "musicV2Scale":
            MUSIC_V2_SCALE,

        "lastfmScale":
            LASTFM_SCALE,

        "artistCount":
            len(
                ranking
            ),

        "formulaMismatchCount":
            formula_mismatch,

        "ranking":
            ranking,

        "productionV7Modified":
            False,

        "productionMusicV1Modified":
            False,

        "musicV2Modified":
            False,

        "websiteModified":
            False,
    }


    V9_FILE.write_text(
        json.dumps(
            v9_payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    # ========================================================
    # Comparison rows
    # ========================================================

    compare_rows = []


    for row in ranking:

        compare_rows.append({
            "artist":
                row[
                    "artist"
                ],

            "v7Rank":
                row[
                    "v7Rank"
                ],

            "v7Point":
                row[
                    "productionV7Point"
                ],

            "v8Rank":
                row[
                    "v8Rank"
                ],

            "v8Point":
                row[
                    "parallelV8Point"
                ],

            "v9Rank":
                row[
                    "v9Rank"
                ],

            "v9Point":
                row[
                    "fandexFinalPoint"
                ],

            "rankChangeV7toV8":
                row[
                    "v7Rank"
                ]
                - row[
                    "v8Rank"
                ],

            "rankChangeV7toV9":
                row[
                    "v7Rank"
                ]
                - row[
                    "v9Rank"
                ],

            "rankChangeV8toV9":
                row[
                    "v8Rank"
                ]
                - row[
                    "v9Rank"
                ],

            "musicV1Point":
                row[
                    "musicV1ReferencePoint"
                ],

            "musicV2RawPoint":
                row[
                    "musicV2RawPoint"
                ],

            "musicV2Contribution":
                row[
                    "musicV2ContributionPoint"
                ],

            "lastfmContribution":
                row[
                    "lastfmContributionPoint"
                ],

            "deltaV9FromV7":
                row[
                    "deltaFromV7"
                ],

            "deltaV9FromV8":
                row[
                    "deltaFromV8"
                ],
        })


    compare_rows.sort(
        key=lambda row:
            row[
                "v9Rank"
            ]
    )


    compare_fields = [
        "artist",
        "v7Rank",
        "v7Point",
        "v8Rank",
        "v8Point",
        "v9Rank",
        "v9Point",
        "rankChangeV7toV8",
        "rankChangeV7toV9",
        "rankChangeV8toV9",
        "musicV1Point",
        "musicV2RawPoint",
        "musicV2Contribution",
        "lastfmContribution",
        "deltaV9FromV7",
        "deltaV9FromV8",
    ]


    with COMPARE_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=compare_fields,
        )

        writer.writeheader()

        writer.writerows(
            compare_rows
        )


    compare_payload = {
        "version":
            "fandex_master_v7_v8_v9_compare_v1",

        "createdAt":
            created_at,

        "v7":
            "production/base",

        "v8":
            "Music v1 + Last.fm x0.25",

        "v9":
            (
                "Music v2 x0.25 "
                "+ Last.fm x0.25"
            ),

        "artistCount":
            len(
                compare_rows
            ),

        "ranking":
            compare_rows,

        "productionV7Modified":
            False,

        "websiteModified":
            False,
    }


    COMPARE_JSON.write_text(
        json.dumps(
            compare_payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    # ========================================================
    # Reports
    # ========================================================

    report_lines = [
        "FANDEX Master v9 Build v1",
        "=" * 100,
        f"version: {VERSION}",
        f"createdAt: {created_at}",
        (
            "formula: "
            "(v7 - Music v1) "
            "+ Music v2 x0.25 "
            "+ existing v8 Last.fm contribution"
        ),
        f"artistCount: {len(ranking)}",
        (
            "formulaMismatchCount: "
            f"{formula_mismatch}"
        ),
        "usage: PARALLEL CANDIDATE ONLY",
        "productionV7Modified: FALSE",
        "productionMusicV1Modified: FALSE",
        "musicV2Modified: FALSE",
        "websiteModified: FALSE",
        "",
        "Master v9 ranking",
        "-" * 100,
    ]


    for row in ranking:

        report_lines.append(
            (
                f"{row['rank']}위 "
                f"{row['artist']} "
                f"| v9={row['fandexFinalPoint']:.2f} "
                f"| nonMusic={row['nonMusicBasePoint']:.2f} "
                f"| Music v2 raw="
                f"{row['musicV2RawPoint']:.2f} "
                f"| Music x0.25="
                f"{row['musicV2ContributionPoint']:.2f} "
                f"| Last.fm="
                f"{row['lastfmContributionPoint']:.2f} "
                f"| v7Rank="
                f"{row['v7Rank']} "
                f"| v8Rank="
                f"{row['v8Rank']}"
            )
        )


    V9_REPORT.write_text(
        "\n".join(
            report_lines
        )
        + "\n",
        encoding="utf-8",
    )


    compare_lines = [
        "FANDEX Master v7 / v8 / v9 Comparison",
        "=" * 100,
        "",
        (
            "v7 = production "
            "(Music v1, no Last.fm)"
        ),
        (
            "v8 = Music v1 "
            "+ Last.fm Rolling x0.25"
        ),
        (
            "v9 = Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        "",
        "Ranking comparison",
        "-" * 100,
    ]


    for row in compare_rows:

        compare_lines.append(
            (
                f"{row['artist']} | "
                f"v7 {row['v7Rank']}위 "
                f"{row['v7Point']:.2f} "
                f"-> v8 {row['v8Rank']}위 "
                f"{row['v8Point']:.2f} "
                f"-> v9 {row['v9Rank']}위 "
                f"{row['v9Point']:.2f} "
                f"| v7->v9 rankChange="
                f"{row['rankChangeV7toV9']:+d}"
            )
        )


    COMPARE_REPORT.write_text(
        "\n".join(
            compare_lines
        )
        + "\n",
        encoding="utf-8",
    )


    # ========================================================
    # Verify input files unchanged
    # ========================================================

    changed_inputs = []


    for path in INPUT_FILES:

        after_hash = file_hash(
            path
        )

        if (
            after_hash
            != before_hashes[
                str(
                    path
                )
            ]
        ):

            changed_inputs.append(
                str(
                    path
                )
            )


    if changed_inputs:

        raise RuntimeError(
            "Unexpected input modification: "
            + ", ".join(
                changed_inputs
            )
        )


    # ========================================================
    # Console
    # ========================================================

    print()
    print("=" * 92)
    print(
        "MASTER v9 RANKING"
    )
    print("=" * 92)


    for row in ranking:

        print(
            f"{row['rank']}위 "
            f"{row['artist']} "
            f"| v9={row['fandexFinalPoint']:.2f} "
            f"| Music v2 x0.25="
            f"{row['musicV2ContributionPoint']:.2f} "
            f"| Last.fm="
            f"{row['lastfmContributionPoint']:.2f}"
        )


    print()
    print("=" * 92)
    print(
        "v7 / v8 / v9 COMPARISON"
    )
    print("=" * 92)


    for row in compare_rows:

        print(
            f"{row['artist']} | "
            f"v7 {row['v7Rank']}위 "
            f"{row['v7Point']:.2f} "
            f"-> "
            f"v8 {row['v8Rank']}위 "
            f"{row['v8Point']:.2f} "
            f"-> "
            f"v9 {row['v9Rank']}위 "
            f"{row['v9Point']:.2f} "
            f"| v7->v9 "
            f"{row['rankChangeV7toV9']:+d}"
        )


    max_rank_change = max(
        abs(
            row[
                "rankChangeV7toV9"
            ]
        )
        for row in compare_rows
    )


    max_score_delta = max(
        abs(
            row[
                "deltaV9FromV7"
            ]
        )
        for row in compare_rows
    )


    print()
    print("=" * 92)
    print(
        "VALIDATION"
    )
    print("=" * 92)

    print(
        f"artistCount: "
        f"{len(ranking)}/10"
    )

    print(
        f"formulaMismatchCount: "
        f"{formula_mismatch}"
    )

    print(
        f"maxAbsRankChangeV7toV9: "
        f"{max_rank_change}"
    )

    print(
        f"maxAbsScoreDeltaV7toV9: "
        f"{max_score_delta:.2f}"
    )

    print(
        "inputFilesModified: FALSE"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "productionMusicV1Modified: FALSE"
    )

    print(
        "musicV2Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )


    print()
    print(
        f"v9JSON: {V9_FILE}"
    )

    print(
        f"v9Report: {V9_REPORT}"
    )

    print(
        f"compareCSV: {COMPARE_CSV}"
    )

    print(
        f"compareJSON: {COMPARE_JSON}"
    )

    print(
        f"compareReport: "
        f"{COMPARE_REPORT}"
    )

    print("=" * 92)


if __name__ == "__main__":
    main()