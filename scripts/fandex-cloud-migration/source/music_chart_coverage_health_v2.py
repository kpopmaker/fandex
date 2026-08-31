from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path


VERSION = "music_chart_coverage_health_v2"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MUSIC_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

SEED_FILE = Path(
    "music_chart_seed_v1.csv"
)

SUMMARY_CSV = Path(
    "music_chart_coverage_health_v2_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_coverage_health_v2_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_COVERAGE_HEALTH_V2.txt"
)


FIELDS = [
    "artist",
    "currentMusicPoint",

    "seedEntryCount",
    "rankedEntryCount",
    "nonEntryCount",

    "checkedPlatformCount",
    "checkedPlatforms",
    "rankedPlatformCount",
    "rankedPlatforms",

    "latestCheckedDate",
    "latestCheckedAgeDays",

    "latestRankedDate",
    "latestRankedAgeDays",

    "freshestRankedDecayFactor",

    "freshRankedEntryCount",
    "decayedRankedEntryCount",
    "expiredRankedEntryCount",

    "recentNonEntryCount",

    "coverageStatus",
    "refreshPriority",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return 0.0


def parse_date(value):
    try:
        return date.fromisoformat(
            norm(value)
        )
    except Exception:
        return None


def rank_is_valid(value):
    text = norm(value)

    if not text:
        return False

    try:
        return float(text) > 0
    except Exception:
        return False


def days_old(
    chart_date,
    today,
):
    parsed = parse_date(
        chart_date
    )

    if parsed is None:
        return None

    age = (
        today - parsed
    ).days

    return max(
        0,
        age,
    )


def decay_factor(age):
    if age is None:
        return 0.0

    if age <= 3:
        return 1.0

    if age <= 7:
        return 0.7

    if age <= 14:
        return 0.4

    if age <= 30:
        return 0.2

    return 0.0


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

    return []


def music_point(row):
    if not row:
        return 0.0

    return safe_float(
        row.get(
            "fandexMusicChartFinalPoint",
            row.get(
                "score",
                0,
            ),
        )
    )


def latest_date(rows):
    parsed = [
        parse_date(
            row.get("chartDate")
        )
        for row in rows
    ]

    parsed = [
        value
        for value in parsed
        if value is not None
    ]

    if not parsed:
        return None

    return max(parsed)


def write_csv(
    path,
    rows,
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
            fieldnames=FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(path)


def classify(
    all_entries,
    ranked_entries,
    today,
):
    if not all_entries:
        return (
            "missing",
            "HIGH",
        )

    checked_dates = [
        parse_date(
            row.get("chartDate")
        )
        for row in all_entries
    ]

    checked_dates = [
        value
        for value in checked_dates
        if value is not None
    ]

    if not checked_dates:
        return (
            "invalid_dates",
            "REVIEW",
        )

    latest_check = max(
        checked_dates
    )

    latest_check_age = (
        today - latest_check
    ).days

    latest_check_age = max(
        0,
        latest_check_age,
    )

    ranked_factors = []

    for row in ranked_entries:
        age = days_old(
            row.get("chartDate"),
            today,
        )

        ranked_factors.append(
            decay_factor(age)
        )

    has_fresh_ranked = any(
        factor == 1.0
        for factor in ranked_factors
    )

    has_active_ranked = any(
        factor > 0.0
        for factor in ranked_factors
    )

    # 최근 3일 안에 실제 소스를 확인했는가?
    recent_check = (
        latest_check_age <= 3
    )

    if has_fresh_ranked:
        return (
            "fresh_ranked",
            "LOW",
        )

    # 최근 확인은 했지만 현재 순위 진입은 없음.
    # 오래된 ranked entry가 있어도 현재 0점은
    # 유효한 최신 정보로 취급한다.
    if (
        recent_check
        and not has_fresh_ranked
    ):
        return (
            "fresh_checked_not_ranked",
            "LOW",
        )

    if has_active_ranked:
        return (
            "decayed_ranked",
            "MEDIUM",
        )

    if ranked_entries:
        return (
            "expired_ranked_no_recent_check",
            "HIGH",
        )

    return (
        "checked_not_ranked_stale",
        "HIGH",
    )


def main():
    print()
    print(
        "FANDEX Music Chart "
        "Coverage Health v2"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: DIAGNOSTIC ONLY")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    today = date.today()

    master = read_json(
        MASTER_FILE
    )

    music = read_json(
        MUSIC_FILE
    )

    seed_rows = read_csv(
        SEED_FILE
    )

    master_rows = ranking_rows(
        master
    )

    music_rows = ranking_rows(
        music
    )

    if len(master_rows) != 10:
        raise RuntimeError(
            "Expected 10 Master artists, "
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
            "Master artist set invalid."
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

    for row in seed_rows:
        artist = norm(
            row.get("artist")
        )

        if artist:
            seed_by_artist[
                artist
            ].append(row)

    output = []

    print()
    print("Artist coverage")
    print("-" * 72)

    for artist in artists:
        entries = seed_by_artist.get(
            artist,
            [],
        )

        ranked = [
            row
            for row in entries
            if rank_is_valid(
                row.get("rank")
            )
        ]

        non_ranked = [
            row
            for row in entries
            if not rank_is_valid(
                row.get("rank")
            )
        ]

        checked_platforms = sorted({
            norm(
                row.get("platform")
            )
            for row in entries
            if norm(
                row.get("platform")
            )
        })

        ranked_platforms = sorted({
            norm(
                row.get("platform")
            )
            for row in ranked
            if norm(
                row.get("platform")
            )
        })

        latest_checked = (
            latest_date(entries)
        )

        latest_ranked = (
            latest_date(ranked)
        )

        checked_age = (
            None
            if latest_checked is None
            else max(
                0,
                (
                    today
                    - latest_checked
                ).days,
            )
        )

        ranked_age = (
            None
            if latest_ranked is None
            else max(
                0,
                (
                    today
                    - latest_ranked
                ).days,
            )
        )

        ranked_factors = []

        fresh_ranked = 0
        decayed_ranked = 0
        expired_ranked = 0

        for row in ranked:
            age = days_old(
                row.get(
                    "chartDate"
                ),
                today,
            )

            factor = decay_factor(
                age
            )

            ranked_factors.append(
                factor
            )

            if factor == 1.0:
                fresh_ranked += 1

            elif factor > 0.0:
                decayed_ranked += 1

            else:
                expired_ranked += 1

        recent_non_entry = 0

        for row in non_ranked:
            age = days_old(
                row.get(
                    "chartDate"
                ),
                today,
            )

            if (
                age is not None
                and age <= 3
            ):
                recent_non_entry += 1

        freshest_ranked_factor = (
            max(ranked_factors)
            if ranked_factors
            else None
        )

        (
            coverage_status,
            refresh_priority,
        ) = classify(
            entries,
            ranked,
            today,
        )

        current_point = music_point(
            music_map.get(
                artist
            )
        )

        result = {
            "artist":
                artist,

            "currentMusicPoint":
                round(
                    current_point,
                    2,
                ),

            "seedEntryCount":
                len(entries),

            "rankedEntryCount":
                len(ranked),

            "nonEntryCount":
                len(non_ranked),

            "checkedPlatformCount":
                len(
                    checked_platforms
                ),

            "checkedPlatforms":
                "|".join(
                    checked_platforms
                ),

            "rankedPlatformCount":
                len(
                    ranked_platforms
                ),

            "rankedPlatforms":
                "|".join(
                    ranked_platforms
                ),

            "latestCheckedDate":
                (
                    latest_checked.isoformat()
                    if latest_checked
                    else ""
                ),

            "latestCheckedAgeDays":
                (
                    ""
                    if checked_age is None
                    else checked_age
                ),

            "latestRankedDate":
                (
                    latest_ranked.isoformat()
                    if latest_ranked
                    else ""
                ),

            "latestRankedAgeDays":
                (
                    ""
                    if ranked_age is None
                    else ranked_age
                ),

            "freshestRankedDecayFactor":
                (
                    ""
                    if freshest_ranked_factor
                    is None
                    else freshest_ranked_factor
                ),

            "freshRankedEntryCount":
                fresh_ranked,

            "decayedRankedEntryCount":
                decayed_ranked,

            "expiredRankedEntryCount":
                expired_ranked,

            "recentNonEntryCount":
                recent_non_entry,

            "coverageStatus":
                coverage_status,

            "refreshPriority":
                refresh_priority,
        }

        output.append(
            result
        )

        print(
            f"{artist} | "
            f"Music={result['currentMusicPoint']} | "
            f"checked={result['latestCheckedDate'] or '-'} | "
            f"ranked={result['latestRankedDate'] or '-'} | "
            f"status={coverage_status} | "
            f"priority={refresh_priority}"
        )

    status_counts = Counter(
        row[
            "coverageStatus"
        ]
        for row in output
    )

    priority_counts = Counter(
        row[
            "refreshPriority"
        ]
        for row in output
    )

    write_csv(
        SUMMARY_CSV,
        output,
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
            len(output),

        "statusCounts":
            dict(
                status_counts
            ),

        "priorityCounts":
            dict(
                priority_counts
            ),

        "artists":
            output,

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

    lines = [
        "FANDEX Music Chart Coverage Health v2",
        "=" * 72,
        f"asOfDate: {today.isoformat()}",
        "",
    ]

    for row in output:
        lines.append(
            f"{row['artist']} | "
            f"Music={row['currentMusicPoint']} | "
            f"checked={row['latestCheckedDate'] or '-'} | "
            f"ranked={row['latestRankedDate'] or '-'} | "
            f"status={row['coverageStatus']} | "
            f"priority={row['refreshPriority']}"
        )

    lines.append("")
    lines.append(
        f"statusCounts: "
        f"{dict(status_counts)}"
    )

    lines.append(
        f"priorityCounts: "
        f"{dict(priority_counts)}"
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
        f"statusCounts: "
        f"{dict(status_counts)}"
    )

    print(
        f"priorityCounts: "
        f"{dict(priority_counts)}"
    )

    print()
    print(
        f"summary: {SUMMARY_CSV}"
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