from __future__ import annotations

import argparse
import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_apply_high_priority_candidates_v1"

CANDIDATE_FILE = Path(
    "music_chart_bugs_high_priority_candidates_v1_latest.csv"
)

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

LATEST_PREVIEW = Path(
    "music_chart_seed_v1_high_priority_preview_latest.csv"
)

LATEST_REPORT = Path(
    "MUSIC_CHART_HIGH_PRIORITY_APPLY_V1_REPORT_latest.txt"
)


APPROVED_VALUES = {
    "y",
    "yes",
    "true",
    "1",
    "approve",
    "approved",
    "승인",
}


def normalize(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip().lower()


def clean(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def safe_rank(value: Any) -> int | None:
    try:
        rank = int(
            float(
                clean(value)
            )
        )
    except Exception:
        return None

    if rank <= 0:
        return None

    return rank


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

        fieldnames = list(
            reader.fieldnames or []
        )

        rows = [
            dict(row)
            for row in reader
        ]

    return rows, fieldnames


def write_csv(
    path: Path,
    rows: list[dict[str, str]],
    fieldnames: list[str],
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
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(path)


def is_approved(
    row: dict[str, str],
) -> bool:
    return (
        normalize(
            row.get("approve")
        )
        in APPROVED_VALUES
    )


def platform_key(
    row: dict[str, Any],
) -> tuple[str, str]:
    return (
        normalize(
            row.get("artist")
        ),
        normalize(
            row.get("platform")
        ),
    )


def select_approved_candidates(
    rows: list[dict[str, str]],
) -> list[dict[str, str]]:
    approved = []

    for row in rows:
        if (
            normalize(
                row.get(
                    "refreshPriority"
                )
            )
            != "high"
        ):
            continue

        if not is_approved(row):
            continue

        rank = safe_rank(
            row.get("rank")
        )

        if rank is None:
            continue

        approved.append(row)

    grouped: dict[
        tuple[str, str],
        list[
            tuple[
                int,
                dict[str, str],
            ]
        ],
    ] = {}

    for row in approved:
        key = platform_key(row)

        grouped.setdefault(
            key,
            [],
        ).append(
            (
                safe_rank(
                    row.get("rank")
                )
                or 999999,
                row,
            )
        )

    selected = []

    for key in sorted(grouped):
        matches = grouped[key]

        matches.sort(
            key=lambda item: (
                item[0],
                normalize(
                    item[1].get(
                        "trackTitle"
                    )
                ),
            )
        )

        selected.append(
            matches[0][1]
        )

    return selected


def candidate_to_seed(
    candidate: dict[str, str],
    seed_fieldnames: list[str],
) -> dict[str, str]:
    row = {
        field: ""
        for field in seed_fieldnames
    }

    for field in [
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "chartType",
        "metricType",
        "metricValue",
    ]:
        if field in row:
            row[field] = clean(
                candidate.get(field)
            )

    source_key = clean(
        candidate.get(
            "sourceKey"
        )
    )

    source_url = clean(
        candidate.get(
            "sourceUrl"
        )
    )

    candidate_memo = clean(
        candidate.get(
            "memo"
        )
    )

    memo_parts = [
        f"approved_by={VERSION}",
        (
            "selectionPolicy="
            "best_approved_rank_per_artist_platform"
        ),
    ]

    if source_key:
        memo_parts.append(
            f"sourceKey={source_key}"
        )

    if source_url:
        memo_parts.append(
            f"source={source_url}"
        )

    if candidate_memo:
        memo_parts.append(
            candidate_memo
        )

    if "memo" in row:
        row["memo"] = "; ".join(
            memo_parts
        )

    return row


def core_equal(
    left: dict[str, Any],
    right: dict[str, Any],
) -> bool:
    fields = [
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "chartType",
        "metricType",
        "metricValue",
    ]

    for field in fields:
        if clean(
            left.get(field)
        ) != clean(
            right.get(field)
        ):
            return False

    return True


def main() -> int:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Approved HIGH candidates를 "
            "music_chart_seed_v1.csv에 반영"
        ),
    )

    args = parser.parse_args()

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    print()
    print(
        "FANDEX Music Chart "
        "HIGH Priority Approval v1"
    )
    print("=" * 72)
    print(
        "mode:",
        "APPLY"
        if args.apply
        else "DRY-RUN",
    )
    print(
        f"candidate: {CANDIDATE_FILE}"
    )
    print(
        f"seed: {SEED_FILE}"
    )
    print("=" * 72)

    try:
        (
            candidate_rows,
            candidate_fields,
        ) = read_csv(
            CANDIDATE_FILE
        )

        (
            seed_rows,
            seed_fieldnames,
        ) = read_csv(
            SEED_FILE
        )

    except Exception as exc:
        print(
            f"ERROR: {exc}"
        )
        return 1

    if "approve" not in candidate_fields:
        print(
            "ERROR: candidate CSV에 "
            "approve 컬럼이 없습니다."
        )
        return 1

    if not seed_fieldnames:
        print(
            "ERROR: seed header가 없습니다."
        )
        return 1

    approved_count = sum(
        1
        for row in candidate_rows
        if is_approved(row)
    )

    selected = (
        select_approved_candidates(
            candidate_rows
        )
    )

    print()
    print(
        f"candidateRowCount: "
        f"{len(candidate_rows)}"
    )
    print(
        f"approvedRowCount: "
        f"{approved_count}"
    )
    print(
        f"selectedCount: "
        f"{len(selected)}"
    )

    if not selected:
        print()
        print(
            "STOP: 승인된 HIGH 후보가 "
            "없습니다."
        )
        print(
            "approve 컬럼에 Y를 입력한 "
            "행만 처리합니다."
        )
        print()
        print(
            "seedModified: FALSE"
        )
        print(
            "masterModified: FALSE"
        )
        print(
            "websiteModified: FALSE"
        )
        return 1

    seed_platform_indexes: dict[
        tuple[str, str],
        list[int],
    ] = {}

    for index, row in enumerate(
        seed_rows
    ):
        key = platform_key(row)

        seed_platform_indexes.setdefault(
            key,
            [],
        ).append(index)

    for key, indexes in (
        seed_platform_indexes.items()
    ):
        if len(indexes) > 1:
            print()
            print(
                "ERROR: 기존 seed에 "
                "artist+platform 중복이 있습니다."
            )
            print(
                f"key={key}, "
                f"count={len(indexes)}"
            )
            print(
                "자동 반영을 중단합니다."
            )
            return 1

    preview_rows = [
        dict(row)
        for row in seed_rows
    ]

    add_count = 0
    replace_count = 0
    unchanged_count = 0

    actions = []

    for candidate in selected:
        converted = (
            candidate_to_seed(
                candidate,
                seed_fieldnames,
            )
        )

        key = platform_key(
            converted
        )

        existing_indexes = (
            seed_platform_indexes.get(
                key,
                [],
            )
        )

        artist = clean(
            converted.get("artist")
        )

        platform = clean(
            converted.get("platform")
        )

        track = clean(
            converted.get("trackTitle")
        )

        rank = clean(
            converted.get("rank")
        )

        if not existing_indexes:
            preview_rows.append(
                converted
            )

            new_index = (
                len(preview_rows) - 1
            )

            seed_platform_indexes[
                key
            ] = [
                new_index
            ]

            add_count += 1

            action = "ADD"

        else:
            index = (
                existing_indexes[0]
            )

            existing = (
                preview_rows[index]
            )

            if core_equal(
                existing,
                converted,
            ):
                unchanged_count += 1
                action = "UNCHANGED"

            else:
                preview_rows[
                    index
                ] = converted

                replace_count += 1
                action = "REPLACE"

        actions.append({
            "action":
                action,

            "artist":
                artist,

            "platform":
                platform,

            "trackTitle":
                track,

            "rank":
                rank,
        })

    timestamp_preview = Path(
        "music_chart_seed_v1_"
        f"high_priority_preview_{timestamp}.csv"
    )

    write_csv(
        timestamp_preview,
        preview_rows,
        seed_fieldnames,
    )

    write_csv(
        LATEST_PREVIEW,
        preview_rows,
        seed_fieldnames,
    )

    print()
    print(
        "Approved HIGH candidates"
    )
    print("-" * 72)

    for item in actions:
        print(
            f"{item['action']} | "
            f"{item['artist']} | "
            f"{item['platform']} | "
            f"rank={item['rank']} | "
            f"{item['trackTitle']}"
        )

    print()
    print(
        f"ADD: {add_count}"
    )
    print(
        f"REPLACE: {replace_count}"
    )
    print(
        f"UNCHANGED: {unchanged_count}"
    )
    print(
        f"previewRowCount: "
        f"{len(preview_rows)}"
    )

    backup_file = None

    if args.apply:
        backup_file = Path(
            "music_chart_seed_v1_"
            "backup_before_high_priority_v1_"
            f"{timestamp}.csv"
        )

        shutil.copy2(
            SEED_FILE,
            backup_file,
        )

        write_csv(
            SEED_FILE,
            preview_rows,
            seed_fieldnames,
        )

    report_lines = [
        (
            "FANDEX Music Chart "
            "HIGH Priority Approval v1"
        ),
        "=" * 72,
        (
            "mode: "
            + (
                "APPLY"
                if args.apply
                else "DRY-RUN"
            )
        ),
        (
            f"candidateRowCount: "
            f"{len(candidate_rows)}"
        ),
        (
            f"approvedRowCount: "
            f"{approved_count}"
        ),
        (
            f"selectedCount: "
            f"{len(selected)}"
        ),
        f"ADD: {add_count}",
        f"REPLACE: {replace_count}",
        (
            f"UNCHANGED: "
            f"{unchanged_count}"
        ),
        "",
    ]

    for item in actions:
        report_lines.append(
            f"{item['action']} | "
            f"{item['artist']} | "
            f"{item['platform']} | "
            f"rank={item['rank']} | "
            f"{item['trackTitle']}"
        )

    report_lines.extend([
        "",
        (
            f"preview: "
            f"{LATEST_PREVIEW}"
        ),
        (
            "seedModified: "
            + (
                "TRUE"
                if args.apply
                else "FALSE"
            )
        ),
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    if backup_file:
        report_lines.append(
            f"backup: {backup_file}"
        )

    report_text = "\n".join(
        report_lines
    )

    timestamp_report = Path(
        "MUSIC_CHART_HIGH_PRIORITY_"
        f"APPLY_V1_REPORT_{timestamp}.txt"
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print("=" * 72)

    if args.apply:
        print(
            "music_chart_seed_v1.csv "
            "APPLY 완료"
        )
        print(
            f"backup: {backup_file}"
        )
        print(
            "seedModified: TRUE"
        )

    else:
        print(
            "DRY-RUN 완료"
        )
        print(
            "seedModified: FALSE"
        )

    print(
        f"preview: {LATEST_PREVIEW}"
    )
    print(
        f"report: {LATEST_REPORT}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())