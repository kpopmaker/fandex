from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]

RECOVERED_HISTORICAL_CSV = (
    REPO_ROOT
    / "youtube_seed_videos_recovered_baseline_candidate_v1.csv"
)
REVIEWED_EXPANSION_CSV = (
    REPO_ROOT
    / "youtube_seed_videos_reviewed_expansion_candidate_v1.csv"
)
OUTPUT_CSV = (
    REPO_ROOT
    / "youtube_seed_videos_known_approved_shadow_v1.csv"
)
OUTPUT_JSON = (
    REPO_ROOT
    / "youtube_seed_videos_known_approved_shadow_v1.json"
)

VERSION = "youtube_known_approved_shadow_seed_v1"

SEED_FIELDS = [
    "canonicalArtistId",
    "artist",
    "videoId",
    "sourceUrl",
    "videoType",
    "memo",
]


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise RuntimeError(
            f"Required YouTube shadow input missing: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return [
            dict(row)
            for row in csv.DictReader(file)
        ]


def validate_video_id(video_id: str) -> None:
    if (
        len(video_id) != 11
        or any(
            not (
                char.isalnum()
                or char in "_-"
            )
            for char in video_id
        )
    ):
        raise RuntimeError(
            "Invalid YouTube videoId: "
            + video_id
        )


def build_shadow_seed() -> dict[str, Any]:
    historical = read_csv(
        RECOVERED_HISTORICAL_CSV
    )
    expansion = read_csv(
        REVIEWED_EXPANSION_CSV
    )

    if len(historical) != 47:
        raise RuntimeError(
            f"Expected 47 recoverable historical approvals, got {len(historical)}."
        )
    if len(expansion) != 11:
        raise RuntimeError(
            f"Expected 11 reviewed expansion videos, got {len(expansion)}."
        )

    rows: list[dict[str, str]] = []
    seen_videos: set[str] = set()
    artist_ids: dict[str, str] = {}

    for row in historical:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        video_id = norm(
            row.get("videoId")
        )
        status = norm(
            row.get("recoveryStatus")
        )
        video_type = norm(
            row.get("recoveredVideoType")
        )

        if status != "ok":
            raise RuntimeError(
                "Historical YouTube approval not live-resolved: "
                + video_id
            )
        if not canonical_id or not artist or not video_type:
            raise RuntimeError(
                "Historical YouTube approval missing identity/type: "
                + video_id
            )
        validate_video_id(video_id)

        if video_id in seen_videos:
            raise RuntimeError(
                "Duplicate YouTube videoId across known approvals: "
                + video_id
            )
        seen_videos.add(video_id)

        existing = artist_ids.get(artist)
        if existing and existing != canonical_id:
            raise RuntimeError(
                "YouTube artist/canonical conflict: "
                f"{artist} / {existing} / {canonical_id}"
            )
        artist_ids[artist] = canonical_id

        rows.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "videoId":
                video_id,
            "sourceUrl":
                norm(row.get("sourceUrl"))
                or (
                    "https://www.youtube.com/watch?v="
                    + video_id
                ),
            "videoType":
                video_type,
            "memo":
                "known_historical_approved_id;"
                + norm(
                    row.get("videoTypeSource")
                ),
        })

    for row in expansion:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        video_id = norm(
            row.get("videoId")
        )
        video_type = norm(
            row.get("videoType")
        )
        activation_state = norm(
            row.get("activationState")
        )

        if activation_state != "reviewed_candidate_only":
            raise RuntimeError(
                "Expansion YouTube seed not review-locked: "
                + video_id
            )
        if not canonical_id or not artist or not video_type:
            raise RuntimeError(
                "Expansion YouTube seed missing identity/type: "
                + video_id
            )
        validate_video_id(video_id)

        if video_id in seen_videos:
            raise RuntimeError(
                "Expansion YouTube seed overlaps historical known approval: "
                + video_id
            )
        seen_videos.add(video_id)

        existing = artist_ids.get(artist)
        if existing and existing != canonical_id:
            raise RuntimeError(
                "YouTube artist/canonical conflict: "
                f"{artist} / {existing} / {canonical_id}"
            )
        artist_ids[artist] = canonical_id

        rows.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "videoId":
                video_id,
            "sourceUrl":
                norm(row.get("sourceUrl"))
                or (
                    "https://www.youtube.com/watch?v="
                    + video_id
                ),
            "videoType":
                video_type,
            "memo":
                "reviewed_expansion_candidate;"
                + norm(
                    row.get("reviewId")
                ),
        })

    if len(rows) != 58:
        raise RuntimeError(
            f"Expected 58 known-approved shadow rows, got {len(rows)}."
        )
    if len(artist_ids) != 21:
        raise RuntimeError(
            f"Expected 21 YouTube artists in known-approved shadow seed, got {len(artist_ids)}."
        )

    count_by_artist = Counter(
        row["canonicalArtistId"]
        for row in rows
    )

    return {
        "version":
            VERSION,
        "mode":
            "NON_COMPARABLE_SHADOW_ONLY",
        "reproducibilityState":
            "COMPLETE_HISTORICAL_SEED_UNKNOWN",
        "scorePromotionEligible":
            False,
        "reason":
            (
                "The original complete historical youtube_seed_videos_v1.csv "
                "was never committed. This shadow combines only 47 recoverable "
                "historical approved additions with 11 newly reviewed videos."
            ),
        "artistCount":
            len(artist_ids),
        "knownApprovedVideoCount":
            len(rows),
        "historicalKnownApprovedCount":
            len(historical),
        "newReviewedVideoCount":
            len(expansion),
        "videoCountByCanonicalArtistId":
            dict(
                sorted(
                    count_by_artist.items()
                )
            ),
        "rows":
            rows,
        "activeSeedModified":
            False,
        "productScoreModified":
            False,
        "runtimeModified":
            False,
    }


def write_outputs(
    payload: dict[str, Any],
) -> None:
    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=SEED_FIELDS,
        )
        writer.writeheader()
        writer.writerows(
            payload["rows"]
        )

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    payload = build_shadow_seed()
    write_outputs(payload)

    print(
        "YouTube known-approved shadow seed | "
        f"artists={payload['artistCount']} | "
        f"videos={payload['knownApprovedVideoCount']} | "
        f"historicalKnown={payload['historicalKnownApprovedCount']} | "
        f"newReviewed={payload['newReviewedVideoCount']} | "
        f"mode={payload['mode']}"
    )
    print(
        "scorePromotionEligible: FALSE"
    )
    print(
        "PASS: known-approved YouTube shadow seed "
        "materialized without active mutation"
    )


if __name__ == "__main__":
    main()
