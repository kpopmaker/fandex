import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RECEIPT=ROOT/"data/fandex-cloud-v10/seed/music_chart_bugs_full355_discovery_receipt_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    d=read_json(RECEIPT)
    compat=read_json(COMPAT)

    assert d["version"]=="music_chart_bugs_full355_discovery_receipt_v1"
    assert d["status"]=="bugs_candidates_discovered_review_required_non_activating"

    x=d["discovery"]
    assert x["runId"]==37558301311
    assert x["jobId"]==112589543570
    assert x["conclusion"]=="success"
    assert x["targetArtistCount"]==355
    assert x["compatibilityBeforeDiscovery"]=={"supportedCount":89,"unresolvedCount":266,"unsupportedCount":0}
    assert x["parsedChartRowCount"]==100
    assert x["candidateRowCount"]==88
    assert x["candidateCanonicalArtistCount"]==50
    assert x["supportedHitArtistCount"]==47
    assert x["unresolvedHitArtistCount"]==3
    assert x["unresolvedHitCanonicalArtistIds"]==["girlsgeneration","itzy","kickflip"]
    assert x["identityAmbiguityCount"]==0
    assert x["unsafeAliasMatchCount"]==0

    artifact=d["artifact"]
    assert artifact["artifactId"]==11455593889
    assert artifact["digest"]=="sha256:cec7bf1d0a20703972570eeb589f14fe3ef95a9cfebc423ba1c5a08c7ecca044"

    by_id={row["canonicalArtistId"]:row for row in d["unresolvedHitEvidence"]}
    assert by_id["itzy"]["observedProviderDisplays"]==["ITZY (있지)"]
    assert by_id["itzy"]["reviewDisposition"]=="eligible_for_reviewed_supported_binding"
    assert by_id["kickflip"]["observedProviderDisplays"]==["KickFlip(킥플립)"]
    assert by_id["kickflip"]["observedCandidateRowCount"]==8
    assert by_id["kickflip"]["reviewDisposition"]=="eligible_for_reviewed_supported_binding"
    assert by_id["girlsgeneration"]["reviewDisposition"]=="remain_unresolved"

    music=compat["sources"]["music_chart"]
    assert len(music["supportedCanonicalArtistIds"])==89
    assert len(music["unresolvedCanonicalArtistIds"])==266
    assert len(music["unsupportedCanonicalArtistIds"])==0
    assert {"itzy","kickflip","girlsgeneration"} <= set(music["unresolvedCanonicalArtistIds"])

    boundary=d["decisionBoundary"]
    assert boundary["reviewEligibleCanonicalArtistIds"]==["itzy","kickflip"]
    assert boundary["remainUnresolvedCanonicalArtistIds"]==["girlsgeneration"]
    assert boundary["machineCandidateAutoPromoted"] is False
    assert boundary["nextGate"]=="MUSIC_BUGS_ITZY_KICKFLIP_REVIEW_REQUIRED"

    assert all(value is False for value in d["safety"].values())

    print("PASS: Bugs full355 Music discovery | unresolvedHits=3 | reviewEligible=itzy,kickflip | girlsgeneration=UNRESOLVED")


if __name__=="__main__":
    main()
