from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import youtube_publish_v3 as historical


VERSION = "youtube_publish_v3_shadow_v1"

METRICS_FILE = Path(
    "youtube_video_metrics_candidate_v1.csv"
)
LEGACY_SNAPSHOT = Path(
    "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)
OUTPUT_JSON = Path(
    "fandex_youtube_ranking_v3_shadow_latest.json"
)
OUTPUT_AUDIT = Path(
    "fandex_youtube_ranking_v3_shadow_audit.csv"
)


def norm(value):
    return "" if value is None else str(value).strip()


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def legacy_points():
    payload = read_json(
        LEGACY_SNAPSHOT
    )
    result = {}

    for row in payload.get(
        "ranking",
        [],
    ):
        artist = norm(
            row.get("artist")
        )
        point = row.get(
            "youtubePoint"
        )
        if artist and point is not None:
            result[artist] = float(point)

    return result


def main():
    if not METRICS_FILE.exists():
        raise RuntimeError(
            "YouTube shadow metrics missing: "
            + str(METRICS_FILE)
        )

    rows = read_csv(
        METRICS_FILE
    )
    if not rows:
        raise RuntimeError(
            "YouTube shadow metrics empty."
        )

    artist_to_id = {}
    id_to_artist = {}
    seen_video_ids = set()

    totals = defaultdict(float)
    raw_totals = defaultdict(float)
    counts = defaultdict(int)
    audit_rows = []

    for row in rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        video_id = norm(
            row.get("videoId")
        )

        if (
            not canonical_id
            or not artist
            or not video_id
        ):
            raise RuntimeError(
                "YouTube shadow metrics missing identity."
            )

        previous_id = artist_to_id.get(
            artist
        )
        if (
            previous_id
            and previous_id != canonical_id
        ):
            raise RuntimeError(
                "YouTube artist identity mismatch: "
                + artist
            )

        previous_artist = id_to_artist.get(
            canonical_id
        )
        if (
            previous_artist
            and previous_artist != artist
        ):
            raise RuntimeError(
                "YouTube canonical identity collision: "
                + canonical_id
            )

        if video_id in seen_video_ids:
            raise RuntimeError(
                "YouTube videoId duplicated across "
                "shadow metrics: "
                + video_id
            )

        seen_video_ids.add(
            video_id
        )
        artist_to_id[
            artist
        ] = canonical_id
        id_to_artist[
            canonical_id
        ] = artist

        point = historical.calculate_video_point(
            row
        )
        totals[
            canonical_id
        ] += float(
            point["finalVideoPoint"]
        )
        raw_totals[
            canonical_id
        ] += float(
            point["rawVideoPoint"]
        )
        counts[
            canonical_id
        ] += 1

        audit_rows.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "videoId":
                video_id,
            "videoType":
                norm(
                    row.get("videoType")
                ),
            "viewCount":
                norm(
                    row.get("viewCount")
                ),
            "likeCount":
                norm(
                    row.get("likeCount")
                ),
            "commentCount":
                norm(
                    row.get("commentCount")
                ),
            "rawVideoPoint":
                point["rawVideoPoint"],
            "finalVideoPoint":
                point["finalVideoPoint"],
        })

    legacy = legacy_points()

    ranking = []
    for canonical_id in sorted(
        totals
    ):
        artist = id_to_artist[
            canonical_id
        ]
        current = round(
            totals[canonical_id],
            2,
        )
        previous = legacy.get(
            artist
        )

        ranking.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "youtubePointShadow":
                current,
            "youtubeRawPointShadow":
                round(
                    raw_totals[
                        canonical_id
                    ],
                    4,
                ),
            "videoCount":
                counts[
                    canonical_id
                ],
            "legacySnapshotPoint":
                (
                    previous
                    if previous is not None
                    else None
                ),
            "deltaFromLegacySnapshot":
                (
                    round(
                        current - previous,
                        2,
                    )
                    if previous is not None
                    else None
                ),
            "productEligible":
                False,
        })

    ranking.sort(
        key=lambda row: (
            -row[
                "youtubePointShadow"
            ],
            row[
                "canonicalArtistId"
            ],
        )
    )

    for rank, row in enumerate(
        ranking,
        start=1,
    ):
        row["rank"] = rank

    payload = {
        "version":
            VERSION,
        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),
        "mode":
            "shadow_only",
        "historicalFormulaVersion":
            historical.VERSION,
        "historicalScaleFactor":
            historical.SCALE_FACTOR,
        "artistCount":
            len(ranking),
        "videoCount":
            len(rows),
        "legacyComparableArtistCount":
            sum(
                1
                for row in ranking
                if row[
                    "legacySnapshotPoint"
                ] is not None
            ),
        "ranking":
            ranking,
        "activeYouTubeSnapshotModified":
            False,
        "productModified":
            False,
        "runtimeModified":
            False,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    with OUTPUT_AUDIT.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "canonicalArtistId",
                "artist",
                "videoId",
                "videoType",
                "viewCount",
                "likeCount",
                "commentCount",
                "rawVideoPoint",
                "finalVideoPoint",
            ],
        )
        writer.writeheader()
        writer.writerows(
            sorted(
                audit_rows,
                key=lambda row: (
                    row[
                        "canonicalArtistId"
                    ],
                    row[
                        "videoId"
                    ],
                ),
            )
        )

    print(
        "YouTube v3 shadow | "
        f"artists={payload['artistCount']} | "
        f"videos={payload['videoCount']} | "
        f"legacyComparable="
        f"{payload['legacyComparableArtistCount']}"
    )
    print(
        "activeYouTubeSnapshotModified: FALSE"
    )
    print(
        "productModified: FALSE"
    )


if __name__ == "__main__":
    main()
