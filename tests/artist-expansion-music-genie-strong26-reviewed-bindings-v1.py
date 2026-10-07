import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DISCOVERY=ROOT/"data/fandex-cloud-v10/seed/music_genie_full264_identity_discovery_receipt_v1.json"
DETAIL=ROOT/"data/fandex-cloud-v10/seed/music_genie_exact94_detail_verification_receipt_v1.json"
REVIEW=ROOT/"data/fandex-cloud-v10/seed/music_genie_strong26_reviewed_bindings_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"

def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def main():
    discovery=read_json(DISCOVERY)
    detail=read_json(DETAIL)
    review=read_json(REVIEW)
    compat=read_json(COMPAT)

    assert discovery["version"]=="music_genie_full264_identity_discovery_receipt_v1"
    assert discovery["execution"]["runId"]==37559756356
    assert discovery["execution"]["requestCount"]==264
    assert discovery["execution"]["dispositionCounts"]=={
        "unique_exact_candidate":94,
        "ambiguous_exact_candidates":46,
        "unique_wrapper_candidate_review_required":28,
        "ambiguous_wrapper_candidates":73,
        "provider_candidates_without_alias_match":20,
        "no_provider_candidate":3,
        "request_failed":0,
    }
    assert discovery["artifact"]["artifactId"]==11456271955
    assert discovery["artifact"]["digest"]=="sha256:342d6bfc23ab8d39714058879101a16ca2c1ef7a89bf26407266848119005c0c"

    assert detail["version"]=="music_genie_exact94_detail_verification_receipt_v1"
    assert detail["execution"]["runId"]==37560176276
    assert detail["execution"]["targetCount"]==94
    assert detail["execution"]["dispositionCounts"]=={
        "strong_metadata_consistent_candidate":26,
        "metadata_partial_candidate":39,
        "debut_year_mismatch":5,
        "entity_type_mismatch_or_unparsed":23,
        "detail_display_mismatch":1,
        "detail_fetch_failed":0,
    }
    assert detail["artifact"]["artifactId"]==11456228049
    assert detail["artifact"]["digest"]=="sha256:df2d9059f99d7ed4461c45ab72c5f15721daf27e0c0f7ba025bcfeae1282ba0f"

    strong=detail["execution"]["strongMetadataConsistentCanonicalArtistIds"]
    assert len(strong)==26
    assert len(set(strong))==26

    assert review["version"]=="music_genie_strong26_reviewed_bindings_v1"
    assert review["reviewedSupportedCandidateCount"]==26
    assert review["reviewedSupportedCanonicalArtistIds"]==strong

    music=compat["sources"]["music_chart"]
    supported=set(music["supportedCanonicalArtistIds"])
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    unsupported=set(music["unsupportedCanonicalArtistIds"])
    assert len(supported)==91
    assert len(unresolved)==264
    assert len(unsupported)==0
    assert set(strong) <= unresolved
    assert set(strong).isdisjoint(supported)

    contract=review["reviewContract"]
    assert contract["canonicalArtistIdAuthoritative"] is True
    assert contract["stableProviderArtistIdRequired"] is True
    assert contract["providerSearchExactAliasRequired"] is True
    assert contract["providerDetailDisplayAliasMatchRequired"] is True
    assert contract["canonicalEntityTypeMatchRequired"] is True
    assert contract["canonicalDebutYearMatchRequired"] is True
    assert contract["displayNameOnlyBindingAllowed"] is False
    assert contract["fuzzyIdentityAllowed"] is False
    assert contract["ambiguousProviderIdAutoSelectionAllowed"] is False
    assert contract["partialMetadataAutoPromotionAllowed"] is False
    assert contract["conflictingMetadataAutoPromotionAllowed"] is False
    assert contract["reviewedBindingActivatesProduct"] is False

    assert review["applicationPreview"]=={
        "currentSupportedCount":91,
        "currentUnresolvedCount":264,
        "currentUnsupportedCount":0,
        "addReviewedSupportedCount":26,
        "proposedSupportedCount":117,
        "proposedUnresolvedCount":238,
        "proposedUnsupportedCount":0,
    }
    assert 117+238==355

    decision=review["decision"]
    assert decision["selected"]=="approve_genie_strong26_as_music_source_reviewed_supported_candidates_only"
    assert all(value is False for key,value in decision.items() if key!="selected")
    assert review["nextGate"]=="MUSIC_GENIE_STRONG26_APPLICATION_VALIDATION_REQUIRED"

    print("PASS: Genie strong26 review | current=91/264/0 | proposed=117/238/0 | partial/conflicts=UNRESOLVED")

if __name__=="__main__":
    main()
