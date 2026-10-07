import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_candidate_discovery_receipt_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
ACTIVE = ROOT / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    compat = read_json(COMPAT)
    active = read_json(ACTIVE)

    assert receipt["version"] == "music_chart_full355_candidate_discovery_receipt_v1"
    assert receipt["status"] == "machine_candidates_discovered_review_required_non_activating"

    material = receipt["targetMaterialization"]
    assert material["canonicalUniverseCount"] == 355
    assert material["preservedReviewedSupportedCount"] == 21
    assert material["unresolvedCandidateCount"] == 334
    assert material["unsupportedCount"] == 0
    assert material["aliasCollisionCount"] == 2
    assert material["droppedShortAliasCount"] == 10
    assert material["fuzzyAutoBinding"] is False
    assert material["ambiguousAliasAutoSelection"] is False

    live = receipt["liveDiscovery"]
    assert live["runId"] == 37554027952
    assert live["jobId"] == 112575954501
    assert live["head"] == "5962091894555fdd3cb9924647668c874798a432"
    assert live["conclusion"] == "success"
    assert live["parsedChartRowCount"] == 300
    assert live["candidateRowCount"] == 235
    assert live["candidateCanonicalArtistCount"] == 80
    assert live["reviewedSupportedHitArtistCount"] == 11
    assert live["unresolvedHitArtistCount"] == 69
    assert live["identityAmbiguityCount"] == 5
    assert sum(live["sourceCounts"].values()) == 300

    artifact = receipt["artifact"]
    assert artifact["artifactId"] == 11454022856
    assert artifact["digest"] == "sha256:edf87a0f00ee6ea3d992275977a0676b02b5f7e5a12b280cd84e443335512b79"

    review = receipt["reviewPartition"]
    exact = review["exactCanonicalAliasProviderDisplayCanonicalArtistIds"]
    composite = review["compositeProviderDisplayCanonicalArtistIds"]
    assert review["exactCanonicalAliasProviderDisplayCandidateCount"] == 34
    assert review["compositeProviderDisplayCandidateCount"] == 35
    assert len(exact) == 34
    assert len(composite) == 35
    assert len(set(exact)) == 34
    assert len(set(composite)) == 35
    assert set(exact).isdisjoint(composite)
    assert len(set(exact) | set(composite)) == 69

    music = compat["sources"]["music_chart"]
    assert len(music["supportedCanonicalArtistIds"]) == 21
    assert len(music["unresolvedCanonicalArtistIds"]) == 334
    assert len(music["unsupportedCanonicalArtistIds"]) == 0
    assert len(active["artists"]) == 21

    boundary = receipt["decisionBoundary"]
    assert boundary["exact34EligibleForReviewedBindingReview"] is True
    assert boundary["exact34AutoPromotedToSupported"] is False
    assert boundary["composite35EligibleForAutomaticPromotion"] is False
    assert boundary["ambiguitiesEligibleForAutomaticPromotion"] is False
    assert boundary["nextGate"] == "MUSIC_FULL355_EXACT_CANDIDATE_REVIEW_REQUIRED"

    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: Music full355 candidate packet | "
        "unresolvedHits=69 | exactReviewCandidates=34 | "
        "composite=35 | ambiguity=5 | registry=UNCHANGED"
    )


if __name__ == "__main__":
    main()
