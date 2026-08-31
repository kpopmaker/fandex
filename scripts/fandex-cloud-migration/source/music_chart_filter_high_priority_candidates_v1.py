from __future__ import annotations

import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_filter_high_priority_candidates_v1"

QUEUE_FILE = Path(
    "music_chart_refresh_priority_queue_v1_latest.csv"
)

CANDIDATE_FILE = Path(
    "music_chart_artist_candidates_v2_latest.csv"
)

OUTPUT_CSV = Path(
    "music_chart_high_priority_candidates_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_high_priority_candidates_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_HIGH_PRIORITY_CANDIDATES_V1.txt"
)


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
        reader = csv.DictReader(f)

        fieldnames = list(
            reader.fieldnames or []
        )

        rows = [
            dict(row)
            for row in reader
        ]

    return rows, fieldnames


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
        "FANDEX Music Chart "
        "HIGH Priority Candidate Filter v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: FILTER / REVIEW ONLY")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    queue_rows, _ = read_csv(
        QUEUE_FILE
    )

    candidate_rows, candidate_fields = (
        read_csv(
            CANDIDATE_FILE
        )
    )

    if "artist" not in candidate_fields:
        raise RuntimeError(
            "Candidate CSV missing artist field."
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
            "No HIGH priority artists found."
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
                    row.get("refreshPriority")
                ),

            "coverageStatus":
                norm(
                    row.get("coverageStatus")
                ),

            "reason":
                norm(
                    row.get("reason")
                ),

            "recommendedAction":
                norm(
                    row.get(
                        "recommendedAction"
                    )
                ),
        }

    high_artists = set(
        high_map
    )

    filtered = []

    for candidate in candidate_rows:
        artist = norm(
            candidate.get("artist")
        )

        if artist not in high_artists:
            continue

        meta = high_map[artist]

        output_row = {
            "refreshRank":
                meta["refreshRank"],

            "refreshPriority":
                meta["refreshPriority"],

            "coverageStatus":
                meta["coverageStatus"],

            "refreshReason":
                meta["reason"],

            "recommendedAction":
                meta["recommendedAction"],
        }

        for field in candidate_fields:
            output_row[field] = candidate.get(
                field,
                "",
            )

        filtered.append(
            output_row
        )

    def rank_value(row):
        try:
            return int(
                norm(
                    row.get("refreshRank")
                )
            )
        except Exception:
            return 999

    def chart_rank_value(row):
        try:
            return float(
                norm(
                    row.get("rank")
                )
            )
        except Exception:
            return 999999

    filtered.sort(
        key=lambda row: (
            rank_value(row),
            norm(
                row.get("platform")
            ),
            chart_rank_value(row),
            norm(
                row.get("trackTitle")
            ),
        )
    )

    output_fields = [
        "refreshRank",
        "refreshPriority",
        "coverageStatus",
        "refreshReason",
        "recommendedAction",
    ]

    for field in candidate_fields:
        if field not in output_fields:
            output_fields.append(
                field
            )

    write_csv(
        OUTPUT_CSV,
        filtered,
        output_fields,
    )

    candidate_counts = Counter(
        norm(
            row.get("artist")
        )
        for row in filtered
    )

    artist_results = []

    for artist, meta in sorted(
        high_map.items(),
        key=lambda item: (
            int(
                item[1]["refreshRank"]
                or 999
            )
        ),
    ):
        count = candidate_counts.get(
            artist,
            0,
        )

        artist_results.append({
            "artist":
                artist,

            "refreshRank":
                meta["refreshRank"],

            "coverageStatus":
                meta["coverageStatus"],

            "candidateCount":
                count,

            "candidateStatus":
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

        "highPriorityArtistCount":
            len(high_artists),

        "allCandidateCount":
            len(candidate_rows),

        "highPriorityCandidateCount":
            len(filtered),

        "artists":
            artist_results,

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
        "FANDEX Music Chart HIGH Priority Candidates v1",
        "=" * 72,
        "",
        f"HIGH artists: {len(high_artists)}",
        f"All candidates: {len(candidate_rows)}",
        f"HIGH candidates: {len(filtered)}",
        "",
    ]

    print()
    print("HIGH priority candidate results")
    print("-" * 72)

    for result in artist_results:
        line = (
            f"{result['refreshRank']} | "
            f"{result['artist']} | "
            f"{result['coverageStatus']} | "
            f"candidates={result['candidateCount']} | "
            f"{result['candidateStatus']}"
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
        f"HIGH artist count: "
        f"{len(high_artists)}"
    )
    print(
        f"all candidate count: "
        f"{len(candidate_rows)}"
    )
    print(
        f"HIGH candidate count: "
        f"{len(filtered)}"
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