from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any


VERSION = "youtube_reviewed_seed_candidate_v1"

TARGET_CONFIG = Path(
    "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_candidate_v1.json"
)
REVIEWS_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_seed_reviews_v1.json"
)
CANDIDATE_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_seed_videos_candidate_v1.csv"
)

ALLOWED_VIDEO_TYPES = {
    "official_mv",
    "dance_practice",
    "performance_video",
    "shorts",
    "live_clip",
    "external_content",
}
ALLOWED_SOURCE_TYPES = {
    "official",
    "broadcast",
    "external",
}


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def load_targets() -> dict[str, str]:
    payload = load_json(TARGET_CONFIG)
    rows = payload.get("artists")

    if not isinstance(rows, list) or not rows:
        raise RuntimeError(
            "YouTube reviewed seed target config is empty."
        )

    result: dict[str, str] = {}

    for row in rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(row.get("artist"))

        if not canonical_id or not artist:
            raise RuntimeError(
                "Invalid YouTube target binding."
            )
        if canonical_id in result:
            raise RuntimeError(
                "Duplicate YouTube target canonicalArtistId: "
                + canonical_id
            )
        result[canonical_id] = artist

    return result


def validate_reviews(
    payload: dict[str, Any],
    targets: dict[str, str],
) -> list[dict[str, Any]]:
    if (
        norm(payload.get("version"))
        != "youtube_seed_reviews_v1"
    ):
        raise RuntimeError(
            "Invalid YouTube review ledger version."
        )

    source_run = payload.get("sourceRun")
    if not isinstance(source_run, dict):
        raise RuntimeError(
            "YouTube review ledger sourceRun missing."
        )

    for key in [
        "workflowRunId",
        "workflowHead",
        "artifactId",
        "artifactDigest",
    ]:
        if not norm(source_run.get(key)):
            raise RuntimeError(
                "YouTube review sourceRun missing "
                + key
            )

    reviews = payload.get("reviews")
    if not isinstance(reviews, list):
        raise RuntimeError(
            "YouTube review ledger reviews must be a list."
        )

    seen_review_ids: set[str] = set()
    seen_video_ids: set[str] = set()
    approved: list[dict[str, Any]] = []

    for index, row in enumerate(
        reviews,
        start=1,
    ):
        review_id = norm(
            row.get("reviewId")
        )
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(row.get("artist"))
        video_id = norm(row.get("videoId"))
        decision = norm(row.get("decision"))
        video_type = norm(
            row.get("reviewedVideoType")
        )
        source_type = norm(
            row.get("reviewedSourceType")
        )
        evidence_url = norm(
            row.get("evidenceUrl")
        )
        reviewer = norm(
            row.get("reviewer")
        )
        reviewed_at = norm(
            row.get("reviewedAt")
        )
        rationale = norm(
            row.get("rationale")
        )
        activation_state = norm(
            row.get("activationState")
        )

        if not review_id:
            raise RuntimeError(
                f"Review {index} missing reviewId."
            )
        if review_id in seen_review_ids:
            raise RuntimeError(
                "Duplicate YouTube reviewId: "
                + review_id
            )
        seen_review_ids.add(review_id)

        expected_artist = targets.get(
            canonical_id
        )
        if expected_artist is None:
            raise RuntimeError(
                "YouTube review references unknown canonical artist: "
                + canonical_id
            )
        if artist != expected_artist:
            raise RuntimeError(
                "YouTube review artist/canonical mismatch: "
                f"{canonical_id} / {artist} / "
                f"expected={expected_artist}"
            )

        if not re.fullmatch(
            r"[A-Za-z0-9_-]{11}",
            video_id,
        ):
            raise RuntimeError(
                "Invalid reviewed YouTube videoId: "
                + video_id
            )
        if video_id in seen_video_ids:
            raise RuntimeError(
                "Duplicate reviewed YouTube videoId: "
                + video_id
            )
        seen_video_ids.add(video_id)

        if decision != "approved":
            raise RuntimeError(
                "Only explicit approved reviews may enter "
                "the reviewed seed candidate."
            )
        if video_type not in ALLOWED_VIDEO_TYPES:
            raise RuntimeError(
                "Invalid reviewed YouTube video type: "
                + video_type
            )
        if source_type not in ALLOWED_SOURCE_TYPES:
            raise RuntimeError(
                "Invalid reviewed YouTube source type: "
                + source_type
            )
        if (
            video_id not in evidence_url
            or not evidence_url.startswith(
                "https://www.youtube.com/"
            )
        ):
            raise RuntimeError(
                "YouTube review evidence URL mismatch: "
                + review_id
            )
        if not reviewer or not rationale:
            raise RuntimeError(
                "YouTube review requires reviewer and rationale: "
                + review_id
            )
        if not re.search(
            r"[+-]\d\d:\d\d$",
            reviewed_at,
        ):
            raise RuntimeError(
                "YouTube review reviewedAt must be timezone-aware: "
                + review_id
            )
        if (
            activation_state
            != "reviewed_seed_candidate_only"
        ):
            raise RuntimeError(
                "YouTube review activationState must remain "
                "reviewed_seed_candidate_only: "
                + review_id
            )

        approved.append(row)

    return approved


def build_seed_rows(
    approved: list[dict[str, Any]],
    source_run_id: str,
) -> list[dict[str, str]]:
    result = []

    for row in approved:
        result.append({
            "canonicalArtistId":
                norm(
                    row.get(
                        "canonicalArtistId"
                    )
                ),
            "artist":
                norm(row.get("artist")),
            "videoId":
                norm(row.get("videoId")),
            "sourceUrl":
                norm(
                    row.get("evidenceUrl")
                ),
            "videoType":
                norm(
                    row.get(
                        "reviewedVideoType"
                    )
                ),
            "memo":
                (
                    "reviewed_seed_candidate_only; "
                    + norm(
                        row.get(
                            "reviewId"
                        )
                    )
                    + "; sourceRun="
                    + source_run_id
                ),
        })

    return result


def read_candidate_file(
    path: Path,
) -> list[dict[str, str]]:
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def main() -> None:
    targets = load_targets()
    payload = load_json(REVIEWS_FILE)
    approved = validate_reviews(
        payload,
        targets,
    )

    source_run_id = norm(
        payload["sourceRun"][
            "workflowRunId"
        ]
    )
    generated = build_seed_rows(
        approved,
        source_run_id,
    )
    materialized = read_candidate_file(
        CANDIDATE_FILE
    )

    if generated != materialized:
        raise RuntimeError(
            "Materialized YouTube seed candidate does not "
            "match reviewed ledger."
        )

    counts: dict[str, int] = {
        canonical_id: 0
        for canonical_id in targets
    }

    for row in generated:
        counts[
            row["canonicalArtistId"]
        ] += 1

    approved_artist_count = sum(
        1
        for value in counts.values()
        if value > 0
    )

    print(
        "PASS: reviewed YouTube seed candidate | "
        f"approvedVideos={len(generated)} | "
        f"approvedArtists={approved_artist_count} | "
        f"targetArtists={len(targets)}"
    )
    print(
        "activationState: "
        "reviewed_seed_candidate_only"
    )
    print(
        "Product eligibility: NOT IMPLIED"
    )


if __name__ == "__main__":
    main()
