import csv
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_interest_history_v1"

SOURCE_FILE = Path(
    "lastfm_artist_interest_v2_latest.csv"
)

HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

REPORT_FILE = Path(
    "FANDEX_LASTFM_INTEREST_HISTORY_V1_REPORT.txt"
)


FIELDS = [
    "snapshotDate",
    "snapshotAt",
    "artist",
    "lastfmName",
    "listeners",
    "playcount",
    "sourceVersion",
]


def clean(value):
    return str(value or "").strip()


def to_int(value):
    text = clean(value).replace(",", "")

    if not text:
        return 0

    try:
        return int(float(text))

    except ValueError:
        return 0


def read_csv(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일 없음: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def read_history():
    if not HISTORY_FILE.exists():
        return []

    with HISTORY_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def write_history(rows):
    with HISTORY_FILE.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    print()
    print(
        "FANDEX Last.fm interest history v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "purpose: cumulative Last.fm stats "
        "-> daily snapshot history"
    )
    print(
        "scoreUsage: "
        "history_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    source_rows = read_csv(
        SOURCE_FILE
    )

    if len(source_rows) != 10:
        raise SystemExit(
            "ERROR: Last.fm latest row count가 "
            f"10이 아닙니다: {len(source_rows)}"
        )

    now = datetime.now()

    snapshot_date = now.strftime(
        "%Y-%m-%d"
    )

    snapshot_at = now.isoformat(
        timespec="seconds"
    )

    history_rows = read_history()

    existing_keys = {
        (
            clean(row.get("snapshotDate")),
            clean(row.get("artist")),
        )
        for row in history_rows
    }

    appended = []
    skipped = []

    for row in source_rows:
        artist = clean(
            row.get("artist")
        )

        lastfm_name = clean(
            row.get("lastfmName")
            or row.get("returnedName")
            or row.get("name")
        )

        listeners = to_int(
            row.get("listeners")
        )

        playcount = to_int(
            row.get("playcount")
        )

        if not artist:
            raise SystemExit(
                "ERROR: Last.fm artist 없음"
            )

        if listeners <= 0:
            raise SystemExit(
                f"ERROR: {artist} listeners 값 이상"
            )

        if playcount <= 0:
            raise SystemExit(
                f"ERROR: {artist} playcount 값 이상"
            )

        key = (
            snapshot_date,
            artist,
        )

        if key in existing_keys:
            skipped.append(artist)
            continue

        new_row = {
            "snapshotDate":
                snapshot_date,
            "snapshotAt":
                snapshot_at,
            "artist":
                artist,
            "lastfmName":
                lastfm_name,
            "listeners":
                listeners,
            "playcount":
                playcount,
            "sourceVersion":
                "lastfm_v2",
        }

        history_rows.append(
            new_row
        )

        appended.append(
            new_row
        )

        existing_keys.add(key)

    history_rows.sort(
        key=lambda row: (
            clean(
                row.get("snapshotDate")
            ),
            clean(
                row.get("artist")
            ),
        )
    )

    write_history(
        history_rows
    )

    artist_count = len(
        {
            clean(row.get("artist"))
            for row in history_rows
            if clean(row.get("artist"))
        }
    )

    snapshot_dates = sorted(
        {
            clean(
                row.get("snapshotDate")
            )
            for row in history_rows
            if clean(
                row.get("snapshotDate")
            )
        }
    )

    print()
    print("snapshot 결과")
    print("-" * 80)

    for row in appended:
        print(
            f"ADD {row['artist']} | "
            f"listeners={row['listeners']} | "
            f"playcount={row['playcount']}"
        )

    for artist in skipped:
        print(
            f"SKIP {artist} | "
            f"{snapshot_date} snapshot 이미 존재"
        )

    report = [
        "FANDEX Last.fm Interest History v1",
        "=" * 80,
        f"version: {VERSION}",
        f"snapshotDate: {snapshot_date}",
        "",
        (
            f"sourceRowCount: "
            f"{len(source_rows)}"
        ),
        (
            f"appendedRowCount: "
            f"{len(appended)}"
        ),
        (
            f"skippedSameDateCount: "
            f"{len(skipped)}"
        ),
        (
            f"historyRowCount: "
            f"{len(history_rows)}"
        ),
        (
            f"historyArtistCount: "
            f"{artist_count}"
        ),
        (
            f"snapshotDateCount: "
            f"{len(snapshot_dates)}"
        ),
        "",
        (
            "scoreUsage: "
            "history_only_not_master_score"
        ),
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]

    REPORT_FILE.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 80)
    print(
        f"sourceRowCount: "
        f"{len(source_rows)}"
    )
    print(
        f"appendedRowCount: "
        f"{len(appended)}"
    )
    print(
        f"skippedSameDateCount: "
        f"{len(skipped)}"
    )
    print(
        f"historyRowCount: "
        f"{len(history_rows)}"
    )
    print(
        f"historyArtistCount: "
        f"{artist_count}"
    )
    print(
        f"snapshotDateCount: "
        f"{len(snapshot_dates)}"
    )
    print(
        f"history: {HISTORY_FILE}"
    )
    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "scoreUsage: "
        "history_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()