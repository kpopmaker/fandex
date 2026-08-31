from __future__ import annotations

import csv
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import music_chart_collect_bugs_v1 as bugs


VERSION = "music_chart_check_bugs_refresh_queue_v1"

QUEUE_FILE = Path(
    "music_chart_refresh_priority_queue_v2_latest.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

OUTPUT_CSV = Path(
    "music_chart_bugs_refresh_queue_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_bugs_refresh_queue_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_BUGS_REFRESH_QUEUE_V1_REPORT.txt"
)

BUGS_URL = "https://music.bugs.co.kr/chart"


ALIASES = {
    "아이유": [
        "아이유",
        "IU",
    ],
    "에스파": [
        "에스파",
        "aespa",
    ],
    "에이티즈": [
        "에이티즈",
        "ATEEZ",
    ],
    "보이넥스트도어": [
        "보이넥스트도어",
        "BOYNEXTDOOR",
    ],
    "아이브": [
        "아이브",
        "IVE",
    ],
    "르세라핌": [
        "르세라핌",
        "LE SSERAFIM",
    ],
    "뉴진스": [
        "뉴진스",
        "NewJeans",
    ],
    "세븐틴": [
        "세븐틴",
        "SEVENTEEN",
    ],
    "스트레이키즈": [
        "스트레이키즈",
        "Stray Kids",
    ],
    "투모로우바이투게더": [
        "투모로우바이투게더",
        "TOMORROW X TOGETHER",
    ],
}


HISTORY_FIELDS = [
    "checkDate",
    "checkedAt",
    "artist",
    "platform",
    "status",
    "candidateCount",
    "bestRank",
    "bestTrackTitle",
    "sourceKeys",
    "evidenceFile",
    "sourceVersion",
]


OUTPUT_FIELDS = [
    "refreshRank",
    "artist",
    "refreshPriority",
    "coverageStatus",
    "status",
    "candidateCount",
    "bestRank",
    "bestTrackTitle",
    "matchedArtist",
    "checkDate",
    "checkedAt",
]


def norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalized_name(value: Any) -> str:
    text = unicodedata.normalize(
        "NFKC",
        norm(value),
    ).lower()

    return re.sub(
        r"[^0-9a-z가-힣]+",
        "",
        text,
    )


def safe_int(
    value: Any,
    default: int = 999999,
) -> int:
    try:
        result = int(
            float(
                norm(value)
            )
        )

        if result <= 0:
            return default

        return result

    except Exception:
        return default


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(
            csv.DictReader(file)
        )


def write_csv(
    path: Path,
    rows: list[dict[str, Any]],
    fields: list[str],
) -> None:
    temp = path.with_suffix(
        path.suffix + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fields,
        )

        writer.writeheader()

        for row in rows:
            writer.writerow({
                field: row.get(
                    field,
                    "",
                )
                for field in fields
            })

    temp.replace(path)


def artist_matches(
    target_artist: str,
    chart_artist: str,
) -> bool:
    chart_norm = normalized_name(
        chart_artist
    )

    if not chart_norm:
        return False

    aliases = ALIASES.get(
        target_artist,
        [target_artist],
    )

    for alias in aliases:
        alias_norm = normalized_name(
            alias
        )

        if not alias_norm:
            continue

        if chart_norm == alias_norm:
            return True

        # 아이유/에이티즈처럼
        # Bugs가 영문+한글을 함께 쓰는 경우 포함.
        if (
            len(alias_norm) >= 3
            and alias_norm in chart_norm
        ):
            return True

    return False


def find_candidates(
    artist: str,
    chart_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    matches = []

    for row in chart_rows:
        chart_artist = norm(
            row.get("artist")
        )

        if not artist_matches(
            artist,
            chart_artist,
        ):
            continue

        rank = safe_int(
            row.get("rank")
        )

        if rank == 999999:
            continue

        matches.append({
            "rank": rank,
            "trackTitle": norm(
                row.get(
                    "trackTitle"
                )
            ),
            "artist": chart_artist,
        })

    matches.sort(
        key=lambda row: (
            row["rank"],
            row["trackTitle"],
        )
    )

    return matches


def history_key(
    row: dict[str, Any],
):
    return (
        norm(
            row.get(
                "checkDate"
            )
        ),
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


def main() -> None:
    print()
    print(
        "FANDEX Bugs Refresh Queue Check v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "mode: CHECK + HISTORY ONLY"
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
    print("=" * 80)

    queue_rows = read_csv(
        QUEUE_FILE
    )

    if not queue_rows:
        raise RuntimeError(
            "Refresh queue is empty."
        )

    targets = []

    for row in queue_rows:
        priority = norm(
            row.get(
                "refreshPriority"
            )
        ).upper()

        if priority not in [
            "HIGH",
            "MEDIUM",
        ]:
            continue

        artist = norm(
            row.get("artist")
        )

        if not artist:
            continue

        targets.append(row)

    if not targets:
        raise RuntimeError(
            "No actionable queue targets."
        )

    print()
    print(
        f"queueTargetCount: "
        f"{len(targets)}"
    )

    for row in targets:
        print(
            f"- {row.get('queueRank')} "
            f"{row.get('artist')} "
            f"| {row.get('refreshPriority')}"
        )

    print()
    print(
        f"Fetch Bugs chart: "
        f"{BUGS_URL}"
    )

    page = bugs.fetch_bugs_chart()

    chart_rows = bugs.parse_bugs_chart(
        page
    )

    if not chart_rows:
        raise RuntimeError(
            "Bugs chart parse returned 0 rows."
        )

    print(
        f"parsed Bugs rows: "
        f"{len(chart_rows)}"
    )

    now = datetime.now()

    check_date = (
        now.date().isoformat()
    )

    checked_at = (
        now.isoformat(
            timespec="seconds"
        )
    )

    output = []
    new_history = []

    print()
    print(
        "Queue artist Bugs results"
    )
    print("-" * 80)

    for queue_row in targets:
        artist = norm(
            queue_row.get(
                "artist"
            )
        )

        matches = find_candidates(
            artist,
            chart_rows,
        )

        best = (
            matches[0]
            if matches
            else None
        )

        if best:
            status = "RANKED"
            best_rank = best[
                "rank"
            ]
            best_track = best[
                "trackTitle"
            ]
            matched_artist = best[
                "artist"
            ]

        else:
            status = "NOT_RANKED"
            best_rank = ""
            best_track = ""
            matched_artist = ""

        result = {
            "refreshRank":
                norm(
                    queue_row.get(
                        "queueRank"
                    )
                ),

            "artist":
                artist,

            "refreshPriority":
                norm(
                    queue_row.get(
                        "refreshPriority"
                    )
                ),

            "coverageStatus":
                norm(
                    queue_row.get(
                        "coverageStatus"
                    )
                ),

            "status":
                status,

            "candidateCount":
                len(matches),

            "bestRank":
                best_rank,

            "bestTrackTitle":
                best_track,

            "matchedArtist":
                matched_artist,

            "checkDate":
                check_date,

            "checkedAt":
                checked_at,
        }

        output.append(
            result
        )

        new_history.append({
            "checkDate":
                check_date,

            "checkedAt":
                checked_at,

            "artist":
                artist,

            "platform":
                "bugs",

            "status":
                status,

            "candidateCount":
                len(matches),

            "bestRank":
                best_rank,

            "bestTrackTitle":
                best_track,

            "sourceKeys":
                "bugs_realtime",

            "evidenceFile":
                str(
                    OUTPUT_JSON
                ),

            "sourceVersion":
                VERSION,
        })

        if best:
            print(
                f"{artist} | "
                f"RANKED | "
                f"candidates={len(matches)} | "
                f"best={best_rank}위 "
                f"{best_track} | "
                f"{matched_artist}"
            )

            if len(matches) > 1:
                for candidate in matches:
                    print(
                        "  - "
                        f"{candidate['rank']}위 "
                        f"{candidate['trackTitle']} "
                        f"| {candidate['artist']}"
                    )

        else:
            print(
                f"{artist} | "
                "NOT_RANKED | "
                "candidates=0"
            )

    write_csv(
        OUTPUT_CSV,
        output,
        OUTPUT_FIELDS,
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            checked_at,

        "checkDate":
            check_date,

        "parsedChartRowCount":
            len(chart_rows),

        "targetCount":
            len(targets),

        "rankedCount":
            sum(
                1
                for row in output
                if row[
                    "status"
                ] == "RANKED"
            ),

        "notRankedCount":
            sum(
                1
                for row in output
                if row[
                    "status"
                ] == "NOT_RANKED"
            ),

        "artists":
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

    # ---------------------------------------------------------
    # Check history idempotent UPSERT
    # key = checkDate + artist + platform
    # ---------------------------------------------------------

    existing_history = (
        read_csv(
            HISTORY_FILE
        )
        if HISTORY_FILE.exists()
        else []
    )

    merged = {}

    for row in existing_history:
        key = history_key(row)

        if all(key):
            merged[key] = {
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in HISTORY_FIELDS
            }

    for row in new_history:
        merged[
            history_key(row)
        ] = row

    merged_rows = list(
        merged.values()
    )

    merged_rows.sort(
        key=lambda row: (
            norm(
                row.get(
                    "checkDate"
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
            norm(
                row.get(
                    "platform"
                )
            ),
        )
    )

    write_csv(
        HISTORY_FILE,
        merged_rows,
        HISTORY_FIELDS,
    )

    report_lines = [
        (
            "FANDEX Bugs Refresh "
            "Queue Check v1"
        ),
        "=" * 80,
        f"checkDate: {check_date}",
        (
            f"parsedChartRowCount: "
            f"{len(chart_rows)}"
        ),
        "",
    ]

    for row in output:
        report_lines.append(
            f"{row['artist']} | "
            f"{row['status']} | "
            f"candidates="
            f"{row['candidateCount']} | "
            f"rank="
            f"{row['bestRank']} | "
            f"{row['bestTrackTitle']}"
        )

    report_lines.extend([
        "",
        (
            f"historyRowCount: "
            f"{len(merged_rows)}"
        ),
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
    print("=" * 80)
    print(
        f"historyRowCount: "
        f"{len(merged_rows)}"
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