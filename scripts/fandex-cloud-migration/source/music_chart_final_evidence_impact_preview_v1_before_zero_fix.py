from __future__ import annotations

import csv
import json
import math
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_final_evidence_impact_preview_v1"

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_final_evidence_impact_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_music_chart_final_evidence_impact_preview_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_FINAL_EVIDENCE_IMPACT_PREVIEW_V1_REPORT.txt"
)


TARGET_ARTISTS = [
    "에이티즈",
    "아이유",
]

SUPPORTED_PLATFORMS = [
    "melon",
    "genie",
    "bugs",
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
            f"Future chartDate: "
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
    value: Any,
) -> float:
    metric = safe_float(
        value,
        0.0,
    )

    if metric <= 0:
        return 0.0

    return min(
        math.log10(
            metric + 1
        ) * 2.0,
        30.0,
    )


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

    chart_type = norm(
        row.get(
            "chartType"
        )
    ).lower() or "other"

    return (
        rank_base(rank)
        * PLATFORM_WEIGHTS.get(
            platform,
            PLATFORM_WEIGHTS[
                "other"
            ],
        )
        * CHART_TYPE_WEIGHTS.get(
            chart_type,
            CHART_TYPE_WEIGHTS[
                "other"
            ],
        )
        + metric_bonus(
            row.get(
                "metricValue"
            )
        )
    )


def entry_point(
    row: dict[str, Any],
    as_of_date: date,
) -> float:
    return (
        raw_entry_point(row)
        * stale_factor(
            parse_date(
                row.get(
                    "chartDate"
                )
            ),
            as_of_date,
        )
    )


