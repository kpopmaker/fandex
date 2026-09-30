from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

import artist_source_compatibility_review_v1 as review_workflow


VERSION = "artist_source_compatibility_application_preview_v1"

COMPATIBILITY_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_v1.json"
)
REVIEWS_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_reviews_v1.json"
)
APPLICATION_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_application_v1.json"
)
MUSIC_BINDING_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_v1.json"
)
LASTFM_BINDING_FILE = Path(
    "scripts/lastfm-cloud/lastfm_artist_seed_v1.csv"
)
OUTPUT_FILE = Path(
    "artist_source_compatibility_application_preview_v1_latest.json"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_lastfm_rows(path: Path) -> list[dict[str, str]]:
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return [
            dict(row)
            for row in csv.DictReader(file)
        ]


def require_unique(
    values: list[str],
    label: str,
) -> None:
    if len(values) != len(set(values)):
        raise RuntimeError(
            f"Duplicate {label}."
        )


def validate_application_manifest(
    application: dict[str, Any],
    reviews_payload: dict[str, Any],
) -> list[str]:
    if (
        norm(application.get("version"))
        != "artist_source_compatibility_application_v1"
    ):
        raise RuntimeError(
            "Invalid application manifest version."
        )

    if (
        norm(application.get("reviewLedgerVersion"))
        != norm(reviews_payload.get("version"))
    ):
        raise RuntimeError(
            "Application reviewLedgerVersion mismatch."
        )

    if (
        norm(application.get("mode"))
        != "preview_only_no_active_mutation"
    ):
        raise RuntimeError(
            "Application mode must remain preview-only."
        )

    selected = application.get("selectedReviewIds")
    if (
        not isinstance(selected, list)
        or not selected
    ):
        raise RuntimeError(
            "Application selectedReviewIds must be non-empty."
        )

    selected_ids = [
        norm(value)
        for value in selected
    ]
    if any(not value for value in selected_ids):
        raise RuntimeError(
            "Application contains empty review ID."
        )

    require_unique(
        selected_ids,
        "selected review ID",
    )
    return selected_ids


def assert_no_identity_collisions(
    music_payload: dict[str, Any],
    lastfm_rows: list[dict[str, str]],
) -> None:
    indexes = (
        review_workflow.build_active_identity_index(
            music_payload,
            lastfm_rows,
        )
    )

    for source, identities in indexes.items():
        for identity, owners in identities.items():
            if len(owners) > 1:
                raise RuntimeError(
                    "Provider identity collision in "
                    f"application candidate: "
                    f"{source}/{identity} -> "
                    f"{sorted(owners)}"
                )


def build_application_preview(
    registry: dict[str, Any],
    reviews_payload: dict[str, Any],
    application: dict[str, Any],
    music_payload: dict[str, Any],
    lastfm_rows: list[dict[str, str]],
) -> dict[str, Any]:
    validated_reviews = (
        review_workflow.validate_reviews(
            registry,
            reviews_payload,
            music_payload,
            lastfm_rows,
        )
    )
    reviews_by_id = {
        review["reviewId"]: review
        for review in validated_reviews
    }

    selected_ids = (
        validate_application_manifest(
            application,
            reviews_payload,
        )
    )

    selected_reviews: list[
        dict[str, Any]
    ] = []

    for review_id in selected_ids:
        row = reviews_by_id.get(review_id)
        if row is None:
            raise RuntimeError(
                "Selected review does not exist: "
                + review_id
            )

        if (
            row["activationState"]
            != "reviewed_candidate_only"
        ):
            raise RuntimeError(
                "Selected review is not a "
                "reviewed candidate: "
                + review_id
            )

        if row["proposedStatus"] != "supported":
            raise RuntimeError(
                "Only supported reviews may be "
                "selected for binding application: "
                + review_id
            )

        if not isinstance(
            row.get("proposedBinding"),
            dict,
        ):
            raise RuntimeError(
                "Selected supported review missing "
                "proposedBinding: "
                + review_id
            )

        selected_reviews.append(row)

    selected_pairs = [
        (
            row["source"],
            row["canonicalArtistId"],
        )
        for row in selected_reviews
    ]
    require_unique(
        [
            f"{source}:{canonical_id}"
            for source, canonical_id
            in selected_pairs
        ],
        "selected source/canonical pair",
    )

    active_music = music_payload.get(
        "artists",
        [],
    )
    if not isinstance(active_music, list):
        raise RuntimeError(
            "Invalid active Music config."
        )

    proposed_music = [
        dict(row)
        for row in active_music
    ]
    proposed_lastfm = [
        dict(row)
        for row in lastfm_rows
    ]

    active_music_ids = {
        norm(row.get("canonicalArtistId"))
        for row in active_music
    }
    active_lastfm_ids = {
        norm(row.get("canonicalArtistId"))
        for row in lastfm_rows
    }

    proposed_music_ids = set(
        active_music_ids
    )
    proposed_lastfm_ids = set(
        active_lastfm_ids
    )

    applied_transitions = []

    for row in selected_reviews:
        source = row["source"]
        canonical_id = row[
            "canonicalArtistId"
        ]
        binding = dict(
            row["proposedBinding"]
        )

        if source == "music_chart":
            if canonical_id in proposed_music_ids:
                raise RuntimeError(
                    "Music application target already "
                    "active: "
                    + canonical_id
                )
            proposed_music.append(binding)
            proposed_music_ids.add(
                canonical_id
            )

        elif source == "lastfm":
            if canonical_id in proposed_lastfm_ids:
                raise RuntimeError(
                    "Last.fm application target already "
                    "active: "
                    + canonical_id
                )
            proposed_lastfm.append(binding)
            proposed_lastfm_ids.add(
                canonical_id
            )

        else:
            raise RuntimeError(
                "Unsupported application source: "
                + source
            )

        applied_transitions.append(
            {
                "reviewId":
                    row["reviewId"],
                "source":
                    source,
                "canonicalArtistId":
                    canonical_id,
                "fromStatus":
                    "unresolved",
                "toStatus":
                    "supported",
                "applicationState":
                    "binding_candidate_only",
            }
        )

    proposed_music_payload = {
        **music_payload,
        "artists":
            proposed_music,
    }

    assert_no_identity_collisions(
        proposed_music_payload,
        proposed_lastfm,
    )

    proposed_compatibility = {}
    for source in [
        "music_chart",
        "lastfm",
    ]:
        (
            supported,
            unresolved,
            unsupported,
        ) = review_workflow.compatibility_partition(
            registry,
            source,
        )

        applied_ids = {
            row["canonicalArtistId"]
            for row in selected_reviews
            if row["source"] == source
        }

        if not applied_ids <= unresolved:
            raise RuntimeError(
                "Application includes non-unresolved "
                f"target for {source}."
            )

        proposed_supported = (
            supported
            | applied_ids
        )
        proposed_unresolved = (
            unresolved
            - applied_ids
        )

        proposed_compatibility[source] = {
            "supportedCanonicalArtistIds":
                sorted(
                    proposed_supported
                ),
            "unresolvedCanonicalArtistIds":
                sorted(
                    proposed_unresolved
                ),
            "unsupportedCanonicalArtistIds":
                sorted(
                    unsupported
                ),
            "supportedCount":
                len(proposed_supported),
            "unresolvedCount":
                len(proposed_unresolved),
            "unsupportedCount":
                len(unsupported),
        }

    selected_review_set = set(
        selected_ids
    )
    deferred_unsupported = [
        row["reviewId"]
        for row in validated_reviews
        if (
            row["proposedStatus"]
            == "unsupported"
            and row["reviewId"]
            not in selected_review_set
        )
    ]

    return {
        "version":
            VERSION,
        "applicationManifestVersion":
            norm(
                application.get("version")
            ),
        "mode":
            "preview_only_no_active_mutation",
        "selectedReviewCount":
            len(selected_reviews),
        "selectedMusicReviewCount":
            sum(
                1
                for row in selected_reviews
                if row["source"]
                == "music_chart"
            ),
        "selectedLastfmReviewCount":
            sum(
                1
                for row in selected_reviews
                if row["source"]
                == "lastfm"
            ),
        "activeCountsBefore": {
            "music_chart":
                len(active_music),
            "lastfm":
                len(lastfm_rows),
        },
        "candidateCountsAfter": {
            "music_chart":
                len(proposed_music),
            "lastfm":
                len(proposed_lastfm),
        },
        "appliedTransitions":
            applied_transitions,
        "proposedMusicBindingConfig":
            proposed_music_payload,
        "proposedLastfmBindingRows":
            proposed_lastfm,
        "proposedCompatibility":
            proposed_compatibility,
        "deferredUnsupportedReviewIds":
            deferred_unsupported,
        "activeProviderBindingsModified":
            False,
        "compatibilityRegistryModified":
            False,
        "collectionActivated":
            False,
        "productModified":
            False,
        "registryLifecycleModified":
            False,
        "databaseModified":
            False,
        "runtimeModified":
            False,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build a fail-closed preview of "
            "explicit reviewed-supported source "
            "binding applications."
        )
    )
    parser.add_argument(
        "--compatibility",
        type=Path,
        default=COMPATIBILITY_FILE,
    )
    parser.add_argument(
        "--reviews",
        type=Path,
        default=REVIEWS_FILE,
    )
    parser.add_argument(
        "--application",
        type=Path,
        default=APPLICATION_FILE,
    )
    parser.add_argument(
        "--music-bindings",
        type=Path,
        default=MUSIC_BINDING_FILE,
    )
    parser.add_argument(
        "--lastfm-bindings",
        type=Path,
        default=LASTFM_BINDING_FILE,
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    registry = review_workflow.read_json(
        args.compatibility
    )
    reviews_payload = (
        review_workflow.read_json(
            args.reviews
        )
    )
    application = (
        review_workflow.read_json(
            args.application
        )
    )
    music_payload = (
        review_workflow.read_json(
            args.music_bindings
        )
    )
    lastfm_rows = read_lastfm_rows(
        args.lastfm_bindings
    )

    preview = build_application_preview(
        registry,
        reviews_payload,
        application,
        music_payload,
        lastfm_rows,
    )

    args.output.write_text(
        json.dumps(
            preview,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: reviewed-supported binding "
        "application preview validated | "
        f"selected={preview['selectedReviewCount']} | "
        f"musicCandidate="
        f"{preview['candidateCountsAfter']['music_chart']} | "
        f"lastfmCandidate="
        f"{preview['candidateCountsAfter']['lastfm']}"
    )


if __name__ == "__main__":
    main()
