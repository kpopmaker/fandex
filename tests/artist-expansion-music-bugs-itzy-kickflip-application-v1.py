import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RECEIPT=ROOT/"data/fandex-cloud-v10/seed/music_chart_bugs_itzy_kickflip_application_receipt_v1.json"
TARGET=ROOT/"data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    d=read_json(RECEIPT)
    target=read_json(TARGET)
    compat=read_json(COMPAT)

    assert d["version"]=="music_chart_bugs_itzy_kickflip_application_receipt_v1"
    assert d["status"]=="source_application_validated_non_product"

    app=d["application"]
    assert app["previousTargetCount"]==89
    assert app["appliedReviewedBindingCount"]==2
    assert app["targetCount"]==91
    assert app["previousSupportedCount"]==89
    assert app["supportedCount"]==91
    assert app["previousUnresolvedCount"]==266
    assert app["unresolvedCount"]==264
    assert app["unsupportedCount"]==0
    assert app["appliedCanonicalArtistIds"]==["itzy","kickflip"]
    assert app["deferredCanonicalArtistIds"]==["girlsgeneration"]

    ids={row["canonicalArtistId"] for row in target["artists"]}
    assert len(target["artists"])==91
    assert {"itzy","kickflip"} <= ids
    assert "girlsgeneration" not in ids

    music=compat["sources"]["music_chart"]
    supported=set(music["supportedCanonicalArtistIds"])
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    assert len(supported)==91
    assert len(unresolved)==264
    assert len(music["unsupportedCanonicalArtistIds"])==0
    assert {"itzy","kickflip"} <= supported
    assert "girlsgeneration" in unresolved
    assert supported.isdisjoint(unresolved)
    assert len(supported | unresolved)==355

    live=d["liveValidation"]
    assert live["runId"]==37558691392
    assert live["jobId"]==112590777401
    assert live["head"]=="bafc2601d16ee165a0310ec4a0c473b79ccf848d"
    assert live["conclusion"]=="success"
    assert live["itzyObservedRowCount"]==1
    assert live["kickflipObservedRowCount"]==8
    assert live["girlsgenerationStillUnresolvedHit"] is True
    assert live["identityAmbiguityCount"]==0
    assert live["unsafeAliasMatchCount"]==0

    artifact=d["artifact"]
    assert artifact["artifactId"]==11455519795
    assert artifact["digest"]=="sha256:129d4a247e655e689d161d6259128a54eebbeefb0765ac775bc788fc4e9681fa"

    decision=d["decision"]
    assert decision["sourceApplicationValidated"] is True
    assert decision["sourceBindingExpansionReadyForArtistExpansionLine"] is True
    assert decision["girlsgenerationRemainsUnresolved"] is True
    assert all(decision[k] is False for k in [
        "productCohortExpansionAuthorized",
        "productRuntimeActivationAuthorized",
        "schedulerActivationAuthorized",
        "databaseMutationAuthorized",
        "deploymentAuthorized",
        "mainMergeAuthorized",
    ])

    assert d["remainingMusicCoverage"]=={
        "supportedCount":91,
        "unresolvedCount":264,
        "unsupportedCount":0,
        "nextGate":"MUSIC_FULL355_REMAINING264_DISCOVERY_STRATEGY_REQUIRED",
    }
    assert all(value is False for value in d["safety"].values())

    print("PASS: Music Bugs application | ITZY=SUPPORTED | KickFlip=SUPPORTED | coverage=91/264/0 | GirlsGeneration=UNRESOLVED")


if __name__=="__main__":
    main()