def music_scores(
    rows: list[
        dict[str, Any]
    ],
    as_of_date: date,
) -> dict[str, float]:
    totals = {}

    for row in rows:
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
            entry_point(
                row,
                as_of_date,
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


def latest_history_for_targets(
    rows: list[
        dict[str, str]
    ],
):
    result = {}

    for artist in TARGET_ARTISTS:
        for platform in SUPPORTED_PLATFORMS:
            matches = [
                row
                for row in rows
                if (
                    norm(
                        row.get(
                            "artist"
                        )
                    )
                    == artist
                    and norm(
                        row.get(
                            "platform"
                        )
                    ).lower()
                    == platform
                )
            ]

            if not matches:
                raise RuntimeError(
                    "Missing check history: "
                    f"{artist}/{platform}"
                )

            matches.sort(
                key=lambda row:
                    norm(
                        row.get(
                            "checkDate"
                        )
                    ),
                reverse=True,
            )

            result[
                (
                    artist,
                    platform,
                )
            ] = matches[0]

    dates = {
        norm(
            row.get(
                "checkDate"
            )
        )
        for row in result.values()
    }

    if len(dates) != 1:
        raise RuntimeError(
            "Latest evidence dates "
            f"are mixed: {sorted(dates)}"
        )

    as_of_text = next(
        iter(dates)
    )

    as_of_date = parse_date(
        as_of_text
    )

    if as_of_date is None:
        raise RuntimeError(
            f"Invalid evidence date: "
            f"{as_of_text}"
        )

    return (
        result,
        as_of_text,
        as_of_date,
    )


def seed_key(
    row: dict[str, Any],
):
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


def chart_defaults(
    platform: str,
):
    if platform == "melon":
        return (
            "TOP100",
            "daily",
        )

    if platform == "genie":
        return (
            "Top 200 Daily",
            "daily",
        )

    if platform == "bugs":
        return (
            "Bugs Realtime",
            "realtime",
        )

    return (
        platform,
        "other",
    )


def build_preview_seed(
    seed_rows: list[
        dict[str, str]
    ],
    evidence: dict[
        tuple[str, str],
        dict[str, str],
    ],
):
    preview = deepcopy(
        seed_rows
    )

    actions = []

    for artist in TARGET_ARTISTS:
        for platform in SUPPORTED_PLATFORMS:
            ev = evidence[
                (
                    artist,
                    platform,
                )
            ]

            status = norm(
                ev.get(
                    "status"
                )
            ).upper()

            existing_indexes = [
                index
                for index, row
                in enumerate(preview)
                if seed_key(row)
                == (
                    artist,
                    platform,
                )
            ]

            # --------------------------------
            # 현재 미진입
            # → 과거 ranked seed 제거
            # --------------------------------
            if status == "NOT_RANKED":
                if existing_indexes:
                    old_rows = [
                        preview[index]
                        for index
                        in existing_indexes
                    ]

                    for old in old_rows:
                        actions.append({
                            "artist":
                                artist,

                            "platform":
                                platform,

                            "action":
                                "REMOVE",

                            "oldRank":
                                norm(
                                    old.get(
                                        "rank"
                                    )
                                ),

                            "newRank":
                                "",

                            "trackTitle":
                                norm(
                                    old.get(
                                        "trackTitle"
                                    )
                                ),

                            "oldDate":
                                norm(
                                    old.get(
                                        "chartDate"
                                    )
                                ),

                            "newDate":
                                norm(
                                    ev.get(
                                        "checkDate"
                                    )
                                ),
                        })

                    preview = [
                        row
                        for row in preview
                        if seed_key(row)
                        != (
                            artist,
                            platform,
                        )
                    ]

                else:
                    actions.append({
                        "artist":
                            artist,

                        "platform":
                            platform,

                        "action":
                            "NO_ENTRY_CONFIRMED",

                        "oldRank":
                            "",

                        "newRank":
                            "",

                        "trackTitle":
                            "",

                        "oldDate":
                            "",

                        "newDate":
                            norm(
                                ev.get(
                                    "checkDate"
                                )
                            ),
                    })

                continue

            # --------------------------------
            # 현재 순위 진입
            # --------------------------------
            if status != "RANKED":
                raise RuntimeError(
                    f"Unsupported status: "
                    f"{artist}/{platform}/"
                    f"{status}"
                )

            new_rank = safe_int(
                ev.get(
                    "bestRank"
                )
            )

            if new_rank is None:
                raise RuntimeError(
                    "Invalid ranked evidence: "
                    f"{artist}/{platform}"
                )

            new_date = norm(
                ev.get(
                    "checkDate"
                )
            )

            candidate_track = norm(
                ev.get(
                    "bestTrackTitle"
                )
            )

            chart_name, chart_type = (
                chart_defaults(
                    platform
                )
            )

            if existing_indexes:
                if len(
                    existing_indexes
                ) > 1:
                    raise RuntimeError(
                        "Duplicate seed rows: "
                        f"{artist}/{platform}"
                    )

                index = (
                    existing_indexes[0]
                )

                old = dict(
                    preview[index]
                )

                new = dict(old)

                old_rank = norm(
                    old.get(
                        "rank"
                    )
                )

                old_date = norm(
                    old.get(
                        "chartDate"
                    )
                )

                old_track = norm(
                    old.get(
                        "trackTitle"
                    )
                )

                new[
                    "rank"
                ] = str(
                    new_rank
                )

                new[
                    "chartDate"
                ] = new_date

                new[
                    "chartName"
                ] = chart_name

                new[
                    "chartType"
                ] = chart_type

                if not old_track:
                    new[
                        "trackTitle"
                    ] = candidate_track

                preview[index] = new

                actions.append({
                    "artist":
                        artist,

                    "platform":
                        platform,

                    "action":
                        "UPDATE",

                    "oldRank":
                        old_rank,

                    "newRank":
                        str(
                            new_rank
                        ),

                    "trackTitle":
                        norm(
                            new.get(
                                "trackTitle"
                            )
                        ),

                    "oldDate":
                        old_date,

                    "newDate":
                        new_date,
                })

            else:
                new = {
                    "artist":
                        artist,

                    "platform":
                        platform,

                    "chartName":
                        chart_name,

                    "trackTitle":
                        candidate_track,

                    "rank":
                        str(
                            new_rank
                        ),

                    "chartDate":
                        new_date,

                    "chartType":
                        chart_type,

                    "metricType":
                        "",

                    "metricValue":
                        "",

                    "memo":
                        (
                            "preview_from_check_history;"
                            f"sourceVersion="
                            f"{VERSION}"
                        ),
                }

                preview.append(
                    new
                )

                actions.append({
                    "artist":
                        artist,

                    "platform":
                        platform,

                    "action":
                        "ADD",

                    "oldRank":
                        "",

                    "newRank":
                        str(
                            new_rank
                        ),

                    "trackTitle":
                        candidate_track,

                    "oldDate":
                        "",

                    "newDate":
                        new_date,
                })

    return (
        preview,
        actions,
    )


def ranking_rows(
    payload: Any,
):
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
        return payload[
            "ranking"
        ]

    if isinstance(
        payload,
        list,
    ):
        return payload

    raise RuntimeError(
        "Master ranking not found."
    )


def artist_name(
    row: dict[str, Any],
):
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
):
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
        if key in row:
            try:
                return float(
                    row.get(key)
                )
            except Exception:
                pass

    raise RuntimeError(
        "Master point field "
        f"not found: "
        f"{artist_name(row)}"
    )


def current_music_point(
    row: dict[str, Any],
):
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
            for nested in [
                "point",
                "score",
                "total",
            ]:
                if nested in value:
                    return safe_float(
                        value.get(
                            nested
                        )
                    )

        else:
            try:
                return float(value)
            except Exception:
                pass

    return None


def master_rank(
    row: dict[str, Any],
    fallback: int,
):
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


