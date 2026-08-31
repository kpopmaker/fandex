from __future__ import annotations

import csv
import json
import math
from pathlib import Path


VERSION = "lastfm_global_interest_rolling_score_preview_v1"

INPUT_FILE = Path(
    "lastfm_global_interest_rolling_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.json"
)

REQUIRED_FIELDS = [
    "artist",
    "latestDate",
    "snapshotDateCount",

    "rolling3Status",
    "rolling3ListenerDeltaPerDay",
    "rolling3PlaycountDeltaPerDay",

    "rolling7Status",
    "rolling7ListenerDeltaPerDay",
    "rolling7PlaycountDeltaPerDay",
]

OUTPUT_FIELDS = [
    "rank",
    "artist",
    "latestDate",
    "snapshotDateCount",

    "rolling3Status",
    "rolling3ListenerDeltaPerDay",
    "rolling3PlaycountDeltaPerDay",
    "rolling3ListenerLogNormalized",
    "rolling3PlaycountLogNormalized",
    "rolling3PreviewPoint",

    "rolling7Status",
    "rolling7ListenerDeltaPerDay",
    "rolling7PlaycountDeltaPerDay",
    "rolling7ListenerLogNormalized",
    "rolling7PlaycountLogNormalized",
    "rolling7PreviewPoint",

    "activeMode",
    "rollingCombinedPreviewPoint",
    "status",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def to_float(value):
    value = norm(value)

    if value == "":
        return None

    return float(value)


def read_input():
    if not INPUT_FILE.exists():
        raise RuntimeError(
            f"Input file not found: {INPUT_FILE}"
        )

    with INPUT_FILE.open(
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
            "Rolling input missing fields: "
            + ", ".join(missing)
        )

    if len(rows) != 10:
        raise RuntimeError(
            "Expected 10 rolling rows, "
            f"got {len(rows)}."
        )

    return rows


def log_value(value):
    if value is None:
        return None

    if value < 0:
        return None

    return math.log1p(value)


def minmax(values):
    usable = [
        value
        for value in values
        if value is not None
    ]

    if not usable:
        return {}

    low = min(usable)
    high = max(usable)

    if high == low:
        return {
            value: 50.0
            for value in set(usable)
        }

    return {
        value: (
            (value - low)
            / (high - low)
            * 100.0
        )
        for value in set(usable)
    }


def calculate_window(
    rows,
    prefix,
):
    status_field = (
        f"{prefix}Status"
    )

    listener_field = (
        f"{prefix}ListenerDeltaPerDay"
    )

    playcount_field = (
        f"{prefix}PlaycountDeltaPerDay"
    )

    prepared = []

    for row in rows:
        status = norm(
            row.get(status_field)
        )

        listener_value = to_float(
            row.get(listener_field)
        )

        playcount_value = to_float(
            row.get(playcount_field)
        )

        listener_log = None
        playcount_log = None

        if status == "ready":
            listener_log = log_value(
                listener_value
            )

            playcount_log = log_value(
                playcount_value
            )

        prepared.append({
            "artist":
                norm(row.get("artist")),

            "status":
                status,

            "listenerValue":
                listener_value,

            "playcountValue":
                playcount_value,

            "listenerLog":
                listener_log,

            "playcountLog":
                playcount_log,
        })

    listener_map = minmax([
        row["listenerLog"]
        for row in prepared
    ])

    playcount_map = minmax([
        row["playcountLog"]
        for row in prepared
    ])

    result = {}

    for row in prepared:
        artist = row["artist"]

        if row["status"] != "ready":
            result[artist] = {
                "listenerNormalized": "",
                "playcountNormalized": "",
                "point": "",
            }
            continue

        if (
            row["listenerLog"] is None
            or
            row["playcountLog"] is None
        ):
            result[artist] = {
                "listenerNormalized": "",
                "playcountNormalized": "",
                "point": "",
            }
            continue

        listener_normalized = (
            listener_map[
                row["listenerLog"]
            ]
        )

        playcount_normalized = (
            playcount_map[
                row["playcountLog"]
            ]
        )

        # 기존 Last.fm preview와 동일하게
        # listeners 50% + playcount 50%
        point = (
            listener_normalized * 0.5
            + playcount_normalized * 0.5
        )

        result[artist] = {
            "listenerNormalized":
                round(
                    listener_normalized,
                    4,
                ),

            "playcountNormalized":
                round(
                    playcount_normalized,
                    4,
                ),

            "point":
                round(
                    point,
                    4,
                ),
        }

    return result


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
        "Rolling Score Preview v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    rows = read_input()

    rolling3_score = (
        calculate_window(
            rows,
            "rolling3",
        )
    )

    rolling7_score = (
        calculate_window(
            rows,
            "rolling7",
        )
    )

    rolling3_ready = sum(
        1
        for row in rows
        if norm(
            row.get(
                "rolling3Status"
            )
        ) == "ready"
    )

    rolling7_ready = sum(
        1
        for row in rows
        if norm(
            row.get(
                "rolling7Status"
            )
        ) == "ready"
    )

    # 활성 모드
    #
    # 2일 이하:
    # insufficient_history
    #
    # 3~6일:
    # rolling3
    #
    # 7일 이상:
    # rolling3 + rolling7
    #
    # 두 rolling이 모두 준비되면
    # 각각 50%로 결합한다.
    if rolling7_ready == 10:
        active_mode = (
            "rolling3_50_rolling7_50"
        )

    elif rolling3_ready == 10:
        active_mode = "rolling3_only"

    else:
        active_mode = (
            "insufficient_history"
        )

    output_rows = []

    for row in rows:
        artist = norm(
            row.get("artist")
        )

        score3 = (
            rolling3_score[artist]
        )

        score7 = (
            rolling7_score[artist]
        )

        point3 = score3["point"]
        point7 = score7["point"]

        combined = ""

        if (
            active_mode
            == "rolling3_50_rolling7_50"
            and point3 != ""
            and point7 != ""
        ):
            combined = round(
                point3 * 0.5
                + point7 * 0.5,
                4,
            )

        elif (
            active_mode
            == "rolling3_only"
            and point3 != ""
        ):
            combined = point3

        status = "ok"

        if active_mode == (
            "insufficient_history"
        ):
            status = (
                "insufficient_history"
            )

        if (
            norm(
                row.get(
                    "rolling3Status"
                )
            )
            == "review_negative_delta"
            or
            norm(
                row.get(
                    "rolling7Status"
                )
            )
            == "review_negative_delta"
        ):
            status = "review"

        output_rows.append({
            "rank":
                "",

            "artist":
                artist,

            "latestDate":
                norm(
                    row.get(
                        "latestDate"
                    )
                ),

            "snapshotDateCount":
                norm(
                    row.get(
                        "snapshotDateCount"
                    )
                ),

            "rolling3Status":
                norm(
                    row.get(
                        "rolling3Status"
                    )
                ),

            "rolling3ListenerDeltaPerDay":
                norm(
                    row.get(
                        "rolling3ListenerDeltaPerDay"
                    )
                ),

            "rolling3PlaycountDeltaPerDay":
                norm(
                    row.get(
                        "rolling3PlaycountDeltaPerDay"
                    )
                ),

            "rolling3ListenerLogNormalized":
                score3[
                    "listenerNormalized"
                ],

            "rolling3PlaycountLogNormalized":
                score3[
                    "playcountNormalized"
                ],

            "rolling3PreviewPoint":
                point3,

            "rolling7Status":
                norm(
                    row.get(
                        "rolling7Status"
                    )
                ),

            "rolling7ListenerDeltaPerDay":
                norm(
                    row.get(
                        "rolling7ListenerDeltaPerDay"
                    )
                ),

            "rolling7PlaycountDeltaPerDay":
                norm(
                    row.get(
                        "rolling7PlaycountDeltaPerDay"
                    )
                ),

            "rolling7ListenerLogNormalized":
                score7[
                    "listenerNormalized"
                ],

            "rolling7PlaycountLogNormalized":
                score7[
                    "playcountNormalized"
                ],

            "rolling7PreviewPoint":
                point7,

            "activeMode":
                active_mode,

            "rollingCombinedPreviewPoint":
                combined,

            "status":
                status,
        })

    ready_rows = [
        row
        for row in output_rows
        if row[
            "rollingCombinedPreviewPoint"
        ] != ""
    ]

    ready_rows.sort(
        key=lambda row:
            float(
                row[
                    "rollingCombinedPreviewPoint"
                ]
            ),
        reverse=True,
    )

    rank_map = {
        row["artist"]: rank
        for rank, row in enumerate(
            ready_rows,
            start=1,
        )
    }

    for row in output_rows:
        if row["artist"] in rank_map:
            row["rank"] = (
                rank_map[
                    row["artist"]
                ]
            )

    output_rows.sort(
        key=lambda row: (
            999
            if row["rank"] == ""
            else int(row["rank"]),
            row["artist"],
        )
    )

    write_csv(
        output_rows
    )

    score_ready_count = sum(
        1
        for row in output_rows
        if row[
            "rollingCombinedPreviewPoint"
        ] != ""
    )

    needs_review_count = sum(
        1
        for row in output_rows
        if row["status"] == "review"
    )

    latest_date = max(
        norm(
            row.get("latestDate")
        )
        for row in rows
    )

    payload = {
        "version":
            VERSION,

        "latestDate":
            latest_date,

        "artistCount":
            len(rows),

        "rolling3ReadyCount":
            rolling3_ready,

        "rolling7ReadyCount":
            rolling7_ready,

        "activeMode":
            active_mode,

        "scoreReadyCount":
            score_ready_count,

        "needsReviewCount":
            needs_review_count,

        "weights": {
            "listenerVsPlaycount": {
                "listener": 0.5,
                "playcount": 0.5,
            },

            "rollingWindow": {
                "rolling3": 0.5,
                "rolling7": 0.5,
            },
        },

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
        f"latestDate: "
        f"{latest_date}"
    )

    print(
        f"artistCount: "
        f"{len(rows)}"
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
        f"activeMode: "
        f"{active_mode}"
    )

    print(
        f"scoreReadyCount: "
        f"{score_ready_count}/10"
    )

    print(
        f"needsReviewCount: "
        f"{needs_review_count}"
    )

    print(
        f"output: "
        f"{OUTPUT_CSV}"
    )

    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()