from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import youtube_collect_video_metrics_v1 as collector
import youtube_discover_seed_candidates_artist_list_v2 as discovery
import youtube_publish_v3 as publish_v3


VERSION = "youtube_v3_full_reviewed_cohort_shadow_v1"

HISTORICAL_MANIFEST = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_historical_approved_seed_manifest_v1.json"
)
CURRENT_REVIEWED_SEED = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_seed_videos_candidate_v1.csv"
)
TARGET_CONFIG = Path(
    "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_candidate_v1.json"
)
FROZEN_RANKING = Path(
    "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)
OUTPUT_FILE = Path(
    "youtube_v3_full_reviewed_cohort_shadow_v1_latest.json"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def main() -> None:
    historical = read_json(
        HISTORICAL_MANIFEST
    )
    current_rows = read_csv(
        CURRENT_REVIEWED_SEED
    )
    targets_payload = read_json(
        TARGET_CONFIG
    )
    frozen_payload = read_json(
        FROZEN_RANKING
    )

    target_rows = targets_payload.get(
        "artists"
    )
    if (
        not isinstance(target_rows, list)
        or len(target_rows) != 21
    ):
        raise RuntimeError(
            "Expected 21 YouTube full-cohort targets."
        )

    target_ids = {
        norm(row.get("canonicalArtistId"))
        for row in target_rows
    }
    if (
        "" in target_ids
        or len(target_ids) != 21
    ):
        raise RuntimeError(
            "Invalid YouTube full-cohort canonical targets."
        )

    seed_rows: list[dict[str, str]] = []
    seen_video_ids: set[str] = set()
    historical_ids: set[str] = set()
    current_ids: set[str] = set()

    historical_artists = historical.get(
        "artists"
    )
    if (
        not isinstance(historical_artists, list)
        or len(historical_artists) != 10
    ):
        raise RuntimeError(
            "Historical YouTube manifest must contain 10 artists."
        )

    for artist_row in historical_artists:
        canonical_id = norm(
            artist_row.get(
                "canonicalArtistId"
            )
        )
        artist = norm(
            artist_row.get("artist")
        )
        videos = artist_row.get(
            "videos"
        )

        if (
            not canonical_id
            or not artist
            or canonical_id
            not in target_ids
            or not isinstance(videos, list)
            or not videos
        ):
            raise RuntimeError(
                "Invalid historical YouTube full-cohort row."
            )

        historical_ids.add(
            canonical_id
        )

        for video in videos:
            video_id = norm(
                video.get("videoId")
            )
            if (
                not video_id
                or video_id
                in seen_video_ids
            ):
                raise RuntimeError(
                    "Duplicate/invalid YouTube full-cohort videoId: "
                    + video_id
                )
            seen_video_ids.add(
                video_id
            )

            seed_rows.append({
                "canonicalArtistId":
                    canonical_id,
                "artist":
                    artist,
                "videoId":
                    video_id,
                "reviewedVideoType":
                    norm(
                        video.get(
                            "historicalVideoType"
                        )
                    ),
                "seedEvidenceClass":
                    "historical_approved_recovered",
            })

    for row in current_rows:
        canonical_id = norm(
            row.get(
                "canonicalArtistId"
            )
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
            or canonical_id
            not in target_ids
            or not video_id
        ):
            raise RuntimeError(
                "Invalid current reviewed YouTube seed row."
            )
        if video_id in seen_video_ids:
            raise RuntimeError(
                "YouTube full-cohort video assigned twice: "
                + video_id
            )

        seen_video_ids.add(
            video_id
        )
        current_ids.add(
            canonical_id
        )

        seed_rows.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "videoId":
                video_id,
            "reviewedVideoType":
                norm(
                    row.get("videoType")
                ),
            "seedEvidenceClass":
                "current_reviewed_seed_candidate",
        })

    if historical_ids & current_ids:
        raise RuntimeError(
            "Historical and current reviewed YouTube artist cohorts overlap."
        )

    covered_ids = (
        historical_ids
        | current_ids
    )
    if covered_ids != target_ids:
        missing = sorted(
            target_ids
            - covered_ids
        )
        extra = sorted(
            covered_ids
            - target_ids
        )
        raise RuntimeError(
            "YouTube full-cohort reviewed coverage mismatch: "
            f"missing={missing} extra={extra}"
        )

    if len(seed_rows) != 74:
        raise RuntimeError(
            "Expected 74 combined reviewed YouTube seed videos, "
            f"got {len(seed_rows)}."
        )

    api_key = collector.get_api_key()
    returned: dict[str, dict[str, Any]] = {}

    video_ids = [
        row["videoId"]
        for row in seed_rows
    ]

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
                returned[
                    video_id
                ] = item

    missing_videos = sorted(
        set(video_ids)
        - set(returned)
    )
    if missing_videos:
        raise RuntimeError(
            "YouTube full-cohort reviewed videos missing from live API: "
            + ", ".join(
                missing_videos
            )
        )

    scored_by_artist: dict[
        str,
        list[dict[str, Any]],
    ] = defaultdict(list)

    for seed in seed_rows:
        item = returned[
            seed["videoId"]
        ]
        snippet = item.get(
            "snippet",
            {},
        )
        stats = item.get(
            "statistics",
            {},
        )
        title = norm(
            snippet.get("title")
        )

        reviewed_type = norm(
            seed.get(
                "reviewedVideoType"
            )
        )
        video_type = (
            reviewed_type
            or discovery.classify_type(
                title
            )
        )

        metric = {
            "canonicalArtistId":
                seed[
                    "canonicalArtistId"
                ],
            "artist":
                seed["artist"],
            "videoId":
                seed["videoId"],
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
                    stats.get(
                        "viewCount"
                    )
                ),
            "likeCount":
                collector.to_int(
                    stats.get(
                        "likeCount"
                    )
                ),
            "commentCount":
                collector.to_int(
                    stats.get(
                        "commentCount"
                    )
                ),
            "videoType":
                video_type,
        }

        point = (
            publish_v3.calculate_video_point(
                metric
            )
        )

        scored_by_artist[
            seed[
                "canonicalArtistId"
            ]
        ].append({
            **metric,
            **point,
            "seedEvidenceClass":
                seed[
                    "seedEvidenceClass"
                ],
            "videoTypeSource":
                (
                    "reviewed_or_historical"
                    if reviewed_type
                    else "reclassified_from_live_title"
                ),
        })

    frozen_by_artist = {
        norm(row.get("artist")):
            float(
                row.get(
                    "youtubePoint"
                )
                or 0
            )
        for row in frozen_payload.get(
            "ranking",
            [],
        )
    }

    ranking = []
    for target in target_rows:
        canonical_id = norm(
            target.get(
                "canonicalArtistId"
            )
        )
        artist = norm(
            target.get("artist")
        )
        rows = scored_by_artist[
            canonical_id
        ]

        shadow_point = round(
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

        ranking.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "seedCount":
                len(rows),
            "seedEvidenceClasses":
                sorted({
                    row[
                        "seedEvidenceClass"
                    ]
                    for row in rows
                }),
            "youtubePointV3Shadow":
                shadow_point,
            "frozenYoutubePoint":
                (
                    frozen_by_artist.get(
                        artist
                    )
                    if artist
                    in frozen_by_artist
                    else None
                ),
            "productEligibility":
                "not_evaluated",
        })

    ranking.sort(
        key=lambda row: (
            -float(
                row[
                    "youtubePointV3Shadow"
                ]
            ),
            row[
                "canonicalArtistId"
            ],
        )
    )

    for index, row in enumerate(
        ranking,
        start=1,
    ):
        row[
            "shadowRank"
        ] = index

    payload = {
        "version":
            VERSION,
        "createdAt":
            datetime.now(
                timezone.utc
            ).isoformat(
                timespec="seconds"
            ),
        "formulaVersion":
            publish_v3.VERSION,
        "scoreMode":
            "historical_youtube_v3_formula_on_heterogeneous_reviewed_seed_evidence",
        "targetArtistCount":
            len(target_ids),
        "reviewedSeedVideoCount":
            len(seed_rows),
        "historicalRecoveredArtistCount":
            len(historical_ids),
        "currentReviewedArtistCount":
            len(current_ids),
        "historicalLineageComplete":
            False,
        "commonSeedSelectionPolicyEstablished":
            False,
        "comparabilityThresholdDefined":
            False,
        "productEligibilityEvaluated":
            False,
        "rebaselineAuthorized":
            False,
        "ranking":
            ranking,
        "activeYouTubeRankingModified":
            False,
        "masterProductModified":
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
        "PASS: YouTube full reviewed cohort shadow | "
        f"artists={len(ranking)} | "
        f"videos={len(seed_rows)} | "
        "missing=0"
    )

    for row in ranking:
        print(
            f"{row['shadowRank']} | "
            f"{row['canonicalArtistId']} | "
            f"{row['artist']} | "
            f"seeds={row['seedCount']} | "
            f"shadowPoint={row['youtubePointV3Shadow']} | "
            f"frozen={row['frozenYoutubePoint']}"
        )

    print(
        "historicalLineageComplete: FALSE"
    )
    print(
        "commonSeedSelectionPolicyEstablished: FALSE"
    )
    print(
        "rebaselineAuthorized: FALSE"
    )
    print(
        "active YouTube ranking modified: FALSE"
    )


if __name__ == "__main__":
    main()
