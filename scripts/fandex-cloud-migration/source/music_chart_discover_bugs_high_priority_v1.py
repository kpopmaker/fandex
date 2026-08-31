from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import music_chart_collect_bugs_v1 as bugs
import music_chart_discover_artist_candidates_v2 as discover


VERSION = "music_chart_discover_bugs_high_priority_v1"

QUEUE_FILE = Path(
    "music_chart_refresh_priority_queue_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "music_chart_bugs_high_priority_candidates_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_bugs_high_priority_candidates_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_BUGS_HIGH_PRIORITY_CANDIDATES_V1.txt"
)


OUTPUT_FIELDS = [
    "refreshRank",
    "refreshPriority",
    "coverageStatus",
    "approve",
    "artist",
    "platform",
    "chartName",
    "trackTitle",
    "rank",
    "chartDate",
    "chartType",
    "metricType",
    "metricValue",
    "memo",
    "sourceKey",
    "matchedArtist",
    "matchedAlias",
    "rankSource",
    "sourceUrl",
]


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


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


def rank_number(value):
    try:
        return int(
            float(
                norm(value)
            )
        )
    except Exception:
        return 999999


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
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)

    temp.replace(path)


def main():
    print()
    print(
        "FANDEX Bugs HIGH Priority "
        "Artist Discovery v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: DISCOVERY / REVIEW ONLY")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    queue_rows = read_csv(
        QUEUE_FILE
    )

    high_rows = [
        row
        for row in queue_rows
        if norm(
            row.get("refreshPriority")
        ).upper() == "HIGH"
    ]

    if not high_rows:
        raise RuntimeError(
            "No HIGH priority artists."
        )

    high_map = {}

    for row in high_rows:
        artist = norm(
            row.get("artist")
        )

        if not artist:
            continue

        high_map[artist] = {
            "refreshRank":
                norm(
                    row.get("refreshRank")
                ),

            "refreshPriority":
                norm(
                    row.get(
                        "refreshPriority"
                    )
                ),

            "coverageStatus":
                norm(
                    row.get(
                        "coverageStatus"
                    )
                ),
        }

    print()
    print(
        f"HIGH target artists: "
        f"{len(high_map)}"
    )

    for artist, meta in sorted(
        high_map.items(),
        key=lambda item:
            int(
                item[1][
                    "refreshRank"
                ]
                or 999
            ),
    ):
        print(
            f"- {meta['refreshRank']} "
            f"{artist}"
        )

    print()
    print(
        f"Fetch Bugs chart: "
        f"{bugs.BUGS_CHART_URL}"
    )

    page = bugs.fetch_bugs_chart()

    chart_rows = (
        bugs.parse_bugs_chart(
            page
        )
    )

    if not chart_rows:
        raise RuntimeError(
            "Bugs chart parser returned 0 rows."
        )

    print(
        f"parsed Bugs rows: "
        f"{len(chart_rows)}"
    )

    today = date.today().isoformat()

    candidates = []

    seen = set()

    for chart_row in chart_rows:
        chart_artist = norm(
            chart_row.get("artist")
        )

        track_title = norm(
            chart_row.get(
                "trackTitle"
            )
        )

        rank = norm(
            chart_row.get("rank")
        )

        if (
            not chart_artist
            or not track_title
        ):
            continue

        matched = (
            discover.find_target_artist(
                chart_artist
            )
        )

        if matched is None:
            continue

        (
            target_artist,
            matched_alias,
        ) = matched

        if (
            target_artist
            not in high_map
        ):
            continue

        dedupe_key = (
            target_artist,
            track_title.lower(),
            rank,
        )

        if dedupe_key in seen:
            continue

        seen.add(
            dedupe_key
        )

        meta = high_map[
            target_artist
        ]

        candidates.append({
            "refreshRank":
                meta[
                    "refreshRank"
                ],

            "refreshPriority":
                meta[
                    "refreshPriority"
                ],

            "coverageStatus":
                meta[
                    "coverageStatus"
                ],

            "approve":
                "",

            "artist":
                target_artist,

            "platform":
                "bugs",

            "chartName":
                "Bugs Realtime",

            "trackTitle":
                track_title,

            "rank":
                rank,

            "chartDate":
                today,

            "chartType":
                "realtime",

            "metricType":
                "",

            "metricValue":
                "",

            "memo":
                (
                    f"candidate_discovered_by="
                    f"{VERSION}; "
                    f"sourceKey=bugs_realtime; "
                    f"matchedArtist="
                    f"{chart_artist}; "
                    f"matchedAlias="
                    f"{matched_alias}; "
                    f"sourceUrl="
                    f"{bugs.BUGS_CHART_URL}"
                ),

            "sourceKey":
                "bugs_realtime",

            "matchedArtist":
                chart_artist,

            "matchedAlias":
                matched_alias,

            "rankSource":
                "bugs_rank",

            "sourceUrl":
                bugs.BUGS_CHART_URL,
        })

    candidates.sort(
        key=lambda row: (
            int(
                row[
                    "refreshRank"
                ]
                or 999
            ),
            rank_number(
                row["rank"]
            ),
            row[
                "trackTitle"
            ],
        )
    )

    write_csv(
        OUTPUT_CSV,
        candidates,
    )

    counts = Counter(
        row["artist"]
        for row in candidates
    )

    artist_results = []

    for artist, meta in sorted(
        high_map.items(),
        key=lambda item:
            int(
                item[1][
                    "refreshRank"
                ]
                or 999
            ),
    ):
        count = counts.get(
            artist,
            0,
        )

        artist_results.append({
            "artist":
                artist,

            "refreshRank":
                meta[
                    "refreshRank"
                ],

            "candidateCount":
                count,

            "status":
                (
                    "FOUND"
                    if count > 0
                    else "MISS"
                ),
        })

    payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "chartDate":
            today,

        "source":
            "bugs",

        "sourceUrl":
            bugs.BUGS_CHART_URL,

        "parsedChartRowCount":
            len(chart_rows),

        "highPriorityArtistCount":
            len(high_map),

        "candidateCount":
            len(candidates),

        "artists":
            artist_results,

        "candidates":
            candidates,

        "seedModified":
            False,

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
        (
            "FANDEX Bugs HIGH Priority "
            "Artist Discovery v1"
        ),
        "=" * 72,
        f"chartDate: {today}",
        (
            f"parsedChartRowCount: "
            f"{len(chart_rows)}"
        ),
        "",
    ]

    print()
    print(
        "HIGH artist Bugs results"
    )
    print("-" * 72)

    for result in artist_results:
        line = (
            f"{result['refreshRank']} | "
            f"{result['artist']} | "
            f"candidates="
            f"{result['candidateCount']} | "
            f"{result['status']}"
        )

        print(line)
        lines.append(line)

    if candidates:
        print()
        print("Candidates")
        print("-" * 72)

        lines.append("")
        lines.append("Candidates")
        lines.append("-" * 72)

        for row in candidates:
            line = (
                f"{row['refreshRank']} | "
                f"{row['artist']} | "
                f"rank={row['rank']} | "
                f"{row['trackTitle']} | "
                f"matchedArtist="
                f"{row['matchedArtist']}"
            )

            print(line)
            lines.append(line)

    lines.append("")
    lines.append(
        "seedModified: FALSE"
    )
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
        f"candidateCount: "
        f"{len(candidates)}"
    )
    print(
        f"output: {OUTPUT_CSV}"
    )
    print(
        f"json: {OUTPUT_JSON}"
    )
    print(
        f"report: {REPORT_FILE}"
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