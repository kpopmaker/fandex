import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

DECISIONS = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_v3_seed_review_decisions_v1.json"
)
CANDIDATE_JSON = (
    ROOT
    / "youtube_seed_videos_candidate_v1.json"
)
CANDIDATE_CSV = (
    ROOT
    / "youtube_seed_videos_candidate_v1.csv"
)
METRICS_CSV = (
    ROOT
    / "youtube_video_metrics_candidate_v1.csv"
)
SHADOW_JSON = (
    ROOT
    / "fandex_youtube_ranking_v3_shadow_latest.json"
)
ACTIVE_YOUTUBE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)


def read_json(path):
    return json.loads(
        path.read_text(encoding="utf-8-sig")
    )


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def main():
    decisions = read_json(DECISIONS)
    candidate = read_json(CANDIDATE_JSON)
    candidate_rows = read_csv(CANDIDATE_CSV)
    metric_rows = read_csv(METRICS_CSV)
    shadow = read_json(SHADOW_JSON)
    active = read_json(ACTIVE_YOUTUBE)

    assert len(decisions["reviews"]) == 21

    unresolved = {
        "jimin",
        "v",
        "jennie",
        "lisa",
    }
    covered = {
        row["canonicalArtistId"]
        for row in decisions["reviews"]
        if row["approved"]
    }

    assert len(covered) == 17
    assert {
        row["canonicalArtistId"]
        for row in decisions["reviews"]
        if not row["approved"]
    } == unresolved

    assert candidate[
        "activationState"
    ] == "candidate_only_not_active"
    assert candidate[
        "targetArtistCount"
    ] == 21
    assert candidate[
        "coveredArtistCount"
    ] == 17
    assert candidate[
        "unresolvedArtistCount"
    ] == 4
    assert candidate[
        "approvedVideoCount"
    ] == 41
    assert set(
        candidate[
            "coveredCanonicalArtistIds"
        ]
    ) == covered
    assert set(
        candidate[
            "unresolvedCanonicalArtistIds"
        ]
    ) == unresolved
    assert candidate[
        "activeSeedModified"
    ] is False
    assert candidate[
        "productModified"
    ] is False

    assert len(candidate_rows) == 41
    assert len({
        row["videoId"]
        for row in candidate_rows
    }) == 41
    assert {
        row["canonicalArtistId"]
        for row in candidate_rows
    } == covered

    assert len(metric_rows) == 41
    assert len({
        row["videoId"]
        for row in metric_rows
    }) == 41
    assert {
        row["canonicalArtistId"]
        for row in metric_rows
    } == covered

    assert shadow[
        "mode"
    ] == "shadow_only"
    assert shadow[
        "artistCount"
    ] == 17
    assert shadow[
        "videoCount"
    ] == 41
    assert shadow[
        "legacyComparableArtistCount"
    ] == 10
    assert shadow[
        "activeYouTubeSnapshotModified"
    ] is False
    assert shadow[
        "productModified"
    ] is False
    assert shadow[
        "runtimeModified"
    ] is False

    shadow_ids = {
        row["canonicalArtistId"]
        for row in shadow["ranking"]
    }
    assert shadow_ids == covered
    assert not (
        shadow_ids
        & unresolved
    )
    assert all(
        row["productEligible"] is False
        for row in shadow["ranking"]
    )

    active_artists = {
        row["artist"]
        for row in active["ranking"]
    }
    candidate_artists = {
        row["artist"]
        for row in candidate_rows
    }

    assert len(active_artists) == 10
    assert active_artists <= candidate_artists

    comparable = [
        row
        for row in shadow["ranking"]
        if row[
            "legacySnapshotPoint"
        ] is not None
    ]
    assert len(comparable) == 10
    assert {
        row["artist"]
        for row in comparable
    } == active_artists

    assert all(
        row[
            "deltaFromLegacySnapshot"
        ] is not None
        for row in comparable
    )

    print(
        "PASS: reviewed YouTube seed candidate "
        "covers 17/21 artists with 41 live metrics; "
        "historical v3 shadow scores 17 artists and "
        "compares all current Product 10 without "
        "modifying active YouTube/Product state"
    )


if __name__ == "__main__":
    main()
