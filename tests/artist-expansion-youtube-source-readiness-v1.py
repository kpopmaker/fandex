import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    return json.loads(
        (ROOT / path).read_text(
            encoding="utf-8-sig"
        )
    )


def main():
    readiness = read_json(
        "data/fandex-cloud-v10/seed/"
        "youtube_source_readiness_v1.json"
    )
    target = read_json(
        "data/fandex-cloud-v10/seed/"
        "music_chart_artist_targets_candidate_v1.json"
    )
    ranking = read_json(
        "data/fandex-cloud-v10/seed/"
        "fandex_youtube_ranking_v3_latest.json"
    )
    historical = read_json(
        "data/fandex-cloud-v10/seed/"
        "youtube_historical_approved_seed_manifest_v1.json"
    )
    reviews = read_json(
        "data/fandex-cloud-v10/seed/"
        "youtube_seed_video_reviews_v1.json"
    )

    canonical_by_artist = {
        row["artist"]: row["canonicalArtistId"]
        for row in target["artists"]
    }
    target_ids = set(
        canonical_by_artist.values()
    )
    assert len(target_ids) == 21

    frozen_ids = {
        canonical_by_artist[
            row["artist"]
        ]
        for row in ranking["ranking"]
    }
    assert len(frozen_ids) == 10

    historical_ids = {
        row["canonicalArtistId"]
        for row in historical["artists"]
    }
    assert historical_ids == frozen_ids

    historical_video_ids = {
        video["videoId"]
        for row in historical["artists"]
        for video in row["videos"]
    }
    assert len(historical_video_ids) == 47

    review_rows = [
        row
        for row in reviews["reviews"]
        if row["decision"] == "approved"
    ]
    reviewed_new_ids = {
        row["canonicalArtistId"]
        for row in review_rows
    }
    assert len(reviewed_new_ids) == 11
    assert len({
        row["videoId"]
        for row in review_rows
    }) == 11
    assert not (
        reviewed_new_ids
        & historical_ids
    )
    assert (
        historical_ids
        | reviewed_new_ids
    ) == target_ids

    evidence = readiness["evidence"]
    state = readiness["readiness"]

    assert evidence[
        "historicalKnownApprovedVideoIds"
    ] == 47
    assert evidence[
        "reviewedExpansionVideoIds"
    ] == 11
    assert evidence[
        "knownApprovedShadowVideoIds"
    ] == 58
    assert evidence[
        "reviewedSeedArtistCount"
    ] == 21
    assert evidence[
        "frozenProductScoreArtistCount"
    ] == 10

    assert set(
        state[
            "reviewedSeedEvidenceCanonicalArtistIds"
        ]
    ) == target_ids
    assert set(
        state[
            "frozenProductScoreAvailableCanonicalArtistIds"
        ]
    ) == frozen_ids
    assert set(
        state[
            "sourceOnlyReviewedButScoreBlockedCanonicalArtistIds"
        ]
    ) == reviewed_new_ids

    assert state[
        "scoreRecomputeEligibleCanonicalArtistIds"
    ] == []
    assert state[
        "productExpansionEligibleCanonicalArtistIds"
    ] == []

    blocker_codes = {
        row["code"]
        for row in readiness["blockers"]
    }
    assert blocker_codes == {
        "COMPLETE_HISTORICAL_SEED_UNKNOWN",
        "FROZEN_SCORE_INPUT_NOT_REPRODUCIBLE",
        "UNIFORM_EXPANSION_SEED_POLICY_UNDEFINED",
        "KNOWN_APPROVAL_SHADOW_NON_COMPARABLE",
    }

    guards = readiness["guards"]
    assert all(guards.values())

    assert readiness["currentState"] == (
        "FROZEN_PRODUCT_10_WITH_21_ARTIST_REVIEWED_SEED_EVIDENCE"
    )

    print(
        "PASS: YouTube readiness boundary | "
        "reviewedSeed=21 | frozenScore=10 | "
        "scoreRecomputeEligible=0 | "
        "productExpansionEligible=0"
    )


if __name__ == "__main__":
    main()
