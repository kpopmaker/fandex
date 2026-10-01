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
    "youtube_seed_review_v1_v6",
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
    assert preview["reviewCount"] == 10
    assert preview["approvedReviewCount"] == 10
    assert preview["approvedNewArtistCount"] == 10
    assert preview["candidateCoveredArtistCount"] == 20
    assert preview["unresolvedArtistCount"] == 1
    assert preview[
        "unresolvedCanonicalArtistIds"
    ] == ["jungkook"]

    expected = {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
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

    for row in preview["approvedReviews"]:
        assert row["sourceDiscoveryRunId"]
        assert row["sourceArtifactId"]
        assert (
            row["activationState"]
            == "reviewed_candidate_only"
        )

    print(
        "PASS: YouTube reviewed seed coverage is 20/21; "
        "only jungkook remains unresolved"
    )


if __name__ == "__main__":
    main()
