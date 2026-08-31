import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_global_interest_delta_v1"

HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

OUTPUT_CSV = Path(
    "lastfm_global_interest_delta_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_lastfm_global_interest_delta_v1_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_LASTFM_GLOBAL_INTEREST_DELTA_V1_REPORT.txt"
)


FIELDS = [
    "artist",
    "lastfmName",
    "status",
    "previousDate",
    "latestDate",
    "daysBetween",
    "previousListeners",
    "latestListeners",
    "listenerDelta",
    "listenerDeltaPerDay",
    "previousPlaycount",
    "latestPlaycount",
    "playcountDelta",
    "playcountDeltaPerDay",
    "warnings",
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


def write_csv(path, rows):
    with path.open(
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


def parse_date(value):
    text = clean(value)

    try:
        return datetime.strptime(
            text,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        return None


def round_value(value):
    return round(value, 2)


def main():
    print()
    print(
        "FANDEX Last.fm Global Interest "
        "delta v1"
    )
    print("=" * 84)
    print(f"version: {VERSION}")
    print(
        "formula: latest snapshot - "
        "previous distinct-date snapshot"
    )
    print(
        "scoreUsage: "
        "delta_preview_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 84)

    history_rows = read_csv(
        HISTORY_FILE
    )

    if not history_rows:
        raise SystemExit(
            "ERROR: Last.fm history가 비어 있습니다."
        )

    by_artist = defaultdict(list)

    for row in history_rows:
        artist = clean(
            row.get("artist")
        )

        snapshot_date = parse_date(
            row.get("snapshotDate")
        )

        if not artist:
            continue

        if snapshot_date is None:
            raise SystemExit(
                f"ERROR: {artist} snapshotDate 형식 오류"
            )

        by_artist[artist].append({
            "snapshotDate": snapshot_date,
            "snapshotAt": clean(
                row.get("snapshotAt")
            ),
            "lastfmName": clean(
                row.get("lastfmName")
            ),
            "listeners": to_int(
                row.get("listeners")
            ),
            "playcount": to_int(
                row.get("playcount")
            ),
        })

    if len(by_artist) != 10:
        raise SystemExit(
            "ERROR: history artist count가 "
            f"10이 아닙니다: {len(by_artist)}"
        )

    results = []

    ready_count = 0
    insufficient_count = 0
    review_count = 0

    print()
    print("artist delta")
    print("-" * 84)

    for artist in sorted(by_artist):
        snapshots = by_artist[artist]

        # 날짜별 마지막 snapshot만 사용
        date_map = {}

        for snapshot in snapshots:
            key = snapshot["snapshotDate"]

            previous = date_map.get(key)

            if previous is None:
                date_map[key] = snapshot
                continue

            # 같은 날짜 여러 row가 있더라도
            # snapshotAt이 더 뒤인 것을 선택
            if (
                snapshot["snapshotAt"]
                >= previous["snapshotAt"]
            ):
                date_map[key] = snapshot

        distinct_snapshots = [
            date_map[key]
            for key in sorted(date_map)
        ]

        latest = distinct_snapshots[-1]

        warnings = []

        if len(distinct_snapshots) < 2:
            status = "insufficient_history"

            insufficient_count += 1

            result = {
                "artist": artist,
                "lastfmName":
                    latest["lastfmName"],
                "status": status,
                "previousDate": "",
                "latestDate":
                    latest[
                        "snapshotDate"
                    ].isoformat(),
                "daysBetween": "",
                "previousListeners": "",
                "latestListeners":
                    latest["listeners"],
                "listenerDelta": "",
                "listenerDeltaPerDay": "",
                "previousPlaycount": "",
                "latestPlaycount":
                    latest["playcount"],
                "playcountDelta": "",
                "playcountDeltaPerDay": "",
                "warnings": "",
            }

            results.append(result)

            print(
                f"{artist} | "
                f"status={status} | "
                f"snapshots="
                f"{len(distinct_snapshots)}"
            )

            continue

        previous = distinct_snapshots[-2]

        days_between = (
            latest["snapshotDate"]
            - previous["snapshotDate"]
        ).days

        listener_delta = (
            latest["listeners"]
            - previous["listeners"]
        )

        playcount_delta = (
            latest["playcount"]
            - previous["playcount"]
        )

        if days_between <= 0:
            warnings.append(
                "INVALID_DATE_INTERVAL"
            )

        if listener_delta < 0:
            warnings.append(
                "NEGATIVE_LISTENER_DELTA"
            )

        if playcount_delta < 0:
            warnings.append(
                "NEGATIVE_PLAYCOUNT_DELTA"
            )

        if days_between > 0:
            listener_per_day = (
                listener_delta
                / days_between
            )

            playcount_per_day = (
                playcount_delta
                / days_between
            )

        else:
            listener_per_day = 0
            playcount_per_day = 0

        if warnings:
            status = "needs_review"
            review_count += 1

        else:
            status = "delta_ready"
            ready_count += 1

        result = {
            "artist": artist,
            "lastfmName":
                latest["lastfmName"],
            "status": status,

            "previousDate":
                previous[
                    "snapshotDate"
                ].isoformat(),

            "latestDate":
                latest[
                    "snapshotDate"
                ].isoformat(),

            "daysBetween":
                days_between,

            "previousListeners":
                previous["listeners"],

            "latestListeners":
                latest["listeners"],

            "listenerDelta":
                listener_delta,

            "listenerDeltaPerDay":
                round_value(
                    listener_per_day
                ),

            "previousPlaycount":
                previous["playcount"],

            "latestPlaycount":
                latest["playcount"],

            "playcountDelta":
                playcount_delta,

            "playcountDeltaPerDay":
                round_value(
                    playcount_per_day
                ),

            "warnings":
                "|".join(warnings),
        }

        results.append(result)

        print(
            f"{artist} | "
            f"status={status} | "
            f"{previous['snapshotDate']} "
            f"-> {latest['snapshotDate']} | "
            f"listeners Δ={listener_delta} | "
            f"playcount Δ={playcount_delta}"
        )

        if warnings:
            print(
                "  warnings: "
                + "|".join(warnings)
            )

    write_csv(
        OUTPUT_CSV,
        results,
    )

    snapshot_dates = sorted({
        clean(
            row.get("snapshotDate")
        )
        for row in history_rows
        if clean(
            row.get("snapshotDate")
        )
    })

    payload = {
        "version": VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "historyRowCount":
            len(history_rows),

        "artistCount":
            len(by_artist),

        "snapshotDateCount":
            len(snapshot_dates),

        "deltaReadyCount":
            ready_count,

        "insufficientHistoryCount":
            insufficient_count,

        "needsReviewCount":
            review_count,

        "scoreUsage":
            (
                "delta_preview_only_"
                "not_master_score"
            ),

        "masterModified": False,
        "websiteModified": False,

        "rows": results,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    report = [
        (
            "FANDEX Last.fm Global "
            "Interest Delta v1"
        ),
        "=" * 84,
        f"version: {VERSION}",
        "",
        (
            f"historyRowCount: "
            f"{len(history_rows)}"
        ),
        (
            f"artistCount: "
            f"{len(by_artist)}"
        ),
        (
            "snapshotDateCount: "
            f"{len(snapshot_dates)}"
        ),
        (
            "deltaReadyCount: "
            f"{ready_count}"
        ),
        (
            "insufficientHistoryCount: "
            f"{insufficient_count}"
        ),
        (
            "needsReviewCount: "
            f"{review_count}"
        ),
        "",
    ]

    for row in results:
        report.append(
            f"{row['artist']} | "
            f"status={row['status']} | "
            f"listenerDelta="
            f"{row['listenerDelta']} | "
            f"playcountDelta="
            f"{row['playcountDelta']} | "
            f"warnings="
            f"{row['warnings']}"
        )

    report.extend([
        "",
        (
            "scoreUsage: "
            "delta_preview_only_"
            "not_master_score"
        ),
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    OUTPUT_REPORT.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 84)

    print(
        f"historyRowCount: "
        f"{len(history_rows)}"
    )

    print(
        f"artistCount: "
        f"{len(by_artist)}"
    )

    print(
        "snapshotDateCount: "
        f"{len(snapshot_dates)}"
    )

    print(
        "deltaReadyCount: "
        f"{ready_count}"
    )

    print(
        "insufficientHistoryCount: "
        f"{insufficient_count}"
    )

    print(
        "needsReviewCount: "
        f"{review_count}"
    )

    print(
        f"CSV: {OUTPUT_CSV}"
    )

    print(
        f"JSON: {OUTPUT_JSON}"
    )

    print(
        f"report: {OUTPUT_REPORT}"
    )

    print(
        "scoreUsage: "
        "delta_preview_only_not_master_score"
    )

    print(
        "masterModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()