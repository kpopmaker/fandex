import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_v_lisa_candidate_v1.json"
READINESS = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_full21_adoption_readiness_v1.json"
LASTFM_COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    evidence = read_json(EVIDENCE)
    readiness = read_json(READINESS)
    compat = read_json(LASTFM_COMPAT)

    assert evidence["version"] == "listenbrainz_v_lisa_candidate_v1"
    assert evidence["status"] == "canonical_provider_candidate_supported_not_drop_in_lastfm"

    assert evidence["probe"]["runId"] == 37465020592
    assert evidence["probe"]["runConclusion"] == "success"
    assert evidence["probe"]["artifactId"] == 11414358389

    by_id = {row["canonicalArtistId"]: row for row in evidence["targets"]}
    assert set(by_id) == {"v", "lisa"}
    assert by_id["v"]["musicBrainzArtistMbid"] == "83096042-3785-481e-8843-dee69f1aad12"
    assert by_id["lisa"]["musicBrainzArtistMbid"] == "30aeb57f-bb16-47fa-86ca-79fc57b4d12c"

    for row in by_id.values():
        assert row["exactMbidEchoAcrossSuccessfulRanges"] is True
        assert row["successfulRangeCount"] == 3
        assert row["allTimeTotalListenCount"] > 0
        assert row["monthTotalListenCount"] > 0
        assert row["weekTotalListenCount"] > 0
        assert row["canonicalSpecificListeningSignalSupported"] is True

    provider = evidence["provider"]
    assert provider["identityAuthority"] == "MusicBrainz artist MBID"
    assert provider["documentedPrimaryMetric"] == "total_listen_count"
    assert provider["documentedTotalUniqueListenerCount"] is False

    decision = evidence["compatibilityDecision"]
    assert decision["alternativeCanonicalProviderFound"] is True
    assert decision["vResolvedAtIdentityLayer"] is True
    assert decision["lisaResolvedAtIdentityLayer"] is True
    assert decision["lastfmUnsupportedStatusShouldChangeNow"] is False
    assert decision["vLisaOnlyMetricSubstitutionAllowed"] is False
    assert decision["full21ListenBrainzShadowCandidateReady"] is True

    lastfm = compat["sources"]["lastfm"]
    assert set(lastfm["unsupportedCanonicalArtistIds"]) >= {"v", "lisa"}

    assert evidence["requiredNextValidation"]["code"] == "FULL_21_LISTENBRAINZ_CANONICAL_COHORT_SHADOW_REQUIRED"

    alt = readiness["crossSourceProductReadiness"]["alternativeCanonicalProviderCandidate"]
    assert alt["provider"] == "ListenBrainz"
    assert alt["vCanonicalIdentitySupported"] is True
    assert alt["lisaCanonicalIdentitySupported"] is True
    assert alt["lastfmDropInReplacementReady"] is False
    assert alt["productParityResolved"] is False
    assert readiness["nextGate"]["code"] == "FULL_21_LISTENBRAINZ_CANONICAL_COHORT_SHADOW_REQUIRED"

    assert all(value is False for value in evidence["safety"].values())

    print(
        "PASS: ListenBrainz canonical candidate | "
        "V=SUPPORTED | LISA=SUPPORTED | "
        "Last.fm-drop-in=FALSE | next=full21-shadow"
    )


if __name__ == "__main__":
    main()
