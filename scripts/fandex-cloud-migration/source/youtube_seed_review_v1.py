from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]

TARGET_FILE = (
    REPO_ROOT
    / "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_candidate_v1.json"
)
HISTORICAL_FILE = (
    REPO_ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_historical_approved_seed_manifest_v1.json"
)
REVIEWS_FILE = (
    REPO_ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_seed_video_reviews_v1.json"
)
OUTPUT_CSV = (
    REPO_ROOT
    / "youtube_seed_videos_reviewed_expansion_candidate_v1.csv"
)
OUTPUT_JSON = (
    REPO_ROOT
    / "youtube_seed_video_review_preview_v1_latest.json"
)

VERSION = "youtube_seed_video_review_v1"

VALID_DECISIONS = {
    "approved",
    "rejected",
    "deferred",
}

VALID_MACHINE_EVIDENCE = {
    "strong_artist_specific_evidence",
    "partial_artist_specific_evidence",
    "weak_no_artist_specific_evidence",
}

VALID_VIDEO_TYPES = {
    "official_mv",
    "performance_video",
    "dance_practice",
    "live_clip",
    "broadcast_clip",
    "external_content",
    "behind",
    "shorts",
    "challenge",
}

VIDEO_ID_PATTERN = re.compile(
    r"^[A-Za-z0-9_-]{11}$"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )
    if not isinstance(payload, dict):
        raise RuntimeError(
            f"Expected JSON object: {path}"
        )
    return payload


def parse_reviewed_at(value: Any) -> str:
    text = norm(value)
    if not text:
        raise RuntimeError(
            "YouTube seed review missing reviewedAt."
        )
    try:
        parsed = datetime.fromisoformat(
            text.replace("Z", "+00:00")
        )
    except ValueError as exc:
        raise RuntimeError(
            "Invalid YouTube seed reviewedAt: "
            + text
        ) from exc
    if parsed.tzinfo is None:
        raise RuntimeError(
            "YouTube seed reviewedAt must include timezone."
        )
    return text


def load_targets() -> dict[str, dict[str, Any]]:
    payload = read_json(TARGET_FILE)
    rows = payload.get("artists")
    if not isinstance(rows, list) or not rows:
        raise RuntimeError(
            "YouTube target config has no artists."
        )

    result = {}
    seen_names = set()

    for row in rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        aliases = row.get("aliases")

        if (
            not canonical_id
            or not artist
            or not isinstance(aliases, list)
            or not aliases
        ):
            raise RuntimeError(
                "Invalid YouTube target binding."
            )
        if canonical_id in result:
            raise RuntimeError(
                "Duplicate YouTube target canonicalArtistId: "
                + canonical_id
            )
        if artist in seen_names:
            raise RuntimeError(
                "Duplicate YouTube target artist: "
                + artist
            )

        result[canonical_id] = {
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "aliases":
                [
                    norm(alias)
                    for alias in aliases
                    if norm(alias)
                ],
        }
        seen_names.add(artist)

    if len(result) != 21:
        raise RuntimeError(
            f"Expected 21 YouTube target artists, got {len(result)}."
        )

    return result


def load_historical() -> tuple[
    set[str],
    set[str],
]:
    payload = read_json(HISTORICAL_FILE)
    rows = payload.get("artists")
    if not isinstance(rows, list) or not rows:
        raise RuntimeError(
            "Historical YouTube manifest has no artists."
        )

    canonical_ids = set()
    video_ids = set()

    for row in rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        if not canonical_id:
            raise RuntimeError(
                "Historical YouTube canonicalArtistId missing."
            )
        canonical_ids.add(canonical_id)

        videos = row.get("videos")
        if not isinstance(videos, list) or not videos:
            raise RuntimeError(
                "Historical YouTube artist has no videos: "
                + canonical_id
            )
        for video in videos:
            video_id = norm(
                video.get("videoId")
            )
            if not VIDEO_ID_PATTERN.fullmatch(
                video_id
            ):
                raise RuntimeError(
                    "Invalid historical YouTube videoId: "
                    + video_id
                )
            if video_id in video_ids:
                raise RuntimeError(
                    "Duplicate historical YouTube videoId: "
                    + video_id
                )
            video_ids.add(video_id)

    if len(canonical_ids) != 10:
        raise RuntimeError(
            "Expected 10 historical YouTube artists."
        )
    if len(video_ids) != 47:
        raise RuntimeError(
            "Expected 47 historical YouTube video IDs."
        )

    return canonical_ids, video_ids


