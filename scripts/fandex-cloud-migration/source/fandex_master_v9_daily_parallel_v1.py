from __future__ import annotations

import csv
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v9_daily_parallel_v1"

BUILDER = Path(
    "fandex_master_v9_music_v2_lastfm_build_v1.py"
)

V9_FILE = Path(
    "fandex_master_v9_ranking_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

HISTORY_FILE = Path(
    "fandex_master_v9_history_v1.csv"
)

LATEST_HISTORY_FILE = Path(
    "fandex_master_v9_history_latest.csv"
)


FIELDS = [
    "snapshotDate",
    "snapshotAt",
    "artist",
    "rank",
    "v9Point",
    "v7Point",
    "v8Point",
    "musicV1Point",
    "musicV2RawPoint",
    "musicV2ContributionPoint",
    "lastfmContributionPoint",
    "sourceVersion",
]


def norm(value):
    if value is None:
        return ""

    return str(
        value
    ).strip()


def number(
    value,
    default=0.0,
):
    try:
        if value in [
            None,
            "",
        ]:
            return default

        return float(
            value
        )

    except Exception:
        return default


def run_builder():
    if not BUILDER.exists():
        raise RuntimeError(
            f"Missing builder: {BUILDER}"
        )

    result = subprocess.run(
        [
            sys.executable,
            str(BUILDER),
        ],
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Master v9 builder failed "
            f"with exit code "
            f"{result.returncode}"
        )


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing JSON: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_history():
    if not HISTORY_FILE.exists():
        return []

    with HISTORY_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        return list(
            csv.DictReader(
                file
            )
        )


def write_csv(
    path,
    rows,
):
    temp = Path(
        str(path) + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=FIELDS,
        )

        writer.writeheader()

        for row in rows:

            writer.writerow({
                field:
                    row.get(
                        field,
                        ""
                    )
                for field in FIELDS
            })

    temp.replace(
        path
    )


def main():
    print()
    print("=" * 88)
    print(
        "FANDEX Master v9 Daily Parallel v1"
    )
    print("=" * 88)

    print(
        f"version: {VERSION}"
    )

    print(
        "usage: PARALLEL CANDIDATE ONLY"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


    run_builder()


    v9 = read_json(
        V9_FILE
    )

    music_v2 = read_json(
        MUSIC_V2_FILE
    )


    snapshot_date = norm(
        music_v2.get(
            "snapshotDate"
        )
    )


    if not snapshot_date:
        raise RuntimeError(
            "Music v2 snapshotDate missing."
        )


    ranking = v9.get(
        "ranking",
        []
    )


    if (
        not isinstance(
            ranking,
            list,
        )
        or len(
            ranking
        )
        != 10
    ):
        raise RuntimeError(
            "Expected v9 ranking 10 artists."
        )


    snapshot_at = datetime.now().isoformat(
        timespec="seconds"
    )


    latest_rows = []


    for row in ranking:

        latest_rows.append({
            "snapshotDate":
                snapshot_date,

            "snapshotAt":
                snapshot_at,

            "artist":
                norm(
                    row.get(
                        "artist"
                    )
                ),

            "rank":
                row.get(
                    "rank",
                    "",
                ),

            "v9Point":
                row.get(
                    "fandexFinalPoint",
                    row.get(
                        "score",
                        "",
                    ),
                ),

            "v7Point":
                row.get(
                    "productionV7Point",
                    "",
                ),

            "v8Point":
                row.get(
                    "parallelV8Point",
                    "",
                ),

            "musicV1Point":
                row.get(
                    "musicV1ReferencePoint",
                    "",
                ),

            "musicV2RawPoint":
                row.get(
                    "musicV2RawPoint",
                    "",
                ),

            "musicV2ContributionPoint":
                row.get(
                    "musicV2ContributionPoint",
                    "",
                ),

            "lastfmContributionPoint":
                row.get(
                    "lastfmContributionPoint",
                    "",
                ),

            "sourceVersion":
                v9.get(
                    "version",
                    "",
                ),
        })


    artists = {
        row[
            "artist"
        ]
        for row in latest_rows
    }


    if len(
        artists
    ) != 10:
        raise RuntimeError(
            "v9 latest artist set "
            "is not 10 unique artists."
        )


    history = read_history()


    if HISTORY_FILE.exists():

        backup = Path(
            "fandex_master_v9_history_v1_"
            "backup_before_upsert_"
            + datetime.now().strftime(
                "%Y%m%d_%H%M%S"
            )
            + ".csv"
        )

        shutil.copy2(
            HISTORY_FILE,
            backup,
        )

        print(
            f"historyBackup: {backup}"
        )


    kept = []


    for row in history:

        row_date = norm(
            row.get(
                "snapshotDate"
            )
        )

        artist = norm(
            row.get(
                "artist"
            )
        )


        if (
            row_date
            == snapshot_date
            and artist
            in artists
        ):
            continue


        kept.append(
            row
        )


    merged = (
        kept
        + latest_rows
    )


    merged.sort(
        key=lambda row: (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            int(
                number(
                    row.get(
                        "rank"
                    ),
                    999999,
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )
    )


    seen = set()


    for row in merged:

        key = (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )


        if key in seen:
            raise RuntimeError(
                "v9 history duplicate: "
                f"{key}"
            )


        seen.add(
            key
        )


    write_csv(
        HISTORY_FILE,
        merged,
    )

    write_csv(
        LATEST_HISTORY_FILE,
        sorted(
            latest_rows,
            key=lambda row:
                int(
                    number(
                        row.get(
                            "rank"
                        ),
                        999999,
                    )
                ),
        ),
    )


    snapshot_dates = sorted({
        norm(
            row.get(
                "snapshotDate"
            )
        )
        for row in merged
        if norm(
            row.get(
                "snapshotDate"
            )
        )
    })


    latest_count = sum(
        1
        for row in merged
        if norm(
            row.get(
                "snapshotDate"
            )
        )
        == snapshot_date
    )


    print()
    print(
        "v9 history"
    )
    print("-" * 88)

    print(
        f"snapshotDate: "
        f"{snapshot_date}"
    )

    print(
        f"latestArtistCount: "
        f"{latest_count}/10"
    )

    print(
        f"historyRowCount: "
        f"{len(merged)}"
    )

    print(
        f"historySnapshotCount: "
        f"{len(snapshot_dates)}"
    )

    print(
        "historyDuplicateCount: 0"
    )

    print(
        f"history: {HISTORY_FILE}"
    )

    print(
        f"latestHistory: "
        f"{LATEST_HISTORY_FILE}"
    )

    print()
    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 88)


if __name__ == "__main__":
    main()
