from __future__ import annotations

import argparse
import csv
import shutil
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_apply_final_evidence_v1"

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

PREVIEW_FILE = Path(
    "music_chart_seed_v1_final_evidence_preview_latest.csv"
)

REPORT_FILE = Path(
    "MUSIC_CHART_APPLY_FINAL_EVIDENCE_V1_REPORT.txt"
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
                field:
                    row.get(
                        field,
                        "",
                    )
                for field in fields
            })

    temp.replace(path)


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


def latest_evidence(
    history_rows: list[
        dict[str, str]
    ],
):
    result = {}

    for artist in TARGET_ARTISTS:
        for platform in SUPPORTED_PLATFORMS:

            matches = [
                row
                for row in history_rows
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
                    "Missing history evidence: "
                    f"{artist}/{platform}"
                )

            matches.sort(
                key=lambda row: (
                    norm(
                        row.get(
                            "checkDate"
                        )
                    ),
                    norm(
                        row.get(
                            "checkedAt"
                        )
                    ),
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
            "Evidence dates are mixed: "
            f"{sorted(dates)}"
        )

    return result


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


def apply_evidence(
    seed_rows: list[
        dict[str, str]
    ],
    evidence,
):
    working = deepcopy(
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

            check_date = norm(
                ev.get(
                    "checkDate"
                )
            )

            indexes = [
                index
                for index, row
                in enumerate(
                    working
                )
                if seed_key(row)
                == (
                    artist,
                    platform,
                )
            ]

            # ------------------------------------
            # 현재 미진입
            # → 과거 ranked seed 제거
            # ------------------------------------
            if status == "NOT_RANKED":

                if not indexes:
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

                        "oldDate":
                            "",

                        "newDate":
                            check_date,

                        "trackTitle":
                            "",
                    })

                    continue

                old_rows = [
                    working[index]
                    for index in indexes
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

                        "oldDate":
                            norm(
                                old.get(
                                    "chartDate"
                                )
                            ),

                        "newDate":
                            check_date,

                        "trackTitle":
                            norm(
                                old.get(
                                    "trackTitle"
                                )
                            ),
                    })

                working = [
                    row
                    for row in working
                    if seed_key(row)
                    != (
                        artist,
                        platform,
                    )
                ]

                continue

            # ------------------------------------
            # 현재 ranked
            # ------------------------------------
            if status != "RANKED":
                raise RuntimeError(
                    "Unsupported evidence status: "
                    f"{artist}/{platform}/"
                    f"{status}"
                )

            rank = safe_int(
                ev.get(
                    "bestRank"
                )
            )

            if rank is None:
                raise RuntimeError(
                    "Invalid ranked evidence: "
                    f"{artist}/{platform}"
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

            # 기존 row 있음
            if indexes:

                if len(indexes) > 1:
                    raise RuntimeError(
                        "Duplicate seed rows: "
                        f"{artist}/{platform}"
                    )

                index = indexes[0]

                old = dict(
                    working[index]
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
                ] = str(rank)

                new[
                    "chartDate"
                ] = check_date

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

                old_memo = norm(
                    old.get(
                        "memo"
                    )
                )

                memo_parts = [
                    (
                        "auto_refresh="
                        + VERSION
                    ),
                    (
                        "evidenceFile="
                        + norm(
                            ev.get(
                                "evidenceFile"
                            )
                        )
                    ),
                    (
                        "sourceVersion="
                        + norm(
                            ev.get(
                                "sourceVersion"
                            )
                        )
                    ),
                    (
                        "checkedAt="
                        + norm(
                            ev.get(
                                "checkedAt"
                            )
                        )
                    ),
                    (
                        "previousRank="
                        + old_rank
                    ),
                    (
                        "previousDate="
                        + old_date
                    ),
                ]

                if old_memo:
                    memo_parts.append(
                        "previousMemo="
                        + old_memo
                    )

                new[
                    "memo"
                ] = "; ".join(
                    memo_parts
                )

                working[index] = new

                changed = (
                    old_rank != str(rank)
                    or old_date != check_date
                )

                actions.append({
                    "artist":
                        artist,

                    "platform":
                        platform,

                    "action":
                        (
                            "UPDATE"
                            if changed
                            else "UNCHANGED"
                        ),

                    "oldRank":
                        old_rank,

                    "newRank":
                        str(rank),

                    "oldDate":
                        old_date,

                    "newDate":
                        check_date,

                    "trackTitle":
                        norm(
                            new.get(
                                "trackTitle"
                            )
                        ),
                })

                continue

            # 기존 row 없음
            new_row = {
                "artist":
                    artist,

                "platform":
                    platform,

                "chartName":
                    chart_name,

                "trackTitle":
                    candidate_track,

                "rank":
                    str(rank),

                "chartDate":
                    check_date,

                "chartType":
                    chart_type,

                "metricType":
                    "",

                "metricValue":
                    "",

                "memo":
                    (
                        "auto_add="
                        + VERSION
                        + "; evidenceFile="
                        + norm(
                            ev.get(
                                "evidenceFile"
                            )
                        )
                        + "; sourceVersion="
                        + norm(
                            ev.get(
                                "sourceVersion"
                            )
                        )
                    ),
            }

            working.append(
                new_row
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
                    str(rank),

                "oldDate":
                    "",

                "newDate":
                    check_date,

                "trackTitle":
                    candidate_track,
            })

    return (
        working,
        actions,
    )


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--apply",
        action="store_true",
    )

    args = parser.parse_args()

    mode = (
        "APPLY"
        if args.apply
        else "DRY-RUN"
    )

    print()
    print(
        "FANDEX Music Chart "
        "Final Evidence Apply v1"
    )
    print("=" * 84)
    print(
        f"version: {VERSION}"
    )
    print(
        f"mode: {mode}"
    )
    print(
        "targets: "
        + ", ".join(
            TARGET_ARTISTS
        )
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 84)

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

    if not seed_fields:
        raise RuntimeError(
            "Seed fieldnames missing."
        )

    before_count = len(
        seed_rows
    )

    evidence = latest_evidence(
        history_rows
    )

    (
        projected_rows,
        actions,
    ) = apply_evidence(
        seed_rows,
        evidence,
    )

    after_count = len(
        projected_rows
    )

    print()
    print(
        "Evidence actions"
    )
    print("-" * 84)

    changed_count = 0

    for action in actions:

        if action[
            "action"
        ] in [
            "REMOVE",
            "UPDATE",
            "ADD",
        ]:
            changed_count += 1

        if action[
            "action"
        ] == "REMOVE":

            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"REMOVE | "
                f"rank={action['oldRank']} | "
                f"date={action['oldDate']}"
            )

        elif action[
            "action"
        ] == "UPDATE":

            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"UPDATE | "
                f"rank "
                f"{action['oldRank']} "
                f"→ "
                f"{action['newRank']} | "
                f"date "
                f"{action['oldDate']} "
                f"→ "
                f"{action['newDate']}"
            )

        elif action[
            "action"
        ] == "ADD":

            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"ADD | "
                f"rank="
                f"{action['newRank']} | "
                f"{action['trackTitle']}"
            )

        else:

            print(
                f"{action['artist']} | "
                f"{action['platform']} | "
                f"{action['action']}"
            )

    write_csv(
        PREVIEW_FILE,
        projected_rows,
        seed_fields,
    )

    backup_file = None

    if args.apply:

        if changed_count > 0:

            timestamp = (
                datetime.now()
                .strftime(
                    "%Y%m%d_%H%M%S"
                )
            )

            backup_file = Path(
                "music_chart_seed_v1_"
                "backup_before_final_evidence_v1_"
                f"{timestamp}.csv"
            )

            shutil.copy2(
                SEED_FILE,
                backup_file,
            )

            write_csv(
                SEED_FILE,
                projected_rows,
                seed_fields,
            )

            (
                verify_rows,
                _,
            ) = read_csv(
                SEED_FILE
            )

            if (
                len(verify_rows)
                != after_count
            ):
                raise RuntimeError(
                    "Post-apply row count "
                    "validation failed."
                )

            print()
            print("APPLY OK")
            print(
                f"backup: {backup_file}"
            )

        else:
            print()
            print(
                "NO CHANGES: "
                "already up to date."
            )

    else:
        print()
        print(
            "DRY-RUN ONLY"
        )
        print(
            "seedModified: FALSE"
        )

    report_lines = [
        (
            "FANDEX Music Chart "
            "Final Evidence Apply v1"
        ),
        "=" * 84,
        f"mode: {mode}",
        (
            f"seedRowCountBefore: "
            f"{before_count}"
        ),
        (
            f"seedRowCountAfter: "
            f"{after_count}"
        ),
        (
            f"changedCount: "
            f"{changed_count}"
        ),
        "",
    ]

    for action in actions:
        report_lines.append(
            f"{action['artist']} | "
            f"{action['platform']} | "
            f"{action['action']} | "
            f"{action['oldRank']} "
            f"→ "
            f"{action['newRank']} | "
            f"{action['oldDate']} "
            f"→ "
            f"{action['newDate']}"
        )

    report_lines.extend([
        "",
        (
            "seedModified: "
            + (
                "TRUE"
                if (
                    args.apply
                    and changed_count > 0
                )
                else "FALSE"
            )
        ),
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
        f"seedRowCountBefore: "
        f"{before_count}"
    )
    print(
        f"seedRowCountAfter: "
        f"{after_count}"
    )
    print(
        f"changedCount: "
        f"{changed_count}"
    )
    print(
        f"preview: {PREVIEW_FILE}"
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