import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SEED=ROOT/"data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
COMPAT=ROOT/"data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
BIND=ROOT/"data/fandex-cloud-v10/seed/music_genie_strong26_provider_bindings_v1.json"
REVIEW=ROOT/"data/fandex-cloud-v10/seed/music_genie_strong26_reviewed_bindings_v1.json"
RECEIPT=ROOT/"data/fandex-cloud-v10/seed/music_genie_strong26_source_application_receipt_v1.json"

def load(p): return json.loads(p.read_text(encoding="utf-8-sig"))

def main():
    t,c,b,r,d=map(load,[SEED,COMPAT,BIND,REVIEW,RECEIPT])
    a=d["application"]
    assert d["version"]=="music_genie_strong26_source_application_receipt_v1"
    assert d["status"]=="source_candidate_application_validated_non_product"
    assert d["source"]=="music_chart" and d["provider"]=="genie"
    assert (a["previousSupportedCount"],a["previousUnresolvedCount"])==(91,264)
    assert (a["supportedCount"],a["unresolvedCount"],a["unsupportedCount"])==(117,238,0)
    assert (a["addedReviewedBindings"],a["targetCount"])==(26,117)
    assert len(t["artists"])==117
    ids={x["canonicalArtistId"] for x in t["artists"]}
    assert len(ids)==117
    source=c["sources"]["music_chart"]
    sup=set(source["supportedCanonicalArtistIds"])
    unresolved=set(source["unresolvedCanonicalArtistIds"])
    unsupported=set(source["unsupportedCanonicalArtistIds"])
    assert len(sup)==117 and len(unresolved)==238 and len(unsupported)==0
    assert sup.isdisjoint(unresolved)
    assert len(sup|unresolved|unsupported)==355
    rows=b["bindings"]
    assert len(rows)==26
    reviewed=set(r["reviewedSupportedCanonicalArtistIds"])
    pinned={row["canonicalArtistId"] for row in rows}
    assert len(pinned)==26
    assert pinned==reviewed==set(a["appliedCanonicalArtistIds"])
    assert pinned<=ids and pinned<=sup and pinned.isdisjoint(unresolved)
    providerids=[str(row["providerArtistId"]) for row in rows]
    assert len(set(providerids))==26 and all(v.isdigit() for v in providerids)
    assert t["reviewedExpansionGenieStrong26"]["productCohortExpansionAuthorized"] is False
    assert t["reviewedExpansionGenieStrong26"]["runtimeActivationAuthorized"] is False
    live=d["liveValidation"]
    assert live["runId"]==37560876534
    assert live["conclusion"]=="success"
    assert live["applicationValidationHead"]=="c965c3f9376a6b96b15c65746fd64e6f39038acd"
    assert live["artifactId"]==11456194778
    assert live["artifactDigest"]=="sha256:edc27c27b39b85732f25834a6600370247d790f77bdba37cc96ba1b7e9da7b39"
    for k in ["validatedBindingCount","expectedExactGenieProviderIdObservedCount","detailAliasMatchCount","detailEntityTypeMatchCount","detailDebutYearMatchCount"]:
        assert live[k]==26, k
    assert live["failedBindingCount"]==0
    assert all(v is False for v in d["safety"].values())
    scope=d["currentScope"]
    assert scope["candidateBranchOnly"] is True
    assert scope["canonicalUniverseCount"]==355
    for k,v in scope.items():
        if k not in {"candidateBranchOnly","canonicalUniverseCount"}:
            assert v is False,k
    assert d["nextGate"]=="MUSIC_GENIE_REMAINING238_REVIEW_OR_ALTERNATE_PROVIDER_EVIDENCE_REQUIRED"
    print("PASS: Music Genie strong26 source receipt | providerIds=26 unique | live=26/26 | Music=117/238/0 | Product=UNCHANGED")

if __name__=="__main__":
    main()
