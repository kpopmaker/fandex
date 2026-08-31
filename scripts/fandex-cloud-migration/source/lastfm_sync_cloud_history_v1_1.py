from __future__ import annotations

import argparse
import csv
import io
import json
import shutil
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path


VERSION = "lastfm_sync_cloud_history_v1_1"

KST = timezone(timedelta(hours=9))

CLOUD_URL = (
    "https://raw.githubusercontent.com/"
    "kpopmaker/fandex/main/"
    "data/lastfm-cloud/"
    "lastfm_artist_interest_history_v1.csv"
)

LOCAL_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

STATUS_FILE = Path(
    "lastfm_sync_cloud_history_v1_1_latest.json"
)

LOCAL_FIELDS = [
    "snapshotDate",
    "snapshotAt",
    "artist",
    "lastfmName",
    "listeners",
    "playcount",
    "sourceVersion",
]

CLOUD_REQUIRED_FIELDS = [
    "snapshotDate",
    "artist",
    "lastfmName",
    "listeners",
    "playcount",
    "collectedAt",
]

COMPARE_FIELDS = [
    "lastfmName",
    "listeners",
    "playcount",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def row_key(row):
    return (
        norm(row.get("snapshotDate")),
        norm(row.get("artist")),
    )


def read_csv_file(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        reader = csv.DictReader(f)

        return (
            list(reader.fieldnames or []),
            [dict(row) for row in reader],
        )


def fetch_cloud_csv():
    request = urllib.request.Request(
        CLOUD_URL,
        headers={
            "User-Agent":
                "FANDEX-LastFM-Cloud-Sync/1.1",
            "Cache-Control": "no-cache",
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

    return (
        list(reader.fieldnames or []),
        [dict(row) for row in reader],
    )


def require_fields(
    label,
    actual_fields,
    required_fields,
):
    missing = [
        field
        for field in required_fields
        if field not in actual_fields
    ]

    if missing:
        raise RuntimeError(
            f"{label} missing fields: "
            + ", ".join(missing)
        )


def find_duplicates(rows):
    counts = Counter(
        row_key(row)
        for row in rows
    )

    return [
        key
        for key, count in counts.items()
        if count > 1
    ]


def cloud_collected_at_to_local(
    collected_at,
):
    value = norm(collected_at)

    if not value:
        raise RuntimeError(
            "Cloud collectedAt is empty."
        )

    try:
        dt = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    except ValueError as exc:
        raise RuntimeError(
            "Invalid Cloud collectedAt: "
            f"{value}"
        ) from exc

    if dt.tzinfo is not None:
        dt = dt.astimezone(KST)
        dt = dt.replace(tzinfo=None)

    return dt.isoformat(
        timespec="seconds"
    )


def dominant_source_version(local_rows):
    values = [
        norm(row.get("sourceVersion"))
        for row in local_rows
        if norm(row.get("sourceVersion"))
    ]

    if not values:
        raise RuntimeError(
            "Local sourceVersion values "
            "are empty."
        )

    return Counter(values).most_common(1)[0][0]


def project_cloud_row(
    cloud_row,
    source_version,
):
    return {
        "snapshotDate":
            norm(
                cloud_row.get(
                    "snapshotDate"
                )
            ),

        "snapshotAt":
            cloud_collected_at_to_local(
                cloud_row.get(
                    "collectedAt"
                )
            ),

        "artist":
            norm(
                cloud_row.get("artist")
            ),

        "lastfmName":
            norm(
                cloud_row.get(
                    "lastfmName"
                )
            ),

        "listeners":
            norm(
                cloud_row.get(
                    "listeners"
                )
            ),

        "playcount":
            norm(
                cloud_row.get(
                    "playcount"
                )
            ),

        "sourceVersion":
            source_version,
    }


def validate_cloud_dates(
    cloud_rows,
):
    by_date = {}

    for row in cloud_rows:
        date = norm(
            row.get("snapshotDate")
        )

        by_date.setdefault(
            date,
            [],
        ).append(row)

    if not by_date:
        raise RuntimeError(
            "Cloud history is empty."
        )

    for date, rows in sorted(
        by_date.items()
    ):
        artists = {
            norm(row.get("artist"))
            for row in rows
        }

        if (
            len(rows) != 10
            or len(artists) != 10
        ):
            raise RuntimeError(
                "Incomplete Cloud snapshot: "
                f"{date} = "
                f"{len(rows)}/10 rows, "
                f"{len(artists)}/10 artists"
            )

    return sorted(by_date)


def write_local_atomic(rows):
    temp_file = LOCAL_FILE.with_suffix(
        LOCAL_FILE.suffix + ".tmp"
    )

    with temp_file.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=LOCAL_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp_file.replace(
        LOCAL_FILE
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
        else "PREVIEW"
    )

    print()
    print(
        "FANDEX Last.fm "
        "Cloud -> Local Sync v1.1"
    )
    print("=" * 72)
    print(f"mode: {mode}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    if not LOCAL_FILE.exists():
        raise SystemExit(
            "ERROR: local history missing: "
            f"{LOCAL_FILE}"
        )

    (
        local_fields,
        local_rows,
    ) = read_csv_file(
        LOCAL_FILE
    )

    (
        cloud_fields,
        cloud_rows,
    ) = fetch_cloud_csv()

    require_fields(
        "Local",
        local_fields,
        LOCAL_FIELDS,
    )

    require_fields(
        "Cloud",
        cloud_fields,
        CLOUD_REQUIRED_FIELDS,
    )

    local_duplicates = (
        find_duplicates(local_rows)
    )

    if local_duplicates:
        raise SystemExit(
            "ERROR: Local duplicate keys: "
            f"{len(local_duplicates)}"
        )

    cloud_duplicates = (
        find_duplicates(cloud_rows)
    )

    if cloud_duplicates:
        raise SystemExit(
            "ERROR: Cloud duplicate keys: "
            f"{len(cloud_duplicates)}"
        )

    cloud_dates = (
        validate_cloud_dates(
            cloud_rows
        )
    )

    source_version = (
        dominant_source_version(
            local_rows
        )
    )

    local_map = {
        row_key(row): {
            field: norm(row.get(field))
            for field in LOCAL_FIELDS
        }
        for row in local_rows
    }

    projected_cloud = {
        row_key(row):
            project_cloud_row(
                row,
                source_version,
            )
        for row in cloud_rows
    }

    shared_keys = (
        set(local_map)
        & set(projected_cloud)
    )

    conflicts = []

    for key in sorted(
        shared_keys
    ):
        differences = [
            field
            for field in COMPARE_FIELDS
            if (
                local_map[key][field]
                !=
                projected_cloud[key][field]
            )
        ]

        if differences:
            conflicts.append(
                (
                    key,
                    differences,
                )
            )

    cloud_only_keys = sorted(
        set(projected_cloud)
        - set(local_map)
    )

    local_only_keys = sorted(
        set(local_map)
        - set(projected_cloud)
    )

    print()
    print(
        f"localSchema: "
        f"{','.join(LOCAL_FIELDS)}"
    )

    print(
        f"sourceVersionForImport: "
        f"{source_version}"
    )

    print(
        f"localRowsBefore: "
        f"{len(local_rows)}"
    )

    print(
        f"cloudRows: "
        f"{len(cloud_rows)}"
    )

    print(
        f"sharedRows: "
        f"{len(shared_keys)}"
    )

    print(
        f"cloudOnlyRows: "
        f"{len(cloud_only_keys)}"
    )

    print(
        f"localOnlyRowsPreserved: "
        f"{len(local_only_keys)}"
    )

    print(
        f"conflicts: "
        f"{len(conflicts)}"
    )

    print(
        f"cloudSnapshotDates: "
        f"{len(cloud_dates)}"
    )

    print(
        f"cloudLatestDate: "
        f"{cloud_dates[-1]}"
    )

    if conflicts:
        print()

        for (
            conflict_key,
            fields,
        ) in conflicts[:20]:

            date, artist = conflict_key

            print(
                "CONFLICT: "
                f"{date} / "
                f"{artist} / "
                + ",".join(fields)
            )

        raise SystemExit(
            "ERROR: Cloud/local conflict. "
            "No local file modified."
        )

    merged_map = dict(
        local_map
    )

    for key in cloud_only_keys:
        merged_map[key] = (
            projected_cloud[key]
        )

    merged_rows = [
        merged_map[key]
        for key in sorted(
            merged_map
        )
    ]

    import_dates = sorted({
        date
        for date, artist
        in cloud_only_keys
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
        f"mergedRows: "
        f"{len(merged_rows)}"
    )

    payload = {
        "version": VERSION,
        "mode": mode,
        "status": (
            "READY"
            if cloud_only_keys
            else "ALREADY_SYNCED"
        ),
        "localSchema":
            LOCAL_FIELDS,
        "sourceVersionForImport":
            source_version,
        "localRowsBefore":
            len(local_rows),
        "cloudRows":
            len(cloud_rows),
        "sharedRows":
            len(shared_keys),
        "cloudOnlyRows":
            len(cloud_only_keys),
        "localOnlyRowsPreserved":
            len(local_only_keys),
        "conflicts":
            len(conflicts),
        "cloudSnapshotDates":
            len(cloud_dates),
        "cloudLatestDate":
            cloud_dates[-1],
        "cloudImportDates":
            import_dates,
        "mergedRows":
            len(merged_rows),
        "localModified":
            False,
        "masterModified":
            False,
        "websiteModified":
            False,
    }

    if not args.apply:
        STATUS_FILE.write_text(
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
            "local history NOT modified."
        )

        print(
            "Apply command:"
        )

        print(
            "py "
            "lastfm_sync_cloud_history_v1_1.py "
            "--apply"
        )

        return

    if not cloud_only_keys:
        STATUS_FILE.write_text(
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
            "no local modification."
        )

        return

    stamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup = Path(
        "lastfm_artist_interest_history_v1_"
        "backup_before_cloud_sync_v1_1_"
        f"{stamp}.csv"
    )

    shutil.copy2(
        LOCAL_FILE,
        backup,
    )

    write_local_atomic(
        merged_rows
    )

    (
        verify_fields,
        verify_rows,
    ) = read_csv_file(
        LOCAL_FILE
    )

    if verify_fields != LOCAL_FIELDS:
        shutil.copy2(
            backup,
            LOCAL_FILE,
        )

        raise SystemExit(
            "ERROR: Local schema changed. "
            "Original restored."
        )

    if (
        len(verify_rows)
        != len(merged_rows)
    ):
        shutil.copy2(
            backup,
            LOCAL_FILE,
        )

        raise SystemExit(
            "ERROR: Row-count verification "
            "failed. Original restored."
        )

    verify_map = {
        row_key(row): row
        for row in verify_rows
    }

    for key in cloud_only_keys:
        if key not in verify_map:
            shutil.copy2(
                backup,
                LOCAL_FILE,
            )

            raise SystemExit(
                "ERROR: Imported row missing. "
                "Original restored."
            )

    payload["status"] = "APPLIED"
    payload["localModified"] = True
    payload["backup"] = str(
        backup
    )
    payload["localRowsAfter"] = (
        len(verify_rows)
    )

    STATUS_FILE.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("APPLY OK")
    print(
        f"backup: {backup}"
    )
    print(
        f"localRowsAfter: "
        f"{len(verify_rows)}"
    )
    print(
        f"importedCloudRows: "
        f"{len(cloud_only_keys)}"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()