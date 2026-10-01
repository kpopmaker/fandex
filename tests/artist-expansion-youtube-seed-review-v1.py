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
    "youtube_seed_review_v1_test",
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
    assert preview["reviewCount"] == 6
    assert preview["approvedReviewCount"] == 6
    assert preview["approvedNewArtistCount"] == 6
    assert preview["candidateCoveredArtistCount"] == 16
    assert preview["unresolvedArtistCount"] == 5
    assert set(
        preview["unresolvedCanonicalArtistIds"]
    ) == {
        "jungkook",
        "jimin",
        "v",
        "jennie",
        "lisa",
    }
    assert {
        row["canonicalArtistId"]
        for row in preview["approvedReviews"]
    } == {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
        "rose",
        "riize",
    }
    assert {
        row["activationState"]
        for row in preview["approvedReviews"]
    } == {"reviewed_candidate_only"}

    assert preview["activeSeedModified"] is False
    assert preview["productScoreModified"] is False
    assert preview["databaseModified"] is False
    assert preview["runtimeModified"] is False

    print(
        "PASS: first YouTube reviewed seed batch covers "
        "16/21 candidate artists and leaves exactly "
        "jungkook,jimin,v,jennie,lisa unresolved"
    )


if __name__ == "__main__":
    main()
