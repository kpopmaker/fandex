from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_rolling_master_impact_preview_v1"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

ROLLING_SCORE_FILE = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "lastfm_rolling_master_impact_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_lastfm_rolling_master_impact_preview_v1_latest.json"
)

REPORT_FILE = Path(
    "FANDEX_LASTFM_ROLLING_MASTER_IMPACT_PREVIEW_V1_REPORT.txt"
)

SCALES = [
    0.25,
    0.50,
    1.00,
]


OUTPUT_FIELDS = [
    "scale",
    "projectedRank",
    "currentRank",
    "rankChange",
    "artist",
    "currentMasterPoint",
    "rollingScore",
    "lastfmAddedPoint",
    "projectedMasterPoint",
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
        reader = csv.DictReader(f)

        return (
            list(reader),
            list(reader.fieldnames or []),
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


def master_point(row):
    for key in [
        "fandexFinalPoint",
        "fandexTotalPoint",
        "finalPoint",
        "totalPoint",
        "finalScore",
        "totalScore",
        "fandexScore",
        "score",
        "total",
    ]:
        if key not in row:
            continue

        value = row.get(key)

        try:
            return float(value)
        except Exception:
            continue

    raise RuntimeError(
        "Master score field not found. "
        f"artist={artist_name(row)}, "
        f"keys={list(row.keys())}"
    )


def master_rank(row, fallback):
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


def detect_score_field(fieldnames):
    preferred = [
        "rollingScore",
        "rollingScorePreview",
        "previewScore",
        "lastfmRollingScore",
        "lastfmScore",
        "finalScore",
        "score",
    ]

    lower_map = {
        field.lower():
            field
        for field in fieldnames
    }

    for candidate in preferred:
        key = candidate.lower()

        if key in lower_map:
            return lower_map[key]

    # fallback:
    # score라는 단어가 들어간 숫자 컬럼 탐색
    for field in fieldnames:
        lower = field.lower()

        if (
            "score" in lower
            and "status" not in lower
            and "ready" not in lower
        ):
            return field

    raise RuntimeError(
        "Rolling score field를 찾지 못했습니다. "
        f"CSV fields={fieldnames}"
    )


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
        "FANDEX Last.fm Rolling "
        "Master Impact Preview v1"
    )
    print("=" * 88)
    print(f"version: {VERSION}")
    print(
        "purpose: rolling Last.fm score의 "
        "Master 영향도 sensitivity test"
    )
    print(
        "scales: "
        + ", ".join(
            str(scale)
            for scale in SCALES
        )
    )
    print(
        "scoreUsage: "
        "rolling_impact_preview_only"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 88)

    master_payload = read_json(
        MASTER_FILE
    )

    (
        rolling_rows,
        rolling_fields,
    ) = read_csv(
        ROLLING_SCORE_FILE
    )

    master_rows = ranking_rows(
        master_payload
    )

    if len(master_rows) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(master_rows)}."
        )

    if len(rolling_rows) != 10:
        raise RuntimeError(
            "Expected 10 Rolling artists, "
            f"got {len(rolling_rows)}."
        )

    score_field = detect_score_field(
        rolling_fields
    )

    print()
    print(
        f"detectedRollingScoreField: "
        f"{score_field}"
    )

    rolling_map = {}

    for row in rolling_rows:
        artist = artist_name(row)

        if not artist:
            continue

        rolling_map[artist] = (
            safe_float(
                row.get(
                    score_field
                )
            )
        )

    master_artists = [
        artist_name(row)
        for row in master_rows
    ]

    missing = [
        artist
        for artist in master_artists
        if artist not in rolling_map
    ]

    if missing:
        raise RuntimeError(
            "Rolling score missing artists: "
            + ", ".join(missing)
        )

    current_points = {}

    current_ranks = {}

    for index, row in enumerate(
        master_rows,
        start=1,
    ):
        artist = artist_name(row)

        current_points[
            artist
        ] = master_point(row)

        current_ranks[
            artist
        ] = master_rank(
            row,
            index,
        )

    all_output = []

    scenario_payloads = []

    print()
    print("Impact scenarios")
    print("-" * 88)

    for scale in SCALES:
        projected_points = {}

        for artist in master_artists:
            added = (
                rolling_map[
                    artist
                ]
                * scale
            )

            projected_points[
                artist
            ] = (
                current_points[
                    artist
                ]
                + added
            )

        projected_order = sorted(
            master_artists,
            key=lambda artist: (
                -projected_points[
                    artist
                ],
                artist,
            ),
        )

        projected_ranks = {
            artist:
                index
            for index, artist
            in enumerate(
                projected_order,
                start=1,
            )
        }

        print()
        print(
            f"Last.fm Rolling scale "
            f"x{scale:.2f}"
        )
        print("-" * 88)

        scenario_rows = []

        for artist in projected_order:
            old_rank = (
                current_ranks[
                    artist
                ]
            )

            new_rank = (
                projected_ranks[
                    artist
                ]
            )

            rolling_score = (
                rolling_map[
                    artist
                ]
            )

            added = (
                rolling_score
                * scale
            )

            projected = (
                projected_points[
                    artist
                ]
            )

            result = {
                "scale":
                    scale,

                "projectedRank":
                    new_rank,

                "currentRank":
                    old_rank,

                "rankChange":
                    old_rank
                    - new_rank,

                "artist":
                    artist,

                "currentMasterPoint":
                    round(
                        current_points[
                            artist
                        ],
                        2,
                    ),

                "rollingScore":
                    round(
                        rolling_score,
                        2,
                    ),

                "lastfmAddedPoint":
                    round(
                        added,
                        2,
                    ),

                "projectedMasterPoint":
                    round(
                        projected,
                        2,
                    ),
            }

            scenario_rows.append(
                result
            )

            all_output.append(
                result
            )

            print(
                f"{new_rank}위 "
                f"{artist} | "
                f"{projected:.2f} | "
                f"Rolling "
                f"{rolling_score:.2f} | "
                f"Last.fm "
                f"+{added:.2f} | "
                f"rankChange "
                f"{old_rank - new_rank:+d}"
            )

        scenario_payloads.append({
            "scale":
                scale,

            "ranking":
                scenario_rows,
        })

    write_csv(
        OUTPUT_CSV,
        all_output,
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "scoreSource":
            str(
                ROLLING_SCORE_FILE
            ),

        "detectedScoreField":
            score_field,

        "scales":
            SCALES,

        "artistCount":
            len(master_artists),

        "scenarios":
            scenario_payloads,

        "scoreUsage":
            "rolling_impact_preview_only",

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

    lines = [
        (
            "FANDEX Last.fm Rolling "
            "Master Impact Preview v1"
        ),
        "=" * 88,
        (
            f"scoreField: "
            f"{score_field}"
        ),
        "",
    ]

    for scenario in scenario_payloads:
        scale = scenario[
            "scale"
        ]

        lines.append(
            f"Last.fm Rolling "
            f"scale x{scale:.2f}"
        )

        lines.append(
            "-" * 88
        )

        for row in scenario[
            "ranking"
        ]:
            lines.append(
                f"{row['projectedRank']}위 "
                f"{row['artist']} | "
                f"{row['projectedMasterPoint']} | "
                f"Rolling "
                f"{row['rollingScore']} | "
                f"Last.fm "
                f"+{row['lastfmAddedPoint']} | "
                f"rankChange "
                f"{row['rankChange']:+d}"
            )

        lines.append("")

    lines.extend([
        (
            "scoreUsage: "
            "rolling_impact_preview_only"
        ),
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print(
        f"CSV: {OUTPUT_CSV}"
    )
    print(
        f"JSON: {OUTPUT_JSON}"
    )
    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "scoreUsage: "
        "rolling_impact_preview_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()