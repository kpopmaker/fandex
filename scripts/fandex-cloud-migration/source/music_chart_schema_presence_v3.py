from __future__ import annotations

import argparse
import copy
import json
import shutil
from datetime import datetime
from pathlib import Path

import music_chart_zero_presence_from_history_v2 as legacy


VERSION = "music_chart_schema_presence_v3"

RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

REPORTS_FILE = Path(
    "fandex_music_chart_artist_reports_v1_latest.json"
)

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_SCHEMA_PRESENCE_V3_REPORT.txt"
)


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_float(
    value,
    default=0.0,
):
    try:
        return float(
            value or 0
        )
    except Exception:
        return default


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        return json.load(file)


def write_json(
    path,
    payload,
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


def artist_name(row):
    return norm(
        row.get("artist")
        or row.get("artistName")
        or row.get("name")
    )


def make_schema_evidence(
    artist,
):
    now = datetime.now().isoformat(
        timespec="seconds"
    )

    return {
        platform: {
            "checkDate": "",
            "checkedAt": now,
            "artist": artist,
            "platform": platform,
            "status": "SCHEMA_MISSING",
            "sourceVersion": VERSION,
        }
        for platform in [
            "melon",
            "genie",
            "bugs",
        ]
    }


def convert_meta(
    row,
):
    meta = row.get("meta")

    if not isinstance(
        meta,
        dict,
    ):
        meta = {}

    meta = copy.deepcopy(
        meta
    )

    meta.pop(
        "zeroEvidence",
        None,
    )

    meta.pop(
        "checkDates",
        None,
    )

    meta.pop(
        "evidenceFile",
        None,
    )

    meta["scoreVersion"] = VERSION
    meta[
        "scoreMode"
    ] = (
        "schema_presence_missing_artist_zero"
    )

    meta[
        "note"
    ] = (
        "Artist was absent from the "
        "Music v1 ranking, so an explicit "
        "zero row was added only to preserve "
        "the 10-artist schema. "
        "No current-chart NOT_RANKED "
        "inference was used."
    )

    meta[
        "schemaPresence"
    ] = True

    row["meta"] = meta

    return row


def make_zero_row(
    artist,
    rank,
):
    row = legacy.make_zero_ranking_row(
        artist,
        rank,
        make_schema_evidence(
            artist
        ),
    )

    row = convert_meta(
        row
    )

    row[
        "coreSignal"
    ] = "schema_missing_zero"

    return row


def make_zero_report(
    artist,
    rank,
):
    report = legacy.make_zero_report(
        artist,
        rank,
        make_schema_evidence(
            artist
        ),
    )

    if isinstance(
        report,
        dict,
    ):
        report = convert_meta(
            report
        )

        report[
            "coreSignal"
        ] = "schema_missing_zero"

    return report


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
        "Schema Presence v3"
    )
    print("=" * 84)
    print(
        f"version: {VERSION}"
    )
    print(
        f"mode: {mode}"
    )
    print(
        "rule: preserve every existing "
        "Music v1 score; add explicit zero "
        "only for Master artists missing "
        "from Music ranking"
    )
    print(
        "usesCheckHistory: FALSE"
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


    ranking = ranking_payload.get(
        "ranking"
    )

    if not isinstance(
        ranking,
        list,
    ):
        raise RuntimeError(
            "Music ranking array missing."
        )


    reports = reports_payload.get(
        "reports"
    )

    if not isinstance(
        reports,
        dict,
    ):
        raise RuntimeError(
            "Music reports dict missing."
        )


    master_rows = master_payload.get(
        "ranking"
    )

    if not isinstance(
        master_rows,
        list,
    ):
        raise RuntimeError(
            "Master ranking array missing."
        )


    master_artists = [
        artist_name(row)
        for row in master_rows
        if artist_name(row)
    ]


    if (
        len(master_artists) != 10
        or len(
            set(master_artists)
        ) != 10
    ):
        raise RuntimeError(
            "Expected exactly 10 unique "
            "Master artists."
        )


    ranking_map = {
        artist_name(row):
            row
        for row in ranking
        if artist_name(row)
    }


    unexpected = [
        artist
        for artist in ranking_map
        if artist
        not in master_artists
    ]

    if unexpected:
        raise RuntimeError(
            "Unexpected Music artists: "
            + ", ".join(
                unexpected
            )
        )


    preserved = []
    added = []


    for artist in master_artists:

        if artist in ranking_map:
            preserved.append(
                artist
            )
            continue


        new_rank = (
            len(ranking) + 1
        )

        row = make_zero_row(
            artist,
            new_rank,
        )

        ranking.append(
            row
        )

        ranking_map[
            artist
        ] = row

        reports[
            artist
        ] = make_zero_report(
            artist,
            new_rank,
        )

        added.append(
            artist
        )


    if len(ranking) != 10:
        raise RuntimeError(
            "Projected Music ranking "
            f"must contain 10 rows, got "
            f"{len(ranking)}."
        )


    if len({
        artist_name(row)
        for row in ranking
    }) != 10:
        raise RuntimeError(
            "Projected Music ranking "
            "artists are not unique."
        )


    for index, row in enumerate(
        ranking,
        start=1,
    ):
        row["rank"] = index


    zero_artists = [
        artist_name(row)
        for row in ranking
        if safe_float(
            row.get(
                "fandexMusicChartFinalPoint"
            )
        ) == 0.0
    ]


    now = datetime.now().isoformat(
        timespec="seconds"
    )


    for payload in [
        ranking_payload,
        reports_payload,
    ]:

        payload.pop(
            "zeroPresenceVersion",
            None,
        )

        payload.pop(
            "zeroPresenceAsOfDate",
            None,
        )

        payload.pop(
            "explicitZeroArtists",
            None,
        )

        payload[
            "schemaPresenceVersion"
        ] = VERSION

        payload[
            "schemaPresenceAt"
        ] = now

        payload[
            "schemaZeroArtists"
        ] = zero_artists

        payload[
            "schemaAddedArtists"
        ] = added


    ranking_payload[
        "ranking"
    ] = ranking

    reports_payload[
        "reports"
    ] = reports


    print()
    print(
        "Schema presence actions"
    )
    print("-" * 84)

    for artist in preserved:
        print(
            f"{artist} | "
            "PRESERVE_EXISTING"
        )

    for artist in added:
        print(
            f"{artist} | "
            "ADD_SCHEMA_ZERO"
        )


    print()
    print(
        f"projectedArtistCount: "
        f"{len(ranking)}"
    )
    print(
        f"schemaZeroArtistCount: "
        f"{len(zero_artists)}"
    )
    print(
        "schemaZeroArtists: "
        + (
            ", ".join(
                zero_artists
            )
            if zero_artists
            else "-"
        )
    )


    ranking_backup = None
    reports_backup = None


    if args.apply:

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        ranking_backup = Path(
            "fandex_music_chart_ranking_v1_latest_"
            "backup_before_schema_presence_v3_"
            f"{timestamp}.json"
        )

        reports_backup = Path(
            "fandex_music_chart_artist_reports_v1_latest_"
            "backup_before_schema_presence_v3_"
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


        verify = read_json(
            RANKING_FILE
        ).get(
            "ranking",
            []
        )

        if len(verify) != 10:
            raise RuntimeError(
                "Post-apply Music ranking "
                "does not contain 10 rows."
            )


        print()
        print("APPLY OK")
        print(
            f"rankingBackup: "
            f"{ranking_backup}"
        )
        print(
            f"reportsBackup: "
            f"{reports_backup}"
        )


    lines = [
        (
            "FANDEX Music Chart "
            "Schema Presence v3"
        ),
        "=" * 84,
        f"mode: {mode}",
        (
            "rule: preserve existing Music "
            "v1 scores; add zero only when "
            "artist is absent"
        ),
        (
            f"projectedArtistCount: "
            f"{len(ranking)}"
        ),
        (
            f"schemaZeroArtistCount: "
            f"{len(zero_artists)}"
        ),
        (
            "schemaZeroArtists: "
            + (
                ", ".join(
                    zero_artists
                )
                if zero_artists
                else "-"
            )
        ),
        (
            "schemaAddedArtists: "
            + (
                ", ".join(
                    added
                )
                if added
                else "-"
            )
        ),
        "usesCheckHistory: FALSE",
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]


    REPORT_FILE.write_text(
        "\n".join(
            lines
        ),
        encoding="utf-8",
    )


    print()
    print("=" * 84)
    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "usesCheckHistory: FALSE"
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