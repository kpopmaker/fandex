from __future__ import annotations

import argparse
import csv
import io
import json
import shutil
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_sync_cloud_history_v1"

CLOUD_URL = (
    "https://raw.githubusercontent.com/"
    "kpopmaker/fandex/main/"
    "data/lastfm-cloud/"
    "lastfm_artist_interest_history_v1.csv"
)

LOCAL = Path(
    "lastfm_artist_interest_history_v1.csv"
)

STATUS = Path(
    "lastfm_sync_cloud_history_v1_latest.json"
)

FIELDS = [
    "snapshotDate",
    "artist",
    "query",
    "lastfmName",
    "listeners",
    "playcount",
    "collectedAt",
    "status",
]

# collectedAt은 비교에서 제외.
# 같은 snapshot이라도 Cloud 초기 이관 시각과
# 로컬 실제 수집 시각이 다를 수 있기 때문.
COMPARE_FIELDS = [
    "query",
    "lastfmName",
    "listeners",
    "playcount",
    "status",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def key(row):
    return (
        norm(row.get("snapshotDate")),
        norm(row.get("artist")),
    )


def clean(row):
    return {
        field: norm(row.get(field))
        for field in FIELDS
    }


def read_local():
    with LOCAL.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        reader = csv.DictReader(f)

        fields = list(
            reader.fieldnames or []
        )

        rows = [
            dict(row)
            for row in reader
        ]

    return fields, rows


def read_cloud():
    request = urllib.request.Request(
        CLOUD_URL,
        headers={
            "Cache-Control": "no-cache",
            "User-Agent":
                "FANDEX-LastFM-Sync/1.0",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:

        text = response.read().decode(
            "utf-8-sig"
        )

    reader = csv.DictReader(
        io.StringIO(text)
    )

    fields = list(
        reader.fieldnames or []
    )

    rows = [
        dict(row)
        for row in reader
    ]

    return fields, rows


def validate_fields(label, fields):
    missing = [
        field
        for field in FIELDS
        if field not in fields
    ]

    if missing:
        raise RuntimeError(
            f"{label} missing fields: "
            + ", ".join(missing)
        )


def duplicate_keys(rows):
    counter = Counter(
        key(row)
        for row in rows
    )

    return [
        row_key
        for row_key, count
        in counter.items()
        if count > 1
    ]


def validate_cloud(rows):

    duplicates = duplicate_keys(rows)

    if duplicates:
        raise RuntimeError(
            "Cloud duplicate keys: "
            f"{len(duplicates)}"
        )

    by_date = defaultdict(list)

    for row in rows:
        by_date[
            norm(row.get("snapshotDate"))
        ].append(row)

    if not by_date:
        raise RuntimeError(
            "Cloud history is empty."
        )

    expected_artists = None

    for date in sorted(
        by_date,
        reverse=True,
    ):
        artists = {
            norm(row.get("artist"))
            for row in by_date[date]
        }

        if (
            len(by_date[date]) == 10
            and len(artists) == 10
        ):
            expected_artists = artists
            break

    if not expected_artists:
        raise RuntimeError(
            "Cloud has no complete "
            "10-artist snapshot."
        )

    incomplete = []

    for date, date_rows in sorted(
        by_date.items()
    ):
        artists = {
            norm(row.get("artist"))
            for row in date_rows
        }

        if (
            len(date_rows) != 10
            or artists != expected_artists
        ):
            incomplete.append(
                f"{date}({len(date_rows)}/10)"
            )

    if incomplete:
        raise RuntimeError(
            "Cloud incomplete snapshot: "
            + ", ".join(incomplete[:5])
        )

    return sorted(by_date)


def write_atomic(rows):

    temp = LOCAL.with_suffix(
        LOCAL.suffix + ".tmp"
    )

    with temp.open(
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

    temp.replace(LOCAL)


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
        else "PREVIEW"
    )

    print()
    print(
        "FANDEX Last.fm "
        "Cloud -> Local History Sync v1"
    )
    print("=" * 72)
    print(f"mode: {mode}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    if not LOCAL.exists():
        raise SystemExit(
            "ERROR: local history "
            f"not found: {LOCAL}"
        )

    local_fields, local_rows = (
        read_local()
    )

    cloud_fields, cloud_rows = (
        read_cloud()
    )

    validate_fields(
        "Local",
        local_fields,
    )

    validate_fields(
        "Cloud",
        cloud_fields,
    )

    cloud_dates = validate_cloud(
        cloud_rows
    )

    local_duplicates = (
        duplicate_keys(local_rows)
    )

    if local_duplicates:
        raise SystemExit(
            "ERROR: local duplicate keys: "
            f"{len(local_duplicates)}"
        )

    local_map = {
        key(row): clean(row)
        for row in local_rows
    }

    cloud_map = {
        key(row): clean(row)
        for row in cloud_rows
    }

    conflicts = []

    shared_keys = (
        set(local_map)
        & set(cloud_map)
    )

    for row_key in sorted(
        shared_keys
    ):

        differences = [
            field
            for field in COMPARE_FIELDS
            if (
                local_map[row_key][field]
                !=
                cloud_map[row_key][field]
            )
        ]

        if differences:
            conflicts.append(
                (
                    row_key,
                    differences,
                )
            )

    cloud_only = sorted(
        set(cloud_map)
        - set(local_map)
    )

    local_only = sorted(
        set(local_map)
        - set(cloud_map)
    )

    print()
    print(
        f"cloudRows: {len(cloud_rows)}"
    )

    print(
        "localRowsBefore: "
        f"{len(local_rows)}"
    )

    print(
        "cloudOnlyRows: "
        f"{len(cloud_only)}"
    )

    print(
        "localOnlyRowsPreserved: "
        f"{len(local_only)}"
    )

    print(
        f"conflicts: {len(conflicts)}"
    )

    print(
        "cloudSnapshotDates: "
        f"{len(cloud_dates)}"
    )

    print(
        "cloudLatestDate: "
        f"{cloud_dates[-1]}"
    )

    if conflicts:

        for (
            snapshot_key,
            differences,
        ) in conflicts[:10]:

            date, artist = snapshot_key

            print(
                "CONFLICT: "
                f"{date} / {artist} / "
                + ",".join(differences)
            )

        raise SystemExit(
            "ERROR: shared Cloud/local "
            "data conflict. "
            "No file modified."
        )

    merged = dict(local_map)

    for row_key in cloud_only:
        merged[row_key] = (
            cloud_map[row_key]
        )

    merged_rows = [
        merged[row_key]
        for row_key in sorted(merged)
    ]

    import_dates = sorted({
        date
        for date, artist
        in cloud_only
    })

    print(
        "cloudImportDates: "
        + (
            ", ".join(import_dates)
            if import_dates
            else "NONE"
        )
    )

    print(
        f"mergedRows: {len(merged_rows)}"
    )

    payload = {
        "version": VERSION,
        "mode": mode,
        "status": (
            "READY"
            if cloud_only
            else "ALREADY_SYNCED"
        ),
        "cloudRowCount":
            len(cloud_rows),
        "localRowCountBefore":
            len(local_rows),
        "mergedRowCount":
            len(merged_rows),
        "cloudOnlyCount":
            len(cloud_only),
        "localOnlyCount":
            len(local_only),
        "conflictCount": 0,
        "cloudLatestDate":
            cloud_dates[-1],
        "cloudImportDates":
            import_dates,
        "localModified": False,
        "masterModified": False,
        "websiteModified": False,
    }

    if not args.apply:

        STATUS.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        print()
        print(
            "PREVIEW ONLY - "
            "local history was NOT modified."
        )

        print(
            "Apply: "
            "py "
            "lastfm_sync_cloud_history_v1.py "
            "--apply"
        )

        return

    if not cloud_only:

        STATUS.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        print()
        print(
            "ALREADY SYNCED - "
            "no local change needed."
        )

        return

    stamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup = Path(
        "lastfm_artist_interest_history_v1_"
        "backup_before_cloud_sync_"
        f"{stamp}.csv"
    )

    shutil.copy2(
        LOCAL,
        backup,
    )

    write_atomic(
        merged_rows
    )

    _, verify_rows = read_local()

    if (
        len(verify_rows)
        != len(merged_rows)
    ):
        shutil.copy2(
            backup,
            LOCAL,
        )

        raise SystemExit(
            "ERROR: post-write "
            "verification failed; "
            "local history restored."
        )

    verify_map = {
        key(row): clean(row)
        for row in verify_rows
    }

    for cloud_key in cloud_map:

        if cloud_key not in verify_map:

            shutil.copy2(
                backup,
                LOCAL,
            )

            raise SystemExit(
                "ERROR: imported Cloud "
                "row missing; "
                "local history restored."
            )

    payload["status"] = "APPLIED"
    payload["localModified"] = True
    payload["backup"] = str(backup)

    STATUS.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("APPLY OK")
    print(f"backup: {backup}")

    print(
        "localRowsAfter: "
        f"{len(verify_rows)}"
    )

    print(
        "importedCloudRows: "
        f"{len(cloud_only)}"
    )

    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()