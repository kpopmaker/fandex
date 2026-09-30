from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "artist_source_compatibility_review_v1"

COMPATIBILITY_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_v1.json"
)
REVIEWS_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_reviews_v1.json"
)
MUSIC_BINDING_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_v1.json"
)
LASTFM_BINDING_FILE = Path(
    "scripts/lastfm-cloud/lastfm_artist_seed_v1.csv"
)
OUTPUT_FILE = Path(
    "artist_source_compatibility_review_preview_v1_latest.json"
)

SCOPED_SOURCES = {
    "music_chart",
    "lastfm",
}
ALLOWED_DECISIONS = {
    "supported",
    "unsupported",
}


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def exact_identity(value: Any) -> str:
    return " ".join(
        norm(value).casefold().split()
    )


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(
            f"Missing JSON file: {path}"
        )

    payload = json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )

    if not isinstance(payload, dict):
        raise RuntimeError(
            f"Invalid JSON object: {path}"
        )

    return payload


def read_lastfm_bindings(
    path: Path,
) -> list[dict[str, str]]:
    if not path.exists():
        raise RuntimeError(
            f"Missing Last.fm binding file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return [
            dict(row)
            for row in csv.DictReader(file)
        ]


def parse_reviewed_at(value: Any) -> str:
    text = norm(value)

    if not text:
        raise RuntimeError(
            "Review missing reviewedAt."
        )

    try:
        parsed = datetime.fromisoformat(
            text.replace("Z", "+00:00")
        )
    except ValueError as exc:
        raise RuntimeError(
            f"Invalid reviewedAt: {text}"
        ) from exc

    if parsed.tzinfo is None:
        raise RuntimeError(
            "reviewedAt must include timezone."
        )

    return text


def compatibility_partition(
    registry: dict[str, Any],
    source: str,
) -> tuple[set[str], set[str], set[str]]:
    sources = registry.get("sources")

    if not isinstance(sources, dict):
        raise RuntimeError(
            "Compatibility registry missing sources."
        )

    row = sources.get(source)

    if not isinstance(row, dict):
        raise RuntimeError(
            f"Compatibility source missing: {source}"
        )

    supported = set(
        row.get(
            "supportedCanonicalArtistIds",
            [],
        )
    )
    unresolved = set(
        row.get(
            "unresolvedCanonicalArtistIds",
            [],
        )
    )
    unsupported = set(
        row.get(
            "unsupportedCanonicalArtistIds",
            [],
        )
    )

    if (
        supported & unresolved
        or supported & unsupported
        or unresolved & unsupported
    ):
        raise RuntimeError(
            f"Compatibility partition overlaps: {source}"
        )

    return (
        supported,
        unresolved,
        unsupported,
    )


def validate_evidence(
    review_id: str,
    evidence: Any,
) -> list[dict[str, str]]:
    if (
        not isinstance(evidence, list)
        or not evidence
    ):
        raise RuntimeError(
            f"Review evidence required: {review_id}"
        )

    normalized: list[dict[str, str]] = []

    for index, item in enumerate(evidence):
        if not isinstance(item, dict):
            raise RuntimeError(
                f"Invalid evidence row: "
                f"{review_id}[{index}]"
            )

        source = norm(
            item.get("source")
        )
        url = norm(
            item.get("url")
        )
        note = norm(
            item.get("note")
        )

        if not source:
            raise RuntimeError(
                f"Evidence source required: "
                f"{review_id}[{index}]"
            )
        if not (
            url.startswith("https://")
            or url.startswith("http://")
        ):
            raise RuntimeError(
                f"Evidence URL required: "
                f"{review_id}[{index}]"
            )

        normalized.append(
            {
                "source": source,
                "url": url,
                "note": note,
            }
        )

    return normalized


