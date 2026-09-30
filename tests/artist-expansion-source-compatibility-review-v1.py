import importlib.util
import json
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
    "artist_source_compatibility_review_v1",
    "scripts/fandex-cloud-migration/source/"
    "artist_source_compatibility_review_v1.py",
)


def base_inputs():
    registry = json.loads(
        (
            ROOT
            / "data/fandex-cloud-v10/seed/"
            "artist_source_compatibility_v1.json"
        ).read_text(encoding="utf-8")
    )
    reviews_payload = json.loads(
        (
            ROOT
            / "data/fandex-cloud-v10/seed/"
            "artist_source_compatibility_reviews_v1.json"
        ).read_text(encoding="utf-8")
    )
    music = json.loads(
        (
            ROOT
            / "data/fandex-cloud-v10/seed/"
            "music_chart_artist_targets_v1.json"
        ).read_text(encoding="utf-8")
    )
    lastfm = review.read_lastfm_bindings(
        ROOT
        / "scripts/lastfm-cloud/"
        "lastfm_artist_seed_v1.csv"
    )
    return registry, reviews_payload, music, lastfm


def empty_ledger(payload):
    result = dict(payload)
    result["reviews"] = []
    return result


def main():
    registry, reviews_payload, music, lastfm = base_inputs()

    production_reviews = review.validate_reviews(
        registry,
        reviews_payload,
        music,
        lastfm,
    )
    assert len(production_reviews) == 8
    assert {
        row["canonicalArtistId"]
        for row in production_reviews
    } == {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
    }
    assert {
        row["source"]
        for row in production_reviews
    } == {
        "music_chart",
        "lastfm",
    }
    assert {
        row["proposedStatus"]
        for row in production_reviews
    } == {"supported"}
    assert {
        row["activationState"]
        for row in production_reviews
    } == {"reviewed_candidate_only"}

    production_preview = review.build_preview(
        registry,
        production_reviews,
    )
    assert production_preview["reviewCount"] == 8
    assert (
        production_preview["sourceSummary"]["music_chart"][
            "reviewedSupportedProposalCount"
        ]
        == 4
    )
    assert (
        production_preview["sourceSummary"]["lastfm"][
            "reviewedSupportedProposalCount"
        ]
        == 4
    )
    assert (
        production_preview["sourceSummary"]["music_chart"][
            "pendingReviewCount"
        ]
        == 341
    )
    assert (
        production_preview["sourceSummary"]["lastfm"][
            "pendingReviewCount"
        ]
        == 341
    )
    assert production_preview["mutatesCompatibilityRegistry"] is False
    assert production_preview["mutatesProviderBindings"] is False
    assert production_preview["activatesCollection"] is False
    assert production_preview["productModified"] is False
    assert production_preview["databaseModified"] is False
    assert production_preview["runtimeModified"] is False

    base = empty_ledger(reviews_payload)

    fixture = dict(base)
    fixture["reviews"] = [
        {
            "reviewId": "music-jimin-supported-fixture",
            "canonicalArtistId": "jimin",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-provider-evidence",
                    "url": "https://example.com/music/jimin",
                    "note": "fixture only",
                }
            ],
            "proposedBinding": {
                "canonicalArtistId": "jimin",
                "artist": "지민",
                "aliases": ["지민", "Jimin"],
            },
        },
        {
            "reviewId": "lastfm-jennie-supported-fixture",
            "canonicalArtistId": "jennie",
            "source": "lastfm",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-provider-evidence",
                    "url": "https://example.com/lastfm/jennie",
                    "note": "fixture only",
                }
            ],
            "proposedBinding": {
                "canonicalArtistId": "jennie",
                "artist": "제니",
                "query": "JENNIE",
            },
        },
        {
            "reviewId": "music-v-unsupported-fixture",
            "canonicalArtistId": "v",
            "source": "music_chart",
            "decision": "unsupported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-incompatibility-evidence",
                    "url": "https://example.com/music/v-unavailable",
                    "note": "fixture only",
                }
            ],
        },
    ]

    validated = review.validate_reviews(
        registry,
        fixture,
        music,
        lastfm,
    )
    assert len(validated) == 3
    assert {
        row["activationState"]
        for row in validated
    } == {"reviewed_candidate_only"}

    preview = review.build_preview(
        registry,
        validated,
    )
    assert preview["mutatesCompatibilityRegistry"] is False
    assert preview["mutatesProviderBindings"] is False
    assert preview["activatesCollection"] is False
    assert (
        preview["sourceSummary"]["music_chart"][
            "reviewedSupportedProposalCount"
        ]
        == 1
    )
    assert (
        preview["sourceSummary"]["music_chart"][
            "reviewedUnsupportedProposalCount"
        ]
        == 1
    )
    assert (
        preview["sourceSummary"]["lastfm"][
            "reviewedSupportedProposalCount"
        ]
        == 1
    )

    already_supported = dict(base)
    already_supported["reviews"] = [
        {
            "reviewId": "music-iu-repeat",
            "canonicalArtistId": "iu",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture",
                    "url": "https://example.com/iu",
                }
            ],
            "proposedBinding": {
                "artist": "아이유",
                "aliases": ["아이유", "IU"],
            },
        }
    ]
    try:
        review.validate_reviews(
            registry,
            already_supported,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected already-supported review rejection"
        )
    except RuntimeError as exc:
        assert "already supported" in str(exc)

    collision = dict(base)
    collision["reviews"] = [
        {
            "reviewId": "music-jimin-collision",
            "canonicalArtistId": "jimin",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture",
                    "url": "https://example.com/jimin",
                }
            ],
            "proposedBinding": {
                "artist": "지민",
                "aliases": ["Jimin", "IU"],
            },
        }
    ]
    try:
        review.validate_reviews(
            registry,
            collision,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected exact provider identity collision rejection"
        )
    except RuntimeError as exc:
        assert "collision with active binding" in str(exc)

    unsupported_with_binding = dict(base)
    unsupported_with_binding["reviews"] = [
        {
            "reviewId": "music-v-invalid",
            "canonicalArtistId": "v",
            "source": "music_chart",
            "decision": "unsupported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-10-01T07:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture",
                    "url": "https://example.com/v",
                }
            ],
            "proposedBinding": {
                "artist": "뷔",
                "aliases": ["V"],
            },
        }
    ]
    try:
        review.validate_reviews(
            registry,
            unsupported_with_binding,
            music,
            lastfm,
        )
        raise AssertionError(
            "expected unsupported binding rejection"
        )
    except RuntimeError as exc:
        assert "must not include proposedBinding" in str(exc)

    print(
        "PASS: production reviewed batch and source compatibility workflow "
        "are auditable, fail-closed, and non-activating"
    )


if __name__ == "__main__":
    main()
