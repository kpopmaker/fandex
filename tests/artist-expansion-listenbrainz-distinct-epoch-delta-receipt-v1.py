import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_distinct_epoch_delta_receipt_v1.json"
BASELINE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    baseline = read_json(BASELINE)

    assert receipt["version"] == "listenbrainz_full21_distinct_epoch_delta_receipt_v1"
    assert receipt["status"] == "distinct_epoch_raw_delta_characterized_non_activating"

    c = receipt["characterization"]
    assert c["runId"] == 37548004659
    assert c["jobId"] == 112556571411
    assert c["head"] == "4c358a7bffc2c4f3b0c52581888a83e9674db7e3"
    assert c["conclusion"] == "success"
    assert c["targetArtistCount"] == 21
    assert c["exactIdentityArtistCount"] == 21
    assert c["newProviderEpochArtistCount"] == 21
    assert c["positiveDeltaArtistCount"] == 21
    assert c["negativeDeltaArtistCount"] == 0
    assert c["unchangedDeltaArtistCount"] == 0
    assert c["currentProviderEpochMinimum"] == 1791315569
    assert c["currentProviderEpochMaximum"] == 1791315826
    assert c["rateComputed"] is False
    assert c["scoreComputed"] is False
    assert c["normalizationComputed"] is False

    stats = c["rawDeltaStats"]
    assert stats["count"] == 21
    assert stats["sum"] == 306827
    assert stats["min"] == 29
    assert stats["max"] == 244625
    assert stats["median"] == 850

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11451054983
    assert artifact["digest"] == "sha256:f382d3dcc3152e0c364d2cc7d77c8218873ea969873a0d48c1181a15b3a1fdd2"

    rows = receipt["artists"]
    assert len(rows) == 21
    assert len({r["canonicalArtistId"] for r in rows}) == 21
    assert all(r["status"] == "ok" for r in rows)
    assert all(r["newerThanPreviousMaxEpoch"] is True for r in rows)
    assert all(r["rawAllTimeDelta"] > 0 for r in rows)

    baseline_by_id = {r["canonicalArtistId"]: r for r in baseline["artists"]}
    for row in rows:
        prior = baseline_by_id[row["canonicalArtistId"]]["allTimeTotalListenCount"]
        assert row["previousAllTimeTotalListenCount"] == prior
        assert row["currentAllTimeTotalListenCount"] - prior == row["rawAllTimeDelta"]

    by_id = {r["canonicalArtistId"]: r for r in rows}
    assert by_id["bts"]["rawAllTimeDelta"] == 244625
    assert by_id["jimin"]["rawAllTimeDelta"] == 17474
    assert by_id["jungkook"]["rawAllTimeDelta"] == 14944
    assert by_id["v"]["rawAllTimeDelta"] == 13830
    assert by_id["lisa"]["rawAllTimeDelta"] == 296
    assert by_id["riize"]["rawAllTimeDelta"] == 29

    ranking = receipt["rawDeltaRankingDescriptiveOnly"]
    assert len(ranking) == 21
    assert ranking[0]["canonicalArtistId"] == "bts"
    assert ranking[0]["rawAllTimeDelta"] == 244625
    assert ranking[-1]["canonicalArtistId"] == "riize"
    assert ranking[-1]["rawAllTimeDelta"] == 29

    i = receipt["interpretation"]
    assert i["distinctProviderEpochEstablishedForAll21"] is True
    assert i["all21CanonicalIdentityObserved"] is True
    assert i["all21RawDeltaPositive"] is True
    assert i["negativeCumulativeMovementObserved"] is False
    assert i["rawCumulativeDeltaObservableAsUniformFull21Signal"] is True
    assert i["rawDeltaRankingIsScore"] is False
    assert i["rawDeltaRankingIsProductRanking"] is False
    assert i["productionScoreContractEstablished"] is False
    assert i["rateContractEstablished"] is False

    d = receipt["decisionBoundary"]
    assert d["eligibleForSignalContractDesign"] is True
    assert d["directUseAsProductScoreAuthorized"] is False
    assert d["directLastfmReplacementAuthorized"] is False
    assert d["perArtistHybridProviderMixingAuthorized"] is False
    assert d["newFormulaAuthorized"] is False
    assert d["nextGate"] == "LISTENBRAINZ_FULL21_DELTA_SIGNAL_CONTRACT_DECISION_REQUIRED"

    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz distinct epoch delta | "
        "newEpoch=21/21 | positive=21/21 | negative=0 | "
        "sum=306827 | median=850 | score=FALSE"
    )


if __name__ == "__main__":
    main()