def build_active_identity_index(
    music_payload: dict[str, Any],
    lastfm_rows: list[dict[str, str]],
) -> dict[str, dict[str, set[str]]]:
    indexes = {
        "music_chart": {},
        "lastfm": {},
    }

    music_rows = music_payload.get(
        "artists",
        [],
    )
    if not isinstance(music_rows, list):
        raise RuntimeError(
            "Invalid Music binding config."
        )

    for row in music_rows:
        if not isinstance(row, dict):
            continue

        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        aliases = row.get("aliases") or []

        if not canonical_id or not artist:
            raise RuntimeError(
                "Invalid active Music binding."
            )
        if not isinstance(aliases, list):
            raise RuntimeError(
                f"Invalid Music aliases: {canonical_id}"
            )

        identities = [
            artist,
            *[
                norm(alias)
                for alias in aliases
            ],
        ]

        for identity in identities:
            key = exact_identity(identity)
            if not key:
                continue
            indexes["music_chart"].setdefault(
                key,
                set(),
            ).add(canonical_id)

    for row in lastfm_rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        query = norm(
            row.get("query")
        )

        if (
            not canonical_id
            or not artist
            or not query
        ):
            raise RuntimeError(
                "Invalid active Last.fm binding."
            )

        for identity in [
            artist,
            query,
        ]:
            key = exact_identity(identity)
            if not key:
                continue
            indexes["lastfm"].setdefault(
                key,
                set(),
            ).add(canonical_id)

    return indexes


def validate_supported_binding(
    review_id: str,
    source: str,
    canonical_artist_id: str,
    binding: Any,
) -> dict[str, Any]:
    if not isinstance(binding, dict):
        raise RuntimeError(
            f"supported review requires "
            f"proposedBinding: {review_id}"
        )

    binding_id = norm(
        binding.get("canonicalArtistId")
    )
    if (
        binding_id
        and binding_id != canonical_artist_id
    ):
        raise RuntimeError(
            f"proposedBinding canonicalArtistId "
            f"mismatch: {review_id}"
        )

    artist = norm(
        binding.get("artist")
    )
    if not artist:
        raise RuntimeError(
            f"proposedBinding artist required: "
            f"{review_id}"
        )

    if source == "music_chart":
        aliases = binding.get("aliases")

        if (
            not isinstance(aliases, list)
            or not aliases
        ):
            raise RuntimeError(
                f"Music proposedBinding aliases "
                f"required: {review_id}"
            )

        cleaned_aliases = [
            norm(alias)
            for alias in aliases
            if norm(alias)
        ]
        if not cleaned_aliases:
            raise RuntimeError(
                f"Music proposedBinding aliases "
                f"empty: {review_id}"
            )

        return {
            "canonicalArtistId":
                canonical_artist_id,
            "artist":
                artist,
            "aliases":
                cleaned_aliases,
        }

    if source == "lastfm":
        query = norm(
            binding.get("query")
        )
        if not query:
            raise RuntimeError(
                f"Last.fm proposedBinding query "
                f"required: {review_id}"
            )

        return {
            "canonicalArtistId":
                canonical_artist_id,
            "artist":
                artist,
            "query":
                query,
        }

    raise RuntimeError(
        f"Unsupported review source: {source}"
    )


def binding_identities(
    source: str,
    binding: dict[str, Any],
) -> list[str]:
    if source == "music_chart":
        return [
            norm(binding.get("artist")),
            *[
                norm(alias)
                for alias in (
                    binding.get("aliases")
                    or []
                )
            ],
        ]

    if source == "lastfm":
        return [
            norm(binding.get("artist")),
            norm(binding.get("query")),
        ]

    return []


