from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path


VERSION = "music_chart_coverage_health_v1"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MUSIC_RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

SUMMARY_CSV = Path(
    "music_chart_coverage_health_v1_latest.csv"
)

ENTRY_CSV = Path(
    "music_chart_coverage_health_entries_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_coverage_health_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_COVERAGE_HEALTH_V1.txt"
)


SUMMARY_FIELDS = [
    "artist",
    "musicRecordPresent",
    "currentMusicPoint",
    "seedEntryCount",
    "rankedEntryCount",
    "nonEntryCount",
    "platformCount",
    "platforms",
    "latestChartDate",
    "latestAgeDays",
    "freshestDecayFactor",
    "freshEntryCount",
    "staleEntryCount",
    "oldEntryCount",
    "expiredEntryCount",
    "coverageStatus",
]

ENTRY_FIELDS = [
    "artist",
    "platform",
    "chartName",
    "trackTitle",
    "rank",
    "chartDate",
    "ageDays",
    "decayFactor",
    "freshness",
    "entryStatus",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_float(value, default=0.0):
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


def parse_date(value):
    try:
        return date.fromisoformat(
            norm(value)
        )
    except Exception:
        return None


def decay_factor(days_old):
    if days_old is None:
        return 0.0

    if days_old <= 3:
        return 1.0

    if days_old <= 7:
        return 0.7

    if days_old <= 14:
        return 0.4

    if days_old <= 30:
        return 0.2

    return 0.0


def freshness(days_old):
    if days_old is None:
        return "unknown"

    if days_old <= 3:
        return "fresh"

    if days_old <= 7:
        return "stale"

    if days_old <= 30:
        return "old"

    return "expired"


def rank_is_valid(value):
    text = norm(value)

    if text == "":
        return False

    try:
        return float(text) > 0
    except Exception:
        return False


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def read_csv(path):
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


def ranking_rows(payload):
    if (
        isinstance(payload, dict)
        and isinstance(
            payload.get("ranking"),
            list,
        )
    ):
        return [
            row
            for row in payload["ranking"]
            if isinstance(row, dict)
        ]

    if isinstance(payload, list):
        return [
            row
            for row in payload
            if isinstance(row, dict)
        ]

    return []


def get_music_point(row):
    for key in [
        "fandexMusicChartFinalPoint",
        "musicPoint",
        "music",
        "score",
    ]:
        if key in row:
            return safe_float(
                row.get(key)
            )

    return 0.0


def write_csv(
    path,
    rows,
    fieldnames,
):
    temp = path.with_suffix(
        path.suffix + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(path)


def main():
    print()
    print(
        "FANDEX Music Chart Coverage Health v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: DIAGNOSTIC ONLY")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    today = date.today()

    master_payload = read_json(
        MASTER_FILE
    )

    music_payload = read_json(
        MUSIC_RANKING_FILE
    )

    seed_rows = read_csv(
        SEED_FILE
    )

    master_rows = ranking_rows(
        master_payload
    )

    music_rows = ranking_rows(
        music_payload
    )

    if len(master_rows) != 10:
        raise RuntimeError(
            "Expected 10 artists in Master, "
            f"got {len(master_rows)}."
        )

    artists = [
        norm(row.get("artist"))
        for row in master_rows
    ]

    if (
        len(set(artists)) != 10
        or "" in artists
    ):
        raise RuntimeError(
            "Master artist list is invalid."
        )

    music_map = {
        norm(row.get("artist")):
            row
        for row in music_rows
        if norm(row.get("artist"))
    }

    seed_by_artist = defaultdict(
        list
    )

    entry_rows = []

    for row in seed_rows:
        artist = norm(
            row.get("artist")
        )

        if not artist:
            continue

        chart_date_text = norm(
            row.get("chartDate")
        )

        chart_date = parse_date(
            chart_date_text
        )

        age_days = None

        if chart_date is not None:
            age_days = (
                today - chart_date
            ).days

            if age_days < 0:
                age_days = 0

        factor = decay_factor(
            age_days
        )

        valid_rank = rank_is_valid(
            row.get("rank")
        )

        if not valid_rank:
            entry_status = "not_ranked"

        elif factor == 0.0:
            entry_status = "expired"

        elif factor < 1.0:
            entry_status = "decayed"

        else:
            entry_status = "active"

        enriched = {
            "artist":
                artist,

            "platform":
                norm(
                    row.get("platform")
                ),

            "chartName":
                norm(
                    row.get("chartName")
                ),

            "trackTitle":
                norm(
                    row.get("trackTitle")
                ),

            "rank":
                norm(
                    row.get("rank")
                ),

            "chartDate":
                chart_date_text,

            "ageDays":
                ""
                if age_days is None
                else age_days,

            "decayFactor":
                factor,

            "freshness":
                freshness(
                    age_days
                ),

            "entryStatus":
                entry_status,
        }

        entry_rows.append(
            enriched
        )

        seed_by_artist[
            artist
        ].append(
            enriched
        )

    summary_rows = []

    missing_count = 0
    fresh_count = 0
    decayed_only_count = 0
    expired_only_count = 0
    no_ranked_count = 0

    print()
    print("Artist coverage")
    print("-" * 72)

    for artist in artists:
        artist_entries = (
            seed_by_artist.get(
                artist,
                [],
            )
        )

        music_record = (
            music_map.get(
                artist
            )
        )

        music_present = (
            music_record is not None
        )

        current_music_point = (
            get_music_point(
                music_record
            )
            if music_present
            else 0.0
        )

        ranked_entries = [
            row
            for row in artist_entries
            if rank_is_valid(
                row.get("rank")
            )
        ]

        non_entry_count = (
            len(artist_entries)
            - len(ranked_entries)
        )

        platforms = sorted({
            norm(
                row.get("platform")
            )
            for row in artist_entries
            if norm(
                row.get("platform")
            )
        })

        valid_dates = []

        for row in artist_entries:
            parsed = parse_date(
                row.get("chartDate")
            )

            if parsed is not None:
                valid_dates.append(
                    parsed
                )

        latest_date = (
            max(valid_dates)
            if valid_dates
            else None
        )

        latest_age_days = (
            (today - latest_date).days
            if latest_date is not None
            else None
        )

        if (
            latest_age_days is not None
            and latest_age_days < 0
        ):
            latest_age_days = 0

        ranked_factors = [
            safe_float(
                row.get(
                    "decayFactor"
                )
            )
            for row in ranked_entries
        ]

        freshest_factor = (
            max(ranked_factors)
            if ranked_factors
            else None
        )

        fresh_entries = sum(
            1
            for row in ranked_entries
            if row[
                "freshness"
            ] == "fresh"
        )

        stale_entries = sum(
            1
            for row in ranked_entries
            if row[
                "freshness"
            ] == "stale"
        )

        old_entries = sum(
            1
            for row in ranked_entries
            if row[
                "freshness"
            ] == "old"
        )

        expired_entries = sum(
            1
            for row in ranked_entries
            if row[
                "freshness"
            ] == "expired"
        )

        if not artist_entries:
            coverage_status = "missing"
            missing_count += 1

        elif not ranked_entries:
            coverage_status = (
                "no_ranked_entries"
            )
            no_ranked_count += 1

        elif freshest_factor == 0.0:
            coverage_status = (
                "expired_only"
            )
            expired_only_count += 1

        elif freshest_factor < 1.0:
            coverage_status = (
                "decayed_only"
            )
            decayed_only_count += 1

        else:
            coverage_status = "fresh"
            fresh_count += 1

        summary = {
            "artist":
                artist,

            "musicRecordPresent":
                "TRUE"
                if music_present
                else "FALSE",

            "currentMusicPoint":
                round(
                    current_music_point,
                    2,
                ),

            "seedEntryCount":
                len(
                    artist_entries
                ),

            "rankedEntryCount":
                len(
                    ranked_entries
                ),

            "nonEntryCount":
                non_entry_count,

            "platformCount":
                len(
                    platforms
                ),

            "platforms":
                "|".join(
                    platforms
                ),

            "latestChartDate":
                (
                    latest_date.isoformat()
                    if latest_date
                    else ""
                ),

            "latestAgeDays":
                (
                    ""
                    if latest_age_days is None
                    else latest_age_days
                ),

            "freshestDecayFactor":
                (
                    ""
                    if freshest_factor is None
                    else freshest_factor
                ),

            "freshEntryCount":
                fresh_entries,

            "staleEntryCount":
                stale_entries,

            "oldEntryCount":
                old_entries,

            "expiredEntryCount":
                expired_entries,

            "coverageStatus":
                coverage_status,
        }

        summary_rows.append(
            summary
        )

        print(
            f"{artist} | "
            f"Music={summary['currentMusicPoint']} | "
            f"platforms={summary['platformCount']} | "
            f"latest={summary['latestChartDate'] or '-'} | "
            f"age={summary['latestAgeDays'] if summary['latestAgeDays'] != '' else '-'} | "
            f"factor={summary['freshestDecayFactor'] if summary['freshestDecayFactor'] != '' else '-'} | "
            f"status={coverage_status}"
        )

    write_csv(
        SUMMARY_CSV,
        summary_rows,
        SUMMARY_FIELDS,
    )

    write_csv(
        ENTRY_CSV,
        entry_rows,
        ENTRY_FIELDS,
    )

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "asOfDate":
            today.isoformat(),

        "artistCount":
            len(artists),

        "seedEntryCount":
            len(seed_rows),

        "musicRankingArtistCount":
            len(music_rows),

        "statusCounts": {
            "fresh":
                fresh_count,

            "decayedOnly":
                decayed_only_count,

            "expiredOnly":
                expired_only_count,

            "noRankedEntries":
                no_ranked_count,

            "missing":
                missing_count,
        },

        "artists":
            summary_rows,

        "policy": {
            "days0To3":
                1.0,

            "days4To7":
                0.7,

            "days8To14":
                0.4,

            "days15To30":
                0.2,

            "daysOver30":
                0.0,

            "sourceTypeIndependent":
                True,
        },

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

    lines = []

    lines.append(
        "FANDEX Music Chart Coverage Health v1"
    )

    lines.append("=" * 72)

    lines.append(
        f"asOfDate: {today.isoformat()}"
    )

    lines.append(
        f"artistCount: {len(artists)}"
    )

    lines.append(
        f"seedEntryCount: {len(seed_rows)}"
    )

    lines.append(
        f"musicRankingArtistCount: "
        f"{len(music_rows)}"
    )

    lines.append("")

    for row in summary_rows:
        lines.append(
            f"{row['artist']} | "
            f"Music={row['currentMusicPoint']} | "
            f"platforms={row['platformCount']} | "
            f"latest={row['latestChartDate'] or '-'} | "
            f"age={row['latestAgeDays'] if row['latestAgeDays'] != '' else '-'} | "
            f"factor={row['freshestDecayFactor'] if row['freshestDecayFactor'] != '' else '-'} | "
            f"status={row['coverageStatus']}"
        )

    lines.append("")
    lines.append(
        f"fresh: {fresh_count}"
    )

    lines.append(
        f"decayedOnly: "
        f"{decayed_only_count}"
    )

    lines.append(
        f"expiredOnly: "
        f"{expired_only_count}"
    )

    lines.append(
        f"noRankedEntries: "
        f"{no_ranked_count}"
    )

    lines.append(
        f"missing: {missing_count}"
    )

    lines.append("")
    lines.append(
        "masterModified: FALSE"
    )

    lines.append(
        "websiteModified: FALSE"
    )

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print(
        f"artistCount: {len(artists)}"
    )
    print(
        f"seedEntryCount: {len(seed_rows)}"
    )
    print(
        f"musicRankingArtistCount: "
        f"{len(music_rows)}"
    )
    print()
    print(
        f"fresh: {fresh_count}"
    )
    print(
        f"decayedOnly: "
        f"{decayed_only_count}"
    )
    print(
        f"expiredOnly: "
        f"{expired_only_count}"
    )
    print(
        f"noRankedEntries: "
        f"{no_ranked_count}"
    )
    print(
        f"missing: {missing_count}"
    )
    print()
    print(
        f"summary: {SUMMARY_CSV}"
    )
    print(
        f"entries: {ENTRY_CSV}"
    )
    print(
        f"json: {OUTPUT_JSON}"
    )
    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()