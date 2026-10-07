import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RECEIPT=ROOT/"data/fandex-cloud-v10/seed/music_chart_full355_composite34_application_receipt_v1.json"
TARGET=ROOT/"data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
REVIEW=ROOT/"data/fandex-cloud-v10/seed/music_chart_full355_composite34_reviewed_bindings_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt=read_json(RECEIPT)
    target=read_json(TARGET)
    compat=read_json(COMPAT)
    review=read_json(REVIEW)

    assert receipt["version"]=="music_chart_full355_composite34_application_receipt_v1"
    assert receipt["status"]=="source_application_validated_non_product"

    app=receipt["application"]
    assert app["previousTargetCount"]==55
    assert app["appliedReviewedBindingCount"]==34
    assert app["targetCount"]==89
    assert app["previousSupportedCount"]==55
    assert app["supportedCount"]==89
    assert app["previousUnresolvedCount"]==300
    assert app["unresolvedCount"]==266
    assert app["unsupportedCount"]==0
    assert app["deferredCanonicalArtistIds"]==["girlsgeneration"]

    approved=set(review["approvedReviewedSupportedCanonicalArtistIds"])
    assert len(approved)==34
    assert set(app["appliedCanonicalArtistIds"])==approved

    ids={row["canonicalArtistId"] for row in target["artists"]}
    assert len(target["artists"])==89
    assert len(ids)==89
    assert approved <= ids
    assert "girlsgeneration" not in ids

    music=compat["sources"]["music_chart"]
    supported=set(music["supportedCanonicalArtistIds"])
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    unsupported=set(music["unsupportedCanonicalArtistIds"])
    assert len(supported)==89
    assert len(unresolved)==266
    assert len(unsupported)==0
    assert approved <= supported
    assert "girlsgeneration" in unresolved
    assert supported.isdisjoint(unresolved)
    assert len(supported | unresolved | unsupported)==355

    live=receipt["liveValidation"]
    assert live["runId"]==37556338334
    assert live["jobId"]==112583331231
    assert live["head"]=="fbb908b6010f576a07890eac9ed42d232adc294e"
    assert live["conclusion"]=="success"
    assert live["parsedChartRowCount"]==300
    assert live["candidateRowCount"]==239
    assert live["candidateCanonicalArtistCount"]==80
    assert live["composite34ObservedCount"]==34
    assert live["composite34MissingCanonicalArtistIds"]==[]
    assert live["identityAmbiguityCount"]==0
    assert sum(live["sourceCounts"].values())==300

    artifact=receipt["artifact"]
    assert artifact["artifactId"]==11455585122
    assert artifact["digest"]=="sha256:7abcca4cc20c1eb9ccc5c51e2b3dc89d5881262abd4b17e9ad826a5eb6b6e769"

    decision=receipt["decision"]
    assert decision["sourceApplicationValidated"] is True
    assert decision["sourceBindingExpansionReadyForArtistExpansionLine"] is True
    assert decision["girlsgenerationRemainsUnresolved"] is True
    assert decision["productCohortExpansionAuthorized"] is False
    assert decision["productRuntimeActivationAuthorized"] is False
    assert decision["schedulerActivationAuthorized"] is False
    assert decision["databaseMutationAuthorized"] is False
    assert decision["deploymentAuthorized"] is False
    assert decision["mainMergeAuthorized"] is False

    remaining=receipt["remainingMusicCoverage"]
    assert remaining["supportedCount"]==89
    assert remaining["unresolvedCount"]==266
    assert remaining["unsupportedCount"]==0
    assert remaining["knownDeferredLiveCandidateCanonicalArtistIds"]==["girlsgeneration"]
    assert remaining["nextGate"]=="MUSIC_FULL355_REMAINING266_DISCOVERY_STRATEGY_REQUIRED"

    assert all(value is False for value in receipt["safety"].values())

    print("PASS: Music composite34 source application | targets=89 | compatibility=89/266/0 | live=34/34 | girlsgeneration=UNRESOLVED")


if __name__=="__main__":
    main()