def validate_reviews(
    registry: dict[str, Any],
    reviews_payload: dict[str, Any],
    music_payload: dict[str, Any],
    lastfm_rows: list[dict[str, str]],
) -> list[dict[str, Any]]:
    if (
        norm(
            reviews_payload.get(
                "compatibilityVersion"
            )
        )
        != norm(registry.get("version"))
    ):
        raise RuntimeError(
            "Review ledger compatibilityVersion "
            "does not match registry version."
        )

    reviews = reviews_payload.get(
        "reviews",
        [],
    )
    if not isinstance(reviews, list):
        raise RuntimeError(
            "Review ledger reviews must be a list."
        )

    active_indexes = (
        build_active_identity_index(
            music_payload,
            lastfm_rows,
        )
    )
    proposed_indexes = {
        "music_chart": {},
        "lastfm": {},
    }

    seen_review_ids: set[str] = set()
    seen_pairs: set[tuple[str, str]] = set()
    normalized_reviews: list[
        dict[str, Any]
    ] = []

    for raw in reviews:
        if not isinstance(raw, dict):
            raise RuntimeError(
                "Invalid review row."
            )

        review_id = norm(
            raw.get("reviewId")
        )
        canonical_artist_id = norm(
            raw.get("canonicalArtistId")
        )
        source = norm(
            raw.get("source")
        )
        decision = norm(
            raw.get("decision")
        )
        reviewer = norm(
            raw.get("reviewer")
        )
        reviewed_at = parse_reviewed_at(
            raw.get("reviewedAt")
        )

        if not review_id:
            raise RuntimeError(
                "Review missing reviewId."
            )
        if review_id in seen_review_ids:
            raise RuntimeError(
                f"Duplicate reviewId: {review_id}"
            )
        seen_review_ids.add(review_id)

        if not canonical_artist_id:
            raise RuntimeError(
                f"Review missing canonicalArtistId: "
                f"{review_id}"
            )
        if source not in SCOPED_SOURCES:
            raise RuntimeError(
                f"Invalid review source: "
                f"{review_id} = {source}"
            )
        if decision not in ALLOWED_DECISIONS:
            raise RuntimeError(
                f"Invalid review decision: "
                f"{review_id} = {decision}"
            )
        if not reviewer:
            raise RuntimeError(
                f"Review missing reviewer: "
                f"{review_id}"
            )

        pair = (
            source,
            canonical_artist_id,
        )
        if pair in seen_pairs:
            raise RuntimeError(
                "Duplicate source/canonical review: "
                f"{source}/{canonical_artist_id}"
            )
        seen_pairs.add(pair)

        (
            supported,
            unresolved,
            unsupported,
        ) = compatibility_partition(
            registry,
            source,
        )

        if canonical_artist_id in supported:
            raise RuntimeError(
                "Review target already supported: "
                f"{source}/{canonical_artist_id}"
            )
        if canonical_artist_id in unsupported:
            raise RuntimeError(
                "Review target already unsupported: "
                f"{source}/{canonical_artist_id}"
            )
        if canonical_artist_id not in unresolved:
            raise RuntimeError(
                "Review target is not unresolved: "
                f"{source}/{canonical_artist_id}"
            )

        evidence = validate_evidence(
            review_id,
            raw.get("evidence"),
        )

        proposed_binding = None

        if decision == "supported":
            proposed_binding = (
                validate_supported_binding(
                    review_id,
                    source,
                    canonical_artist_id,
                    raw.get(
                        "proposedBinding"
                    ),
                )
            )

            for identity in (
                binding_identities(
                    source,
                    proposed_binding,
                )
            ):
                key = exact_identity(identity)
                if not key:
                    continue

                active_owners = (
                    active_indexes[
                        source
                    ].get(
                        key,
                        set(),
                    )
                )
                foreign_active = {
                    owner
                    for owner in active_owners
                    if owner
                    != canonical_artist_id
                }
                if foreign_active:
                    raise RuntimeError(
                        "Exact provider identity "
                        "collision with active binding: "
                        f"{review_id} / {identity}"
                    )

                proposed_owners = (
                    proposed_indexes[
                        source
                    ].get(
                        key,
                        set(),
                    )
                )
                foreign_proposed = {
                    owner
                    for owner
                    in proposed_owners
                    if owner
                    != canonical_artist_id
                }
                if foreign_proposed:
                    raise RuntimeError(
                        "Exact provider identity "
                        "collision with reviewed candidate: "
                        f"{review_id} / {identity}"
                    )

                proposed_indexes[
                    source
                ].setdefault(
                    key,
                    set(),
                ).add(
                    canonical_artist_id
                )

        else:
            proposed_binding_raw = raw.get(
                "proposedBinding"
            )
            if proposed_binding_raw not in (
                None,
                {},
            ):
                raise RuntimeError(
                    "unsupported review must not "
                    "include proposedBinding: "
                    f"{review_id}"
                )

        normalized_reviews.append(
            {
                "reviewId":
                    review_id,
                "canonicalArtistId":
                    canonical_artist_id,
                "source":
                    source,
                "currentStatus":
                    "unresolved",
                "proposedStatus":
                    decision,
                "reviewer":
                    reviewer,
                "reviewedAt":
                    reviewed_at,
                "evidence":
                    evidence,
                "proposedBinding":
                    proposed_binding,
                "notes":
                    norm(
                        raw.get("notes")
                    ),
                "activationState":
                    "reviewed_candidate_only",
            }
        )

    return normalized_reviews


