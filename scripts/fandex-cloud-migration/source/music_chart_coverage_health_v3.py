from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_coverage_health_v3"

V2_FILE = Path(
    "music_chart_coverage_health_v2_latest.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

OUTPUT_CSV = Path(
    "music_chart_coverage_health_v3_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_coverage_health_v3_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_COVERAGE_HEALTH_V3.txt"
)


SUPPORTED_PLATFORMS = [
    "melon",
    "genie",
    "bugs",
]

RECENT_DAYS = 3


OUTPUT_FIELDS = [
    "artist",
    "currentMusicPoint",

    "seedEntryCount",
    "rankedEntryCount",
    "nonEntryCount",

    "checkedPlatformCount",
    "checkedPlatforms",
    "rankedPlatformCount",
    "rankedPlatforms",

    "latestCheckedDate",
    "latestCheckedAgeDays",
    "latestRankedDate",
    "latestRankedAgeDays",

    "freshestRankedDecayFactor",

    "freshRankedEntryCount",
    "decayedRankedEntryCount",
    "expiredRankedEntryCount",

    "recentNonEntryCount",

    "v2CoverageStatus",
    "v2RefreshPriority",

    "recentHistoryPlatformCount",
    "recentHistoryPlatforms",

    "recentHistoryRankedCount",
    "recentHistoryRankedPlatforms",
    "recentHistoryRankedCandidates",

    "recentHistoryNotRankedCount",
    "recentHistoryNotRankedPlatforms",

    "allSupportedPlatformsRecentlyChecked",
    "allSupportedPlatformsNotRanked",

    "coverageStatus",
    "refreshPriority",
    "statusReason",
]


def norm(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def safe_int(
    value: Any,
    default: int | None = None,
) -> int | None:
    try:
        if value in [None, ""]:
            return default

        return int(
            float(
                str(value).strip()
            )
        )

    except Exception:
        return default


def parse_date(
    value: Any,
):
    try:
        return date.fromisoformat(
            norm(value)
        )
    except Exception:
        return None


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
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()

        for row in rows:
            writer.writerow({
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in OUTPUT_FIELDS
            })

    temp.replace(path)


def history_age_days(
    row: dict[str, str],
    today: date,
) -> int | None:
    check_date = parse_date(
        row.get("checkDate")
    )

    if check_date is None:
        return None

    return max(
        0,
        (
            today
            - check_date
        ).days,
    )


def latest_platform_history(
    history_rows: list[dict[str, str]],
    artist: str,
) -> dict[str, dict[str, str]]:
    matches = [
        row
        for row in history_rows
        if norm(
            row.get("artist")
        ) == artist
    ]

    latest = {}

    for row in matches:
        platform = norm(
            row.get("platform")
        ).lower()

        if platform not in SUPPORTED_PLATFORMS:
            continue

        row_date = parse_date(
            row.get("checkDate")
        )

        if row_date is None:
            continue

        existing = latest.get(
            platform
        )

        if existing is None:
            latest[platform] = row
            continue

        existing_date = parse_date(
            existing.get("checkDate")
        )

        if (
            existing_date is None
            or row_date > existing_date
        ):
            latest[platform] = row

    return latest


def candidate_label(
    row: dict[str, str],
) -> str:
    platform = norm(
        row.get("platform")
    )

    rank = norm(
        row.get("bestRank")
    )

    track = norm(
        row.get("bestTrackTitle")
    )

    if not rank:
        rank = "?"

    if track:
        return (
            f"{platform}:"
            f"{rank}:"
            f"{track}"
        )

    return (
        f"{platform}:"
        f"{rank}"
    )


def classify(
    base: dict[str, str],
    latest_history: dict[
        str,
        dict[str, str],
    ],
    today: date,
):
    v2_status = norm(
        base.get(
            "coverageStatus"
        )
    )

    v2_priority = norm(
        base.get(
            "refreshPriority"
        )
    )

    recent_history = {}

    for platform, row in (
        latest_history.items()
    ):
        age = history_age_days(
            row,
            today,
        )

        if (
            age is not None
            and age <= RECENT_DAYS
        ):
            recent_history[
                platform
            ] = row

    recent_ranked = {
        platform:
            row
        for platform, row
        in recent_history.items()
        if norm(
            row.get("status")
        ).upper()
        == "RANKED"
    }

    recent_not_ranked = {
        platform:
            row
        for platform, row
        in recent_history.items()
        if norm(
            row.get("status")
        ).upper()
        == "NOT_RANKED"
    }

    all_checked = all(
        platform
        in recent_history
        for platform
        in SUPPORTED_PLATFORMS
    )

    all_not_ranked = (
        all_checked
        and all(
            norm(
                recent_history[
                    platform
                ].get("status")
            ).upper()
            == "NOT_RANKED"
            for platform
            in SUPPORTED_PLATFORMS
        )
    )

    # 1.
    # seed 자체에 이미 최신 ranked가 있다면
    # 가장 강한 최신 근거.
    if v2_status == "fresh_ranked":
        return (
            "fresh_ranked",
            "LOW",
            (
                "seed에 최근 순위 데이터가 "
                "이미 반영되어 있음"
            ),
            recent_history,
            recent_ranked,
            recent_not_ranked,
            all_checked,
            all_not_ranked,
        )

    # 2.
    # discovery에서는 최신 순위가 발견됐지만
    # 아직 seed에 승인/반영되지 않은 상태.
    if recent_ranked:
        return (
            "fresh_ranked_candidate_unapplied",
            "MEDIUM",
            (
                "최근 차트 탐색에서 순위 후보를 "
                "발견했지만 seed 최신화가 필요함"
            ),
            recent_history,
            recent_ranked,
            recent_not_ranked,
            all_checked,
            all_not_ranked,
        )

    # 3.
    # 지원 중인 3개 플랫폼을 모두 최근 확인했고
    # 전부 미진입이라면 이것은 유효한 0점 근거.
    if all_not_ranked:
        return (
            "fresh_checked_not_ranked",
            "LOW",
            (
                "Melon/Genie/Bugs를 최근 모두 "
                "확인했으며 전부 미진입"
            ),
            recent_history,
            recent_ranked,
            recent_not_ranked,
            all_checked,
            all_not_ranked,
        )

    # 4.
    # 근거가 부분적이면 기존 v2 판단을 유지.
    return (
        v2_status,
        v2_priority,
        (
            "최근 check history가 부분적이므로 "
            "기존 v2 판정 유지"
        ),
        recent_history,
        recent_ranked,
        recent_not_ranked,
        all_checked,
        all_not_ranked,
    )


def main() -> None:
    print()
    print(
        "FANDEX Music Chart "
        "Coverage Health v3"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "policy: seed freshness + "
        "check-history evidence"
    )
    print(
        "supportedPlatforms: "
        + ",".join(
            SUPPORTED_PLATFORMS
        )
    )
    print(
        f"recentDays: {RECENT_DAYS}"
    )
    print(
        "mode: DIAGNOSTIC ONLY"
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

    today = date.today()

    v2_rows = read_csv(
        V2_FILE
    )

    history_rows = read_csv(
        HISTORY_FILE
    )

    if len(v2_rows) != 10:
        raise RuntimeError(
            "Expected 10 artists in "
            f"Coverage v2, got {len(v2_rows)}."
        )

    output = []

    print()
    print(
        "Artist coverage"
    )
    print("-" * 80)

    for base in v2_rows:
        artist = norm(
            base.get("artist")
        )

        if not artist:
            raise RuntimeError(
                "Coverage v2 row has "
                "empty artist."
            )

        latest_history = (
            latest_platform_history(
                history_rows,
                artist,
            )
        )

        (
            coverage_status,
            refresh_priority,
            reason,
            recent_history,
            recent_ranked,
            recent_not_ranked,
            all_checked,
            all_not_ranked,
        ) = classify(
            base,
            latest_history,
            today,
        )

        recent_platforms = sorted(
            recent_history.keys()
        )

        ranked_platforms = sorted(
            recent_ranked.keys()
        )

        not_ranked_platforms = sorted(
            recent_not_ranked.keys()
        )

        ranked_candidates = [
            candidate_label(
                recent_ranked[
                    platform
                ]
            )
            for platform
            in ranked_platforms
        ]

        result = {
            "artist":
                artist,

            "currentMusicPoint":
                norm(
                    base.get(
                        "currentMusicPoint"
                    )
                ),

            "seedEntryCount":
                norm(
                    base.get(
                        "seedEntryCount"
                    )
                ),

            "rankedEntryCount":
                norm(
                    base.get(
                        "rankedEntryCount"
                    )
                ),

            "nonEntryCount":
                norm(
                    base.get(
                        "nonEntryCount"
                    )
                ),

            "checkedPlatformCount":
                norm(
                    base.get(
                        "checkedPlatformCount"
                    )
                ),

            "checkedPlatforms":
                norm(
                    base.get(
                        "checkedPlatforms"
                    )
                ),

            "rankedPlatformCount":
                norm(
                    base.get(
                        "rankedPlatformCount"
                    )
                ),

            "rankedPlatforms":
                norm(
                    base.get(
                        "rankedPlatforms"
                    )
                ),

            "latestCheckedDate":
                norm(
                    base.get(
                        "latestCheckedDate"
                    )
                ),

            "latestCheckedAgeDays":
                norm(
                    base.get(
                        "latestCheckedAgeDays"
                    )
                ),

            "latestRankedDate":
                norm(
                    base.get(
                        "latestRankedDate"
                    )
                ),

            "latestRankedAgeDays":
                norm(
                    base.get(
                        "latestRankedAgeDays"
                    )
                ),

            "freshestRankedDecayFactor":
                norm(
                    base.get(
                        "freshestRankedDecayFactor"
                    )
                ),

            "freshRankedEntryCount":
                norm(
                    base.get(
                        "freshRankedEntryCount"
                    )
                ),

            "decayedRankedEntryCount":
                norm(
                    base.get(
                        "decayedRankedEntryCount"
                    )
                ),

            "expiredRankedEntryCount":
                norm(
                    base.get(
                        "expiredRankedEntryCount"
                    )
                ),

            "recentNonEntryCount":
                norm(
                    base.get(
                        "recentNonEntryCount"
                    )
                ),

            "v2CoverageStatus":
                norm(
                    base.get(
                        "coverageStatus"
                    )
                ),

            "v2RefreshPriority":
                norm(
                    base.get(
                        "refreshPriority"
                    )
                ),

            "recentHistoryPlatformCount":
                len(
                    recent_platforms
                ),

            "recentHistoryPlatforms":
                "|".join(
                    recent_platforms
                ),

            "recentHistoryRankedCount":
                len(
                    recent_ranked
                ),

            "recentHistoryRankedPlatforms":
                "|".join(
                    ranked_platforms
                ),

            "recentHistoryRankedCandidates":
                "|".join(
                    ranked_candidates
                ),

            "recentHistoryNotRankedCount":
                len(
                    recent_not_ranked
                ),

            "recentHistoryNotRankedPlatforms":
                "|".join(
                    not_ranked_platforms
                ),

            "allSupportedPlatformsRecentlyChecked":
                (
                    "TRUE"
                    if all_checked
                    else "FALSE"
                ),

            "allSupportedPlatformsNotRanked":
                (
                    "TRUE"
                    if all_not_ranked
                    else "FALSE"
                ),

            "coverageStatus":
                coverage_status,

            "refreshPriority":
                refresh_priority,

            "statusReason":
                reason,
        }

        output.append(
            result
        )

        print(
            f"{artist} | "
            f"Music="
            f"{result['currentMusicPoint']} | "
            f"v2="
            f"{result['v2CoverageStatus']} | "
            f"history="
            f"{result['recentHistoryPlatformCount']}/3 | "
            f"ranked="
            f"{result['recentHistoryRankedCount']} | "
            f"status="
            f"{coverage_status} | "
            f"priority="
            f"{refresh_priority}"
        )

    status_counts = Counter(
        row[
            "coverageStatus"
        ]
        for row in output
    )

    priority_counts = Counter(
        row[
            "refreshPriority"
        ]
        for row in output
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
            today.isoformat(),

        "artistCount":
            len(output),

        "supportedPlatforms":
            SUPPORTED_PLATFORMS,

        "recentDays":
            RECENT_DAYS,

        "historyRowCount":
            len(
                history_rows
            ),

        "statusCounts":
            dict(
                status_counts
            ),

        "priorityCounts":
            dict(
                priority_counts
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

    report_lines = [
        (
            "FANDEX Music Chart "
            "Coverage Health v3"
        ),
        "=" * 80,
        (
            f"asOfDate: "
            f"{today.isoformat()}"
        ),
        (
            "supportedPlatforms: "
            + ",".join(
                SUPPORTED_PLATFORMS
            )
        ),
        (
            f"recentDays: "
            f"{RECENT_DAYS}"
        ),
        "",
    ]

    for row in output:
        report_lines.append(
            f"{row['artist']} | "
            f"Music="
            f"{row['currentMusicPoint']} | "
            f"v2="
            f"{row['v2CoverageStatus']} | "
            f"history="
            f"{row['recentHistoryPlatformCount']}/3 | "
            f"ranked="
            f"{row['recentHistoryRankedCount']} | "
            f"status="
            f"{row['coverageStatus']} | "
            f"priority="
            f"{row['refreshPriority']}"
        )

    report_lines.extend([
        "",
        (
            "statusCounts: "
            f"{dict(status_counts)}"
        ),
        (
            "priorityCounts: "
            f"{dict(priority_counts)}"
        ),
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
    print("=" * 80)
    print(
        f"historyRowCount: "
        f"{len(history_rows)}"
    )
    print(
        f"statusCounts: "
        f"{dict(status_counts)}"
    )
    print(
        f"priorityCounts: "
        f"{dict(priority_counts)}"
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