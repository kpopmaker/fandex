import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"
BINDINGS = ROOT / "data/fandex-cloud-v10/seed/musicbrainz_21_artist_bindings_reviewed_v1.json"
CANDIDATE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_v_lisa_candidate_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    bindings = read_json(BINDINGS)
    candidate = read_json(CANDIDATE)

    assert receipt["version"] == "listenbrainz_full21_canonical_shadow_receipt_v1"
    assert receipt["status"] == "full21_canonical_shadow_complete_non_activating"

    shadow = receipt["shadow"]
    assert shadow["runId"] == 37468037307
    assert shadow["jobId"] == 112283931087
    assert shadow["head"] == "3961b82d39758b444eeecd53a11472e58b1f0d6c"
    assert shadow["conclusion"] == "success"
    assert shadow["targetArtistCount"] == 21
    assert shadow["fullyObservedExactIdentityArtistCount"] == 21
    assert shadow["unavailableArtistCount"] == 0
    assert shadow["identityMismatchArtistCount"] == 0
    assert shadow["ranges"] == ["all_time", "month", "week"]
    assert shadow["metric"] == "total_listen_count"
    assert shadow["zeroImputationUsed"] is False

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11414893747
    assert artifact["digest"] == "sha256:5dc52a38e224402aee016165644f11368136eb326166c272677987bb77dc7e9c"

    rows = receipt["artists"]
    assert len(rows) == 21
    assert len({r["canonicalArtistId"] for r in rows}) == 21
    assert len({r["musicBrainzArtistMbid"] for r in rows}) == 21
    assert all(r["status"] == "ok" and r["exactIdentity"] is True for r in rows)
    assert all(r["allTimeTotalListenCount"] > 0 for r in rows)
    assert all(r["monthTotalListenCount"] > 0 for r in rows)
    assert all(r["weekTotalListenCount"] > 0 for r in rows)

    binding_map = {
        r["canonicalArtistId"]: r["musicBrainzArtistMbid"]
        for r in bindings["bindings"]
    }
    receipt_map = {
        r["canonicalArtistId"]: r["musicBrainzArtistMbid"]
        for r in rows
    }
    assert receipt_map == binding_map

    by_id = {r["canonicalArtistId"]: r for r in rows}
    assert by_id["v"]["weekTotalListenCount"] == 43275
    assert by_id["lisa"]["weekTotalListenCount"] == 2148
    assert by_id["bts"]["allTimeTotalListenCount"] == 92936753

    interpretation = receipt["interpretation"]
    assert interpretation["canonicalCoverageEstablished"] is True
    assert interpretation["full21UniformProviderSurfaceEstablished"] is True
    assert interpretation["lastfmDropInReplacementEstablished"] is False
    assert interpretation["providerMixingAllowed"] is False
    assert interpretation["scoreFormulaDefined"] is False
    assert interpretation["promotionThresholdDefined"] is False

    assert candidate["compatibilityDecision"]["vLisaOnlyMetricSubstitutionAllowed"] is False
    assert receipt["nextGate"]["code"] == "LISTENBRAINZ_FULL21_PROVIDER_CONTRACT_COMPARISON_REQUIRED"
    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: ListenBrainz full21 canonical shadow receipt | "
        "artists=21/21 | unavailable=0 | mismatch=0 | "
        "dropInLastfm=FALSE | next=provider-contract-comparison"
    )


if __name__ == "__main__":
    main()
