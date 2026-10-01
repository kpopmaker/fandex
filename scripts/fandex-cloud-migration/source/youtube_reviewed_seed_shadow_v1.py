from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import youtube_collect_video_metrics_v1 as collector
import youtube_publish_v3 as publish_v3
import youtube_reviewed_seed_candidate_v1 as review_candidate


VERSION = "youtube_reviewed_seed_shadow_v1"

SEED_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_seed_videos_candidate_v1.csv"
)
OUTPUT_FILE = Path(
    "youtube_reviewed_seed_shadow_v1_latest.json"
)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def main() -> None:
    targets = review_candidate.load_targets()
    review_payload = review_candidate.load_json(
        review_candidate.REVIEWS_FILE
    )
    approved = review_candidate.validate_reviews(
        review_payload,
        targets,
    )
    generated = review_candidate.build_seed_rows(
        approved,
        str(
            review_payload["sourceRun"][
                "workflowRunId"
            ]
        ),
    )
    materialized = read_csv(SEED_FILE)

    if generated != materialized:
        raise RuntimeError(
            "Reviewed YouTube seed candidate drift."
        )

    normalized, skipped = (
        collector.normalize_seed_rows(
            materialized
        )
    )
    if skipped:
        raise RuntimeError(
            "Reviewed YouTube seed normalization skipped rows: "
            + json.dumps(
                skipped,
                ensure_ascii=False,
            )
        )

    api_key = collector.get_api_key()
    metrics, _raw, missing = (
        collector.collect_video_metrics(
            normalized,
            api_key,
        )
    )

    if missing:
        raise RuntimeError(
            "Reviewed YouTube live metrics missing rows: "
            + json.dumps(
                missing,
                ensure_ascii=False,
            )
        )

    if len(metrics) != len(materialized):
        raise RuntimeError(
            "Reviewed YouTube live metric count mismatch: "
            f"{len(metrics)} != {len(materialized)}"
        )

    by_canonical: dict[
        str,
        list[dict[str, object]],
    ] = defaultdict(list)
    artist_by_canonical: dict[
        str,
        str,
    ] = {}

    for row in metrics:
        canonical_id = str(
            row.get("canonicalArtistId")
            or ""
        ).strip()
        artist = str(
            row.get("artist")
            or ""
        ).strip()

        if not canonical_id or not artist:
            raise RuntimeError(
                "YouTube shadow metric lost canonical identity."
            )

        expected_artist = targets.get(
            canonical_id
        )
        if expected_artist != artist:
            raise RuntimeError(
                "YouTube shadow metric canonical mismatch: "
                f"{canonical_id} / {artist}"
            )

        previous = artist_by_canonical.get(
            canonical_id
        )
        if (
            previous is not None
            and previous != artist
        ):
            raise RuntimeError(
                "YouTube canonical artist maps to multiple names: "
                + canonical_id
            )
        artist_by_canonical[
            canonical_id
        ] = artist

        points = (
            publish_v3.calculate_video_point(
                row
            )
        )

        by_canonical[
            canonical_id
        ].append({
            **row,
            **points,
        })

    ranking = []

    for canonical_id, rows in (
        by_canonical.items()
    ):
        artist = artist_by_canonical[
            canonical_id
        ]

        total_point = round(
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
            "youtubePointV3Shadow":
                total_point,
            "reviewedSeedCount":
                len(rows),
            "viewCountTotal":
                sum(
                    int(
                        row.get(
                            "viewCount"
                        )
                        or 0
                    )
                    for row in rows
                ),
            "likeCountTotal":
                sum(
                    int(
                        row.get(
                            "likeCount"
                        )
                        or 0
                    )
                    for row in rows
                ),
            "commentCountTotal":
                sum(
                    int(
                        row.get(
                            "commentCount"
                        )
                        or 0
                    )
                    for row in rows
                ),
            "videoTypeCount":
                dict(
                    sorted(
                        Counter(
                            str(
                                row.get(
                                    "videoType"
                                )
                                or ""
                            )
                            for row in rows
                        ).items()
                    )
                ),
            "status":
                "shadow_score_candidate_only",
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
            str(
                row[
                    "canonicalArtistId"
                ]
            ),
        )
    )

    for index, row in enumerate(
        ranking,
        start=1,
    ):
        row["shadowRank"] = index

    reviewed_ids = {
        row["canonicalArtistId"]
        for row in materialized
    }

    target_ids = set(targets)

    if not reviewed_ids:
        raise RuntimeError(
            "Reviewed YouTube seed shadow has no reviewed artists."
        )

    unknown_reviewed_ids = sorted(
        reviewed_ids
        - target_ids
    )
    if unknown_reviewed_ids:
        raise RuntimeError(
            "Reviewed YouTube seed shadow contains "
            "artists outside the canonical target cohort: "
            + ", ".join(unknown_reviewed_ids)
        )

    payload = {
        "version": VERSION,
        "createdAt":
            datetime.now(
                timezone.utc
            ).isoformat(
                timespec="seconds"
            ),
        "scoreMode":
            "historical_youtube_v3_uncapped_additive_log_points_scaled",
        "sourceReviewVersion":
            str(
                review_payload.get(
                    "version"
                )
            ),
        "sourceReviewRunId":
            review_payload[
                "sourceRun"
            ][
                "workflowRunId"
            ],
        "reviewedVideoCount":
            len(materialized),
        "reviewedArtistCount":
            len(reviewed_ids),
        "targetArtistCount":
            len(targets),
        "unreviewedOrNoApprovedArtistCount":
            len(targets)
            - len(reviewed_ids),
        "ranking":
            ranking,
        "activeYouTubeRankingModified":
            False,
        "masterProductModified":
            False,
        "productEligibilityEvaluated":
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
        "PASS: reviewed YouTube seed live shadow | "
        f"videos={len(materialized)} | "
        f"artists={len(reviewed_ids)} | "
        "missing=0"
    )
    for row in ranking:
        print(
            f"{row['canonicalArtistId']} | "
            f"{row['artist']} | "
            f"seeds={row['reviewedSeedCount']} | "
            f"shadowPoint={row['youtubePointV3Shadow']}"
        )
    print(
        "Product eligibility: NOT EVALUATED"
    )
    print(
        "active YouTube ranking modified: FALSE"
    )


if __name__ == "__main__":
    main()
