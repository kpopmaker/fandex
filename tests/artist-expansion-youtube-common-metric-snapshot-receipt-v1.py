import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_metric_snapshot_receipt_v1.json"
POLICY = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_selection_policy_v1.json"
MANIFEST = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_manifest_v1.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    policy = read_json(POLICY)
    manifest = read_json(MANIFEST)

    assert receipt["version"] == "youtube_v3_common_metric_snapshot_receipt_v1"
    assert receipt["status"] == "measurement_complete_non_activating"

    measurement = receipt["measurement"]
    assert measurement["runId"] == 37398978361
    assert measurement["jobId"] == 112061595185
    assert measurement["measurementHead"] == "c0124d8833f996437d591671b6a546d2eca76034"
    assert measurement["conclusion"] == "success"
    assert measurement["targetArtistCount"] == 21
    assert measurement["requestedVideoCount"] == 74
    assert measurement["returnedVideoCount"] == 74
    assert measurement["requestBatchCount"] == 2
    assert measurement["zeroImputationUsed"] is False
    assert measurement["oneCommonCollectionRun"] is True

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11383589365
    assert artifact["digest"] == "sha256:f56a999d3d7fa90804d8259b9c03b0df98c02bd4e4c7132d43b061e928c7fae8"

    assert policy["version"] == receipt["methodology"]["policyVersion"]
    assert manifest["version"] == receipt["methodology"]["manifestVersion"]
    assert receipt["methodology"]["formulaVersion"] == "youtube_publish_v3_uncapped_additive_scaled"
    assert receipt["methodology"]["promotionThresholdDefined"] is False

    ranking = receipt["ranking"]
    assert len(ranking) == 21
    assert len({row["canonicalArtistId"] for row in ranking}) == 21
    assert [row["snapshotRank"] for row in ranking] == list(range(1, 22))
    assert sum(row["videoCount"] for row in ranking) == 74
    assert ranking[0]["canonicalArtistId"] == "bts"
    assert ranking[0]["youtubePointV3RebaselineSnapshot"] == 68.0

    expected_frozen = {
        "lesserafim": 52.76,
        "txt": 49.71,
        "straykids": 47.99,
        "seventeen": 42.85,
        "aespa": 79.04,
        "ive": 37.2,
        "newjeans": 21.54,
        "ateez": 52.43,
        "iu": 49.63,
        "boynextdoor": 35.42,
    }
    frozen_rows = {
        row["canonicalArtistId"]: row["frozenYoutubePoint"]
        for row in ranking
        if row["frozenYoutubePoint"] is not None
    }
    assert frozen_rows == expected_frozen

    assert receipt["nextGate"]["code"] == "COMMON_21_ARTIST_DISTRIBUTION_COMPARISON_REQUIRED"

    safety = receipt["safety"]
    assert safety["missingIsZero"] is False
    assert safety["activeYoutubeRankingModified"] is False
    assert safety["productCohortModified"] is False
    assert safety["productEligibilityEvaluated"] is False
    assert safety["productActivationAuthorized"] is False
    assert safety["databaseModified"] is False
    assert safety["schedulerModified"] is False
    assert safety["deploymentAuthorized"] is False
    assert safety["mainMergeAuthorized"] is False

    print(
        "PASS: durable common YouTube snapshot receipt | "
        "run=37398978361 | artists=21 | videos=74 | "
        "next=distribution-comparison"
    )


if __name__ == "__main__":
    main()
