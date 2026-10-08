import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_provider_epoch_reprobe_receipt_v2.json"
PRIOR = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_provider_epoch_probe_receipt_v1.json"
SCRIPT = ROOT / "scripts/listenbrainz-cloud/listenbrainz_full21_provider_epoch_probe_v1.py"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    prior = read_json(PRIOR)

    assert receipt["version"] == "listenbrainz_full21_provider_epoch_reprobe_receipt_v2"
    assert receipt["status"] == "provider_epoch_still_not_advanced_non_activating"
    assert receipt["baseConsolidation"]["pr"] == 530

    assert receipt["probeCode"]["blobSha"] == "f696861c6c1930980775be2494402017cf7b009b"
    assert receipt["probeCode"]["identicalToConsolidatedBlob"] is True
    assert SCRIPT.is_file()

    prev = receipt["previousEpochBoundary"]
    assert prev["maximumEpoch"] == prior["previousEpochBoundary"]["maximumEpoch"]
    assert prev["maximumIsoUtc"] == prior["previousEpochBoundary"]["maximumIsoUtc"]

    probe = receipt["freshReprobe"]
    assert probe["runId"] == 37473219665
    assert probe["runAttempt"] == 2
    assert probe["jobId"] == 112311434493
    assert probe["conclusion"] == "success"
    assert probe["targetArtistCount"] == 21
    assert probe["exactIdentityArtistCount"] == 21
    assert probe["newProviderEpochArtistCount"] == 0
    assert probe["staleProviderEpochArtistCount"] == 21
    assert probe["unavailableArtistCount"] == 0
    assert probe["identityMismatchArtistCount"] == 0
    assert probe["negativeAllTimeDeltaArtistCount"] == 0
    assert probe["positiveAllTimeDeltaArtistCount"] == 0
    assert probe["unchangedAllTimeArtistCount"] == 21
    assert probe["rateOrScoreComputed"] is False
    assert probe["productActivationAuthorized"] is False

    assert len(receipt["staleProviderEpochCanonicalArtistIds"]) == 21
    assert set(receipt["staleProviderEpochCanonicalArtistIds"]) == set(prior["staleProviderEpochCanonicalArtistIds"])

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11418962780
    assert artifact["digest"] == "sha256:a2b41cb3a2d81440d939f5cd4619d36c4ed4d9dc9b86596d5228cc6cb41308a1"

    interpretation = receipt["interpretation"]
    assert interpretation["distinctProviderUpdateEpochEstablished"] is False
    assert interpretation["zeroGrowthEstablished"] is False
    assert interpretation["allTimeDeltaCharacterizationEligible"] is False
    assert interpretation["blockerChanged"] is False

    assert receipt["nextGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: fresh ListenBrainz epoch reprobe | "
        "attempt=2 | newEpoch=0/21 | stale=21/21 | "
        "zeroGrowth=FALSE | blocker=UNCHANGED"
    )


if __name__ == "__main__":
    main()
