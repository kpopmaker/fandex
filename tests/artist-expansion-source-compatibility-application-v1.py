import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "scripts/fandex-cloud-migration/source"
)
sys.path.insert(0, str(SOURCE_DIR))


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


apply_preview = load_module(
    "artist_source_compatibility_application_preview_v1",
    "scripts/fandex-cloud-migration/source/"
    "artist_source_compatibility_application_preview_v1.py",
)
review = load_module(
    "artist_source_compatibility_review_v1_test",
    "scripts/fandex-cloud-migration/source/"
    "artist_source_compatibility_review_v1.py",
)


def read_json(relative):
    return json.loads(
        (ROOT / relative).read_text(
            encoding="utf-8"
        )
    )


def main():
    registry = read_json(
        "data/fandex-cloud-v10/seed/"
        "artist_source_compatibility_v1.json"
    )
    reviews = read_json(
        "data/fandex-cloud-v10/seed/"
        "artist_source_compatibility_reviews_v1.json"
    )
    application = read_json(
        "data/fandex-cloud-v10/seed/"
        "artist_source_compatibility_application_v1.json"
    )
    music = read_json(
        "data/fandex-cloud-v10/seed/"
        "music_chart_artist_targets_v1.json"
    )
    lastfm = apply_preview.read_lastfm_rows(
        ROOT
        / "scripts/lastfm-cloud/"
        "lastfm_artist_seed_v1.csv"
    )

    preview = apply_preview.build_application_preview(
        registry,
        reviews,
        application,
        music,
        lastfm,
    )

    assert preview["selectedReviewCount"] == 20
    assert preview["selectedMusicReviewCount"] == 11
    assert preview["selectedLastfmReviewCount"] == 9

    assert preview["activeCountsBefore"] == {
        "music_chart": 10,
        "lastfm": 10,
    }
    assert preview["candidateCountsAfter"] == {
        "music_chart": 21,
        "lastfm": 19,
    }

    music_compat = preview["proposedCompatibility"][
        "music_chart"
    ]
    lastfm_compat = preview["proposedCompatibility"][
        "lastfm"
    ]

    assert music_compat["supportedCount"] == 21
    assert music_compat["unresolvedCount"] == 334
    assert music_compat["unsupportedCount"] == 0

    assert lastfm_compat["supportedCount"] == 19
    assert lastfm_compat["unresolvedCount"] == 336
    assert lastfm_compat["unsupportedCount"] == 0

    assert set(
        preview["deferredUnsupportedReviewIds"]
    ) == {
        "lastfm-v-unsupported-v1",
        "lastfm-lisa-unsupported-v1",
    }

    assert {
        row["applicationState"]
        for row in preview["appliedTransitions"]
    } == {"binding_candidate_only"}
    assert {
        row["toStatus"]
        for row in preview["appliedTransitions"]
    } == {"supported"}

    applied_pairs = {
        (
            row["source"],
            row["canonicalArtistId"],
        )
        for row in preview["appliedTransitions"]
    }
    assert ("music_chart", "v") in applied_pairs
    assert ("lastfm", "v") not in applied_pairs
    assert ("music_chart", "lisa") in applied_pairs
    assert ("lastfm", "lisa") not in applied_pairs

    assert preview["activeProviderBindingsModified"] is False
    assert preview["compatibilityRegistryModified"] is False
    assert preview["collectionActivated"] is False
    assert preview["productModified"] is False
    assert preview["registryLifecycleModified"] is False
    assert preview["databaseModified"] is False
    assert preview["runtimeModified"] is False

    assert len(music["artists"]) == 10
    assert len(lastfm) == 10
    assert len(
        registry["sources"]["music_chart"][
            "supportedCanonicalArtistIds"
        ]
    ) == 10
    assert len(
        registry["sources"]["lastfm"][
            "supportedCanonicalArtistIds"
        ]
    ) == 10

    unsupported_selection = dict(application)
    unsupported_selection["selectedReviewIds"] = [
        "lastfm-v-unsupported-v1"
    ]
    try:
        apply_preview.build_application_preview(
            registry,
            reviews,
            unsupported_selection,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected unsupported review selection rejection"
        )
    except RuntimeError as exc:
        assert "Only supported reviews" in str(exc)

    duplicate_selection = dict(application)
    duplicate_selection["selectedReviewIds"] = [
        "music-bts-supported-v1",
        "music-bts-supported-v1",
    ]
    try:
        apply_preview.build_application_preview(
            registry,
            reviews,
            duplicate_selection,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected duplicate selection rejection"
        )
    except RuntimeError as exc:
        assert "Duplicate selected review ID" in str(exc)

    unknown_selection = dict(application)
    unknown_selection["selectedReviewIds"] = [
        "missing-review-id"
    ]
    try:
        apply_preview.build_application_preview(
            registry,
            reviews,
            unknown_selection,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected unknown review rejection"
        )
    except RuntimeError as exc:
        assert "Selected review does not exist" in str(exc)

    print(
        "PASS: reviewed-supported application preview "
        "builds 21 Music / 19 Last.fm binding candidates "
        "without active mutation"
    )


if __name__ == "__main__":
    main()
