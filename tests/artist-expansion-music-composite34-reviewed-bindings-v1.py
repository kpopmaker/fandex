import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/"data/fandex-cloud-v10/seed/music_chart_full355_composite34_reviewed_bindings_v1.json"
DISCOVERY=ROOT/"data/fandex-cloud-v10/seed/music_chart_full355_candidate_discovery_receipt_v1.json"
EXACT_APP=ROOT/"data/fandex-cloud-v10/seed/music_chart_full355_exact34_application_receipt_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    review=read_json(REVIEW)
    discovery=read_json(DISCOVERY)
    exact_app=read_json(EXACT_APP)
    compat=read_json(COMPAT)

    assert review["version"]=="music_chart_full355_composite34_reviewed_bindings_v1"
    assert review["status"]=="reviewed_supported_candidate_application_not_applied"

    approved=set(review["approvedReviewedSupportedCanonicalArtistIds"])
    assert len(approved)==34
    assert review["approvedReviewedSupportedCandidateCount"]==34

    original_composite=set(discovery["reviewPartition"]["compositeProviderDisplayCanonicalArtistIds"])
    assert len(original_composite)==35
    assert approved <= original_composite
    assert original_composite-approved=={"girlsgeneration"}

    assert review["deferredCount"]==1
    assert review["deferred"][0]["canonicalArtistId"]=="girlsgeneration"
    assert review["deferred"][0]["reasonCode"]=="PROVIDER_DISPLAY_IS_SUBGROUP_OR_UNIT_NOT_PARENT_GROUP"
    assert review["deferred"][0]["decision"]=="remain_unresolved"

    policy=review["reviewPolicy"]
    assert policy["canonicalArtistIdAuthoritative"] is True
    assert policy["providerArtistDisplayMayWrapCanonicalAliasesInParentheses"] is True
    assert policy["wrappedAliasesMustAllResolveToSameCanonicalArtist"] is True
    assert policy["collisionFreeAliasRequired"] is True
    assert policy["atLeastOneNonAmbiguousLiveRowRequired"] is True
    assert policy["collaborationRowAloneSufficient"] is False
    assert policy["subgroupOrUnitDisplayMayPromoteParentGroup"] is False
    assert policy["fuzzyIdentityAllowed"] is False
    assert policy["ambiguousRowAutoSelectionAllowed"] is False
    assert policy["reviewedBindingActivatesProduct"] is False

    music=compat["sources"]["music_chart"]
    supported=set(music["supportedCanonicalArtistIds"])
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    assert len(supported)==55
    assert len(unresolved)==300
    assert approved <= unresolved
    assert "girlsgeneration" in unresolved
    assert approved.isdisjoint(supported)

    assert exact_app["remainingMusicCoverage"]["supportedCount"]==55
    assert exact_app["remainingMusicCoverage"]["unresolvedCount"]==300

    preview=review["applicationPreview"]
    assert preview=={
        "currentSupportedCount":55,
        "currentUnresolvedCount":300,
        "currentUnsupportedCount":0,
        "addReviewedSupportedCount":34,
        "proposedSupportedCount":89,
        "proposedUnresolvedCount":266,
        "proposedUnsupportedCount":0,
    }

    decision=review["decision"]
    assert decision["selected"]=="approve_composite34_as_music_source_reviewed_supported_candidates_only"
    assert all(value is False for key,value in decision.items() if key!="selected")
    assert review["nextGate"]=="MUSIC_FULL355_COMPOSITE34_APPLICATION_VALIDATION_REQUIRED"

    print("PASS: Music composite34 review | approved=34 | deferred=1(girlsgeneration-unit) | proposed=89/266/0")


if __name__=="__main__":
    main()
