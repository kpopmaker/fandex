from __future__ import annotations

import argparse
import csv
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_apply_medium_candidates_v1"

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1_latest.csv"
)

PREVIEW_FILE = Path(
    "music_chart_seed_v1_medium_preview_latest.csv"
)

REPORT_FILE = Path(
    "MUSIC_CHART_APPLY_MEDIUM_CANDIDATES_V1_REPORT.txt"
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


def norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def read_csv(path: Path):
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


def write_csv(
    path: Path,
    rows,
    fieldnames,
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
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for row in rows:
            writer.writerow({
                field:
                    row.get(field, "")
                for field in fieldnames
            })

    temp.replace(path)


def safe_rank(value):
    try:
        rank = int(
            float(
                norm(value)
            )
        )

        if rank <= 0:
            return None

        return rank

    except Exception:
        return None


def key(row):
    return (
        norm(
            row.get("artist")
        ),
        norm(
            row.get("platform")
        ).lower(),
    )


def select_candidates(
    history_rows,
):
    selected = {}

    for row in history_rows:
        artist = norm(
            row.get("artist")
        )

        platform = norm(
            row.get("platform")
        ).lower()

        status = norm(
            row.get("status")
        ).upper()

        if artist not in TARGET_ARTISTS:
            continue

        if platform not in TARGET_PLATFORMS:
            continue

        if status != "RANKED":
            continue

        rank = safe_rank(
            row.get("bestRank")
        )

        if rank is None:
            continue

        pair = (
            artist,
            platform,
        )

        if pair in selected:
            raise RuntimeError(
                "Duplicate candidate: "
                f"{artist}/{platform}"
            )

        selected[pair] = row

    expected = {
        (
            artist,
            platform,
        )
        for artist in TARGET_ARTISTS
        for platform in TARGET_PLATFORMS
    }

    missing = sorted(
        expected
        - set(selected)
    )

    if missing:
        raise RuntimeError(
            "Missing candidates: "
            + ", ".join(
                f"{artist}/{platform}"
                for artist, platform
                in missing
            )
        )

    if len(selected) != 6:
        raise RuntimeError(
            "Expected exactly 6 candidates, "
            f"got {len(selected)}."
        )

    return selected


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
        "Medium Candidate Apply v1"
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
            "Seed fields missing."
        )

    original_row_count = len(
        seed_rows
    )

    candidates = select_candidates(
        history_rows
    )

    seed_index = {}

    for index, row in enumerate(
        seed_rows
    ):
        pair = key(row)

        if pair in seed_index:
            # 대상 6개 조합에 대해서만
            # 중복을 엄격히 막는다.
            if (
                pair[0]
                in TARGET_ARTISTS
                and pair[1]
                in TARGET_PLATFORMS
            ):
                raise RuntimeError(
                    "Duplicate seed pair: "
                    f"{pair[0]}/{pair[1]}"
                )

        seed_index[
            pair
        ] = index

    changes = []

    for pair, candidate in (
        candidates.items()
    ):
        artist, platform = pair

        if pair not in seed_index:
            raise RuntimeError(
                "Seed row missing: "
                f"{artist}/{platform}"
            )

        index = seed_index[pair]

        old = dict(
            seed_rows[index]
        )

        new = dict(old)

        old_rank = norm(
            old.get("rank")
        )

        old_date = norm(
            old.get("chartDate")
        )

        new_rank = str(
            safe_rank(
                candidate.get(
                    "bestRank"
                )
            )
        )

        new_date = norm(
            candidate.get(
                "checkDate"
            )
        )

        if not new_date:
            raise RuntimeError(
                "Candidate checkDate missing: "
                f"{artist}/{platform}"
            )

        # 기존 canonical 곡명 유지.
        old_track = norm(
            old.get(
                "trackTitle"
            )
        )

        candidate_track = norm(
            candidate.get(
                "bestTrackTitle"
            )
        )

        if not old_track:
            new[
                "trackTitle"
            ] = candidate_track

        new[
            "rank"
        ] = new_rank

        new[
            "chartDate"
        ] = new_date

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

        changed = (
            old_rank != new_rank
            or old_date != new_date
        )

        if changed:
            old_memo = norm(
                old.get("memo")
            )

            memo_parts = [
                (
                    "auto_refresh="
                    + VERSION
                ),
                (
                    "evidenceFile="
                    + norm(
                        candidate.get(
                            "evidenceFile"
                        )
                    )
                ),
                (
                    "sourceVersion="
                    + norm(
                        candidate.get(
                            "sourceVersion"
                        )
                    )
                ),
                (
                    "checkedAt="
                    + norm(
                        candidate.get(
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

        seed_rows[
            index
        ] = new

        changes.append({
            "artist":
                artist,

            "platform":
                platform,

            "trackTitle":
                norm(
                    new.get(
                        "trackTitle"
                    )
                ),

            "oldRank":
                old_rank,

            "newRank":
                new_rank,

            "oldDate":
                old_date,

            "newDate":
                new_date,

            "changed":
                changed,
        })

    if len(seed_rows) != original_row_count:
        raise RuntimeError(
            "Seed row count changed unexpectedly."
        )

    write_csv(
        PREVIEW_FILE,
        seed_rows,
        seed_fields,
    )

    print()
    print(
        "Candidate UPSERT"
    )
    print("-" * 84)

    changed_count = 0

    for row in sorted(
        changes,
        key=lambda x: (
            x["artist"],
            x["platform"],
        ),
    ):
        if row[
            "changed"
        ]:
            changed_count += 1

        status = (
            "UPDATE"
            if row[
                "changed"
            ]
            else "UNCHANGED"
        )

        print(
            f"{row['artist']} | "
            f"{row['platform']} | "
            f"{row['trackTitle']} | "
            f"{row['oldRank']} "
            f"→ {row['newRank']} | "
            f"{row['oldDate']} "
            f"→ {row['newDate']} | "
            f"{status}"
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
                "backup_before_medium_v1_"
                f"{timestamp}.csv"
            )

            shutil.copy2(
                SEED_FILE,
                backup_file,
            )

            write_csv(
                SEED_FILE,
                seed_rows,
                seed_fields,
            )

            verify_rows, _ = read_csv(
                SEED_FILE
            )

            if (
                len(verify_rows)
                != original_row_count
            ):
                raise RuntimeError(
                    "Post-apply row count "
                    "validation failed."
                )

            print()
            print(
                "APPLY OK"
            )
            print(
                f"backup: "
                f"{backup_file}"
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
            "Medium Candidate Apply v1"
        ),
        "=" * 84,
        f"mode: {mode}",
        (
            f"candidateCount: "
            f"{len(changes)}"
        ),
        (
            f"changedCount: "
            f"{changed_count}"
        ),
        "",
    ]

    for row in changes:
        report_lines.append(
            f"{row['artist']} | "
            f"{row['platform']} | "
            f"{row['oldRank']} "
            f"→ {row['newRank']} | "
            f"{row['oldDate']} "
            f"→ {row['newDate']}"
        )

    report_lines.extend([
        "",
        (
            f"seedModified: "
            f"{'TRUE' if args.apply and changed_count else 'FALSE'}"
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
        f"candidateCount: "
        f"{len(changes)}"
    )
    print(
        f"changedCount: "
        f"{changed_count}"
    )
    print(
        f"seedRowCount: "
        f"{original_row_count}"
    )
    print(
        f"preview: "
        f"{PREVIEW_FILE}"
    )
    print(
        f"report: "
        f"{REPORT_FILE}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()