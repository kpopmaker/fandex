import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_provider_epoch_probe_receipt_v1.json"
REPEAT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_repeat_observation_receipt_v1.json"
POLICY = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_rebaseline_evaluation_policy_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    repeat = read_json(REPEAT)
    policy = read_json(POLICY)

    assert receipt["version"] == "listenbrainz_full21_provider_epoch_probe_receipt_v1"
    assert receipt["status"] == "provider_epoch_not_advanced_non_activating"

    boundary = receipt["previousEpochBoundary"]
    assert boundary["maximumEpoch"] == repeat["providerEpochEvidence"]["maximumEpoch"]
    assert boundary["maximumIsoUtc"] == repeat["providerEpochEvidence"]["maximumIsoUtc"]

    probe = receipt["probe"]
    assert probe["runId"] == 37473219665
    assert probe["jobId"] == 112301840045
    assert probe["head"] == "7af398e8e373f168e481ea65a7833bc58ff6a073"
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

    stale = set(receipt["staleProviderEpochCanonicalArtistIds"])
    assert len(stale) == 21
    assert stale == {
        "iu","aespa","ateez","boynextdoor","ive","lesserafim","newjeans",
        "seventeen","straykids","txt","bts","blackpink","twice","enhypen",
        "jungkook","jimin","v","jennie","lisa","rose","riize"
    }

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11418036005
    assert artifact["digest"] == "sha256:089c8f0a08feb0f8555297fd941e7af613370040186ff48247999189b69ec6a7"

    interpretation = receipt["interpretation"]
    assert interpretation["distinctProviderUpdateEpochEstablished"] is False
    assert interpretation["zeroGrowthEstablished"] is False
    assert interpretation["allTimeDeltaCharacterizationEligible"] is False

    assert receipt["nextGate"]["code"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
    assert policy["nextGate"] == "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz provider epoch probe | "
        "newEpoch=0/21 | stale=21/21 | exactIdentity=21/21 | "
        "zeroGrowth=FALSE | next=provider-update-epoch"
    )


if __name__ == "__main__":
    main()
