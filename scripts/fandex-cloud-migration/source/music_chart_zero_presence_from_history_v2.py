from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_zero_presence_from_history_v2"

RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

REPORTS_FILE = Path(
    "fandex_music_chart_artist_reports_v1_latest.json"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_ZERO_PRESENCE_FROM_HISTORY_V2_REPORT.txt"
)

SUPPORTED_PLATFORMS = [
    "melon",
    "genie",
    "bugs",
]

RECENT_DAYS = 3


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
        return float(value)
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
    ) as f:
        return json.load(f)


def write_json(
    path: Path,
    payload: Any,
):
    temp = path.with_suffix(
        path.suffix + ".tmp"
    )

    temp.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    temp.replace(path)


def read_csv(
    path: Path,
):
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


def ranking_rows(
    payload: Any,
):
    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            "Ranking payload must be dict."
        )

    rows = payload.get(
        "ranking"
    )

    if not isinstance(
        rows,
        list,
    ):
        raise RuntimeError(
            "ranking array not found."
        )

    return rows


def report_dict(
    payload: Any,
):
    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            "Report payload must be dict."
        )

    reports = payload.get(
        "reports"
    )

    if not isinstance(
        reports,
        dict,
    ):
        raise RuntimeError(
            "reports dict not found."
        )

    return reports


def latest_evidence(
    history_rows,
    artist,
    platform,
):
    matches = [
        row
        for row in history_rows
        if (
            norm(
                row.get("artist")
            ) == artist
            and norm(
                row.get("platform")
            ).lower() == platform
        )
    ]

    if not matches:
        return None

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

    return matches[0]


def has_recent_zero_evidence(
    history_rows,
    artist,
    as_of_date,
):
    evidence = {}

    for platform in SUPPORTED_PLATFORMS:

        row = latest_evidence(
            history_rows,
            artist,
            platform,
        )

        if row is None:
            return None

        check_date = parse_date(
            row.get(
                "checkDate"
            )
        )

        if check_date is None:
            return None

        age = (
            as_of_date
            - check_date
        ).days

        if age < 0:
            return None

        if age > RECENT_DAYS:
            return None

        status = norm(
            row.get(
                "status"
            )
        ).upper()

        if status != "NOT_RANKED":
            return None

        evidence[
            platform
        ] = row

    return evidence


def make_zero_ranking_row(
    artist,
    rank,
    evidence,
):
    dates = sorted({
        norm(
            row.get(
                "checkDate"
            )
        )
        for row in evidence.values()
    })

    return {
        "artist":
            artist,

        "fandexMusicChartFinalPoint":
            0.0,

        "coreSignal":
            "checked_not_ranked",

        "entryCount":
            0,

        "platformPoints":
            {},

        "chartTypePoints":
            {},

        "trackPoints":
            {},

        "bestEntry":
            {},

        "entries":
            [],

        "meta": {
            "scoreVersion":
                VERSION,

            "scoreMode":
                "explicit_zero_checked_not_ranked",

            "note":
                (
                    "Recent Melon, Genie, "
                    "and Bugs checks all "
                    "returned NOT_RANKED."
                ),

            "zeroEvidence":
                True,

            "checkDates":
                dates,

            "evidenceFile":
                str(
                    HISTORY_FILE
                ),
        },

        "rank":
            rank,

        "score":
            0.0,

        "originalFandexMusicChartFinalPoint":
            0.0,

        "currentFandexMusicChartFinalPointBeforeV2":
            0.0,

        "deltaFromOriginalMusicPoint":
            0.0,

        "deltaFromCurrentMusicPoint":
            0.0,
    }


