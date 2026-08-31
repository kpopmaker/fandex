from __future__ import annotations

import csv
import json
import math
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_medium_candidate_impact_preview_v1"

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1_latest.csv"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_medium_candidate_impact_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_music_chart_medium_candidate_impact_preview_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_MEDIUM_CANDIDATE_IMPACT_PREVIEW_V1_REPORT.txt"
)


TARGET_ARTISTS = [
    "아이브",
    "뉴진스",
    "르세라핌",
]

TARGET_PLATFORMS = [
    "melon",
    "genie",
]


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
    "projectedRank",
    "currentRank",
    "rankChange",
    "artist",
    "currentMasterPoint",
    "currentMusicPoint",
    "projectedMusicPoint",
    "musicPointChange",
    "projectedMasterPoint",
]


def norm(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def safe_float(
    value: Any,
    default: float = 0.0,
) -> float:
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


def safe_int(
    value: Any,
    default: int | None = None,
) -> int | None:
    try:
        if value in [None, ""]:
            return default

        return int(
            float(
                str(value)
                .replace(",", "")
                .strip()
            )
        )

    except Exception:
        return default


def parse_date(
    value: Any,
) -> date | None:
    try:
        return date.fromisoformat(
            norm(value)
        )
    except Exception:
        return None


def read_csv(
    path: Path,
) -> tuple[
    list[dict[str, str]],
    list[str],
]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        return (
            list(reader),
            list(
                reader.fieldnames
                or []
            ),
        )


def read_json(
    path: Path,
) -> Any:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        return json.load(file)


def rank_base(
    rank: int,
) -> float:
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


def stale_factor(
    chart_date: date | None,
    as_of_date: date,
) -> float:
    if chart_date is None:
        return 0.0

    age = (
        as_of_date
        - chart_date
    ).days

    if age < 0:
        raise RuntimeError(
            f"Future chartDate detected: "
            f"{chart_date}"
        )

    if age <= 3:
        return 1.0

    if age <= 7:
        return 0.7

    if age <= 14:
        return 0.4

    if age <= 30:
        return 0.2

    return 0.0


def metric_bonus(
    metric_value: Any,
) -> float:
    value = safe_float(
        metric_value,
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


def chart_type_for_row(
    row: dict[str, Any],
) -> str:
    value = norm(
        row.get(
            "chartType"
        )
    ).lower()

    if value:
        return value

    return "other"


def raw_entry_point(
    row: dict[str, Any],
) -> float:
    rank = safe_int(
        row.get("rank")
    )

    if rank is None:
        return 0.0

    platform = norm(
        row.get(
            "platform"
        )
    ).lower()

    chart_type = (
        chart_type_for_row(
            row
        )
    )

    platform_weight = (
        PLATFORM_WEIGHTS.get(
            platform,
            PLATFORM_WEIGHTS[
                "other"
            ],
        )
    )

    chart_type_weight = (
        CHART_TYPE_WEIGHTS.get(
            chart_type,
            CHART_TYPE_WEIGHTS[
                "other"
            ],
        )
    )

    return (
        rank_base(rank)
        * platform_weight
        * chart_type_weight
        + metric_bonus(
            row.get(
                "metricValue"
            )
        )
    )


def decayed_entry_point(
    row: dict[str, Any],
    as_of_date: date,
) -> float:
    raw = raw_entry_point(
        row
    )

    factor = stale_factor(
        parse_date(
            row.get(
                "chartDate"
            )
        ),
        as_of_date,
    )

    return raw * factor


def music_scores(
    seed_rows: list[
        dict[str, Any]
    ],
    as_of_date: date,
) -> dict[str, float]:
    totals: dict[
        str,
        float,
    ] = {}

    for row in seed_rows:
        artist = norm(
            row.get(
                "artist"
            )
        )

        if not artist:
            continue

        totals.setdefault(
            artist,
            0.0,
        )

        totals[artist] += (
            decayed_entry_point(
                row,
                as_of_date,
            )
        )

    return {
        artist:
            round(
                value,
                2,
            )
        for artist, value
        in totals.items()
    }


def master_rows(
    payload: Any,
) -> list[dict[str, Any]]:
    if (
        isinstance(
            payload,
            dict,
        )
        and isinstance(
            payload.get(
                "ranking"
            ),
            list,
        )
    ):
        return [
            row
            for row
            in payload[
                "ranking"
            ]
            if isinstance(
                row,
                dict,
            )
        ]

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

    raise RuntimeError(
        "Master ranking array "
        "not found."
    )


def artist_name(
    row: dict[str, Any],
) -> str:
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


def master_point(
    row: dict[str, Any],
) -> float:
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

        try:
            return float(
                row.get(key)
            )
        except Exception:
            continue

    raise RuntimeError(
        "Master score field "
        "not found for "
        f"{artist_name(row)}"
    )


def master_rank(
    row: dict[str, Any],
    fallback: int,
) -> int:
    for key in [
        "rank",
        "fandexRank",
        "ranking",
    ]:
        value = safe_int(
            row.get(key)
        )

        if (
            value is not None
            and value > 0
        ):
            return value

    return fallback


def current_music_from_master(
    row: dict[str, Any],
) -> float:
    for key in [
        "musicChartPoint",
        "musicPoint",
        "musicScore",
        "music",
    ]:
        if key not in row:
            continue

        value = row.get(key)

        if isinstance(
            value,
            dict,
        ):
            for nested_key in [
                "point",
                "score",
                "total",
            ]:
                if nested_key in value:
                    return safe_float(
                        value.get(
                            nested_key
                        )
                    )

        else:
            try:
                return float(value)
            except Exception:
                pass

    # 현재 Master JSON 구조에서
    # Music 필드 탐지가 실패하더라도
    # seed 계산값으로 대체할 수 있도록
    # None 의미의 NaN을 사용한다.
    return float("nan")


def candidate_rows(
    history_rows: list[
        dict[str, str]
    ],
) -> list[dict[str, str]]:
    output = []

    for row in history_rows:
        artist = norm(
            row.get("artist")
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
        ).upper()

        if (
            artist
            not in TARGET_ARTISTS
        ):
            continue

        if (
            platform
            not in TARGET_PLATFORMS
        ):
            continue

        if status != "RANKED":
            continue

        output.append(
            row
        )

    return output


def seed_key(
    row: dict[str, Any],
) -> tuple[str, str]:
    return (
        norm(
            row.get(
                "artist"
            )
        ),
        norm(
            row.get(
                "platform"
            )
        ).lower(),
    )


def make_preview_seed(
    seed_rows: list[
        dict[str, str]
    ],
    candidates: list[
        dict[str, str]
    ],
) -> tuple[
    list[dict[str, str]],
    list[dict[str, Any]],
]:
    preview = deepcopy(
        seed_rows
    )

    index_by_key = {
        seed_key(row):
            index
        for index, row
        in enumerate(preview)
    }

    changes = []

    for candidate in candidates:
        artist = norm(
            candidate.get(
                "artist"
            )
        )

        platform = norm(
            candidate.get(
                "platform"
            )
        ).lower()

        key = (
            artist,
            platform,
        )

        if key not in index_by_key:
            raise RuntimeError(
                "Existing seed row missing "
                f"for candidate: "
                f"{artist}/{platform}"
            )

        index = index_by_key[
            key
        ]

        old = preview[
            index
        ]

        new = deepcopy(
            old
        )

        new_rank = safe_int(
            candidate.get(
                "bestRank"
            )
        )

        if new_rank is None:
            raise RuntimeError(
                f"Invalid candidate rank: "
                f"{artist}/{platform}"
            )

        check_date = norm(
            candidate.get(
                "checkDate"
            )
        )

        if (
            parse_date(
                check_date
            )
            is None
        ):
            raise RuntimeError(
                f"Invalid checkDate: "
                f"{artist}/{platform}"
            )

        candidate_track = norm(
            candidate.get(
                "bestTrackTitle"
            )
        )

        old_track = norm(
            old.get(
                "trackTitle"
            )
        )

        # 현재 3개 후보는 기존 seed와
        # 같은 곡의 순위 갱신이므로
        # 기존 canonical 표기를 유지한다.
        #
        # 곡명이 완전히 비어있는 경우에만
        # candidate 제목을 사용한다.
        final_track = (
            old_track
            or candidate_track
        )

        new[
            "trackTitle"
        ] = final_track

        new[
            "rank"
        ] = str(
            new_rank
        )

        new[
            "chartDate"
        ] = check_date

        # discovery 대상은
        # Melon TOP100 / Genie Daily.
        new[
            "chartType"
        ] = "daily"

        if platform == "melon":
            new[
                "chartName"
            ] = "TOP100"

        elif platform == "genie":
            new[
                "chartName"
            ] = "Top 200 Daily"

        changes.append({
            "artist":
                artist,

            "platform":
                platform,

            "trackTitle":
                final_track,

            "oldRank":
                norm(
                    old.get(
                        "rank"
                    )
                ),

            "newRank":
                new_rank,

            "oldDate":
                norm(
                    old.get(
                        "chartDate"
                    )
                ),

            "newDate":
                check_date,
        })

        preview[
            index
        ] = new

    return (
        preview,
        changes,
    )


def main() -> None:
    print()
    print(
        "FANDEX Music Chart Medium "
        "Candidate Impact Preview v1"
    )
    print("=" * 88)
    print(
        f"version: {VERSION}"
    )
    print(
        "targets: "
        + ", ".join(
            TARGET_ARTISTS
        )
    )
    print(
        "mode: PREVIEW ONLY"
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

    (
        seed_rows,
        seed_fields,
    ) = read_csv(
        SEED_FILE
    )

    (
        history_rows,
        _,
    ) = read_csv(
        HISTORY_FILE
    )

    master_payload = read_json(
        MASTER_FILE
    )

    candidates = candidate_rows(
        history_rows
    )

    expected_candidate_count = (
        len(TARGET_ARTISTS)
        * len(
            TARGET_PLATFORMS
        )
    )

    if (
        len(candidates)
        != expected_candidate_count
    ):
        raise RuntimeError(
            "Expected "
            f"{expected_candidate_count} "
            "ranked candidates, "
            f"got {len(candidates)}."
        )

    candidate_dates = {
        norm(
            row.get(
                "checkDate"
            )
        )
        for row in candidates
    }

    if len(candidate_dates) != 1:
        raise RuntimeError(
            "Candidates have mixed "
            f"checkDate values: "
            f"{sorted(candidate_dates)}"
        )

    as_of_text = next(
        iter(
            candidate_dates
        )
    )

    as_of_date = parse_date(
        as_of_text
    )

    if as_of_date is None:
        raise RuntimeError(
            f"Invalid asOfDate: "
            f"{as_of_text}"
        )

    (
        preview_seed,
        changes,
    ) = make_preview_seed(
        seed_rows,
        candidates,
    )

    current_music = music_scores(
        seed_rows,
        as_of_date,
    )

    projected_music = music_scores(
        preview_seed,
        as_of_date,
    )

    print()
    print(
        f"asOfDate: "
        f"{as_of_text}"
    )

    print()
    print(
        "Candidate replacements"
    )
    print("-" * 88)

    for change in changes:
        print(
            f"{change['artist']} | "
            f"{change['platform']} | "
            f"{change['trackTitle']} | "
            f"rank "
            f"{change['oldRank']} "
            f"→ "
            f"{change['newRank']} | "
            f"date "
            f"{change['oldDate']} "
            f"→ "
            f"{change['newDate']}"
        )

    m_rows = master_rows(
        master_payload
    )

    if len(m_rows) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(m_rows)}."
        )

    current_master = {}

    current_rank = {}

    master_music = {}

    for index, row in enumerate(
        m_rows,
        start=1,
    ):
        artist = artist_name(
            row
        )

        current_master[
            artist
        ] = master_point(
            row
        )

        current_rank[
            artist
        ] = master_rank(
            row,
            index,
        )

        detected_music = (
            current_music_from_master(
                row
            )
        )

        if math.isnan(
            detected_music
        ):
            detected_music = (
                current_music.get(
                    artist,
                    0.0,
                )
            )

        master_music[
            artist
        ] = detected_music

    projected_master = {}

    for artist in current_master:
        old_music = master_music.get(
            artist,
            0.0,
        )

        new_music = (
            projected_music.get(
                artist,
                old_music,
            )
        )

        projected_master[
            artist
        ] = (
            current_master[
                artist
            ]
            - old_music
            + new_music
        )

    order = sorted(
        projected_master,
        key=lambda artist: (
            -projected_master[
                artist
            ],
            artist,
        ),
    )

    projected_rank = {
        artist:
            index
        for index, artist
        in enumerate(
            order,
            start=1,
        )
    }

    output = []

    print()
    print(
        "Projected Master ranking"
    )
    print("-" * 88)

    for artist in order:
        old_music = (
            master_music.get(
                artist,
                0.0,
            )
        )

        new_music = (
            projected_music.get(
                artist,
                old_music,
            )
        )

        delta = (
            new_music
            - old_music
        )

        result = {
            "projectedRank":
                projected_rank[
                    artist
                ],

            "currentRank":
                current_rank[
                    artist
                ],

            "rankChange":
                current_rank[
                    artist
                ]
                - projected_rank[
                    artist
                ],

            "artist":
                artist,

            "currentMasterPoint":
                round(
                    current_master[
                        artist
                    ],
                    2,
                ),

            "currentMusicPoint":
                round(
                    old_music,
                    2,
                ),

            "projectedMusicPoint":
                round(
                    new_music,
                    2,
                ),

            "musicPointChange":
                round(
                    delta,
                    2,
                ),

            "projectedMasterPoint":
                round(
                    projected_master[
                        artist
                    ],
                    2,
                ),
        }

        output.append(
            result
        )

        marker = (
            " *"
            if artist
            in TARGET_ARTISTS
            else ""
        )

        print(
            f"{result['projectedRank']}위 "
            f"{artist}{marker} | "
            f"Master "
            f"{result['currentMasterPoint']:.2f} "
            f"→ "
            f"{result['projectedMasterPoint']:.2f} | "
            f"Music "
            f"{result['currentMusicPoint']:.2f} "
            f"→ "
            f"{result['projectedMusicPoint']:.2f} "
            f"({result['musicPointChange']:+.2f}) | "
            f"rankChange "
            f"{result['rankChange']:+d}"
        )

    temp = OUTPUT_CSV.with_suffix(
        OUTPUT_CSV.suffix + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()

        for row in output:
            writer.writerow(
                row
            )

    temp.replace(
        OUTPUT_CSV
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "asOfDate":
            as_of_text,

        "targetArtists":
            TARGET_ARTISTS,

        "candidateCount":
            len(candidates),

        "changes":
            changes,

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

    report_lines = [
        (
            "FANDEX Music Chart Medium "
            "Candidate Impact Preview v1"
        ),
        "=" * 88,
        (
            f"asOfDate: "
            f"{as_of_text}"
        ),
        "",
        "Candidate replacements",
        "-" * 88,
    ]

    for change in changes:
        report_lines.append(
            f"{change['artist']} | "
            f"{change['platform']} | "
            f"{change['trackTitle']} | "
            f"rank "
            f"{change['oldRank']} "
            f"→ "
            f"{change['newRank']} | "
            f"date "
            f"{change['oldDate']} "
            f"→ "
            f"{change['newDate']}"
        )

    report_lines.extend([
        "",
        "Projected Master ranking",
        "-" * 88,
    ])

    for row in output:
        report_lines.append(
            f"{row['projectedRank']}위 "
            f"{row['artist']} | "
            f"Master "
            f"{row['currentMasterPoint']} "
            f"→ "
            f"{row['projectedMasterPoint']} | "
            f"Music "
            f"{row['currentMusicPoint']} "
            f"→ "
            f"{row['projectedMusicPoint']} "
            f"({row['musicPointChange']:+.2f}) | "
            f"rankChange "
            f"{row['rankChange']:+d}"
        )

    report_lines.extend([
        "",
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
        f"candidateCount: "
        f"{len(candidates)}"
    )
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