from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import music_chart_collect_bugs_v1 as bugs
import music_chart_discover_artist_candidates_v2 as discover
import music_chart_discover_bugs_all_targets_v1 as bugs_discover

import sys

LASTFM_DIR = (
    Path(__file__).resolve().parents[2]
    / "lastfm-cloud"
)
if str(LASTFM_DIR) not in sys.path:
    sys.path.insert(0, str(LASTFM_DIR))

import lastfm_cloud_history_v1 as lastfm


VERSION = "artist_source_candidate_provider_shadow_v1"

MUSIC_CANDIDATE_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_candidate_v1.json"
)
LASTFM_CANDIDATE_FILE = Path(
    "scripts/lastfm-cloud/"
    "lastfm_artist_seed_candidate_v1.csv"
)
OUTPUT_FILE = Path(
    "artist_source_candidate_provider_shadow_v1_latest.json"
)


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def provider_identity(value: Any) -> str:
    return re.sub(
        r"[^0-9a-z가-힣]+",
        "",
        norm(value).casefold(),
    )


def load_music_candidate() -> tuple[
    dict[str, list[str]],
    dict[str, str],
]:
    artists, canonical_ids = (
        discover.load_target_artist_bindings(
            MUSIC_CANDIDATE_FILE
        )
    )

    if len(artists) != 21:
        raise RuntimeError(
            "Expected 21 Music candidate artists, "
            f"got {len(artists)}."
        )
    if len(canonical_ids) != 21:
        raise RuntimeError(
            "Expected 21 Music canonical IDs, "
            f"got {len(canonical_ids)}."
        )

    return artists, canonical_ids


def collect_music_shadow() -> dict[str, Any]:
    target_artists, canonical_ids = (
        load_music_candidate()
    )

    original_targets = discover.TARGET_ARTISTS
    original_ids = discover.TARGET_CANONICAL_IDS

    discover.TARGET_ARTISTS = target_artists
    discover.TARGET_CANONICAL_IDS = (
        canonical_ids
    )

    try:
        collector = discover.load_collector()

        source_results = []
        all_items = []

        with tempfile.TemporaryDirectory() as tmp:
            if hasattr(collector, "RAW_DIR"):
                collector.RAW_DIR = (
                    Path(tmp)
                    / "raw_music_chart_pages"
                )

            for source in discover.SOURCES:
                try:
                    items, fetch_log = (
                        discover.collect_source(
                            collector,
                            source,
                        )
                    )
                except Exception as exc:
                    raise RuntimeError(
                        "Music source fetch failed: "
                        f"{source['sourceKey']} | {exc}"
                    ) from exc

                status_code = fetch_log.get(
                    "statusCode"
                )
                if status_code != 200:
                    raise RuntimeError(
                        "Music source HTTP failure: "
                        f"{source['sourceKey']} "
                        f"status={status_code}"
                    )

                if not items:
                    raise RuntimeError(
                        "Music source parsed 0 rows: "
                        + source["sourceKey"]
                    )

                source_results.append(
                    {
                        "sourceKey":
                            source["sourceKey"],
                        "platform":
                            source["platform"],
                        "statusCode":
                            status_code,
                        "parsedRowCount":
                            len(items),
                    }
                )
                all_items.extend(items)

        deduped = discover.dedupe_chart_items(
            all_items
        )
        ambiguities: list[dict[str, Any]] = []
        candidates = discover.build_candidates(
            deduped,
            date.today().isoformat(),
            ambiguities,
        )

        try:
            bugs_page = (
                bugs.fetch_bugs_chart()
            )
        except Exception as exc:
            raise RuntimeError(
                "Bugs source fetch failed: "
                + str(exc)
            ) from exc

        bugs_rows = bugs.parse_bugs_chart(
            bugs_page
        )
        if not bugs_rows:
            raise RuntimeError(
                "Bugs source parsed 0 rows."
            )

        bugs_candidates = []
        bugs_ambiguities = []

        for row in bugs_rows:
            chart_artist = norm(
                row.get("artist")
            )
            resolution = (
                discover.resolve_target_artist(
                    chart_artist
                )
            )

            if resolution["status"] == "ambiguous":
                bugs_ambiguities.append(
                    {
                        "chartArtist":
                            chart_artist,
                        "trackTitle":
                            norm(
                                row.get(
                                    "trackTitle"
                                )
                            ),
                        "rank":
                            row.get("rank"),
                        "matches":
                            resolution["matches"],
                    }
                )
                continue

            if resolution["status"] != "resolved":
                continue

            matched_alias = norm(
                resolution.get(
                    "matchedAlias"
                )
            )
            if not (
                bugs_discover.alias_matches_safely(
                    chart_artist,
                    matched_alias,
                )
            ):
                continue

            bugs_candidates.append(
                {
                    "canonicalArtistId":
                        resolution[
                            "canonicalArtistId"
                        ],
                    "artist":
                        resolution["artist"],
                    "matchedAlias":
                        matched_alias,
                    "chartArtist":
                        chart_artist,
                    "trackTitle":
                        norm(
                            row.get(
                                "trackTitle"
                            )
                        ),
                    "rank":
                        row.get("rank"),
                }
            )

        all_ambiguities = [
            {
                "source": "melon_genie",
                **row,
            }
            for row in ambiguities
        ] + [
            {
                "source": "bugs",
                **row,
            }
            for row in bugs_ambiguities
        ]

        if all_ambiguities:
            sample = all_ambiguities[:5]
            raise RuntimeError(
                "Music candidate identity ambiguity "
                "detected in live provider data: "
                + json.dumps(
                    sample,
                    ensure_ascii=False,
                )
            )

        resolved_ids = {
            norm(
                row.get(
                    "canonicalArtistId"
                )
            )
            for row in candidates
            if norm(
                row.get(
                    "canonicalArtistId"
                )
            )
        }
        resolved_ids.update(
            row["canonicalArtistId"]
            for row in bugs_candidates
        )

        return {
            "candidateArtistCount":
                len(target_artists),
            "sourceResults":
                source_results,
            "melonGenieParsedRowCount":
                len(deduped),
            "melonGenieCandidateCount":
                len(candidates),
            "bugsParsedRowCount":
                len(bugs_rows),
            "bugsCandidateCount":
                len(bugs_candidates),
            "observedCandidateArtistCount":
                len(resolved_ids),
            "observedCanonicalArtistIds":
                sorted(resolved_ids),
            "identityAmbiguityCount":
                0,
            "notObservedOnCurrentChartsCount":
                len(
                    set(canonical_ids.values())
                    - resolved_ids
                ),
            "notObservedOnCurrentChartsCanonicalIds":
                sorted(
                    set(canonical_ids.values())
                    - resolved_ids
                ),
        }
    finally:
        discover.TARGET_ARTISTS = (
            original_targets
        )
        discover.TARGET_CANONICAL_IDS = (
            original_ids
        )