def build_preview(
    registry: dict[str, Any],
    reviews: list[dict[str, Any]],
) -> dict[str, Any]:
    by_source = {
        source: []
        for source in sorted(
            SCOPED_SOURCES
        )
    }

    for review in reviews:
        by_source[
            review["source"]
        ].append(review)

    source_summary = {}

    for source in sorted(
        SCOPED_SOURCES
    ):
        (
            _supported,
            unresolved,
            _unsupported,
        ) = compatibility_partition(
            registry,
            source,
        )

        source_reviews = by_source[
            source
        ]

        supported_proposals = sum(
            1
            for review in source_reviews
            if review["proposedStatus"]
            == "supported"
        )
        unsupported_proposals = sum(
            1
            for review in source_reviews
            if review["proposedStatus"]
            == "unsupported"
        )

        source_summary[source] = {
            "currentUnresolvedCount":
                len(unresolved),
            "reviewedSupportedProposalCount":
                supported_proposals,
            "reviewedUnsupportedProposalCount":
                unsupported_proposals,
            "pendingReviewCount":
                len(unresolved)
                - len(source_reviews),
        }

    return {
        "version":
            VERSION,
        "compatibilityVersion":
            norm(registry.get("version")),
        "activationPolicy":
            "manual_only_no_runtime_mutation",
        "reviewCount":
            len(reviews),
        "sourceSummary":
            source_summary,
        "reviewedTransitions":
            reviews,
        "mutatesCompatibilityRegistry":
            False,
        "mutatesProviderBindings":
            False,
        "activatesCollection":
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
            "Validate reviewed source compatibility "
            "transition candidates without applying them."
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

    registry = read_json(
        args.compatibility
    )
    reviews_payload = read_json(
        args.reviews
    )
    music_payload = read_json(
        args.music_bindings
    )
    lastfm_rows = read_lastfm_bindings(
        args.lastfm_bindings
    )

    reviews = validate_reviews(
        registry,
        reviews_payload,
        music_payload,
        lastfm_rows,
    )
    preview = build_preview(
        registry,
        reviews,
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
        "PASS: source compatibility review "
        f"preview validated | reviews="
        f"{len(reviews)}"
    )
    for source, summary in (
        preview["sourceSummary"].items()
    ):
        print(
            f"{source} | "
            f"unresolved="
            f"{summary['currentUnresolvedCount']} | "
            f"reviewedSupported="
            f"{summary['reviewedSupportedProposalCount']} | "
            f"reviewedUnsupported="
            f"{summary['reviewedUnsupportedProposalCount']} | "
            f"pending="
            f"{summary['pendingReviewCount']}"
        )


if __name__ == "__main__":
    main()
