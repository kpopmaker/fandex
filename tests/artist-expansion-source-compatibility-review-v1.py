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


def main():
    registry, reviews_payload, music, lastfm = base_inputs()

    assert reviews_payload["reviews"] == []

    fixture = dict(reviews_payload)
    fixture["reviews"] = [
        {
            "reviewId": "music-bts-supported-v1",
            "canonicalArtistId": "bts",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-provider-evidence",
                    "url": "https://example.com/music/bts",
                    "note": "fixture only",
                }
            ],
            "proposedBinding": {
                "canonicalArtistId": "bts",
                "artist": "방탄소년단",
                "aliases": ["방탄소년단", "BTS"],
            },
        },
        {
            "reviewId": "lastfm-blackpink-supported-v1",
            "canonicalArtistId": "blackpink",
            "source": "lastfm",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-provider-evidence",
                    "url": "https://example.com/lastfm/blackpink",
                    "note": "fixture only",
                }
            ],
            "proposedBinding": {
                "canonicalArtistId": "blackpink",
                "artist": "블랙핑크",
                "query": "BLACKPINK",
            },
        },
        {
            "reviewId": "music-twice-unsupported-v1",
            "canonicalArtistId": "twice",
            "source": "music_chart",
            "decision": "unsupported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture-incompatibility-evidence",
                    "url": "https://example.com/music/twice-unavailable",
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

    already_supported = dict(reviews_payload)
    already_supported["reviews"] = [
        {
            "reviewId": "music-iu-repeat",
            "canonicalArtistId": "iu",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
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

    collision = dict(reviews_payload)
    collision["reviews"] = [
        {
            "reviewId": "music-bts-collision",
            "canonicalArtistId": "bts",
            "source": "music_chart",
            "decision": "supported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture",
                    "url": "https://example.com/bts",
                }
            ],
            "proposedBinding": {
                "artist": "방탄소년단",
                "aliases": ["BTS", "IU"],
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

    unsupported_with_binding = dict(reviews_payload)
    unsupported_with_binding["reviews"] = [
        {
            "reviewId": "music-twice-invalid",
            "canonicalArtistId": "twice",
            "source": "music_chart",
            "decision": "unsupported",
            "reviewer": "validation-fixture",
            "reviewedAt": "2026-09-30T23:00:00+09:00",
            "evidence": [
                {
                    "source": "fixture",
                    "url": "https://example.com/twice",
                }
            ],
            "proposedBinding": {
                "artist": "트와이스",
                "aliases": ["TWICE"],
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
        "PASS: reviewed source compatibility workflow "
        "is auditable, fail-closed, and non-activating"
    )


if __name__ == "__main__":
    main()
