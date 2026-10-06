import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_rebaseline_evaluation_policy_v1.json"
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_repeat_observation_receipt_v1.json"
SHADOW = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"
COMPARISON = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_lastfm_provider_contract_comparison_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    policy = read_json(POLICY)
    receipt = read_json(RECEIPT)
    shadow = read_json(SHADOW)
    comparison = read_json(COMPARISON)

    assert policy["version"] == "listenbrainz_full21_rebaseline_evaluation_policy_v1"
    assert policy["status"] == "evaluation_authorized_non_activating"
    assert policy["selectedOption"] == "evaluate_uniform_full21_listenbrainz_rebaseline"
    assert policy["metricSelection"]["candidateObservationMetric"] == "all_time.total_listen_count"
    assert policy["metricSelection"]["monthSelectedForDelta"] is False
    assert policy["metricSelection"]["weekSelectedForDelta"] is False
    assert policy["deltaSemantics"]["distinctProviderUpdateEpochRequired"] is True
    assert policy["deltaSemantics"]["sameProviderEpochObservationsMayNotBeInterpretedAsZeroGrowth"] is True
    assert policy["nextGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"

    auth = policy["authorization"]
    assert auth["repeatedObservationResearch"] is True
    assert auth["characterizeAllTimeDeltaAcrossDistinctProviderEpochs"] is True
    for key in [
        "defineProductionScoreFormula", "defineWeights", "definePromotionThreshold",
        "replaceLastfm", "activateProduct", "modifyRuntime", "scheduleCollection",
        "mutateDatabase", "deploy", "mergeMain"
    ]:
        assert auth[key] is False

    assert receipt["version"] == "listenbrainz_full21_repeat_observation_receipt_v1"
    assert receipt["status"] == "repeat_complete_same_provider_epoch_non_activating"
    assert receipt["policyVersion"] == policy["version"]

    repeat = receipt["repeatObservation"]
    assert repeat["authoritativeRunId"] == 37472054496
    assert repeat["jobId"] == 112297777748
    assert repeat["head"] == "77001456790001c90c5d3d8b26192961f0b14699"
    assert repeat["conclusion"] == "success"
    assert repeat["targetArtistCount"] == 21
    assert repeat["exactIdentityArtistCount"] == 21
    assert repeat["unavailableRangeCount"] == 0
    assert repeat["identityMismatchRangeCount"] == 0
    assert repeat["observedRange"] == "all_time"
    assert repeat["allTimeNegativeDeltaArtistCount"] == 0
    assert repeat["allTimePositiveDeltaArtistCount"] == 0
    assert repeat["allTimeUnchangedArtistCount"] == 21
    assert repeat["rateOrScoreComputed"] is False
    assert repeat["zeroImputationUsed"] is False

    epoch = receipt["providerEpochEvidence"]
    assert epoch["minimumEpoch"] == 1791063455
    assert epoch["maximumEpoch"] == 1791063713
    assert epoch["minimumIsoUtc"] == "2026-10-03T21:37:35Z"
    assert epoch["maximumIsoUtc"] == "2026-10-03T21:41:53Z"
    assert epoch["allReturnedProviderUpdatesPredatePreviousObservation"] is True
    assert epoch["distinctProviderUpdateEpochBetweenObservationsEstablished"] is False

    assert receipt["artifact"]["artifactId"] == 11416733310
    assert receipt["artifact"]["digest"] == "sha256:f5198d30fd0faac5b6c52b63392dab0d0d8a11f135966a31b6aea5cd1fa59162"

    decision = receipt["decision"]
    assert decision["zeroGrowthEstablished"] is False
    assert decision["scoreFormulaReady"] is False
    assert decision["nextGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"

    assert shadow["shadow"]["fullyObservedExactIdentityArtistCount"] == 21
    assert comparison["decision"]["full21ListenbrainzReplacementTechnicallyCoverable"] is True
    assert comparison["decision"]["full21ListenbrainzReplacementSemanticallyAuthorized"] is False

    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz repeat observation | "
        "exact=21/21 | allTimeDelta=0_for_21_same_epoch | "
        "zeroGrowth=FALSE | next=provider-update-epoch"
    )


if __name__ == "__main__":
    main()
