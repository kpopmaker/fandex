from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_check_history_v1"

DISCOVERY_JSON = Path(
    "music_chart_artist_candidates_v2_raw_latest.json"
)

BUGS_JSON = Path(
    "music_chart_bugs_high_priority_candidates_v1_latest.json"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

LATEST_CSV = Path(
    "music_chart_check_history_v1_latest.csv"
)

LATEST_JSON = Path(
    "music_chart_check_history_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_CHECK_HISTORY_V1_REPORT.txt"
)


FIELDS = [
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


def norm(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


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


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        payload = json.load(file)

    if not isinstance(payload, dict):
        raise RuntimeError(
            f"Invalid JSON object: {path}"
        )

    return payload


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    if not path.exists():
        return []

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
            fieldnames=FIELDS,
        )

        writer.writeheader()

        for row in rows:
            writer.writerow({
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in FIELDS
            })

    temp.replace(path)


def parse_created_at(
    value: Any,
) -> tuple[str, str]:
    text = norm(value)

    if not text:
        now = datetime.now()

        return (
            now.date().isoformat(),
            now.isoformat(
                timespec="seconds"
            ),
        )

    try:
        parsed = datetime.fromisoformat(
            text.replace(
                "Z",
                "+00:00",
            )
        )

        return (
            parsed.date().isoformat(),
            text,
        )

    except Exception:
        # createdAt이 이상하면
        # 파일을 오늘 확인한 것으로
        # 조용히 가정하지 않고 중단한다.
        raise RuntimeError(
            f"Invalid createdAt: {text}"
        )


def candidate_rank(
    row: dict[str, Any],
) -> int:
    return safe_int(
        row.get("rank")
    )


def best_candidate(
    rows: list[dict[str, Any]],
) -> dict[str, Any] | None:
    valid = [
        row
        for row in rows
        if candidate_rank(row)
        != 999999
    ]

    if not valid:
        return None

    valid.sort(
        key=lambda row: (
            candidate_rank(row),
            norm(
                row.get(
                    "trackTitle"
                )
            ),
        )
    )

    return valid[0]


def get_discovery_artists(
    payload: dict[str, Any],
) -> list[str]:
    # discover v2는 TARGET_ARTISTS 전체를 검사하지만
    # raw JSON에는 후보가 없는 아티스트 이름이
    # 직접 들어있지 않을 수 있으므로,
    # 현재 FANDEX 고정 10명을 사용한다.
    #
    # 프로젝트 내 Master 대상 10명과 동일한 목록.
    return [
        "아이유",
        "에스파",
        "에이티즈",
        "보이넥스트도어",
        "아이브",
        "르세라핌",
        "뉴진스",
        "세븐틴",
        "스트레이키즈",
        "투모로우바이투게더",
    ]


def melon_genie_rows(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    created_at = payload.get(
        "createdAt"
    )

    (
        check_date,
        checked_at,
    ) = parse_created_at(
        created_at
    )

    source_counts = payload.get(
        "sourceCounts"
    )

    if not isinstance(
        source_counts,
        dict,
    ):
        raise RuntimeError(
            "Discovery JSON sourceCounts missing."
        )

    candidates = payload.get(
        "candidates"
    )

    if not isinstance(
        candidates,
        list,
    ):
        candidates = []

    artists = get_discovery_artists(
        payload
    )

    melon_count = safe_int(
        source_counts.get(
            "melon_top100"
        ),
        default=0,
    )

    genie_source_keys = [
        "genie_daily_page_1",
        "genie_daily_page_2",
        "genie_daily_page_3",
        "genie_daily_page_4",
    ]

    genie_counts = [
        safe_int(
            source_counts.get(key),
            default=0,
        )
        for key in genie_source_keys
    ]

    platform_checks = []

    if melon_count > 0:
        platform_checks.append({
            "platform":
                "melon",

            "sourceKeys":
                "melon_top100",
        })

    # Genie는 4페이지 모두 파싱됐을 때만
    # "Top 200 확인 완료"로 인정한다.
    if (
        len(genie_counts) == 4
        and all(
            value > 0
            for value in genie_counts
        )
    ):
        platform_checks.append({
            "platform":
                "genie",

            "sourceKeys":
                "|".join(
                    genie_source_keys
                ),
        })

    if not platform_checks:
        raise RuntimeError(
            "No successful Melon/Genie "
            "platform checks found."
        )

    output = []

    for platform_info in platform_checks:
        platform = platform_info[
            "platform"
        ]

        for artist in artists:
            matches = [
                row
                for row in candidates
                if (
                    norm(
                        row.get("artist")
                    )
                    == artist
                    and norm(
                        row.get("platform")
                    ).lower()
                    == platform
                )
            ]

            best = best_candidate(
                matches
            )

            if best is None:
                status = "NOT_RANKED"
                best_rank = ""
                best_track = ""

            else:
                status = "RANKED"
                best_rank = candidate_rank(
                    best
                )
                best_track = norm(
                    best.get(
                        "trackTitle"
                    )
                )

            output.append({
                "checkDate":
                    check_date,

                "checkedAt":
                    checked_at,

                "artist":
                    artist,

                "platform":
                    platform,

                "status":
                    status,

                "candidateCount":
                    len(matches),

                "bestRank":
                    best_rank,

                "bestTrackTitle":
                    best_track,

                "sourceKeys":
                    platform_info[
                        "sourceKeys"
                    ],

                "evidenceFile":
                    str(
                        DISCOVERY_JSON
                    ),

                "sourceVersion":
                    "music_chart_discover_artist_candidates_v2",
            })

    return output


def bugs_rows(
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    (
        check_date,
        checked_at,
    ) = parse_created_at(
        payload.get(
            "createdAt"
        )
    )

    parsed_count = safe_int(
        payload.get(
            "parsedChartRowCount"
        ),
        default=0,
    )

    if parsed_count <= 0:
        raise RuntimeError(
            "Bugs chart was not parsed successfully."
        )

    artist_results = payload.get(
        "artists"
    )

    if not isinstance(
        artist_results,
        list,
    ):
        raise RuntimeError(
            "Bugs discovery artists result missing."
        )

    candidates = payload.get(
        "candidates"
    )

    if not isinstance(
        candidates,
        list,
    ):
        candidates = []

    output = []

    # 중요:
    # Bugs discovery는 당시 HIGH 대상만
    # 실제로 검사했으므로 artists 배열에
    # 있는 아티스트만 history로 기록한다.
    for artist_result in artist_results:
        if not isinstance(
            artist_result,
            dict,
        ):
            continue

        artist = norm(
            artist_result.get(
                "artist"
            )
        )

        if not artist:
            continue

        matches = [
            row
            for row in candidates
            if norm(
                row.get("artist")
            ) == artist
        ]

        best = best_candidate(
            matches
        )

        if best is None:
            status = "NOT_RANKED"
            best_rank = ""
            best_track = ""

        else:
            status = "RANKED"
            best_rank = candidate_rank(
                best
            )
            best_track = norm(
                best.get(
                    "trackTitle"
                )
            )

        output.append({
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
                    BUGS_JSON
                ),

            "sourceVersion":
                "music_chart_discover_bugs_high_priority_v1",
        })

    return output


def history_key(
    row: dict[str, Any],
) -> tuple[str, str, str]:
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
        "FANDEX Music Chart "
        "Check History v1"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "purpose: ranked + not-ranked "
        "check evidence history"
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
    print("=" * 76)

    discovery = read_json(
        DISCOVERY_JSON
    )

    bugs = read_json(
        BUGS_JSON
    )

    new_rows = []

    new_rows.extend(
        melon_genie_rows(
            discovery
        )
    )

    new_rows.extend(
        bugs_rows(
            bugs
        )
    )

    if not new_rows:
        raise RuntimeError(
            "No check-history rows generated."
        )

    existing_rows = read_csv(
        HISTORY_FILE
    )

    merged = {}

    # 기존 history 보존
    for row in existing_rows:
        key = history_key(row)

        if all(key):
            merged[key] = {
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in FIELDS
            }

    # 같은 날짜+artist+platform이면
    # 최신 evidence로 idempotent replacement.
    for row in new_rows:
        key = history_key(row)

        if not all(key):
            raise RuntimeError(
                f"Invalid history key: {row}"
            )

        merged[key] = row

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
    )

    latest_date = max(
        norm(
            row.get(
                "checkDate"
            )
        )
        for row in merged_rows
    )

    latest_rows = [
        row
        for row in merged_rows
        if norm(
            row.get(
                "checkDate"
            )
        )
        == latest_date
    ]

    write_csv(
        LATEST_CSV,
        latest_rows,
    )

    ranked_count = sum(
        1
        for row in latest_rows
        if norm(
            row.get("status")
        ) == "RANKED"
    )

    not_ranked_count = sum(
        1
        for row in latest_rows
        if norm(
            row.get("status")
        ) == "NOT_RANKED"
    )

    checked_artists = sorted({
        norm(
            row.get("artist")
        )
        for row in latest_rows
    })

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "latestCheckDate":
            latest_date,

        "historyRowCount":
            len(
                merged_rows
            ),

        "latestRowCount":
            len(
                latest_rows
            ),

        "latestArtistCount":
            len(
                checked_artists
            ),

        "rankedCount":
            ranked_count,

        "notRankedCount":
            not_ranked_count,

        "rows":
            latest_rows,

        "seedModified":
            False,

        "masterModified":
            False,

        "websiteModified":
            False,
    }

    LATEST_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        f"latestCheckDate: "
        f"{latest_date}"
    )
    print(
        f"historyRowCount: "
        f"{len(merged_rows)}"
    )
    print(
        f"latestRowCount: "
        f"{len(latest_rows)}"
    )
    print(
        f"latestArtistCount: "
        f"{len(checked_artists)}"
    )

    print()
    print(
        "Latest check evidence"
    )
    print("-" * 76)

    report_lines = [
        (
            "FANDEX Music Chart "
            "Check History v1"
        ),
        "=" * 76,
        (
            f"latestCheckDate: "
            f"{latest_date}"
        ),
        "",
    ]

    for row in latest_rows:
        rank_text = (
            f"rank={row['bestRank']} "
            f"{row['bestTrackTitle']}"
            if row[
                "status"
            ] == "RANKED"
            else "not ranked"
        )

        line = (
            f"{row['artist']} | "
            f"{row['platform']} | "
            f"{row['status']} | "
            f"{rank_text}"
        )

        print(line)
        report_lines.append(
            line
        )

    report_lines.extend([
        "",
        (
            f"rankedCount: "
            f"{ranked_count}"
        ),
        (
            f"notRankedCount: "
            f"{not_ranked_count}"
        ),
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
    print("=" * 76)
    print(
        f"rankedCount: "
        f"{ranked_count}"
    )
    print(
        f"notRankedCount: "
        f"{not_ranked_count}"
    )
    print(
        f"history: {HISTORY_FILE}"
    )
    print(
        f"latest: {LATEST_CSV}"
    )
    print(
        f"json: {LATEST_JSON}"
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