def make_zero_report(
    artist,
    rank,
    evidence,
):
    row = make_zero_ranking_row(
        artist,
        rank,
        evidence,
    )

    row.pop(
        "score",
        None,
    )

    return row


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
        "Zero Presence from History v2"
    )
    print("=" * 84)
    print(
        f"version: {VERSION}"
    )
    print(
        f"mode: {mode}"
    )
    print(
        "rule: recent "
        "Melon+Genie+Bugs "
        "all NOT_RANKED "
        "=> explicit Music 0"
    )
    print(
        f"recentDays: {RECENT_DAYS}"
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

    ranking_payload = read_json(
        RANKING_FILE
    )

    reports_payload = read_json(
        REPORTS_FILE
    )

    master_payload = read_json(
        MASTER_FILE
    )

    history_rows = read_csv(
        HISTORY_FILE
    )

    ranking = ranking_rows(
        ranking_payload
    )

    reports = report_dict(
        reports_payload
    )

    master_rows = ranking_rows(
        master_payload
    )

    master_artists = [
        artist_name(row)
        for row in master_rows
        if artist_name(row)
    ]

    if len(master_artists) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(master_artists)}."
        )

    history_dates = [
        parse_date(
            row.get(
                "checkDate"
            )
        )
        for row in history_rows
    ]

    history_dates = [
        value
        for value in history_dates
        if value is not None
    ]

    if not history_dates:
        raise RuntimeError(
            "No valid history dates."
        )

    as_of_date = max(
        history_dates
    )

    ranking_map = {
        artist_name(row):
            row
        for row in ranking
        if artist_name(row)
    }

    zero_evidence = {}

    for artist in master_artists:

        evidence = (
            has_recent_zero_evidence(
                history_rows,
                artist,
                as_of_date,
            )
        )

        if evidence is not None:
            zero_evidence[
                artist
            ] = evidence

    print()
    print(
        f"asOfDate: {as_of_date}"
    )

    print()
    print(
        "Explicit-zero evidence"
    )
    print("-" * 84)

    for artist in master_artists:

        if artist not in zero_evidence:
            continue

        print(
            f"{artist} | "
            "melon=NOT_RANKED | "
            "genie=NOT_RANKED | "
            "bugs=NOT_RANKED"
        )

    existing_zero = []
    added_zero = []

    for artist in master_artists:

        if artist not in zero_evidence:
            continue

        existing = ranking_map.get(
            artist
        )

        if existing is not None:

            point = safe_float(
                existing.get(
                    "fandexMusicChartFinalPoint"
                )
            )

            if point > 0:
                raise RuntimeError(
                    "Contradiction: "
                    f"{artist} has "
                    "zero evidence but "
                    f"Music={point}"
                )

            existing_zero.append(
                artist
            )

            continue

        new_rank = len(
            ranking
        ) + 1

        new_row = (
            make_zero_ranking_row(
                artist,
                new_rank,
                zero_evidence[
                    artist
                ],
            )
        )

        ranking.append(
            new_row
        )

        ranking_map[
            artist
        ] = new_row

        reports[
            artist
        ] = make_zero_report(
            artist,
            new_rank,
            zero_evidence[
                artist
            ],
        )

        added_zero.append(
            artist
        )

    print()
    print()
    print(
        "Zero presence actions"
    )
    print("-" * 84)

    for artist in existing_zero:
        print(
            f"{artist} | "
            "ALREADY_ZERO_PRESENT"
        )

    for artist in added_zero:
        print(
            f"{artist} | "
            "ADD_EXPLICIT_ZERO"
        )

    projected_count = len(
        ranking
    )

    if projected_count != 10:
        raise RuntimeError(
            "Projected Music artist "
            f"count must be 10, got "
            f"{projected_count}."
        )

    ranking_payload[
        "ranking"
    ] = ranking

    ranking_payload[
        "zeroPresenceVersion"
    ] = VERSION

    ranking_payload[
        "zeroPresenceAsOfDate"
    ] = str(
        as_of_date
    )

    ranking_payload[
        "explicitZeroArtists"
    ] = list(
        zero_evidence.keys()
    )

    reports_payload[
        "reports"
    ] = reports

    reports_payload[
        "zeroPresenceVersion"
    ] = VERSION

    reports_payload[
        "zeroPresenceAsOfDate"
    ] = str(
        as_of_date
    )

    reports_payload[
        "explicitZeroArtists"
    ] = list(
        zero_evidence.keys()
    )

    if args.apply:

        timestamp = (
            datetime.now()
            .strftime(
                "%Y%m%d_%H%M%S"
            )
        )

        ranking_backup = Path(
            "fandex_music_chart_ranking_v1_latest_"
            "backup_before_zero_presence_v2_"
            f"{timestamp}.json"
        )

        reports_backup = Path(
            "fandex_music_chart_artist_reports_v1_latest_"
            "backup_before_zero_presence_v2_"
            f"{timestamp}.json"
        )

        shutil.copy2(
            RANKING_FILE,
            ranking_backup,
        )

        shutil.copy2(
            REPORTS_FILE,
            reports_backup,
        )

        write_json(
            RANKING_FILE,
            ranking_payload,
        )

        write_json(
            REPORTS_FILE,
            reports_payload,
        )

        verify_ranking = ranking_rows(
            read_json(
                RANKING_FILE
            )
        )

        verify_reports = report_dict(
            read_json(
                REPORTS_FILE
            )
        )

        verify_map = {
            artist_name(row):
                safe_float(
                    row.get(
                        "fandexMusicChartFinalPoint"
                    )
                )
            for row in verify_ranking
        }

        if len(
            verify_ranking
        ) != 10:
            raise RuntimeError(
                "Post-apply ranking "
                "count validation failed."
            )

        if len(
            verify_reports
        ) != 10:
            raise RuntimeError(
                "Post-apply reports "
                "count validation failed."
            )

        for artist in zero_evidence:

            if artist not in verify_map:
                raise RuntimeError(
                    "Missing explicit zero: "
                    f"{artist}"
                )

            if abs(
                verify_map[
                    artist
                ]
            ) > 1e-9:
                raise RuntimeError(
                    "Zero validation failed: "
                    f"{artist}"
                )

        print()
        print(
            "APPLY OK"
        )

        print(
            f"rankingBackup: "
            f"{ranking_backup}"
        )

        print(
            f"reportsBackup: "
            f"{reports_backup}"
        )

    else:
        print()
        print(
            "DRY-RUN ONLY"
        )

    lines = [
        (
            "FANDEX Music Chart "
            "Zero Presence from History v2"
        ),
        "=" * 84,
        f"mode: {mode}",
        f"asOfDate: {as_of_date}",
        (
            "evidenceZeroCount: "
            f"{len(zero_evidence)}"
        ),
        (
            "existingZeroCount: "
            f"{len(existing_zero)}"
        ),
        (
            "addedZeroCount: "
            f"{len(added_zero)}"
        ),
        (
            "projectedMusicArtistCount: "
            f"{projected_count}"
        ),
        "",
    ]

    for artist in existing_zero:
        lines.append(
            f"{artist} | "
            "ALREADY_ZERO_PRESENT"
        )

    for artist in added_zero:
        lines.append(
            f"{artist} | "
            "ADD_EXPLICIT_ZERO"
        )

    lines.extend([
        "",
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 84)
    print(
        f"evidenceZeroCount: "
        f"{len(zero_evidence)}"
    )
    print(
        f"existingZeroCount: "
        f"{len(existing_zero)}"
    )
    print(
        f"addedZeroCount: "
        f"{len(added_zero)}"
    )
    print(
        f"projectedMusicArtistCount: "
        f"{projected_count}"
    )
    print(
        f"projectedReportArtistCount: "
        f"{len(reports)}"
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