def validate_reviews() -> dict[str, Any]:
    targets = load_targets()
    (
        historical_canonical_ids,
        historical_video_ids,
    ) = load_historical()

    payload = read_json(REVIEWS_FILE)

    if (
        norm(payload.get("version"))
        != "youtube_seed_video_reviews_v1"
    ):
        raise RuntimeError(
            "Unexpected YouTube seed review ledger version."
        )

    reviews = payload.get("reviews")
    if not isinstance(reviews, list):
        raise RuntimeError(
            "YouTube seed reviews must be a list."
        )

    seen_review_ids = set()
    approved_video_ids = set()
    approved_pairs = set()
    normalized = []

    for raw in reviews:
        if not isinstance(raw, dict):
            raise RuntimeError(
                "Invalid YouTube seed review row."
            )

        review_id = norm(
            raw.get("reviewId")
        )
        canonical_id = norm(
            raw.get("canonicalArtistId")
        )
        artist = norm(
            raw.get("artist")
        )
        video_id = norm(
            raw.get("videoId")
        )
        decision = norm(
            raw.get("decision")
        )
        reviewed_type = norm(
            raw.get("reviewedVideoType")
        )
        machine_evidence = norm(
            raw.get("machineEvidence")
        )
        reviewer = norm(
            raw.get("reviewer")
        )
        reviewed_at = parse_reviewed_at(
            raw.get("reviewedAt")
        )
        review_reason = norm(
            raw.get("reviewReason")
        )

        if not review_id:
            raise RuntimeError(
                "YouTube seed reviewId missing."
            )
        if review_id in seen_review_ids:
            raise RuntimeError(
                "Duplicate YouTube seed reviewId: "
                + review_id
            )
        seen_review_ids.add(review_id)

        target = targets.get(canonical_id)
        if target is None:
            raise RuntimeError(
                "Unknown YouTube seed canonicalArtistId: "
                + canonical_id
            )
        if artist != target["artist"]:
            raise RuntimeError(
                "YouTube seed artist/canonical mismatch: "
                f"{canonical_id} / {artist}"
            )

        if not VIDEO_ID_PATTERN.fullmatch(
            video_id
        ):
            raise RuntimeError(
                "Invalid YouTube seed videoId: "
                + video_id
            )

        if decision not in VALID_DECISIONS:
            raise RuntimeError(
                "Invalid YouTube seed decision: "
                + decision
            )

        if machine_evidence not in VALID_MACHINE_EVIDENCE:
            raise RuntimeError(
                "Invalid YouTube machine evidence: "
                + machine_evidence
            )

        if not reviewer or not review_reason:
            raise RuntimeError(
                "YouTube seed reviewer/reason required: "
                + review_id
            )

        if decision == "approved":
            if reviewed_type not in VALID_VIDEO_TYPES:
                raise RuntimeError(
                    "Approved YouTube seed requires valid reviewedVideoType: "
                    + review_id
                )
            for field in [
                "videoUrl",
                "title",
                "channelId",
                "channelTitle",
                "sourceDiscoveryRunId",
                "sourceArtifactId",
            ]:
                if not norm(raw.get(field)):
                    raise RuntimeError(
                        "Approved YouTube seed missing "
                        f"{field}: {review_id}"
                    )

            if video_id in historical_video_ids:
                raise RuntimeError(
                    "New YouTube reviewed video overlaps historical baseline: "
                    + video_id
                )
            if video_id in approved_video_ids:
                raise RuntimeError(
                    "YouTube video approved more than once: "
                    + video_id
                )

            pair = (
                canonical_id,
                video_id,
            )
            if pair in approved_pairs:
                raise RuntimeError(
                    "Duplicate YouTube approved artist/video pair."
                )

            approved_video_ids.add(
                video_id
            )
            approved_pairs.add(
                pair
            )

        normalized.append({
            "reviewId":
                review_id,
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "videoId":
                video_id,
            "videoUrl":
                norm(raw.get("videoUrl")),
            "title":
                norm(raw.get("title")),
            "channelId":
                norm(raw.get("channelId")),
            "channelTitle":
                norm(raw.get("channelTitle")),
            "reviewedVideoType":
                reviewed_type,
            "decision":
                decision,
            "reviewer":
                reviewer,
            "reviewedAt":
                reviewed_at,
            "machineEvidence":
                machine_evidence,
            "reviewReason":
                review_reason,
            "sourceDiscoveryRunId":
                norm(
                    raw.get(
                        "sourceDiscoveryRunId"
                    )
                ),
            "sourceArtifactId":
                norm(
                    raw.get(
                        "sourceArtifactId"
                    )
                ),
            "activationState":
                "reviewed_candidate_only",
        })

    approved = [
        row
        for row in normalized
        if row["decision"] == "approved"
    ]
    approved_new_artists = {
        row["canonicalArtistId"]
        for row in approved
        if row["canonicalArtistId"]
        not in historical_canonical_ids
    }

    target_ids = set(targets)
    covered_candidate_ids = (
        historical_canonical_ids
        | approved_new_artists
    )
    unresolved_ids = (
        target_ids
        - covered_candidate_ids
    )

    return {
        "version":
            VERSION,
        "targetArtistCount":
            len(target_ids),
        "historicalArtistCount":
            len(historical_canonical_ids),
        "historicalVideoCount":
            len(historical_video_ids),
        "reviewCount":
            len(normalized),
        "approvedReviewCount":
            len(approved),
        "approvedNewArtistCount":
            len(approved_new_artists),
        "candidateCoveredArtistCount":
            len(covered_candidate_ids),
        "candidateCoveredCanonicalArtistIds":
            sorted(covered_candidate_ids),
        "unresolvedArtistCount":
            len(unresolved_ids),
        "unresolvedCanonicalArtistIds":
            sorted(unresolved_ids),
        "reviews":
            normalized,
        "approvedReviews":
            approved,
        "activeSeedModified":
            False,
        "productScoreModified":
            False,
        "databaseModified":
            False,
        "runtimeModified":
            False,
    }


