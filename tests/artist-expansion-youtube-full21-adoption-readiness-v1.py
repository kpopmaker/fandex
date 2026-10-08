import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READINESS = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_full21_adoption_readiness_v1.json"
COMPARISON = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_distribution_comparison_v1.json"
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_metric_snapshot_receipt_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
MASTER = ROOT / "scripts/fandex-cloud-migration/source/fandex_master_score_v10.py"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    readiness = read_json(READINESS)
    comparison = read_json(COMPARISON)
    receipt = read_json(RECEIPT)
    compat = read_json(COMPAT)
    master_text = MASTER.read_text(encoding="utf-8-sig")

    assert readiness["version"] == "youtube_v3_full21_adoption_readiness_v1"
    assert readiness["status"] == "youtube_source_candidate_ready_product_cohort_blocked"
    assert readiness["decision"]["selectedOption"] == "adopt_full_21_as_youtube_source_candidate_only"

    yt = readiness["youtubeReadiness"]
    assert yt["sourceCandidateArtistCount"] == 21
    assert len(yt["sourceCandidateCanonicalArtistIds"]) == 21
    assert len(set(yt["sourceCandidateCanonicalArtistIds"])) == 21
    assert yt["commonSeedVideoCount"] == 74
    assert yt["measurementRunId"] == 37398978361
    assert yt["measurementReturnedVideoCount"] == 74
    assert yt["measurementZeroImputationUsed"] is False
    assert yt["commonBaselineTechnicallyEstablished"] is True
    assert yt["mixedFrozenAndRebaselineScaleAllowed"] is False
    assert yt["youtubeSourceCandidateAdoptionReady"] is True

    assert receipt["measurement"]["targetArtistCount"] == 21
    assert receipt["measurement"]["returnedVideoCount"] == 74
    assert comparison["decisionBoundary"]["full21RebaselineTechnicalBaselineEstablished"] is True
    assert comparison["decisionBoundary"]["mixedFrozenAndRebaselineProductScaleAllowed"] is False

    target_ids = set(yt["sourceCandidateCanonicalArtistIds"])
    naver = compat["sources"]["naver_news"]
    music = compat["sources"]["music_chart"]
    lastfm = compat["sources"]["lastfm"]

    assert target_ids <= set(naver["supportedCanonicalArtistIds"])
    assert target_ids <= set(music["supportedCanonicalArtistIds"])

    lastfm_supported = target_ids & set(lastfm["supportedCanonicalArtistIds"])
    lastfm_unsupported = target_ids & set(lastfm["unsupportedCanonicalArtistIds"])
    assert len(lastfm_supported) == 19
    assert lastfm_unsupported == {"v", "lisa"}

    cross = readiness["crossSourceProductReadiness"]
    assert cross["target21"]["lastfm"]["supportedCount"] == 19
    assert set(cross["target21"]["lastfm"]["unsupportedCanonicalArtistIds"]) == {"v", "lisa"}
    assert cross["productCohort21Ready"] is False
    assert cross["blockerCode"] == "LASTFM_V_LISA_PRODUCT_PARITY_BLOCK"

    assert 'if youtube_cohort != product_cohort:' in master_text
    assert 'missing_music = sorted(' in master_text
    assert 'missing_lastfm = sorted(' in master_text
    assert 'lastfm_modes.get(name)' in master_text
    assert 'lastfm_status.get(name) != "ok"' in master_text

    allowed = readiness["allowedNow"]
    assert allowed["treatFull21CommonBaselineAsYoutubeSourceCandidate"] is True
    assert allowed["retainFrozen10AsActiveProductYoutubeCohort"] is True
    assert allowed["handoffCandidateToProductRuntime"] is True

    forbidden = readiness["forbiddenNow"]
    assert all(value is True for value in forbidden.values())

    # The cross-source Last.fm blocker remains true, but cumulative research
    # advanced to a uniform ListenBrainz full21 shadow gate.
    alt = cross["alternativeCanonicalProviderCandidate"]
    assert alt["provider"] == "ListenBrainz"
    assert alt["vCanonicalIdentitySupported"] is True
    assert alt["lisaCanonicalIdentitySupported"] is True
    assert alt["lastfmDropInReplacementReady"] is False
    assert alt["productParityResolved"] is False
    assert readiness["nextGate"]["code"] == "FULL_21_LISTENBRAINZ_CANONICAL_COHORT_SHADOW_REQUIRED"
    assert readiness["nextGate"]["primaryBlocker"] == "cross-provider metric comparability"

    safety = readiness["safety"]
    assert all(value is False for value in safety.values())

    print(
        "PASS: YouTube full21 adoption readiness | "
        "youtubeCandidate=READY | product21=BLOCKED | "
        "lastfmSupported=19 | ListenBrainz-path=advanced | activeProduct=frozen10"
    )


if __name__ == "__main__":
    main()