def main():
    print()
    print(
        "FANDEX Music Chart Final "
        "Evidence Impact Preview v1"
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
        "policy: latest 3-platform "
        "evidence overrides stale seed "
        "in preview"
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
        _,
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

    (
        evidence,
        as_of_text,
        as_of_date,
    ) = latest_history_for_targets(
        history_rows
    )

    print()
    print(
        f"asOfDate: "
        f"{as_of_text}"
    )

    print()
    print(
        "Latest evidence"
    )
    print("-" * 88)

    for artist in TARGET_ARTISTS:
        for platform in SUPPORTED_PLATFORMS:
            row = evidence[
                (
                    artist,
                    platform,
                )
            ]

            status = norm(
                row.get(
                    "status"
                )
            )

            rank = norm(
                row.get(
                    "bestRank"
                )
            )

            track = norm(
                row.get(
                    "bestTrackTitle"
                )
            )

            if status == "RANKED":
                print(
                    f"{artist} | "
                    f"{platform} | "
                    f"RANKED | "
                    f"{rank}위 "
                    f"{track}"
                )
            else:
                print(
                    f"{artist} | "
                    f"{platform} | "
                    f"NOT_RANKED"
                )

    (
        preview_seed,
        actions,
    ) = build_preview_seed(
        seed_rows,
        evidence,
    )

    print()
    print(
        "Projected seed actions"
    )
    print("-" * 88)

    for action in actions:
        if action[
            "action"
        ] == "UPDATE":
            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"UPDATE | "
                f"rank "
                f"{action['oldRank']} "
                f"→ {action['newRank']} | "
                f"date "
                f"{action['oldDate']} "
                f"→ {action['newDate']}"
            )

        elif action[
            "action"
        ] == "REMOVE":
            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"REMOVE stale ranked seed | "
                f"rank={action['oldRank']} | "
                f"date={action['oldDate']}"
            )

        elif action[
            "action"
        ] == "ADD":
            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"ADD | "
                f"rank={action['newRank']} | "
                f"{action['trackTitle']}"
            )

        else:
            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"NO_ENTRY_CONFIRMED"
            )

    current_seed_music = (
        music_scores(
            seed_rows,
            as_of_date,
        )
    )

    projected_music = (
        music_scores(
            preview_seed,
            as_of_date,
        )
    )

    m_rows = ranking_rows(
        master_payload
    )

    if len(m_rows) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(m_rows)}."
        )

    current_master = {}
    current_rank_map = {}
    current_music = {}

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

        current_rank_map[
            artist
        ] = master_rank(
            row,
            index,
        )

        detected_music = (
            current_music_point(
                row
            )
        )

        if detected_music is None:
            detected_music = (
                current_seed_music.get(
                    artist,
                    0.0,
                )
            )

        current_music[
            artist
        ] = detected_music

    projected_master = {}

    for artist, master in (
        current_master.items()
    ):
        old_music = (
            current_music.get(
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

        projected_master[
            artist
        ] = (
            master
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

    projected_rank_map = {
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
        "Projected Music / Master"
    )
    print("-" * 88)

    for artist in order:
        old_music = (
            current_music.get(
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

        music_delta = (
            new_music
            - old_music
        )

        result = {
            "projectedRank":
                projected_rank_map[
                    artist
                ],

            "currentRank":
                current_rank_map[
                    artist
                ],

            "rankChange":
                current_rank_map[
                    artist
                ]
                - projected_rank_map[
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
                    music_delta,
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
            f"Music "
            f"{result['currentMusicPoint']:.2f} "
            f"→ "
            f"{result['projectedMusicPoint']:.2f} "
            f"({result['musicPointChange']:+.2f}) | "
            f"Master "
            f"{result['currentMasterPoint']:.2f} "
            f"→ "
            f"{result['projectedMasterPoint']:.2f} | "
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
        writer.writerows(
            output
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

        "supportedPlatforms":
            SUPPORTED_PLATFORMS,

        "actions":
            actions,

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
            "FANDEX Music Chart Final "
            "Evidence Impact Preview v1"
        ),
        "=" * 88,
        f"asOfDate: {as_of_text}",
        "",
        "Projected seed actions",
        "-" * 88,
    ]

    for action in actions:
        report_lines.append(
            f"{action['artist']} | "
            f"{action['platform']} | "
            f"{action['action']} | "
            f"{action['oldRank']} "
            f"→ {action['newRank']} | "
            f"{action['oldDate']} "
            f"→ {action['newDate']}"
        )

    report_lines.extend([
        "",
        "Projected Music / Master",
        "-" * 88,
    ])

    for row in output:
        report_lines.append(
            f"{row['projectedRank']}위 "
            f"{row['artist']} | "
            f"Music "
            f"{row['currentMusicPoint']} "
            f"→ "
            f"{row['projectedMusicPoint']} "
            f"({row['musicPointChange']:+.2f}) | "
            f"Master "
            f"{row['currentMasterPoint']} "
            f"→ "
            f"{row['projectedMasterPoint']} | "
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