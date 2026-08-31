from __future__ import annotations

import argparse
import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_apply_approved_candidates_v2"

CANDIDATE_FILE = Path(
    "music_chart_artist_candidates_v2_latest.csv"
)
SEED_FILE = Path("music_chart_seed_v1.csv")

TARGET_ARTISTS = [
    "뉴진스",
    "르세라핌",
    "아이브",
]

TARGET_PLATFORMS = [
    "melon",
    "genie",
]


def read_csv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    if not path.exists():
        raise FileNotFoundError(f"파일이 없습니다: {path}")

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    return rows, fieldnames


def write_csv(
    path: Path,
    rows: list[dict[str, Any]],
    fieldnames: list[str],
) -> None:
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


def normalize(value: Any) -> str:
    return str(value or "").strip().casefold()


def safe_rank(value: Any) -> int | None:
    try:
        rank = int(str(value or "").strip())
    except (TypeError, ValueError):
        return None

    if rank <= 0:
        return None

    return rank


def select_best_candidates(
    candidate_rows: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[str]]:
    selected: list[dict[str, str]] = []
    missing: list[str] = []

    for artist in TARGET_ARTISTS:
        for platform in TARGET_PLATFORMS:
            matches = []

            for row in candidate_rows:
                if normalize(row.get("artist")) != normalize(artist):
                    continue

                if normalize(row.get("platform")) != normalize(platform):
                    continue

                rank = safe_rank(row.get("rank"))

                if rank is None:
                    continue

                matches.append((rank, row))

            if not matches:
                missing.append(f"{artist} / {platform}")
                continue

            matches.sort(
                key=lambda item: (
                    item[0],
                    normalize(item[1].get("trackTitle")),
                )
            )

            selected.append(matches[0][1])

    return selected, missing


def seed_key(row: dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        normalize(row.get("artist")),
        normalize(row.get("platform")),
        normalize(row.get("chartName")),
        normalize(row.get("trackTitle")),
    )


def convert_candidate_to_seed(
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
        "memo",
    ]:
        if field in row:
            row[field] = str(candidate.get(field) or "").strip()

    source_key = str(candidate.get("sourceKey") or "").strip()
    source_url = str(candidate.get("sourceUrl") or "").strip()
    previous_memo = str(row.get("memo") or "").strip()

    memo_parts = [
        f"approved_by={VERSION}",
        "selectionPolicy=best_rank_per_artist_platform",
    ]

    if source_key:
        memo_parts.append(f"sourceKey={source_key}")

    if source_url:
        memo_parts.append(f"source={source_url}")

    if previous_memo:
        memo_parts.append(previous_memo)

    if "memo" in row:
        row["memo"] = "; ".join(memo_parts)

    return row


