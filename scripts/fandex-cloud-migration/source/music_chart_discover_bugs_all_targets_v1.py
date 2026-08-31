from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import music_chart_collect_bugs_v1 as bugs
import music_chart_discover_artist_candidates_v2 as discover


VERSION = (
    "music_chart_discover_bugs_all_targets_v1"
)

OUTPUT_CSV = Path(
    "music_chart_bugs_all_targets_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "music_chart_bugs_all_targets_v1_latest.json"
)

REPORT_FILE = Path(
    "MUSIC_CHART_BUGS_ALL_TARGETS_V1_REPORT.txt"
)


FIELDS = [
    "artist",
    "platform",
    "chartName",
    "trackTitle",
    "rank",
    "chartDate",
    "chartType",
    "sourceKey",
    "matchedArtist",
    "matchedAlias",
    "sourceUrl",
]


def norm(value):
    if value is None:
        return ""

    return str(value).strip()


def rank_number(value):
    try:
        return int(
            float(
                norm(value)
            )
        )
    except Exception:
        return 999999


def alias_matches_safely(
    chart_artist,
    matched_alias,
):
    """
    Bugs 전용 alias 안전검사.

    영문 alias는 독립된 토큰일 때만 허용한다.

    예:
    IVE  <-> IVE (아이브)            = True
    IVE  <-> ALPHA DRIVE ONE         = False
    IU   <-> IU                      = True
    TXT  <-> TXT                     = True

    한글 alias는 기존 matcher 결과를 유지한다.
    """

    artist_text = norm(
        chart_artist
    )

    alias = norm(
        matched_alias
    )

    if (
        not artist_text
        or not alias
    ):
        return False


    has_ascii_letter = bool(
        re.search(
            r"[A-Za-z]",
            alias,
        )
    )


    # 한글 alias 등은 기존 동작 유지
    if not has_ascii_letter:
        return True


    escaped = re.escape(
        alias
    )


    # alias 안 공백은 연속 공백도 허용
    escaped = escaped.replace(
        r"\ ",
        r"\s+",
    )


    pattern = (
        r"(?<![A-Za-z0-9])"
        + escaped
        + r"(?![A-Za-z0-9])"
    )


    return bool(
        re.search(
            pattern,
            artist_text,
            flags=re.IGNORECASE,
        )
    )


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
                        "",
                    )
                for field in FIELDS
            })

    temp.replace(
        path
    )


def main():
    print()
    print(
        "FANDEX Bugs All Targets "
        "Discovery v1"
    )
    print("=" * 76)
    print(
        f"version: {VERSION}"
    )
    print(
        f"targetArtistCount: "
        f"{len(discover.TARGET_ARTISTS)}"
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
    print("=" * 76)


    page = bugs.fetch_bugs_chart()

    chart_rows = (
        bugs.parse_bugs_chart(
            page
        )
    )


    if not chart_rows:
        raise RuntimeError(
            "Bugs chart parser "
            "returned 0 rows."
        )


    print(
        f"parsedChartRowCount: "
        f"{len(chart_rows)}"
    )


    today = (
        date.today()
        .isoformat()
    )

    candidates = []

    seen = set()


    for chart_row in chart_rows:

        chart_artist = norm(
            chart_row.get(
                "artist"
            )
        )

        track_title = norm(
            chart_row.get(
                "trackTitle"
            )
        )

        rank = norm(
            chart_row.get(
                "rank"
            )
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


        if not alias_matches_safely(
            chart_artist,
            matched_alias,
        ):

            print(
                "SKIP unsafe alias match | "
                f"target={target_artist} | "
                f"alias={matched_alias} | "
                f"chartArtist={chart_artist} | "
                f"track={track_title}"
            )

            continue


        key = (
            target_artist,
            track_title.casefold(),
            rank,
        )


        if key in seen:
            continue


        seen.add(
            key
        )


        candidates.append({
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

            "sourceKey":
                "bugs_realtime",

            "matchedArtist":
                chart_artist,

            "matchedAlias":
                matched_alias,

            "sourceUrl":
                bugs.BUGS_CHART_URL,
        })


    candidates.sort(
        key=lambda row: (
            row["artist"],
            rank_number(
                row["rank"]
            ),
            row["trackTitle"],
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

    for artist in (
        discover.TARGET_ARTISTS
    ):

        count = counts.get(
            artist,
            0,
        )

        artist_results.append({
            "artist":
                artist,

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
            datetime.now()
            .isoformat(
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

        "targetArtistCount":
            len(
                discover.TARGET_ARTISTS
            ),

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
            "FANDEX Bugs All Targets "
            "Discovery v1"
        ),
        "=" * 76,
        (
            f"createdAt: "
            f"{payload['createdAt']}"
        ),
        (
            f"chartDate: "
            f"{today}"
        ),
        (
            f"parsedChartRowCount: "
            f"{len(chart_rows)}"
        ),
        (
            f"targetArtistCount: "
            f"{len(discover.TARGET_ARTISTS)}"
        ),
        "",
        "Artist results",
        "-" * 76,
    ]


    print()
    print(
        "All target artist results"
    )
    print("-" * 76)


    for result in artist_results:

        line = (
            f"{result['artist']} | "
            f"candidates="
            f"{result['candidateCount']} | "
            f"{result['status']}"
        )

        print(
            line
        )

        lines.append(
            line
        )


    if candidates:

        print()
        print(
            "Candidates"
        )
        print("-" * 76)

        lines.extend([
            "",
            "Candidates",
            "-" * 76,
        ])


        for row in candidates:

            line = (
                f"{row['artist']} | "
                f"rank={row['rank']} | "
                f"{row['trackTitle']} | "
                f"matchedArtist="
                f"{row['matchedArtist']}"
            )

            print(
                line
            )

            lines.append(
                line
            )


    lines.extend([
        "",
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])


    REPORT_FILE.write_text(
        "\n".join(
            lines
        ),
        encoding="utf-8",
    )


    print()
    print("=" * 76)
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