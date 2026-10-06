import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "data/fandex-cloud-v10/seed/lastfm_v_lisa_mbid_resolution_v1.json"
READINESS = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_full21_adoption_readiness_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
SEED = ROOT / "scripts/lastfm-cloud/lastfm_artist_seed_v1.csv"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    evidence = read_json(EVIDENCE)
    readiness = read_json(READINESS)
    compat = read_json(COMPAT)
    seed_text = SEED.read_text(encoding="utf-8-sig").lower()

    assert evidence["version"] == "lastfm_v_lisa_mbid_resolution_v1"
    assert evidence["status"] == "mbid_fallback_rejected_keep_unsupported"
    assert evidence["probe"]["completedRunId"] == 37464237518
    assert evidence["probe"]["completedRunConclusion"] == "success"
    assert evidence["probe"]["artifactId"] == 11413847735

    by_id = {row["canonicalArtistId"]: row for row in evidence["targets"]}
    assert set(by_id) == {"v", "lisa"}

    v = by_id["v"]
    assert v["expectedMusicBrainzArtistMbid"] == "83096042-3785-481e-8843-dee69f1aad12"
    assert v["lastfmMbidQuery"]["returnedMbid"] == "6ea37194-8483-470c-8b3d-ca545903a853"
    assert v["findings"]["expectedMbidReturned"] is False
    assert v["findings"]["nameAndMbidStatsEqual"] is True
    assert v["findings"]["nameAndMbidUrlEqual"] is True
    assert v["findings"]["providerIdentityConflationObserved"] is True
    assert v["findings"]["canonicalSpecificStatsProven"] is False

    lisa = by_id["lisa"]
    assert lisa["expectedMusicBrainzArtistMbid"] == "30aeb57f-bb16-47fa-86ca-79fc57b4d12c"
    assert lisa["lastfmMbidQuery"]["apiErrorCode"] == 6
    assert lisa["findings"]["expectedMbidReturned"] is False
    assert lisa["findings"]["canonicalSpecificStatsProven"] is False

    decision = evidence["decision"]
    assert decision["mbidFallbackResolvesProductParity"] is False
    assert set(decision["keepCompatibilityRegistryUnsupported"]) == {"v", "lisa"}
    assert set(decision["doNotPromoteToLastfmSeed"]) == {"v", "lisa"}
    assert decision["fuzzyOrDisplayNameFallbackAllowed"] is False
    assert decision["missingAsZeroAllowed"] is False

    lastfm = compat["sources"]["lastfm"]
    assert set(lastfm["unsupportedCanonicalArtistIds"]) >= {"v", "lisa"}
    assert "v," not in seed_text
    assert "lisa," not in seed_text

    assert readiness["crossSourceProductReadiness"]["productCohort21Ready"] is False
    mbid = readiness["crossSourceProductReadiness"]["lastfmMbidResolution"]
    assert mbid["probeRunId"] == 37464237518
    assert mbid["mbidFallbackResolvesV"] is False
    assert mbid["mbidFallbackResolvesLisa"] is False
    assert mbid["blockerResolved"] is False
    assert readiness["nextGate"]["code"] == "ALTERNATIVE_CANONICAL_LASTFM_PROVIDER_OR_RUNTIME_CONTRACT_DECISION_REQUIRED"

    safety = evidence["safety"]
    assert all(value is False for value in safety.values())

    print(
        "PASS: Last.fm V/LISA MBID fallback rejected | "
        "V=identity-conflated | LISA=mbid-not-found | "
        "unsupported-kept | product21=BLOCKED"
    )


if __name__ == "__main__":
    main()
