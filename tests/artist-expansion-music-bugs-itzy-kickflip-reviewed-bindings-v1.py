import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/"data/fandex-cloud-v10/seed/music_chart_bugs_itzy_kickflip_reviewed_bindings_v1.json"
DISCOVERY=ROOT/"data/fandex-cloud-v10/seed/music_chart_bugs_full355_discovery_receipt_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    review=read_json(REVIEW)
    discovery=read_json(DISCOVERY)
    compat=read_json(COMPAT)

    assert review["version"]=="music_chart_bugs_itzy_kickflip_reviewed_bindings_v1"
    assert review["status"]=="reviewed_supported_candidate_application_not_applied"
    assert review["reviewedSupportedCandidateCount"]==2

    bindings={row["canonicalArtistId"]:row for row in review["reviewedSupportedBindings"]}
    assert set(bindings)=={"itzy","kickflip"}
    assert bindings["itzy"]["providerDisplays"]==["ITZY (있지)"]
    assert bindings["itzy"]["observedCandidateRowCount"]==1
    assert bindings["kickflip"]["providerDisplays"]==["KickFlip(킥플립)"]
    assert bindings["kickflip"]["observedCandidateRowCount"]==8

    policy=review["reviewPolicy"]
    assert policy["canonicalArtistIdAuthoritative"] is True
    assert policy["bilingualWrapperAllowed"] is True
    assert policy["providerArtistFieldMustDirectlyIdentifyCanonicalArtist"] is True
    assert policy["subgroupUnitMayPromoteParentGroup"] is False
    assert policy["fuzzyIdentityAllowed"] is False
    assert policy["ambiguousRowAutoSelectionAllowed"] is False
    assert policy["reviewedBindingActivatesProduct"] is False

    assert review["deferred"]==[{
        "canonicalArtistId":"girlsgeneration",
        "reasonCode":"PROVIDER_DISPLAY_IS_SUBGROUP_OR_UNIT_NOT_PARENT_GROUP",
        "providerDisplays":["소녀시대-효리수 (Girls' Generation-HRS)"],
        "decision":"remain_unresolved",
    }]

    music=compat["sources"]["music_chart"]
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    assert len(music["supportedCanonicalArtistIds"])==89
    assert len(unresolved)==266
    assert {"itzy","kickflip","girlsgeneration"} <= unresolved

    assert set(discovery["decisionBoundary"]["reviewEligibleCanonicalArtistIds"])=={"itzy","kickflip"}
    assert discovery["decisionBoundary"]["remainUnresolvedCanonicalArtistIds"]==["girlsgeneration"]

    assert review["applicationPreview"]=={
        "currentSupportedCount":89,
        "currentUnresolvedCount":266,
        "currentUnsupportedCount":0,
        "addReviewedSupportedCount":2,
        "proposedSupportedCount":91,
        "proposedUnresolvedCount":264,
        "proposedUnsupportedCount":0,
    }

    decision=review["decision"]
    assert decision["selected"]=="approve_itzy_kickflip_as_music_source_reviewed_supported_candidates_only"
    assert all(value is False for key,value in decision.items() if key!="selected")
    assert review["nextGate"]=="MUSIC_BUGS_ITZY_KICKFLIP_APPLICATION_VALIDATION_REQUIRED"

    print("PASS: Music Bugs review | ITZY=APPROVED | KickFlip=APPROVED | GirlsGeneration=UNRESOLVED | proposed=91/264/0")


if __name__=="__main__":
    main()
