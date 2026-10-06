import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_distribution_comparison_v1.json"


def main():
    data = json.loads(EVIDENCE.read_text(encoding="utf-8-sig"))
    assert data["version"] == "youtube_v3_common_distribution_comparison_v1"
    assert data["status"] == "comparison_complete_non_activating"
    assert data["cohorts"] == {
        "frozenOverlapArtistCount": 10,
        "commonRebaselineArtistCount": 21,
        "newOnlyArtistCount": 11,
    }

    paired = data["pairedOverlap"]
    assert paired["positiveDeltaCount"] == 6
    assert paired["negativeDeltaCount"] == 4
    assert paired["zeroDeltaCount"] == 0
    assert paired["meanDelta"] == -12.38
    assert paired["medianDelta"] == 0.575
    assert paired["minRatio"] == 0.182383
    assert paired["maxRatio"] == 1.047818
    assert paired["spearmanRankCorrelation"] == 0.430303
    assert paired["squaredRankDistance"] == 94
    assert len(paired["pairs"]) == 10

    lineage = data["lineagePartition"]
    assert lineage["knownIncompleteLegacy"]["canonicalArtistIds"] == [
        "aespa", "ateez", "boynextdoor", "iu"
    ]
    assert lineage["notMarkedIncompleteLegacy"]["count"] == 6

    findings = data["structuralFindings"]
    assert findings["singleMultiplicativeScaleMapsFrozenToRebaseline"] is False
    assert findings["frozenOverlapRankOrderPreserved"] is False
    assert findings["negativeDeltaSetExactlyMatchesKnownIncompleteLegacySet"] is True
    assert findings["allKnownCompleteLegacyArtistsHavePositiveDelta"] is True
    assert findings["allKnownIncompleteLegacyArtistsHaveNegativeDelta"] is True

    decision = data["decisionBoundary"]
    assert decision["automaticProductEligibilityEstablished"] is False
    assert decision["mixedFrozenAndRebaselineProductScaleAllowed"] is False
    assert decision["full21RebaselineTechnicalBaselineEstablished"] is True
    assert decision["promotionThresholdDefined"] is False
    assert decision["thresholdInventedForThisComparison"] is False
    assert decision["nextGate"] == "FULL_21_REBASELINE_COHORT_ADOPTION_DECISION_REQUIRED"

    safety = data["safety"]
    assert all(value is False for value in safety.values())

    print(
        "PASS: YouTube common distribution comparison | "
        "overlap=10 | negative=4 | positive=6 | "
        "mixedScaleAllowed=FALSE | next=adoption-decision"
    )


if __name__ == "__main__":
    main()