def write_outputs(
    preview: dict[str, Any],
) -> None:
    approved = preview[
        "approvedReviews"
    ]

    fieldnames = [
        "canonicalArtistId",
        "artist",
        "videoId",
        "sourceUrl",
        "videoType",
        "title",
        "channelId",
        "channelTitle",
        "reviewId",
        "reviewedAt",
        "machineEvidence",
        "reviewReason",
        "sourceDiscoveryRunId",
        "sourceArtifactId",
        "activationState",
    ]

    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )
        writer.writeheader()
        for row in approved:
            writer.writerow({
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "videoId":
                    row["videoId"],
                "sourceUrl":
                    row["videoUrl"],
                "videoType":
                    row["reviewedVideoType"],
                "title":
                    row["title"],
                "channelId":
                    row["channelId"],
                "channelTitle":
                    row["channelTitle"],
                "reviewId":
                    row["reviewId"],
                "reviewedAt":
                    row["reviewedAt"],
                "machineEvidence":
                    row["machineEvidence"],
                "reviewReason":
                    row["reviewReason"],
                "sourceDiscoveryRunId":
                    row["sourceDiscoveryRunId"],
                "sourceArtifactId":
                    row["sourceArtifactId"],
                "activationState":
                    row["activationState"],
            })

    OUTPUT_JSON.write_text(
        json.dumps(
            preview,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    preview = validate_reviews()
    write_outputs(preview)

    print(
        "YouTube reviewed seed preview | "
        f"target={preview['targetArtistCount']} | "
        f"historical={preview['historicalArtistCount']} | "
        f"newReviewedArtists={preview['approvedNewArtistCount']} | "
        f"covered={preview['candidateCoveredArtistCount']} | "
        f"unresolved={preview['unresolvedArtistCount']} | "
        f"approvedVideos={preview['approvedReviewCount']}"
    )
    print(
        "unresolvedCanonicalArtistIds="
        + ",".join(
            preview[
                "unresolvedCanonicalArtistIds"
            ]
        )
    )
    print(
        "PASS: YouTube reviewed seed ledger is "
        "fail-closed and candidate-only"
    )


if __name__ == "__main__":
    main()
