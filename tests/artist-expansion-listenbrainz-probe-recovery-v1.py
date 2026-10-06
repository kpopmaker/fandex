import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECOVERY = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_probe_recovery_receipt_v1.json"
PARTIAL = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_probe_availability_receipt_v1.json"
PRIOR = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_provider_epoch_reprobe_receipt_v2.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    recovery = read_json(RECOVERY)
    partial = read_json(PARTIAL)
    prior = read_json(PRIOR)

    assert recovery["version"] == "listenbrainz_full21_probe_recovery_receipt_v1"
    assert recovery["status"] == "full21_observation_recovered_non_activating"

    h = recovery["hardening"]
    assert h["transportMode"] == "serial"
    assert h["maxAttemptsPerArtist"] == 6
    assert h["requestTimeoutSeconds"] == 20
    assert h["interArtistDelaySeconds"] == 1.0
    assert h["semanticRulesChanged"] is False
    assert h["identityRuleChanged"] is False
    assert h["epochBoundaryChanged"] is False
    assert h["scoreFormulaChanged"] is False

    run = recovery["recoveryRun"]
    assert run["runId"] == 37479984874
    assert run["jobId"] == 112325264871
    assert run["head"] == "ace4fc2d3a541879a6e8b6ac9a1779d48dc0d49a"
    assert run["conclusion"] == "success"
    assert run["targetArtistCount"] == 21
    assert run["exactIdentityArtistCount"] == 21
    assert run["unavailableArtistCount"] == 0
    assert run["identityMismatchArtistCount"] == 0
    assert run["newProviderEpochArtistCount"] == 0
    assert run["staleProviderEpochArtistCount"] == 21
    assert run["positiveAllTimeDeltaArtistCount"] == 0
    assert run["negativeAllTimeDeltaArtistCount"] == 0
    assert run["unchangedAllTimeArtistCount"] == 21
    assert run["rateOrScoreComputed"] is False
    assert run["productActivationAuthorized"] is False

    assert partial["latestProbeAttempt"]["exactIdentityObservedCount"] == 2
    assert partial["interpretation"]["providerAvailabilityOrObservabilityDegraded"] is True
    assert prior["freshReprobe"]["exactIdentityArtistCount"] == 21

    epoch = recovery["providerEpoch"]
    assert epoch["previousMaximumEpoch"] == 1791063713
    assert epoch["newestObservedEpoch"] == 1791063713
    assert epoch["distinctProviderUpdateEpochEstablished"] is False

    artifact = recovery["artifact"]
    assert artifact["artifactId"] == 11420108521
    assert artifact["digest"] == "sha256:60455d0bc46bf80d0108401b102975230fcb55d1e011061a39c874eb34b64400"

    interpretation = recovery["interpretation"]
    assert interpretation["full21CohortObservationRecovered"] is True
    assert interpretation["partialAttempt3ClassifiedAsTransientObservabilityFailure"] is True
    assert interpretation["priorCanonicalBindingsStillValid"] is True
    assert interpretation["newProviderEpochEstablished"] is False
    assert interpretation["zeroGrowthEstablished"] is False
    assert interpretation["distinctEpochDeltaCharacterizationEligible"] is False

    assert recovery["nextGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
    assert all(value is False for value in recovery["safety"].values())

    print(
        "PASS: ListenBrainz full21 recovery | exact=21/21 | "
        "partial-attempt=transient | newEpoch=0/21 | next=provider-update-epoch"
    )


if __name__ == "__main__":
    main()
