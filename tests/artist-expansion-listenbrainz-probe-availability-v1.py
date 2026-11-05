import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_probe_availability_receipt_v1.json"
PRIOR = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_provider_epoch_reprobe_receipt_v2.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    prior = read_json(PRIOR)

    assert receipt["version"] == "listenbrainz_full21_probe_availability_receipt_v1"
    assert receipt["status"] == "latest_probe_partial_inconclusive_non_activating"

    latest = receipt["latestProbeAttempt"]
    assert latest["runId"] == 37473219665
    assert latest["runAttempt"] == 3
    assert latest["jobId"] == 112317941300
    assert latest["conclusion"] == "success"
    assert latest["targetArtistCount"] == 21
    assert latest["exactIdentityObservedCount"] == 2
    assert latest["newProviderEpochObservedCount"] == 0
    assert latest["staleProviderEpochObservedCount"] == 2
    assert set(latest["staleProviderEpochCanonicalArtistIds"]) == {"lisa","riize"}
    assert latest["nonExactOrUnavailableCount"] == 19
    assert latest["positiveAllTimeDeltaObservedCount"] == 0
    assert latest["negativeAllTimeDeltaObservedCount"] == 0
    assert latest["unchangedAllTimeObservedCount"] == 2
    assert latest["rateOrScoreComputed"] is False

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11420860486
    assert artifact["digest"] == "sha256:735cca287bc5fff828ae2d722b771a80f5e5ab06bf38248ee5298656388a8be5"

    comparison = receipt["comparisonToAttempt2"]
    assert comparison["attempt2ExactIdentityCount"] == 21
    assert comparison["attempt2NewProviderEpochCount"] == 0
    assert comparison["attempt2StaleProviderEpochCount"] == 21
    assert comparison["attempt3ExactIdentityCount"] == 2
    assert comparison["latestAttemptEstablishesFull21EpochState"] is False
    assert comparison["priorCompleteAttemptStillLatestCompleteCohortObservation"] is True

    assert prior["freshReprobe"]["runAttempt"] == 2
    assert prior["freshReprobe"]["exactIdentityArtistCount"] == 21
    assert prior["freshReprobe"]["newProviderEpochArtistCount"] == 0
    assert prior["freshReprobe"]["staleProviderEpochArtistCount"] == 21

    interpretation = receipt["interpretation"]
    assert interpretation["newProviderEpochEstablished"] is False
    assert interpretation["full21StaleEpochEstablishedByLatestAttempt"] is False
    assert interpretation["zeroGrowthEstablished"] is False
    assert interpretation["distinctEpochDeltaCharacterizationEligible"] is False
    assert interpretation["providerAvailabilityOrObservabilityDegraded"] is True

    assert receipt["nextGate"]["code"] == "LISTENBRAINZ_FULL21_COHORT_REOBSERVATION_REQUIRED"
    assert receipt["nextGate"]["afterRecoveryGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz partial probe handling | "
        "attempt3 exact=2/21 | newEpoch=0 | partial=inconclusive | "
        "priorCompleteAttempt=2 retained | next=full21-reobservation"
    )


if __name__ == "__main__":
    main()
