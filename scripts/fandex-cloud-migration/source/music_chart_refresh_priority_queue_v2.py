from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_refresh_priority_queue_v2"

COVERAGE_FILE = Path(
    "music_chart_coverage_health_v3_latest.csv"
)

OUTPUT_CSV = Path(
    "music_chart_refresh_priority_queue_v2_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_refresh_priority_queue_v2_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_REFRESH_PRIORITY_QUEUE_V2.txt"
)


FIELDS = [
    "queueRank",
    "artist",
    "refreshPriority",
    "coverageStatus",
    "currentMusicPoint",
    "actionType",
    "recentHistoryRankedCount",
    "recentHistoryRankedPlatforms",
    "recentHistoryRankedCandidates",
    "recentHistoryPlatformCount",
    "recentHistoryPlatforms",
    "v2CoverageStatus",
    "statusReason",
]


STATUS_ORDER = {
    # 이미 최신 후보가 있으므로
    # 바로 검증/승인 가능한 작업
    "fresh_ranked_candidate_unapplied": 0,

    # 최신 후보가 없으므로
    # 추가 탐색이 필요한 작업
    "decayed_ranked": 1,

    "expired_ranked_no_recent_check": 2,
    "missing": 3,
}


PRIORITY_ORDER = {
    "HIGH": 0,
    "MEDIUM": 1,
    "LOW": 2,
}


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
    default: int = 0,
) -> int:
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


def action_type(
    status: str,
) -> str:
    if (
        status
        == "fresh_ranked_candidate_unapplied"
    ):
        return (
            "REVIEW_AND_APPLY_EXISTING_CANDIDATE"
        )

    if status == "decayed_ranked":
        return (
            "DISCOVER_FRESH_CANDIDATE"
        )

    if status in [
        "expired_ranked_no_recent_check",
        "missing",
    ]:
        return (
            "CHECK_ALL_SUPPORTED_PLATFORMS"
        )

    return "REVIEW"


def main() -> None:
    print()
    print(
        "FANDEX Music Chart "
        "Refresh Priority Queue v2"
    )
    print("=" * 84)
    print(f"version: {VERSION}")
    print(
        "source: Coverage Health v3"
    )
    print(
        "policy: actionable HIGH/MEDIUM only"
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
    print("=" * 84)

    rows = read_csv(
        COVERAGE_FILE
    )

    if len(rows) != 10:
        raise RuntimeError(
            "Expected 10 artists in "
            f"Coverage v3, got {len(rows)}."
        )

    actionable = []

    for row in rows:
        priority = norm(
            row.get(
                "refreshPriority"
            )
        ).upper()

        status = norm(
            row.get(
                "coverageStatus"
            )
        )

        if priority == "LOW":
            continue

        artist = norm(
            row.get("artist")
        )

        if not artist:
            raise RuntimeError(
                "Empty artist in Coverage v3."
            )

        actionable.append({
            "artist":
                artist,

            "refreshPriority":
                priority,

            "coverageStatus":
                status,

            "currentMusicPoint":
                norm(
                    row.get(
                        "currentMusicPoint"
                    )
                ),

            "actionType":
                action_type(
                    status
                ),

            "recentHistoryRankedCount":
                safe_int(
                    row.get(
                        "recentHistoryRankedCount"
                    )
                ),

            "recentHistoryRankedPlatforms":
                norm(
                    row.get(
                        "recentHistoryRankedPlatforms"
                    )
                ),

            "recentHistoryRankedCandidates":
                norm(
                    row.get(
                        "recentHistoryRankedCandidates"
                    )
                ),

            "recentHistoryPlatformCount":
                safe_int(
                    row.get(
                        "recentHistoryPlatformCount"
                    )
                ),

            "recentHistoryPlatforms":
                norm(
                    row.get(
                        "recentHistoryPlatforms"
                    )
                ),

            "v2CoverageStatus":
                norm(
                    row.get(
                        "v2CoverageStatus"
                    )
                ),

            "statusReason":
                norm(
                    row.get(
                        "statusReason"
                    )
                ),
        })

    actionable.sort(
        key=lambda row: (
            PRIORITY_ORDER.get(
                row[
                    "refreshPriority"
                ],
                99,
            ),
            STATUS_ORDER.get(
                row[
                    "coverageStatus"
                ],
                99,
            ),
            -safe_int(
                row[
                    "recentHistoryRankedCount"
                ]
            ),
            -safe_float(
                row[
                    "currentMusicPoint"
                ]
            ),
            row[
                "artist"
            ],
        )
    )

    output = []

    for index, row in enumerate(
        actionable,
        start=1,
    ):
        result = {
            "queueRank":
                index,
            **row,
        }

        output.append(
            result
        )

    write_csv(
        OUTPUT_CSV,
        output,
    )

    candidate_ready_count = sum(
        1
        for row in output
        if (
            row[
                "coverageStatus"
            ]
            == "fresh_ranked_candidate_unapplied"
        )
    )

    discovery_needed_count = sum(
        1
        for row in output
        if (
            row[
                "coverageStatus"
            ]
            == "decayed_ranked"
        )
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "source":
            str(
                COVERAGE_FILE
            ),

        "queueCount":
            len(output),

        "candidateReadyCount":
            candidate_ready_count,

        "discoveryNeededCount":
            discovery_needed_count,

        "queue":
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

    print()
    print(
        "Refresh queue"
    )
    print("-" * 84)

    report_lines = [
        (
            "FANDEX Music Chart "
            "Refresh Priority Queue v2"
        ),
        "=" * 84,
        "",
    ]

    for row in output:
        candidate_text = (
            row[
                "recentHistoryRankedCandidates"
            ]
            or "-"
        )

        line = (
            f"{row['queueRank']}위 "
            f"{row['artist']} | "
            f"{row['refreshPriority']} | "
            f"{row['coverageStatus']} | "
            f"Music={row['currentMusicPoint']} | "
            f"{row['actionType']} | "
            f"candidate={candidate_text}"
        )

        print(line)
        report_lines.append(
            line
        )

    report_lines.extend([
        "",
        (
            f"queueCount: "
            f"{len(output)}"
        ),
        (
            f"candidateReadyCount: "
            f"{candidate_ready_count}"
        ),
        (
            f"discoveryNeededCount: "
            f"{discovery_needed_count}"
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
    print("=" * 84)
    print(
        f"queueCount: "
        f"{len(output)}"
    )
    print(
        f"candidateReadyCount: "
        f"{candidate_ready_count}"
    )
    print(
        f"discoveryNeededCount: "
        f"{discovery_needed_count}"
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