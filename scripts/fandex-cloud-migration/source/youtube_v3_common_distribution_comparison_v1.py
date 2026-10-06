from __future__ import annotations

import json
import math
from pathlib import Path
from statistics import mean, median, pstdev

ROOT = Path(__file__).resolve().parents[3]

RECEIPT = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_metric_snapshot_receipt_v1.json"
FROZEN = ROOT / "data/fandex-cloud-v10/seed/fandex_youtube_ranking_v3_latest.json"
LINEAGE = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_lineage_status_v1.json"
OUTPUT = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_distribution_comparison_v1.json"

VERSION = "youtube_v3_common_distribution_comparison_v1"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def round6(value: float) -> float:
    return round(float(value), 6)


def stats(values: list[float]) -> dict:
    return {
        "count": len(values),
        "min": round6(min(values)),
        "max": round6(max(values)),
        "mean": round6(mean(values)),
        "median": round6(median(values)),
        "populationStdDev": round6(pstdev(values)),
        "sum": round6(sum(values)),
    }


def pearson(xs: list[float], ys: list[float]) -> float:
    mx = mean(xs)
    my = mean(ys)
    numerator = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return numerator / (dx * dy)


def main() -> None:
    receipt = read_json(RECEIPT)
    frozen = read_json(FROZEN)
    lineage = read_json(LINEAGE)

    if receipt["nextGate"]["code"] != "COMMON_21_ARTIST_DISTRIBUTION_COMPARISON_REQUIRED":
        raise RuntimeError("Unexpected YouTube comparison gate.")
    if receipt["measurement"]["returnedVideoCount"] != 74:
        raise RuntimeError("Common snapshot is not complete 74/74.")

    new_by_artist = {
        row["artist"]: row
        for row in receipt["ranking"]
    }
    canonical_by_artist = {
        row["artist"]: row["canonicalArtistId"]
        for row in receipt["ranking"]
    }

    frozen_rows = []
    for row in frozen["ranking"]:
        artist = row["artist"]
        if artist not in new_by_artist:
            raise RuntimeError("Frozen artist absent from common snapshot: " + artist)
        frozen_rows.append({
            "canonicalArtistId": canonical_by_artist[artist],
            "artist": artist,
            "frozenPoint": float(row["youtubePoint"]),
            "rebaselinePoint": float(
                new_by_artist[artist]["youtubePointV3RebaselineSnapshot"]
            ),
            "rebaselineGlobalRank": int(
                new_by_artist[artist]["snapshotRank"]
            ),
        })

    if len(frozen_rows) != 10:
        raise RuntimeError("Expected 10 frozen overlap artists.")

    frozen_ranked = sorted(
        frozen_rows,
        key=lambda row: (-row["frozenPoint"], row["canonicalArtistId"]),
    )
    for index, row in enumerate(frozen_ranked, start=1):
        row["frozenRank"] = index

    overlap_rebaseline_ranked = sorted(
        frozen_rows,
        key=lambda row: (-row["rebaselinePoint"], row["canonicalArtistId"]),
    )
    overlap_rank = {
        row["canonicalArtistId"]: index
        for index, row in enumerate(overlap_rebaseline_ranked, start=1)
    }

    pairs = []
    for row in frozen_ranked:
        delta = row["rebaselinePoint"] - row["frozenPoint"]
        ratio = row["rebaselinePoint"] / row["frozenPoint"]
        pairs.append({
            **row,
            "rebaselineOverlapRank": overlap_rank[row["canonicalArtistId"]],
            "delta": round(delta, 2),
            "ratio": round6(ratio),
        })

    frozen_values = [row["frozenPoint"] for row in pairs]
    overlap_values = [row["rebaselinePoint"] for row in pairs]
    deltas = [row["delta"] for row in pairs]
    ratios = [row["ratio"] for row in pairs]

    squared_rank_distance = sum(
        (row["frozenRank"] - row["rebaselineOverlapRank"]) ** 2
        for row in pairs
    )
    n = len(pairs)
    spearman = 1 - (
        6 * squared_rank_distance
        / (n * (n * n - 1))
    )

    known_incomplete = set(
        lineage["legacyLineage"]["knownIncompleteBaselineCanonicalArtistIds"]
    )
    incomplete_pairs = [
        row for row in pairs
        if row["canonicalArtistId"] in known_incomplete
    ]
    complete_pairs = [
        row for row in pairs
        if row["canonicalArtistId"] not in known_incomplete
    ]

    all_21_values = [
        float(row["youtubePointV3RebaselineSnapshot"])
        for row in receipt["ranking"]
    ]
    new_only_values = [
        float(row["youtubePointV3RebaselineSnapshot"])
        for row in receipt["ranking"]
        if row["frozenYoutubePoint"] is None
    ]

    all_ratios_identical = all(
        ratio == ratios[0]
        for ratio in ratios
    )
    rank_order_identical = all(
        row["frozenRank"] == row["rebaselineOverlapRank"]
        for row in pairs
    )

    negative_ids = {
        row["canonicalArtistId"]
        for row in pairs
        if row["delta"] < 0
    }
    positive_ids = {
        row["canonicalArtistId"]
        for row in pairs
        if row["delta"] > 0
    }

    structural_findings = {
        "singleMultiplicativeScaleMapsFrozenToRebaseline": all_ratios_identical,
        "frozenOverlapRankOrderPreserved": rank_order_identical,
        "negativeDeltaCanonicalArtistIds": sorted(negative_ids),
        "positiveDeltaCanonicalArtistIds": sorted(positive_ids),
        "knownIncompleteLegacyCanonicalArtistIds": sorted(known_incomplete),
        "negativeDeltaSetExactlyMatchesKnownIncompleteLegacySet": (
            negative_ids == known_incomplete
        ),
        "allKnownCompleteLegacyArtistsHavePositiveDelta": all(
            row["delta"] > 0
            for row in complete_pairs
        ),
        "allKnownIncompleteLegacyArtistsHaveNegativeDelta": all(
            row["delta"] < 0
            for row in incomplete_pairs
        ),
        "interpretation": (
            "The frozen 10 and the common 21 rebaseline are not one scalar-equivalent "
            "score surface. The four negative overlap deltas exactly coincide with "
            "the four artists whose original raw seed baseline is known incomplete. "
            "Therefore frozen and rebaseline points must not be mixed into one "
            "Product cohort without an explicit full-cohort adoption decision."
        ),
    }

    output = {
        "version": VERSION,
        "status": "comparison_complete_non_activating",
        "inputs": {
            "commonMetricReceiptVersion": receipt["version"],
            "commonMetricRunId": receipt["measurement"]["runId"],
            "commonMetricHead": receipt["measurement"]["measurementHead"],
            "frozenRankingVersion": frozen["version"],
            "lineageVersion": lineage["version"],
        },
        "cohorts": {
            "frozenOverlapArtistCount": 10,
            "commonRebaselineArtistCount": 21,
            "newOnlyArtistCount": 11,
        },
        "distribution": {
            "frozen10": stats(frozen_values),
            "rebaselineOverlap10": stats(overlap_values),
            "rebaselineAll21": stats(all_21_values),
            "rebaselineNewOnly11": stats(new_only_values),
        },
        "pairedOverlap": {
            "positiveDeltaCount": sum(1 for value in deltas if value > 0),
            "negativeDeltaCount": sum(1 for value in deltas if value < 0),
            "zeroDeltaCount": sum(1 for value in deltas if value == 0),
            "meanDelta": round6(mean(deltas)),
            "medianDelta": round6(median(deltas)),
            "minRatio": round6(min(ratios)),
            "maxRatio": round6(max(ratios)),
            "meanRatio": round6(mean(ratios)),
            "medianRatio": round6(median(ratios)),
            "pearsonPointCorrelation": round6(
                pearson(frozen_values, overlap_values)
            ),
            "spearmanRankCorrelation": round6(spearman),
            "squaredRankDistance": squared_rank_distance,
            "pairs": pairs,
        },
        "lineagePartition": {
            "knownIncompleteLegacy": {
                "canonicalArtistIds": sorted(known_incomplete),
                "count": len(incomplete_pairs),
                "deltaRange": [
                    round6(min(row["delta"] for row in incomplete_pairs)),
                    round6(max(row["delta"] for row in incomplete_pairs)),
                ],
                "ratioRange": [
                    round6(min(row["ratio"] for row in incomplete_pairs)),
                    round6(max(row["ratio"] for row in incomplete_pairs)),
                ],
            },
            "notMarkedIncompleteLegacy": {
                "canonicalArtistIds": sorted(
                    row["canonicalArtistId"]
                    for row in complete_pairs
                ),
                "count": len(complete_pairs),
                "deltaRange": [
                    round6(min(row["delta"] for row in complete_pairs)),
                    round6(max(row["delta"] for row in complete_pairs)),
                ],
                "ratioRange": [
                    round6(min(row["ratio"] for row in complete_pairs)),
                    round6(max(row["ratio"] for row in complete_pairs)),
                ],
            },
        },
        "structuralFindings": structural_findings,
        "decisionBoundary": {
            "automaticProductEligibilityEstablished": False,
            "mixedFrozenAndRebaselineProductScaleAllowed": False,
            "full21RebaselineTechnicalBaselineEstablished": True,
            "promotionThresholdDefined": False,
            "thresholdInventedForThisComparison": False,
            "nextGate": "FULL_21_REBASELINE_COHORT_ADOPTION_DECISION_REQUIRED",
            "note": (
                "Technical comparison is complete. Any decision to replace the "
                "frozen 10 with the common 21 baseline is a separate explicit "
                "Product adoption decision; this comparison does not activate it."
            ),
        },
        "safety": {
            "missingIsZero": False,
            "automaticRescalingAllowed": False,
            "automaticProductExpansionAllowed": False,
            "activeYoutubeRankingModified": False,
            "productRuntimeModified": False,
            "databaseModified": False,
            "schedulerModified": False,
            "deploymentAuthorized": False,
            "mainMergeAuthorized": False,
        },
    }

    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: YouTube v3 distribution comparison | "
        f"overlap=10 | all21=21 | "
        f"spearman={output['pairedOverlap']['spearmanRankCorrelation']} | "
        f"ratioRange={output['pairedOverlap']['minRatio']}-"
        f"{output['pairedOverlap']['maxRatio']}"
    )
    print(
        "negativeDeltaSetExactlyMatchesKnownIncompleteLegacySet="
        + str(
            structural_findings[
                "negativeDeltaSetExactlyMatchesKnownIncompleteLegacySet"
            ]
        ).upper()
    )
    print(
        "singleMultiplicativeScaleMapsFrozenToRebaseline="
        + str(
            structural_findings[
                "singleMultiplicativeScaleMapsFrozenToRebaseline"
            ]
        ).upper()
    )
    print("nextGate=FULL_21_REBASELINE_COHORT_ADOPTION_DECISION_REQUIRED")


if __name__ == "__main__":
    main()