def build_report(
    selected: list[dict[str, str]],
    missing: list[str],
    duplicates: list[dict[str, str]],
    rows_to_add: list[dict[str, str]],
    apply_mode: bool,
    preview_file: Path,
    backup_file: Path | None,
) -> str:
    lines = [
        "Music chart 승인 후보 seed 반영 v2",
        "=" * 76,
        f"version: {VERSION}",
        f"createdAt: {datetime.now().isoformat(timespec='seconds')}",
        f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}",
        "",
        "선택 정책",
        "-" * 76,
        "신규 아티스트별·플랫폼별 최고 순위 1곡만 선택",
        "",
        "선택된 후보",
        "-" * 76,
    ]

    if selected:
        for row in selected:
            lines.append(
                f"{row.get('artist')} | "
                f"{row.get('platform')} | "
                f"{row.get('chartName')} | "
                f"{row.get('rank')}위 | "
                f"{row.get('trackTitle')}"
            )
    else:
        lines.append("선택된 후보가 없습니다.")

    lines.extend(
        [
            "",
            "검증 결과",
            "-" * 76,
            f"selectedCount: {len(selected)}",
            f"rowsToAdd: {len(rows_to_add)}",
            f"duplicateSkipCount: {len(duplicates)}",
            f"missingCount: {len(missing)}",
        ]
    )

    if missing:
        lines.append("")
        lines.append("누락 조합")
        lines.append("-" * 76)
        lines.extend(missing)

    if duplicates:
        lines.append("")
        lines.append("중복으로 건너뛴 후보")
        lines.append("-" * 76)

        for row in duplicates:
            lines.append(
                f"{row.get('artist')} | "
                f"{row.get('platform')} | "
                f"{row.get('trackTitle')}"
            )

    lines.extend(
        [
            "",
            "출력",
            "-" * 76,
            f"previewFile: {preview_file}",
        ]
    )

    if backup_file is not None:
        lines.append(f"backupFile: {backup_file}")

    if apply_mode:
        lines.append("seedModified: TRUE")
        lines.append("websiteModified: FALSE")
    else:
        lines.append("seedModified: FALSE")
        lines.append("websiteModified: FALSE")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="검증된 후보를 실제 seed에 반영합니다.",
    )
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart 승인 후보 seed 반영 v2")
    print("=" * 76)
    print(
        "실행 모드:",
        "APPLY" if args.apply else "DRY-RUN",
    )
    print()

    try:
        candidate_rows, _ = read_csv(CANDIDATE_FILE)
        seed_rows, seed_fieldnames = read_csv(SEED_FILE)
    except Exception as exc:
        print("입력 파일을 읽지 못했습니다.")
        print(f"원인: {exc}")
        return 1

    if not seed_fieldnames:
        print("seed CSV 헤더를 확인할 수 없습니다.")
        return 1

    selected, missing = select_best_candidates(candidate_rows)

    print("선택된 후보")
    print("-" * 76)

    for row in selected:
        print(
            f"{row.get('artist')} / "
            f"{row.get('platform')} / "
            f"{row.get('rank')}위 / "
            f"{row.get('trackTitle')}"
        )

    if missing:
        print()
        print("필수 조합 누락")
        print("-" * 76)

        for item in missing:
            print(item)

        print()
        print("누락 조합이 있어 반영을 중단합니다.")
        return 1

    existing_keys = {
        seed_key(row)
        for row in seed_rows
    }

    duplicates: list[dict[str, str]] = []
    rows_to_add: list[dict[str, str]] = []

    for candidate in selected:
        converted = convert_candidate_to_seed(
            candidate,
            seed_fieldnames,
        )

        key = seed_key(converted)

        if key in existing_keys:
            duplicates.append(candidate)
            continue

        existing_keys.add(key)
        rows_to_add.append(converted)

    preview_rows = seed_rows + rows_to_add

    preview_file = Path(
        f"music_chart_seed_v1_approved_preview_{timestamp}.csv"
    )
    latest_preview_file = Path(
        "music_chart_seed_v1_approved_preview_latest.csv"
    )

    write_csv(
        preview_file,
        preview_rows,
        seed_fieldnames,
    )
    write_csv(
        latest_preview_file,
        preview_rows,
        seed_fieldnames,
    )

    backup_file: Path | None = None

    if args.apply:
        backup_file = Path(
            f"music_chart_seed_v1_backup_before_approved_v2_"
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

    report_text = build_report(
        selected=selected,
        missing=missing,
        duplicates=duplicates,
        rows_to_add=rows_to_add,
        apply_mode=args.apply,
        preview_file=latest_preview_file,
        backup_file=backup_file,
    )

    timestamp_report = Path(
        f"MUSIC_CHART_APPROVED_CANDIDATES_V2_REPORT_"
        f"{timestamp}.txt"
    )
    latest_report = Path(
        "MUSIC_CHART_APPROVED_CANDIDATES_V2_REPORT_latest.txt"
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )
    latest_report.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print("검증 결과")
    print("-" * 76)
    print(f"선택 후보: {len(selected)}")
    print(f"추가 예정: {len(rows_to_add)}")
    print(f"중복 건너뜀: {len(duplicates)}")
    print(f"누락: {len(missing)}")
    print(f"미리보기: {latest_preview_file}")

    if args.apply:
        print()
        print("music_chart_seed_v1.csv 반영 완료")
        print(f"백업 파일: {backup_file}")
    else:
        print()
        print("DRY-RUN 완료")
        print("원본 seed는 아직 수정하지 않았습니다.")
        print()
        print("실제 반영:")
        print(
            "py music_chart_apply_approved_candidates_v2.py --apply"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())