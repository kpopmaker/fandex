import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_second_interval_wait_receipt_v1.json"
FIRST = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_distinct_epoch_delta_receipt_v1.json"
HANDOFF = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_delta_signal_contract_handoff_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    first = read_json(FIRST)
    handoff = read_json(HANDOFF)

    assert receipt["version"] == "listenbrainz_full21_second_interval_wait_receipt_v1"
    assert receipt["status"] == "second_distinct_interval_not_yet_available_non_activating"

    p = receipt["probe"]
    assert p["runId"] == 37550156324
    assert p["jobId"] == 112563437433
    assert p["head"] == "332ad9180d279b6e9e3744ffbe82a03dc3194b76"
    assert p["conclusion"] == "success"
    assert p["targetArtistCount"] == 21
    assert p["exactIdentityArtistCount"] == 21
    assert p["newerPerArtistEpochCount"] == 0
    assert p["stalePerArtistEpochCount"] == 21
    assert p["unavailableArtistCount"] == 0
    assert p["identityMismatchArtistCount"] == 0
    assert p["secondDistinctIntervalEstablished"] is False
    assert p["rateComputed"] is False
    assert p["scoreComputed"] is False
    assert p["normalizationComputed"] is False

    stale = set(receipt["stalePerArtistEpochCanonicalArtistIds"])
    assert len(stale) == 21
    assert stale == {r["canonicalArtistId"] for r in first["artists"]}

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11452298693
    assert artifact["digest"] == "sha256:ecd13df110604a58433702accdcb3cd09aaedcd35933033ac76b55c636faed89"

    interpretation = receipt["interpretation"]
    assert interpretation["full21CanonicalObservationHealthy"] is True
    assert interpretation["secondDistinctProviderIntervalEstablished"] is False
    assert interpretation["allArtistsStillOnFirstIntervalPerArtistEpoch"] is True
    assert interpretation["staleEpochMeansZeroGrowth"] is False
    assert interpretation["secondIntervalDeltaComputed"] is False
    assert interpretation["multiEpochStabilityDecisionEligible"] is False

    assert handoff["requiredNextObservation"]["code"] == "LISTENBRAINZ_SECOND_DISTINCT_INTERVAL_REQUIRED"
    assert receipt["nextGate"]["code"] == "LISTENBRAINZ_SECOND_DISTINCT_INTERVAL_REQUIRED"
    assert receipt["nextGate"]["afterGate"] == "LISTENBRAINZ_MULTI_EPOCH_DELTA_STABILITY_DECISION_REQUIRED"

    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz second interval wait | "
        "exact=21/21 | newer=0/21 | stale=21/21 | "
        "secondInterval=FALSE | next=second-distinct-interval"
    )


if __name__ == "__main__":
    main()
