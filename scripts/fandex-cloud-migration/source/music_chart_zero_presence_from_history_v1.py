from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_zero_presence_from_history_v1"

MUSIC_RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

MUSIC_REPORT_FILE = Path(
    "fandex_music_chart_artist_reports_v1_latest.json"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_ZERO_PRESENCE_FROM_HISTORY_V1_REPORT.txt"
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

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

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
    ) as file:
        return json.load(file)


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


def write_json_atomic(
    path: Path,
    payload: Any,
) -> None:
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


def ranking_rows(
    payload: Any,
) -> list[dict[str, Any]]:
    if (
        isinstance(payload, dict)
        and isinstance(
            payload.get("ranking"),
            list,
        )
    ):
        return [
            row
            for row
            in payload["ranking"]
            if isinstance(
                row,
                dict,
            )
        ]

    raise RuntimeError(
        "ranking array not found."
    )


def report_rows(
    payload: Any,
) -> list[dict[str, Any]]:
    if (
        isinstance(payload, dict)
        and isinstance(
            payload.get("reports"),
            list,
        )
    ):
        return [
            row
            for row
            in payload["reports"]
            if isinstance(
                row,
                dict,
            )
        ]

    raise RuntimeError(
        "reports array not found."
    )


def artist_name(
    row: dict[str, Any],
) -> str:
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


def music_point(
    row: dict[str, Any],
) -> float:
    for key in [
        "fandexMusicChartFinalPoint",
        "musicChartFinalPoint",
        "musicChartPoint",
        "musicPoint",
        "musicScore",
        "score",
    ]:
        if key in row:
            return safe_float(
                row.get(key)
            )

    return 0.0


def latest_history_by_platform(
    history_rows: list[
        dict[str, str]
    ],
    artist: str,
):
    result = {}

    for platform in SUPPORTED_PLATFORMS:

        matches = [
            row
            for row
            in history_rows
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

        if not matches:
            continue

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
            platform
        ] = matches[0]

    return result


def zero_evidence(
    history_rows: list[
        dict[str, str]
    ],
    artist: str,
    today: date,
):
    latest = (
        latest_history_by_platform(
            history_rows,
            artist,
        )
    )

    if any(
        platform not in latest
        for platform
        in SUPPORTED_PLATFORMS
    ):
        return None

    for platform in SUPPORTED_PLATFORMS:

        row = latest[
            platform
        ]

        check_date = parse_date(
            row.get(
                "checkDate"
            )
        )

        if check_date is None:
            return None

        age = (
            today
            - check_date
        ).days

        if (
            age < 0
            or age > RECENT_DAYS
        ):
            return None

        status = norm(
            row.get(
                "status"
            )
        ).upper()

        if status != "NOT_RANKED":
            return None

    dates = sorted({
        norm(
            row.get(
                "checkDate"
            )
        )
        for row in latest.values()
    })

    return {
        "artist":
            artist,

        "platforms":
            list(
                SUPPORTED_PLATFORMS
            ),

        "checkDates":
            dates,

        "latest":
            latest,
    }


