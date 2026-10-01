import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


review = load_module(
    "youtube_seed_review_v1_v7",
    "scripts/fandex-cloud-migration/source/"
    "youtube_seed_review_v1.py",
)


def main():
    review.TARGET_FILE = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "music_chart_artist_targets_candidate_v1.json"
    )
    review.HISTORICAL_FILE = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "youtube_historical_approved_seed_manifest_v1.json"
    )
    review.REVIEWS_FILE = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "youtube_seed_video_reviews_v1.json"
    )

    preview = review.validate_reviews()

    assert preview["targetArtistCount"] == 21
    assert preview["historicalArtistCount"] == 10
    assert preview["historicalVideoCount"] == 47
    assert preview["reviewCount"] == 11
    assert preview["approvedReviewCount"] == 11
    assert preview["approvedNewArtistCount"] == 11
    assert preview["candidateCoveredArtistCount"] == 21
    assert preview["unresolvedArtistCount"] == 0
    assert preview[
        "unresolvedCanonicalArtistIds"
    ] == []

    expected = {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
        "jungkook",
        "jimin",
        "v",
        "jennie",
        "lisa",
        "rose",
        "riize",
    }
    assert {
        row["canonicalArtistId"]
        for row in preview["approvedReviews"]
    } == expected

    direct = [
        row
        for row in preview["approvedReviews"]
        if row["evidenceSourceType"]
        == "direct_provider_review"
    ]
    assert len(direct) == 1
    assert direct[0]["canonicalArtistId"] == "jungkook"
    assert direct[0]["videoId"] == "p0nPyE-dv9Q"
    assert direct[0]["channelTitle"] == "BANGTANTV"
    assert direct[0]["sourceDiscoveryRunId"] == ""
    assert direct[0]["sourceArtifactId"] == ""

    artifact_rows = [
        row
        for row in preview["approvedReviews"]
        if row["evidenceSourceType"]
        == "github_discovery_artifact"
    ]
    assert len(artifact_rows) == 10
    for row in artifact_rows:
        assert row["sourceDiscoveryRunId"]
        assert row["sourceArtifactId"]

    assert preview["activeSeedModified"] is False
    assert preview["productScoreModified"] is False
    assert preview["databaseModified"] is False
    assert preview["runtimeModified"] is False

    print(
        "PASS: YouTube reviewed seed coverage is 21/21 "
        "with 10 artifact-backed reviews and "
        "1 direct-provider Jung Kook review"
    )


if __name__ == "__main__":
    main()
