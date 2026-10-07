import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_exact34_reviewed_bindings_v1.json"
PREVIEW = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_exact34_application_preview_v1.json"
DISCOVERY = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_candidate_discovery_receipt_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
ACTIVE = ROOT / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    review = read_json(REVIEW)
    preview = read_json(PREVIEW)
    discovery = read_json(DISCOVERY)
    compat = read_json(COMPAT)
    active = read_json(ACTIVE)

    assert review["version"] == "music_chart_full355_exact34_reviewed_bindings_v1"
    assert review["status"] == "reviewed_supported_candidate_application_not_applied"
    assert review["reviewedSupportedCandidateCount"] == 34
    assert len(review["reviewedSupportedCanonicalArtistIds"]) == 34
    assert len(set(review["reviewedSupportedCanonicalArtistIds"])) == 34
    assert review["deferredCompositeCandidateCount"] == 35
    assert len(review["deferredCompositeCanonicalArtistIds"]) == 35

    contract = review["reviewContract"]
    assert contract["canonicalArtistIdAuthoritative"] is True
    assert contract["providerDisplayMustNormalizeExactlyToCanonicalAlias"] is True
    assert contract["aliasMustBeCollisionFreeForReviewedRow"] is True
    assert contract["discoveryRowMustResolveToSingleCanonicalArtist"] is True
    assert contract["fuzzyIdentityAllowed"] is False
    assert contract["displaySubstringOnlySufficient"] is False
    assert contract["ambiguousRowAutoSelectionAllowed"] is False
    assert contract["reviewedBindingActivatesProduct"] is False

    music = compat["sources"]["music_chart"]
    supported = set(music["supportedCanonicalArtistIds"])
    unresolved = set(music["unresolvedCanonicalArtistIds"])
    exact = set(review["reviewedSupportedCanonicalArtistIds"])
    composite = set(review["deferredCompositeCanonicalArtistIds"])

    assert len(supported) == 21
    assert len(unresolved) == 334
    assert exact <= unresolved
    assert composite <= unresolved
    assert exact.isdisjoint(supported)
    assert exact.isdisjoint(composite)
    assert exact == set(discovery["reviewPartition"]["exactCanonicalAliasProviderDisplayCanonicalArtistIds"])

    proposed = preview["proposed"]
    assert preview["current"] == {
        "supportedCount": 21,
        "unresolvedCount": 334,
        "unsupportedCount": 0,
    }
    assert proposed["addReviewedSupportedCount"] == 34
    assert proposed["supportedCount"] == 55
    assert proposed["unresolvedCount"] == 300
    assert proposed["unsupportedCount"] == 0
    assert set(proposed["addedCanonicalArtistIds"]) == exact
    assert proposed["supportedCount"] + proposed["unresolvedCount"] + proposed["unsupportedCount"] == 355

    assert len(active["artists"]) == 21
    assert preview["invariants"]["activeTargetSeedUnchanged"] is True
    assert preview["invariants"]["compatibilityRegistryUnchanged"] is True
    assert preview["invariants"]["productCohortUnchanged"] is True
    assert preview["nextGate"] == "MUSIC_FULL355_EXACT34_APPLICATION_VALIDATION_REQUIRED"

    decision = review["reviewerDecision"]
    assert decision["selected"] == "approve_exact34_as_music_source_reviewed_supported_candidates_only"
    assert all(value is False for key, value in decision.items() if key != "selected")

    print(
        "PASS: Music exact34 reviewed binding preview | "
        "current=21/334/0 | proposed=55/300/0 | "
        "activeSeed=UNCHANGED | registry=UNCHANGED"
    )


if __name__ == "__main__":
    main()