def make_zero_item(
    artist: str,
    evidence: dict[str, Any],
):
    return {
        "artist":
            artist,

        "fandexMusicChartFinalPoint":
            0.0,

        "score":
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

            "zeroEvidence":
                True,

            "supportedPlatforms":
                SUPPORTED_PLATFORMS,

            "checkDates":
                evidence[
                    "checkDates"
                ],

            "evidenceFile":
                str(
                    HISTORY_FILE
                ),
        },
    }


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
        "Zero Presence from History v1"
    )
    print("=" * 84)
    print(
        f"version: {VERSION}"
    )
    print(
        f"mode: {mode}"
    )
    print(
        "rule: recent Melon+Genie+Bugs "
        "all NOT_RANKED => explicit Music 0"
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

    today = date.today()

    music_payload = read_json(
        MUSIC_RANKING_FILE
    )

    report_payload = read_json(
        MUSIC_REPORT_FILE
    )

    master_payload = read_json(
        MASTER_FILE
    )

    history_rows = read_csv(
        HISTORY_FILE
    )

    ranking = ranking_rows(
        music_payload
    )

    reports = report_rows(
        report_payload
    )

    master = ranking_rows(
        master_payload
    )

    target_artists = [
        artist_name(row)
        for row in master
        if artist_name(row)
    ]

    if len(
        target_artists
    ) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
            f"got {len(target_artists)}."
        )

    music_map = {
        artist_name(row):
            row
        for row in ranking
        if artist_name(row)
    }

    report_map = {
        artist_name(row):
            row
        for row in reports
        if artist_name(row)
    }

    evidence_artists = []

    for artist in target_artists:

        evidence = zero_evidence(
            history_rows,
            artist,
            today,
        )

        if evidence is not None:
            evidence_artists.append(
                (
                    artist,
                    evidence,
                )
            )

    print()
    print(
        "Explicit-zero evidence"
    )
    print("-" * 84)

    for artist, evidence in (
        evidence_artists
    ):
        print(
            f"{artist} | "
            f"Melon/Genie/Bugs "
            f"NOT_RANKED | "
            f"dates="
            f"{','.join(evidence['checkDates'])}"
        )

    added = []
    existing_zero = []

    for artist, evidence in (
        evidence_artists
    ):

        existing = music_map.get(
            artist
        )

        if existing is not None:

            point = music_point(
                existing
            )

            if point > 0:
                raise RuntimeError(
                    "Contradiction: "
                    f"{artist} has "
                    f"NOT_RANKED evidence "
                    f"but Music point={point}."
                )

            existing_zero.append(
                artist
            )

            continue

        zero_item = make_zero_item(
            artist,
            evidence,
        )

        ranking.append(
            zero_item
        )

        music_map[
            artist
        ] = zero_item

        added.append(
            artist
        )

        if artist not in report_map:
            reports.append(
                dict(
                    zero_item
                )
            )

    # 기존 ranking 순서는 보존하고
    # 새 explicit-zero만 뒤에 추가.
    for index, row in enumerate(
        ranking,
        start=1,
    ):
        row[
            "rank"
        ] = index

    report_rank_map = {
        artist_name(row):
            row.get("rank")
        for row in ranking
    }

    for row in reports:
        artist = artist_name(
            row
        )

        if artist in report_rank_map:
            row[
                "rank"
            ] = report_rank_map[
                artist
            ]

    music_payload[
        "ranking"
    ] = ranking

    music_payload[
        "zeroPresenceVersion"
    ] = VERSION

    music_payload[
        "zeroPresenceAppliedAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    music_payload[
        "explicitZeroArtists"
    ] = [
        artist
        for artist, _
        in evidence_artists
    ]

    music_payload[
        "artistCount"
    ] = len(
        ranking
    )

    report_payload[
        "reports"
    ] = reports

    report_payload[
        "zeroPresenceVersion"
    ] = VERSION

    report_payload[
        "zeroPresenceAppliedAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    report_payload[
        "explicitZeroArtists"
    ] = [
        artist
        for artist, _
        in evidence_artists
    ]

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

    for artist in added:
        print(
            f"{artist} | "
            "ADD_EXPLICIT_ZERO"
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
            "backup_before_zero_presence_"
            f"{timestamp}.json"
        )

        report_backup = Path(
            "fandex_music_chart_artist_reports_v1_latest_"
            "backup_before_zero_presence_"
            f"{timestamp}.json"
        )

        shutil.copy2(
            MUSIC_RANKING_FILE,
            ranking_backup,
        )

        shutil.copy2(
            MUSIC_REPORT_FILE,
            report_backup,
        )

        write_json_atomic(
            MUSIC_RANKING_FILE,
            music_payload,
        )

        write_json_atomic(
            MUSIC_REPORT_FILE,
            report_payload,
        )

        verify = read_json(
            MUSIC_RANKING_FILE
        )

        verify_rows = ranking_rows(
            verify
        )

        verify_map = {
            artist_name(row):
                music_point(row)
            for row in verify_rows
        }

        for artist, _ in (
            evidence_artists
        ):
            if artist not in verify_map:
                raise RuntimeError(
                    "Post-apply missing "
                    f"zero artist: {artist}"
                )

            if (
                abs(
                    verify_map[
                        artist
                    ]
                )
                > 1e-9
            ):
                raise RuntimeError(
                    "Post-apply zero "
                    f"validation failed: "
                    f"{artist}="
                    f"{verify_map[artist]}"
                )

        print()
        print("APPLY OK")
        print(
            f"rankingBackup: "
            f"{ranking_backup}"
        )
        print(
            f"reportBackup: "
            f"{report_backup}"
        )

    else:
        print()
        print(
            "DRY-RUN ONLY"
        )

    report_lines = [
        (
            "FANDEX Music Chart "
            "Zero Presence from History v1"
        ),
        "=" * 84,
        f"mode: {mode}",
        (
            f"evidenceZeroCount: "
            f"{len(evidence_artists)}"
        ),
        (
            f"existingZeroCount: "
            f"{len(existing_zero)}"
        ),
        (
            f"addedZeroCount: "
            f"{len(added)}"
        ),
        (
            f"projectedMusicArtistCount: "
            f"{len(ranking)}"
        ),
        "",
    ]

    for artist in existing_zero:
        report_lines.append(
            f"{artist} | "
            "ALREADY_ZERO_PRESENT"
        )

    for artist in added:
        report_lines.append(
            f"{artist} | "
            "ADD_EXPLICIT_ZERO"
        )

    report_lines.extend([
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
        f"evidenceZeroCount: "
        f"{len(evidence_artists)}"
    )
    print(
        f"existingZeroCount: "
        f"{len(existing_zero)}"
    )
    print(
        f"addedZeroCount: "
        f"{len(added)}"
    )
    print(
        f"projectedMusicArtistCount: "
        f"{len(ranking)}"
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