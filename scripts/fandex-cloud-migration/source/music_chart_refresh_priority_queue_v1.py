from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_refresh_priority_queue_v1"

INPUT_FILE = Path(
    "music_chart_coverage_health_v2_latest.csv"
)

OUTPUT_CSV = Path(
    "music_chart_refresh_priority_queue_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_refresh_priority_queue_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_REFRESH_PRIORITY_QUEUE_V1.txt"
)


OUTPUT_FIELDS = [
    "refreshRank",
    "artist",
    "refreshPriority",
    "coverageStatus",
    "currentMusicPoint",
    "latestCheckedDate",
    "latestCheckedAgeDays",
    "latestRankedDate",
    "latestRankedAgeDays",
    "checkedPlatformCount",
    "checkedPlatforms",
    "rankedPlatformCount",
    "rankedPlatforms",
    "reason",
    "recommendedAction",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_int(value, default=9999):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except Exception:
        return default


def safe_float(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
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
        return list(
            csv.DictReader(f)
        )


def priority_score(row):
    status = norm(
        row.get("coverageStatus")
    )

    priority = norm(
        row.get("refreshPriority")
    )

    checked_age = safe_int(
        row.get(
            "latestCheckedAgeDays"
        )
    )

    ranked_age = safe_int(
        row.get(
            "latestRankedAgeDays"
        )
    )

    # 숫자가 높을수록 먼저 갱신
    score = 0

    if priority == "HIGH":
        score += 1000

    elif priority == "MEDIUM":
        score += 500

    elif priority == "LOW":
        score += 100

    if status == "missing":
        score += 400

    elif (
        status
        == "expired_ranked_no_recent_check"
    ):
        score += 350

    elif status == "checked_not_ranked_stale":
        score += 300

    elif status == "decayed_ranked":
        score += 200

    elif status == "fresh_checked_not_ranked":
        score += 50

    elif status == "fresh_ranked":
        score += 0

    if checked_age != 9999:
        score += min(
            checked_age,
            100,
        )

    elif ranked_age != 9999:
        score += min(
            ranked_age,
            100,
        )

    return score


def reason_for(row):
    status = norm(
        row.get("coverageStatus")
    )

    if status == "missing":
        return (
            "현재 Music seed 데이터가 없음"
        )

    if (
        status
        == "expired_ranked_no_recent_check"
    ):
        return (
            "과거 순위 기록은 있으나 "
            "유효기간이 만료됐고 최근 확인도 없음"
        )

    if status == "checked_not_ranked_stale":
        return (
            "미진입 확인 기록 자체가 오래됨"
        )

    if status == "decayed_ranked":
        return (
            "유효한 순위 데이터는 있으나 "
            "stale decay가 적용 중"
        )

    if status == "fresh_checked_not_ranked":
        return (
            "최근 확인 결과 미진입"
        )

    if status == "fresh_ranked":
        return (
            "최근 순위 데이터 보유"
        )

    return "상태 확인 필요"


def action_for(row):
    status = norm(
        row.get("coverageStatus")
    )

    if status == "missing":
        return (
            "Melon/Bugs/Genie에서 "
            "신규 후보 탐색"
        )

    if (
        status
        == "expired_ranked_no_recent_check"
    ):
        return (
            "기존 트랙 재검색 후 "
            "현재 진입 여부 갱신"
        )

    if status == "checked_not_ranked_stale":
        return (
            "현재 미진입 여부 재확인"
        )

    if status == "decayed_ranked":
        return (
            "기존 트랙 최신 순위 재수집"
        )

    if status == "fresh_checked_not_ranked":
        return (
            "당장 재수집 불필요"
        )

    if status == "fresh_ranked":
        return (
            "당장 재수집 불필요"
        )

    return "수동 검토"


def main():
    print()
    print(
        "FANDEX Music Chart "
        "Refresh Priority Queue v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: DIAGNOSTIC ONLY")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    rows = read_csv(
        INPUT_FILE
    )

    if len(rows) != 10:
        raise RuntimeError(
            "Expected 10 artists, "
            f"got {len(rows)}."
        )

    prepared = []

    for row in rows:
        item = dict(row)

        item["_priorityScore"] = (
            priority_score(row)
        )

        item["reason"] = (
            reason_for(row)
        )

        item["recommendedAction"] = (
            action_for(row)
        )

        prepared.append(item)

    prepared.sort(
        key=lambda row: (
            -row["_priorityScore"],
            norm(row.get("artist")),
        )
    )

    output = []

    for rank, row in enumerate(
        prepared,
        start=1,
    ):
        output.append({
            "refreshRank":
                rank,

            "artist":
                norm(
                    row.get("artist")
                ),

            "refreshPriority":
                norm(
                    row.get(
                        "refreshPriority"
                    )
                ),

            "coverageStatus":
                norm(
                    row.get(
                        "coverageStatus"
                    )
                ),

            "currentMusicPoint":
                safe_float(
                    row.get(
                        "currentMusicPoint"
                    )
                ),

            "latestCheckedDate":
                norm(
                    row.get(
                        "latestCheckedDate"
                    )
                ),

            "latestCheckedAgeDays":
                norm(
                    row.get(
                        "latestCheckedAgeDays"
                    )
                ),

            "latestRankedDate":
                norm(
                    row.get(
                        "latestRankedDate"
                    )
                ),

            "latestRankedAgeDays":
                norm(
                    row.get(
                        "latestRankedAgeDays"
                    )
                ),

            "checkedPlatformCount":
                norm(
                    row.get(
                        "checkedPlatformCount"
                    )
                ),

            "checkedPlatforms":
                norm(
                    row.get(
                        "checkedPlatforms"
                    )
                ),

            "rankedPlatformCount":
                norm(
                    row.get(
                        "rankedPlatformCount"
                    )
                ),

            "rankedPlatforms":
                norm(
                    row.get(
                        "rankedPlatforms"
                    )
                ),

            "reason":
                row["reason"],

            "recommendedAction":
                row[
                    "recommendedAction"
                ],
        })

    temp = OUTPUT_CSV.with_suffix(
        OUTPUT_CSV.suffix + ".tmp"
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
        writer.writerows(output)

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

        "artistCount":
            len(output),

        "highPriorityCount":
            sum(
                1
                for row in output
                if row[
                    "refreshPriority"
                ] == "HIGH"
            ),

        "mediumPriorityCount":
            sum(
                1
                for row in output
                if row[
                    "refreshPriority"
                ] == "MEDIUM"
            ),

        "lowPriorityCount":
            sum(
                1
                for row in output
                if row[
                    "refreshPriority"
                ] == "LOW"
            ),

        "queue":
            output,

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
        "FANDEX Music Chart Refresh Priority Queue v1",
        "=" * 72,
        "",
    ]

    print()
    print("Refresh queue")
    print("-" * 72)

    for row in output:
        line = (
            f"{row['refreshRank']} | "
            f"{row['artist']} | "
            f"{row['refreshPriority']} | "
            f"{row['coverageStatus']} | "
            f"{row['recommendedAction']}"
        )

        print(line)
        lines.append(line)

    lines.append("")
    lines.append(
        "masterModified: FALSE"
    )
    lines.append(
        "websiteModified: FALSE"
    )

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print(
        f"highPriorityCount: "
        f"{payload['highPriorityCount']}"
    )
    print(
        f"mediumPriorityCount: "
        f"{payload['mediumPriorityCount']}"
    )
    print(
        f"lowPriorityCount: "
        f"{payload['lowPriorityCount']}"
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
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()