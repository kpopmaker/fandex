import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HANDOFF = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_rebaseline_policy_handoff_v1.json"
LINEAGE = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_lineage_status_v1.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    handoff = read_json(HANDOFF)
    lineage = read_json(LINEAGE)

    assert handoff["version"] == "youtube_v3_rebaseline_policy_handoff_v1"
    assert handoff["status"] == "owner-decision-required"
    assert handoff["currentDecision"]["selectedOption"] is None
    assert handoff["currentDecision"]["decisionRecordedAt"] is None
    assert handoff["currentDecision"]["ownerApprovalText"] is None

    current = handoff["currentProductState"]
    assert current["mode"] == "frozen_cutover_snapshot"
    assert current["artistCount"] == 10
    assert current["expansionAllowedWithoutDecision"] is False

    evidence = handoff["technicalEvidence"]
    assert evidence["targetArtistCount"] == 21
    assert evidence["fullReviewedShadowVideoCount"] == 74
    assert evidence["historicalRecoveredArtistCount"] == 10
    assert evidence["currentReviewedArtistCount"] == 11
    assert evidence["historicalLineageComplete"] is False
    assert evidence["exactLegacyReproductionPossible"] is False
    assert set(evidence["knownIncompleteBaselineCanonicalArtistIds"]) == {
        "iu", "aespa", "ateez", "boynextdoor"
    }

    lineage_expansion = lineage["productExpansion"]
    assert lineage_expansion["eligibility"] == "blocked_incomplete_legacy_scale_lineage"
    assert lineage_expansion["currentFrozenCohortAllowed"] is True
    assert lineage_expansion["expandedOrChangedYoutubeCohortAllowed"] is False

    options = {item["id"]: item for item in handoff["decisionOptions"]}
    assert set(options) == {"keep_frozen_10", "approve_full_21_rebaseline"}

    keep = options["keep_frozen_10"]
    assert keep["rebaselineAuthorized"] is False
    assert keep["productExpansionAuthorized"] is False
    assert keep["deploymentAuthorized"] is False

    full = options["approve_full_21_rebaseline"]
    assert full["rebaselineAuthorized"] is True
    assert full["productExpansionAuthorized"] is False
    assert full["deploymentAuthorized"] is False
    assert len(full["requiredFollowup"]) >= 5

    semantics = handoff["semantics"]
    assert semantics["missingIsZero"] is False
    assert semantics["reviewedSeedImpliesProductEligibility"] is False
    assert semantics["automaticRescalingAllowed"] is False
    assert semantics["automaticProductExpansionAllowed"] is False
    assert semantics["machineCandidateImpliesApproval"] is False
    assert semantics["rebaselineDecisionImpliesImmediateDeployment"] is False

    safety = handoff["safety"]
    assert all(value is False for value in safety.values())

    print(
        "PASS: YouTube v3 rebaseline policy handoff is decision-ready, "
        "non-authorizing, and frozen-10-safe"
    )


if __name__ == "__main__":
    main()
