from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import youtube_collect_video_metrics_v1 as collector
import youtube_discover_seed_candidates_artist_list_v2 as discovery
import youtube_publish_v3 as publish_v3


VERSION = "youtube_v3_legacy_reproducibility_audit_v1"

MANIFEST_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_v3_legacy_approved_seed_manifest_v1.json"
)
FROZEN_RANKING_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)
OUTPUT_FILE = Path(
    "youtube_v3_legacy_reproducibility_audit_v1_latest.json"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def main() -> None:
    manifest = read_json(
        MANIFEST_FILE
    )
    frozen = read_json(
        FROZEN_RANKING_FILE
    )

    artists = manifest.get("artists")
    if (
        not isinstance(artists, list)
        or len(artists) != 10
    ):
        raise RuntimeError(
            "Legacy approved YouTube manifest must contain 10 artists."
        )

    frozen_rows = frozen.get("ranking")
    if (
        not isinstance(frozen_rows, list)
        or len(frozen_rows) != 10
    ):
        raise RuntimeError(
            "Frozen YouTube v3 ranking must contain 10 artists."
        )

    frozen_by_artist = {}
    for row in frozen_rows:
        artist = norm(row.get("artist"))
        if not artist:
            raise RuntimeError(
                "Frozen YouTube ranking row missing artist."
            )
        if artist in frozen_by_artist:
            raise RuntimeError(
                "Duplicate frozen YouTube artist: "
                + artist
            )
        frozen_by_artist[artist] = row

    video_owner = {}
    expected_artists = set()

    for artist_row in artists:
        canonical_id = norm(
            artist_row.get("canonicalArtistId")
        )
        artist = norm(
            artist_row.get("artist")
        )
        videos = artist_row.get("videos")

        if (
            not canonical_id
            or not artist
            or not isinstance(videos, list)
            or not videos
        ):
            raise RuntimeError(
                "Invalid legacy approved YouTube manifest artist row."
            )

        expected_artists.add(artist)

        for video in videos:
            video_id = norm(
                video.get("videoId")
            )
            if not video_id:
                raise RuntimeError(
                    "Legacy approved YouTube video missing videoId."
                )
            if video_id in video_owner:
                raise RuntimeError(
                    "Duplicate legacy approved YouTube videoId: "
                    + video_id
                )

            video_owner[video_id] = {
                "canonicalArtistId":
                    canonical_id,
                "artist":
                    artist,
                "reviewedVideoType":
                    norm(
                        video.get(
                            "reviewedVideoType"
                        )
                    ),
            }

    if expected_artists != set(
        frozen_by_artist
    ):
        raise RuntimeError(
            "Legacy approved manifest artist set does not "
            "match frozen YouTube v3 Product cohort."
        )

    if len(video_owner) != 47:
        raise RuntimeError(
            "Expected 47 recovered legacy approved video IDs, "
            f"got {len(video_owner)}."
        )

    api_key = collector.get_api_key()
    returned = {}

    video_ids = list(video_owner)
    for batch in collector.chunked(
        video_ids,
        50,
    ):
        payload = (
            collector.request_youtube_videos(
                api_key,
                batch,
            )
        )
        for item in payload.get(
            "items",
            [],
        ):
            video_id = norm(
                item.get("id")
            )
            if video_id:
                returned[video_id] = item

    missing = sorted(
        set(video_owner)
        - set(returned)
    )
    if missing:
        raise RuntimeError(
            "Legacy approved YouTube videos missing from live API: "
            + ", ".join(missing)
        )

    scored_by_artist = defaultdict(list)

    for video_id, owner in (
        video_owner.items()
    ):
        item = returned[video_id]
        snippet = item.get(
            "snippet",
            {},
        )
        statistics = item.get(
            "statistics",
            {},
        )

        title = norm(
            snippet.get("title")
        )
        reviewed_type = owner[
            "reviewedVideoType"
        ]
        video_type = (
            reviewed_type
            or discovery.classify_type(
                title
            )
        )

        metric = {
            "canonicalArtistId":
                owner[
                    "canonicalArtistId"
                ],
            "artist":
                owner["artist"],
            "videoId":
                video_id,
            "title":
                title,
            "publishedAt":
                norm(
                    snippet.get(
                        "publishedAt"
                    )
                ),
            "viewCount":
                collector.to_int(
                    statistics.get(
                        "viewCount"
                    )
                ),
            "likeCount":
                collector.to_int(
                    statistics.get(
                        "likeCount"
                    )
                ),
            "commentCount":
                collector.to_int(
                    statistics.get(
                        "commentCount"
                    )
                ),
            "videoType":
                video_type,
            # Historical collector did not persist channelTitle.
            # Leaving it absent reproduces that execution path.
        }

        points = (
            publish_v3.calculate_video_point(
                metric
            )
        )
        scored_by_artist[
            owner["artist"]
        ].append({
            **metric,
            **points,
            "videoTypeSource":
                (
                    "historical_review"
                    if reviewed_type
                    else "reclassified_from_live_title"
                ),
        })

    comparisons = []

    for artist in sorted(
        expected_artists
    ):
        rows = scored_by_artist[
            artist
        ]
        reproduced = round(
            sum(
                float(
                    row[
                        "finalVideoPoint"
                    ]
                )
                for row in rows
            ),
            2,
        )
        frozen_point = float(
            frozen_by_artist[
                artist
            ].get(
                "youtubePoint"
            )
            or 0
        )
        delta = round(
            reproduced - frozen_point,
            2,
        )
        ratio = (
            round(
                reproduced
                / frozen_point,
                4,
            )
            if frozen_point > 0
            else None
        )

        comparisons.append({
            "artist":
                artist,
            "frozenYoutubePoint":
                frozen_point,
            "reproducedApprovedSeedPoint":
                reproduced,
            "delta":
                delta,
            "ratioToFrozen":
                ratio,
            "approvedSeedCount":
                len(rows),
            "reclassifiedVideoTypeCount":
                sum(
                    1
                    for row in rows
                    if row[
                        "videoTypeSource"
                    ]
                    == "reclassified_from_live_title"
                ),
        })

    payload = {
        "version":
            VERSION,
        "createdAt":
            datetime.now(
                timezone.utc
            ).isoformat(
                timespec="seconds"
            ),
        "mode":
            "audit_only_no_activation",
        "legacyManifestVersion":
            norm(
                manifest.get(
                    "version"
                )
            ),
        "legacyApprovedVideoCount":
            len(video_owner),
        "legacyArtistCount":
            len(expected_artists),
        "liveApiReturnedVideoCount":
            len(returned),
        "missingVideoCount":
            0,
        "frozenRankingVersion":
            norm(
                frozen.get(
                    "version"
                )
            ),
        "formulaVersion":
            publish_v3.VERSION,
        "historicalCollectorChannelTitlePersisted":
            False,
        "comparabilityThresholdDefined":
            False,
        "comparisons":
            comparisons,
        "activeYouTubeRankingModified":
            False,
        "productModified":
            False,
        "databaseModified":
            False,
        "runtimeModified":
            False,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: YouTube legacy reproducibility audit | "
        f"artists={len(expected_artists)} | "
        f"videos={len(video_owner)} | "
        "missing=0"
    )

    for row in sorted(
        comparisons,
        key=lambda item:
            item["artist"],
    ):
        print(
            f"{row['artist']} | "
            f"seeds={row['approvedSeedCount']} | "
            f"frozen={row['frozenYoutubePoint']} | "
            f"reproduced={row['reproducedApprovedSeedPoint']} | "
            f"delta={row['delta']} | "
            f"ratio={row['ratioToFrozen']}"
        )

    print(
        "comparability threshold: NOT DEFINED"
    )
    print(
        "active YouTube ranking modified: FALSE"
    )


if __name__ == "__main__":
    main()