def collect_lastfm_shadow() -> dict[str, Any]:
    original_seed = lastfm.SEED_FILE
    lastfm.SEED_FILE = LASTFM_CANDIDATE_FILE

    try:
        seeds = lastfm.read_seed()
    finally:
        lastfm.SEED_FILE = original_seed

    if len(seeds) != 19:
        raise RuntimeError(
            "Expected 19 Last.fm candidate seeds, "
            f"got {len(seeds)}."
        )

    api_key = lastfm.get_api_key()
    results = []
    errors = []

    for seed in seeds:
        try:
            item = lastfm.fetch_artist_info(
                seed,
                api_key,
            )

            query_identity = (
                provider_identity(
                    seed["query"]
                )
            )
            returned_identity = (
                provider_identity(
                    item["lastfmName"]
                )
            )

            if (
                not query_identity
                or not returned_identity
                or query_identity
                != returned_identity
            ):
                raise RuntimeError(
                    "Last.fm returned name does "
                    "not match reviewed query: "
                    f"query={seed['query']} "
                    f"returned={item['lastfmName']}"
                )

            results.append(
                {
                    "canonicalArtistId":
                        seed[
                            "canonicalArtistId"
                        ],
                    "artist":
                        seed["artist"],
                    "query":
                        seed["query"],
                    "lastfmName":
                        item["lastfmName"],
                    "listeners":
                        item["listeners"],
                    "playcount":
                        item["playcount"],
                    "status":
                        "ok",
                }
            )
        except Exception as exc:
            errors.append(
                {
                    "canonicalArtistId":
                        seed[
                            "canonicalArtistId"
                        ],
                    "artist":
                        seed["artist"],
                    "query":
                        seed["query"],
                    "error":
                        str(exc),
                }
            )

    if errors:
        raise RuntimeError(
            "Last.fm candidate shadow failed: "
            + json.dumps(
                errors,
                ensure_ascii=False,
            )
        )

    canonical_ids = {
        row["canonicalArtistId"]
        for row in results
    }
    if len(canonical_ids) != 19:
        raise RuntimeError(
            "Last.fm shadow canonical ID count "
            f"mismatch: {len(canonical_ids)}"
        )

    return {
        "candidateArtistCount": 19,
        "successCount": len(results),
        "failureCount": 0,
        "artists": results,
    }


def main() -> None:
    print(
        "FANDEX Artist Source Candidate "
        "Provider Shadow v1"
    )
    print("=" * 72)
    print("activeProviderBindingsModified: FALSE")
    print("compatibilityRegistryModified: FALSE")
    print("collectionActivated: FALSE")
    print("productModified: FALSE")
    print("databaseModified: FALSE")
    print("runtimeModified: FALSE")

    if not (
        os.environ.get(
            "LASTFM_API_KEY"
        )
        or ""
    ).strip():
        raise RuntimeError(
            "LASTFM_API_KEY is required for "
            "provider shadow."
        )

    music_result = collect_music_shadow()
    lastfm_result = collect_lastfm_shadow()

    payload = {
        "version": VERSION,
        "createdAt":
            datetime.now(
                timezone.utc
            ).isoformat(
                timespec="seconds"
            ),
        "mode":
            "live_provider_shadow_candidate_only",
        "music":
            music_result,
        "lastfm":
            lastfm_result,
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

    OUTPUT_FILE.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "Music shadow | "
        f"targets={music_result['candidateArtistCount']} | "
        f"observed="
        f"{music_result['observedCandidateArtistCount']} | "
        f"notObserved="
        f"{music_result['notObservedOnCurrentChartsCount']} | "
        "ambiguities=0"
    )
    print(
        "Last.fm shadow | "
        f"targets={lastfm_result['candidateArtistCount']} | "
        f"success={lastfm_result['successCount']} | "
        "failure=0"
    )
    print(f"output: {OUTPUT_FILE}")
    print("PASS: live provider candidate shadow")


if __name__ == "__main__":
    main()
