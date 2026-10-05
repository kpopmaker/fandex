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
    assert handoff["status"] == "rebaseline-preparation-authorized"

    decision = handoff["currentDecision"]
    assert decision["selectedOption"] == "approve_full_21_rebaseline"
    assert decision["decisionRecordedAt"]
    assert decision["ownerApprovalText"] == "YouTube v3 21명 full-cohort rebaseline 준비 승인"

    boundary = handoff["authorizationBoundary"]
    assert boundary["rebaselinePreparationAuthorized"] is True
    assert boundary["productExpansionAuthorized"] is False
    assert boundary["productionActivationAuthorized"] is False
    assert boundary["deploymentAuthorized"] is False
    assert boundary["schedulerActivationAuthorized"] is False
    assert boundary["databaseMutationAuthorized"] is False

    current = handoff["currentProductState"]
    assert current["mode"] == "frozen_cutover_snapshot"
    assert current["artistCount"] == 10
    assert current["expansionAllowedWithoutDecision"] is False

    evidence = handoff["technicalEvidence"]
    assert evidence["targetArtistCount"] == 21
    assert evidence["fullReviewedShadowVideoCount"] == 74
    assert evidence["historicalLineageComplete"] is False
    assert evidence["exactLegacyReproductionPossible"] is False

    full = {
        item["id"]: item
        for item in handoff["decisionOptions"]
    }["approve_full_21_rebaseline"]
    assert full["rebaselineAuthorized"] is True
    assert full["productExpansionAuthorized"] is False
    assert full["deploymentAuthorized"] is False

    lineage_expansion = lineage["productExpansion"]
    assert lineage_expansion["eligibility"] == "blocked_incomplete_legacy_scale_lineage"
    assert lineage_expansion["currentFrozenCohortAllowed"] is True
    assert lineage_expansion["expandedOrChangedYoutubeCohortAllowed"] is False

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
        "PASS: 21-artist YouTube v3 rebaseline preparation is authorized "
        "while Product activation remains blocked and frozen-10-safe"
    )


if __name__ == "__main__":
    main()
