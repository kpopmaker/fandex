from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path


VERSION = "lastfm_global_interest_rolling_v1"

HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

OUTPUT_CSV = Path(
    "lastfm_global_interest_rolling_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "lastfm_global_interest_rolling_v1_latest.json"
)

REQUIRED_FIELDS = [
    "snapshotDate",
    "artist",
    "listeners",
    "playcount",
]

OUTPUT_FIELDS = [
    "artist",
    "latestDate",
    "snapshotDateCount",

    "rolling3Status",
    "rolling3StartDate",
    "rolling3DaysBetween",
    "rolling3ListenerDelta",
    "rolling3PlaycountDelta",
    "rolling3ListenerDeltaPerDay",
    "rolling3PlaycountDeltaPerDay",

    "rolling7Status",
    "rolling7StartDate",
    "rolling7DaysBetween",
    "rolling7ListenerDelta",
    "rolling7PlaycountDelta",
    "rolling7ListenerDeltaPerDay",
    "rolling7PlaycountDeltaPerDay",

    "status",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def to_int(value):
    return int(norm(value))


def read_history():
    if not HISTORY_FILE.exists():
        raise RuntimeError(
            f"History file not found: {HISTORY_FILE}"
        )

    with HISTORY_FILE.open(
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

    missing = [
        field
        for field in REQUIRED_FIELDS
        if field not in fields
    ]

    if missing:
        raise RuntimeError(
            "History missing fields: "
            + ", ".join(missing)
        )

    return rows


def row_key(row):
    return (
        norm(row.get("snapshotDate")),
        norm(row.get("artist")),
    )


def validate_history(rows):
    if not rows:
        raise RuntimeError(
            "History is empty."
        )

    counts = Counter(
        row_key(row)
        for row in rows
    )

    duplicate_keys = [
        key
        for key, count in counts.items()
        if count > 1
    ]

    if duplicate_keys:
        raise RuntimeError(
            "Duplicate snapshotDate/artist "
            f"keys found: {len(duplicate_keys)}"
        )

    by_date = defaultdict(list)

    for row in rows:
        snapshot_date = norm(
            row.get("snapshotDate")
        )

        date.fromisoformat(
            snapshot_date
        )

        listeners = to_int(
            row.get("listeners")
        )

        playcount = to_int(
            row.get("playcount")
        )

        if listeners <= 0:
            raise RuntimeError(
                "Invalid listeners: "
                f"{snapshot_date} / "
                f"{row.get('artist')} / "
                f"{listeners}"
            )

        if playcount <= 0:
            raise RuntimeError(
                "Invalid playcount: "
                f"{snapshot_date} / "
                f"{row.get('artist')} / "
                f"{playcount}"
            )

        by_date[snapshot_date].append(
            row
        )

    sorted_dates = sorted(
        by_date
    )

    first_artist_set = {
        norm(row.get("artist"))
        for row in by_date[
            sorted_dates[0]
        ]
    }

    if len(first_artist_set) != 10:
        raise RuntimeError(
            "Expected 10 artists in "
            f"{sorted_dates[0]}, "
            f"got {len(first_artist_set)}."
        )

    for snapshot_date in sorted_dates:
        date_rows = by_date[
            snapshot_date
        ]

        artist_set = {
            norm(row.get("artist"))
            for row in date_rows
        }

        if len(date_rows) != 10:
            raise RuntimeError(
                "Incomplete snapshot: "
                f"{snapshot_date} = "
                f"{len(date_rows)}/10"
            )

        if artist_set != first_artist_set:
            raise RuntimeError(
                "Artist set mismatch: "
                f"{snapshot_date}"
            )

    return sorted_dates


def make_window(
    artist_rows,
    window_size,
):
    if len(artist_rows) < window_size:
        return {
            "status":
                "insufficient_history",
            "startDate": "",
            "daysBetween": "",
            "listenerDelta": "",
            "playcountDelta": "",
            "listenerDeltaPerDay": "",
            "playcountDeltaPerDay": "",
        }

    window_rows = (
        artist_rows[-window_size:]
    )

    start = window_rows[0]
    latest = window_rows[-1]

    start_date = date.fromisoformat(
        norm(start["snapshotDate"])
    )

    latest_date = date.fromisoformat(
        norm(latest["snapshotDate"])
    )

    days_between = (
        latest_date - start_date
    ).days

    if days_between <= 0:
        raise RuntimeError(
            "Invalid rolling daysBetween "
            f"for {latest.get('artist')}: "
            f"{days_between}"
        )

    listener_delta = (
        to_int(latest["listeners"])
        - to_int(start["listeners"])
    )

    playcount_delta = (
        to_int(latest["playcount"])
        - to_int(start["playcount"])
    )

    listener_per_day = (
        listener_delta
        / days_between
    )

    playcount_per_day = (
        playcount_delta
        / days_between
    )

    status = "ready"

    if (
        listener_delta < 0
        or playcount_delta < 0
    ):
        status = "review_negative_delta"

    return {
        "status":
            status,

        "startDate":
            norm(start["snapshotDate"]),

        "daysBetween":
            days_between,

        "listenerDelta":
            listener_delta,

        "playcountDelta":
            playcount_delta,

        "listenerDeltaPerDay":
            round(
                listener_per_day,
                4,
            ),

        "playcountDeltaPerDay":
            round(
                playcount_per_day,
                4,
            ),
    }


def write_csv(rows):
    temp = OUTPUT_CSV.with_suffix(
        OUTPUT_CSV.suffix + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(
        OUTPUT_CSV
    )


def main():
    print()
    print(
        "FANDEX Last.fm "
        "Global Interest Rolling v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    rows = read_history()

    snapshot_dates = (
        validate_history(rows)
    )

    latest_date = (
        snapshot_dates[-1]
    )

    by_artist = defaultdict(list)

    for row in rows:
        by_artist[
            norm(row.get("artist"))
        ].append(row)

    output_rows = []

    rolling3_ready = 0
    rolling7_ready = 0
    needs_review = 0

    for artist in sorted(
        by_artist
    ):
        artist_rows = sorted(
            by_artist[artist],
            key=lambda row:
                norm(
                    row.get(
                        "snapshotDate"
                    )
                ),
        )

        rolling3 = make_window(
            artist_rows,
            3,
        )

        rolling7 = make_window(
            artist_rows,
            7,
        )

        if rolling3["status"] == "ready":
            rolling3_ready += 1

        if rolling7["status"] == "ready":
            rolling7_ready += 1

        has_negative_delta = (
            rolling3["status"]
            == "review_negative_delta"
            or
            rolling7["status"]
            == "review_negative_delta"
        )

        if has_negative_delta:
            needs_review += 1

        overall_status = (
            "review"
            if has_negative_delta
            else "ok"
        )

        output_rows.append({
            "artist":
                artist,

            "latestDate":
                norm(
                    artist_rows[-1][
                        "snapshotDate"
                    ]
                ),

            "snapshotDateCount":
                len(artist_rows),

            "rolling3Status":
                rolling3["status"],

            "rolling3StartDate":
                rolling3["startDate"],

            "rolling3DaysBetween":
                rolling3[
                    "daysBetween"
                ],

            "rolling3ListenerDelta":
                rolling3[
                    "listenerDelta"
                ],

            "rolling3PlaycountDelta":
                rolling3[
                    "playcountDelta"
                ],

            "rolling3ListenerDeltaPerDay":
                rolling3[
                    "listenerDeltaPerDay"
                ],

            "rolling3PlaycountDeltaPerDay":
                rolling3[
                    "playcountDeltaPerDay"
                ],

            "rolling7Status":
                rolling7["status"],

            "rolling7StartDate":
                rolling7["startDate"],

            "rolling7DaysBetween":
                rolling7[
                    "daysBetween"
                ],

            "rolling7ListenerDelta":
                rolling7[
                    "listenerDelta"
                ],

            "rolling7PlaycountDelta":
                rolling7[
                    "playcountDelta"
                ],

            "rolling7ListenerDeltaPerDay":
                rolling7[
                    "listenerDeltaPerDay"
                ],

            "rolling7PlaycountDeltaPerDay":
                rolling7[
                    "playcountDeltaPerDay"
                ],

            "status":
                overall_status,
        })

    write_csv(
        output_rows
    )

    payload = {
        "version":
            VERSION,

        "historyRowCount":
            len(rows),

        "snapshotDateCount":
            len(snapshot_dates),

        "earliestDate":
            snapshot_dates[0],

        "latestDate":
            latest_date,

        "artistCount":
            len(by_artist),

        "rolling3ReadyCount":
            rolling3_ready,

        "rolling7ReadyCount":
            rolling7_ready,

        "needsReviewCount":
            needs_review,

        "output":
            str(OUTPUT_CSV),

        "masterModified":
            False,

        "websiteModified":
            False,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        f"historyRowCount: "
        f"{len(rows)}"
    )

    print(
        f"snapshotDateCount: "
        f"{len(snapshot_dates)}"
    )

    print(
        f"earliestDate: "
        f"{snapshot_dates[0]}"
    )

    print(
        f"latestDate: "
        f"{latest_date}"
    )

    print(
        f"artistCount: "
        f"{len(by_artist)}"
    )

    print(
        f"rolling3ReadyCount: "
        f"{rolling3_ready}/10"
    )

    print(
        f"rolling7ReadyCount: "
        f"{rolling7_ready}/10"
    )

    print(
        f"needsReviewCount: "
        f"{needs_review}"
    )

    print(
        f"output: "
        f"{OUTPUT_CSV}"
    )

    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()