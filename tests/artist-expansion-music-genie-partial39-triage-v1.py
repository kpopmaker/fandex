from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/fandex-cloud-v10/seed"
QUEUE = SOURCE / "music_genie_partial39_evidence_triage_v1.json"
TARGETS = SOURCE / "music_chart_artist_targets_v1.json"
COMPAT = SOURCE / "artist_source_compatibility_v1.json"
STRONG26 = SOURCE / "music_genie_strong26_provider_bindings_v1.json"


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    queue = load(QUEUE)
    target = load(TARGETS)
    compat = load(COMPAT)
    strong = load(STRONG26)
    rows = queue["candidates"]

    assert queue["status"] == "non_activating_identity_evidence_triage_only"
    assert queue["canonicalUniverseCount"] == compat["canonicalUniverseCount"] == 355
    assert queue["source"] == "music_chart" and queue["provider"] == "genie"
    assert queue["sourceEvidence"]["exact94DetailRunId"] == 37560176276
    assert queue["sourceEvidence"]["artifactId"] == 11456228049
    assert queue["sourceEvidence"]["artifactDigest"] == (
        "sha256:df2d9059f99d7ed4461c45ab72c5f15721daf27e0c0f7ba025bcfeae1282ba0f"
    )
    assert len(rows) == 39
    ids = [row["canonicalArtistId"] for row in rows]
    provider_ids = [row["genieProviderArtistId"] for row in rows]
    assert len(set(ids)) == len(ids)
    assert len(set(provider_ids)) == len(provider_ids)
    assert all(pid.isdecimal() and len(pid) == 8 for pid in provider_ids)

    source = compat["sources"]["music_chart"]
    supported = source["supportedCanonicalArtistIds"]
    unresolved = source["unresolvedCanonicalArtistIds"]
    unsupported = source["unsupportedCanonicalArtistIds"]
    targets = [entry["canonicalArtistId"] for entry in target["artists"]]
    assert len(supported) == len(targets) == 117
    assert len(unresolved) == 238 and len(unsupported) == 0
    assert len(set(supported + unresolved + unsupported)) == 355
    assert set(targets) == set(supported)
    assert set(ids).issubset(unresolved)
    assert not set(ids).intersection(supported + unsupported)
    assert not set(ids).intersection(row["canonicalArtistId"] for row in strong["bindings"])

    counts = Counter()
    for row in rows:
        canonical_year = row["canonicalDebutYear"]
        genie_year = row["genieDebutYear"]
        assert canonical_year is None or isinstance(canonical_year, int)
        assert genie_year is None or isinstance(genie_year, int)
        if canonical_year is None and genie_year is None:
            expected = "both_debut_years_unavailable"
        elif canonical_year is None:
            expected = "canonical_debut_year_unavailable"
        else:
            assert genie_year is None
            expected = "genie_debut_year_unavailable"
        assert row["evidenceGap"] == expected
        assert row["reviewStatus"] == "unresolved_additional_year_evidence_required"
        assert row["exactAliasSearchCandidate"] is True
        assert row["detailDisplayAliasMatch"] is True
        assert row["detailEntityTypeMatch"] is True
        counts[expected] += 1

    assert counts == {
        "genie_debut_year_unavailable": 7,
        "canonical_debut_year_unavailable": 25,
        "both_debut_years_unavailable": 7,
    }
    disposition = queue["disposition"]
    assert disposition == {
        "sourceMetadataPartialCount": 39,
        "genieDebutYearUnavailableCount": 7,
        "canonicalDebutYearUnavailableCount": 25,
        "bothDebutYearsUnavailableCount": 7,
        "reviewedForSupportCount": 0,
        "automaticallyBoundCount": 0,
    }

    evidence_ids = {entry["canonicalArtistId"] for entry in queue["independentEvidenceExamples"]}
    assert evidence_ids == {"nexz", "boystory"}
    for evidence in queue["independentEvidenceExamples"]:
        row = next(x for x in rows if x["canonicalArtistId"] == evidence["canonicalArtistId"])
        assert row["evidenceGap"] == "genie_debut_year_unavailable"
        assert row["canonicalDebutYear"] == evidence["corroboratedCanonicalDebutYear"]
        assert evidence["url"].startswith("https://")
        assert evidence["doesNotSupplyMissingGenieDetailYear"] is True
        assert evidence["authorizesSupport"] is False

    scope = queue["yearSemanticsReview"]
    assert scope["reviewStatus"] == "external_reported_evidence_not_human_approved_binding"
    assert scope["reviewedAt"] == "2026-10-08"
    assert scope["scopePolicy"] == "UNDECIDED_REQUIRES_HUMAN_REVIEW"
    assert scope["providerDebutYearSemanticsKnown"] is False
    assert scope["exceptionCount"] == 3
    assert len(scope["records"]) == 3
    expected_scope = {
        "joyuri": (2018, 2021, "80661354"),
        "hwangminhyun": (2012, 2023, "80441275"),
        "kangseungyoon": (2010, 2013, "80089706"),
    }
    assert {x["canonicalArtistId"] for x in scope["records"]} == set(expected_scope)
    for evidence in scope["records"]:
        ident = evidence["canonicalArtistId"]
        provider_year, solo_year, provider_id = expected_scope[ident]
        row = next(x for x in rows if x["canonicalArtistId"] == ident)
        assert row["evidenceGap"] == "canonical_debut_year_unavailable"
        assert row["reviewStatus"] == "unresolved_additional_year_evidence_required"
        assert row["canonicalDebutYear"] is None
        assert row["genieDebutYear"] == evidence["genieDetailDebutYear"] == provider_year
        assert row["genieProviderArtistId"] == evidence["genieProviderArtistId"] == provider_id
        assert evidence["independentlyReportedSoloDebutYear"] == solo_year
        assert provider_year != solo_year
        assert evidence["yearScopeAssessment"]
        assert evidence["evidence"]
        assert all(
            item["url"].startswith("https://")
            and item["publisher"] and item["reportPublished"] and item["supports"]
            for item in evidence["evidence"]
        )
        assert ident in unresolved and ident not in supported and ident not in targets
    assert scope["safety"] == {
        "noAutomaticCanonicalDebutYearFill": True,
        "noProviderArtistIdRebinding": True,
        "noSupportPromotion": True,
        "noProductActivation": True,
    }

    # An independent debut-year report is evidence, NOT a provider detail-year backfill.
    independent = queue["independentDebutYearCorroborationV2"]
    assert independent["version"] == "music_genie_partial39_independent_year_evidence_batch_v2"
    assert independent["status"] == "external_evidence_verified_candidate_only_no_binding"
    assert independent["reviewedOn"] == "2026-10-08"
    assert independent["count"] == len(independent["records"]) == 8
    assert independent["dispositionCounts"] == {
        "canonical_debut_year_unavailable": 6,
        "both_debut_years_unavailable": 2,
    }
    source_expected = {
        "leehi": (2012, 2012, "80158970"),
        "jypark": (1994, 1994, "14945855"),
        "sf9": (2016, 2016, "80546873"),
        "b1a4": (2011, 2011, "80131588"),
        "jeongsewoon": (2017, 2017, "80590751"),
        "kard": (2017, None, "81305280"),
        "up10tion": (2015, None, "81290806"),
        "xlov": (2025, 2025, "82757745"),
    }
    assert {r["canonicalArtistId"] for r in independent["records"]} == set(source_expected)
    assert len({r["pinnedGenieProviderArtistId"] for r in independent["records"]}) == 8
    for source_report in independent["records"]:
        ident = source_report["canonicalArtistId"]
        reported_year, provider_year, provider_id = source_expected[ident]
        row = next(x for x in rows if x["canonicalArtistId"] == ident)
        assert ident in unresolved and ident not in supported and ident not in targets
        assert row["genieProviderArtistId"] == source_report["pinnedGenieProviderArtistId"] == provider_id
        assert row["genieDebutYear"] == source_report["genieDetailDebutYear"] == provider_year
        assert row["canonicalDebutYear"] is None
        assert row["evidenceGap"] == source_report["sourceDisposition"]
        assert source_report["externallyCorroboratedDebutYear"] == reported_year
        assert source_report["evidencePublisher"] and source_report["evidenceType"]
        assert source_report["evidenceYearSemantics"]
        assert source_report["summary"]
        assert source_report["url"].startswith("https://")
        assert source_report["reviewStatus"] == "external_corroboration_candidate_not_reviewed_binding"
        assert source_report["canonicalYearPopulated"] is False
        assert source_report["genieYearBackfilled"] is False
        assert source_report["musicSupportedPromoted"] is False
    decision = independent["decisionBoundary"]
    for key in (
        "externalDebutYearDoesNotReplaceProviderDetailYear",
        "canonicalArtistIdAuthoritative",
        "groupCareerDebutAndSoloDebutAreNotInterchangeable",
        "independentlyReportedDebutYearDoesNotMakeReviewedBinding",
        "allEightRemainUnresolved",
        "doesNotReduceMusicUnresolvedCount",
    ):
        assert decision[key] is True, key
    assert decision["productActivationAuthorized"] is False
    assert independent["nextGate"] == "HUMAN_REVIEW_DEBUT_YEAR_SEMANTICS_AND_PROVIDER_ID_DETAILS"

    epoch = queue["providerIdentityEpochReviewV3"]
    assert epoch["version"] == "music_genie_partial39_identity_epoch_review_v3"
    assert epoch["status"] == (
        "reported_external_identity_evidence_requires_human_review_non_activating"
    )
    assert epoch["evaluatedOn"] == "2026-10-08"
    assert epoch["providerDetailRefetchPerformed"] is False
    assert epoch["cohortCount"] == len(epoch["individualRecords"]) == 5
    expected_epoch = {
        "jinu": ("14946516", 1996, 2014, 2019),
        "mino": ("80073343", None, 2014, 2018),
        "bangyedam": ("80211832", 2013, 2020, 2023),
        "chen": ("81098158", None, 2012, 2019),
        "kimjongkook": ("14945901", 1995, 1995, 2001),
    }
    assert {e["canonicalArtistId"] for e in epoch["individualRecords"]} == set(expected_epoch)
    assert len({e["pinnedGenieProviderArtistId"] for e in epoch["individualRecords"]}) == 5
    for evidence in epoch["individualRecords"]:
        ident = evidence["canonicalArtistId"]
        pid, genie_year, group_year, solo_year = expected_epoch[ident]
        row = next(x for x in rows if x["canonicalArtistId"] == ident)
        assert ident in unresolved and ident not in supported and ident not in targets
        assert row["reviewStatus"] == "unresolved_additional_year_evidence_required"
        assert row["canonicalDebutYear"] is None
        assert row["genieProviderArtistId"] == evidence["pinnedGenieProviderArtistId"] == pid
        assert row["genieDebutYear"] == evidence["genieDetailDebutYearRecordedInOriginalArtifact"] == genie_year
        assert evidence["independentlyReportedGroupOrCareerDebutYear"] == group_year
        assert evidence["independentlyReportedSoloDebutYear"] == solo_year
        assert evidence["genieDetailFreshFetchPerformed"] is False
        assert evidence["reviewState"] == "identity_or_year_scope_human_review_required"
        assert evidence["disposition"] and evidence["artistEntityScope"]
        assert evidence["sourceEvidence"]
        for source in evidence["sourceEvidence"]:
            assert source["url"].startswith("https://")
            assert source["publisher"] and source["evidence"] and source["authority"]
        assert evidence["canonicalYearPopulated"] is False
        assert evidence["providerIdBindingAuthorized"] is False
        assert evidence["musicSourceSupportPromotionAuthorized"] is False
    assert next(x for x in epoch["individualRecords"] if x["canonicalArtistId"] == "jinu")[
        "disposition"
    ] == "potential_provider_identity_collision_requires_independent_genie_entity_linkage"
    assert next(x for x in epoch["individualRecords"] if x["canonicalArtistId"] == "chen")[
        "sourceEvidence"
    ][0]["authority"] == "official_group_profile"
    assert epoch["reviewGates"] == {
        "jinuProviderIdentityCollisionPossibilityUnresolved": True,
        "providerDebutYearSemanticsGloballyUnverified": True,
        "distinctGroupAndSoloDebutYearsCannotBeCollapsed": True,
        "allFiveRetainUnresolvedCompatibility": True,
        "noCanonicalYearBackfill": True,
        "noProviderArtistIdAutobind": True,
        "noProductActivation": True,
    }
    assert epoch["nextGate"] == "GENIE_PARTIAL39_IDENTITY_ENTITY_AND_DEBUT_EPOCH_HUMAN_REVIEW_REQUIRED"

    # Same name and matching 1996 year are not proof of an artist ID linkage.
    jinu_collision = queue["jinuCollisionIndependentEvidenceV4"]
    assert jinu_collision["version"] == "music_genie_jinu_alias_collision_independent_evidence_v4"
    assert jinu_collision["status"] == (
        "two_distinct_artist_identities_evidenced_pinned_provider_id_not_yet_disambiguated"
    )
    assert jinu_collision["canonicalArtistId"] == "jinu"
    assert jinu_collision["pinnedCandidateProviderArtistId"] == "14946516"
    assert jinu_collision["pinnedGenieMetadataDebutYear"] == 1996
    assert jinu_collision["pinnedIdLiveDetailLinkedToNeitherEntity"] is False
    assert len(jinu_collision["competingIdentityAliases"]) == 2
    assert len(jinu_collision["sources"]) == 6
    assert {
        e["scope"] for e in jinu_collision["sources"]
    } == {"1996_historical_JINU", "2019_WINNER_JINU"}
    for evidence in jinu_collision["sources"]:
        assert evidence["url"].startswith("https://")
        assert evidence["publisher"] and evidence["supports"]
    jinu_row = next(row for row in rows if row["canonicalArtistId"] == "jinu")
    assert jinu_row["genieProviderArtistId"] == "14946516"
    assert jinu_row["genieDebutYear"] == 1996
    assert jinu_row["canonicalDebutYear"] is None
    assert "jinu" in unresolved and "jinu" not in supported
    assert set(jinu_collision["uncertainty"].values()) == {True}
    assert set(jinu_collision["mutationPermissions"].values()) == {False}
    assert jinu_collision["nextGate"] == "JINU_PINNED_PROVIDER_ID_LIVE_RELEASE_LINKAGE_REQUIRED"

    # Live release proof rejects the old PIN, but cannot auto-apply the alternate.
    jinu_live = queue["jinuLiveIdentityResolutionV5"]
    assert jinu_live["version"] == "music_genie_jinu_live_provider_identity_resolution_v5"
    assert jinu_live["status"] == (
        "pinned_candidate_rejected_as_wrong_artist_alternative_human_review_required"
    )
    assert jinu_live["canonicalArtistId"] == "jinu"
    lineage = jinu_live["verifiedEvidence"]
    assert lineage["runId"] == 37777436998
    assert lineage["jobId"] == 113311724896
    assert lineage["conclusion"] == "success"
    assert lineage["exactHead"] == "e468ec88bddc03015fb0c4fdbafabbec1262715f"
    assert lineage["artifactId"] == 11550277277
    assert lineage["artifactDigest"] == (
        "sha256:e8b072d500e4a07d6eec755b24637573dce00fffa924864598a3b15dc28b078e"
    )
    assert lineage["providerLiveResponseStatuses"] == [200, 200]
    wrong = jinu_live["wrongAliasCandidate"]
    alternate = jinu_live["alternateReviewedCandidateNotApplied"]
    assert wrong["providerArtistId"] == "14946516"
    assert wrong["providerDisplay"] == "JINU"
    assert wrong["firstRecordedProviderDebutYear"] == 1996
    assert wrong["liveDetailDebutYearParsed"] is None
    assert set(wrong["matchedReleaseEvidence"]) == {"Jinujoke", "엉뚱한 상상"}
    assert wrong["linkedToWinner"] is False
    assert wrong["cannotUseAsWinnerProviderIdentity"] is True
    assert wrong["canonicalArtistNotUnsupported"] is True
    assert alternate["providerArtistId"] == "80441171"
    assert alternate["providerDisplay"] == "JINU (김진우)"
    assert alternate["liveDetailStatusCode"] == 200
    assert set(alternate["matchedReleaseEvidence"]) == {"JINU's HEYDAY", "또또또"}
    assert alternate["matchedGroupContext"] == "WINNER"
    assert alternate["providerDebutYearParsed"] is None
    for no_binding in (
        "humanReviewedBindingApproved",
        "providerIdAppliedToTargetSeed",
        "sourceCompatibilityPromoted",
    ):
        assert alternate[no_binding] is False
    assert wrong["providerArtistId"] != alternate["providerArtistId"]
    jinu_row = next(row for row in rows if row["canonicalArtistId"] == "jinu")
    assert jinu_row["genieProviderArtistId"] == wrong["providerArtistId"]
    assert "jinu" in unresolved and "jinu" not in supported and "jinu" not in unsupported
    boundaries = jinu_live["sourceBoundaries"]
    assert boundaries["musicSupportedCount"] == 117
    assert boundaries["musicUnresolvedCount"] == 238
    assert boundaries["musicUnsupportedCount"] == 0
    assert boundaries["alternateCandidateRequiresHumanReviewedBinding"] is True
    assert boundaries["artistRemainsUnresolved"] is True
    assert boundaries["productActivationAuthorized"] is False
    assert boundaries["mainMergeAuthorized"] is False
    assert jinu_live["nextGate"] == (
        "JINU_80441171_HUMAN_REVIEWED_BINDING_AND_DEBUT_SEMANTICS_REQUIRED"
    )

    # Identified provider entity is only a candidate until a human reviews year semantics.
    jinu_packet = load(SOURCE / "music_genie_jinu_80441171_identity_review_packet_v1.json")
    assert jinu_packet["version"] == "music_genie_jinu_80441171_identity_review_packet_v1"
    assert jinu_packet["status"] == (
        "provider_identity_qualified_human_review_and_debut_semantics_required"
    )
    assert jinu_packet["canonicalArtistId"] == "jinu"
    identity = jinu_packet["canonicalIdentity"]
    assert identity["memberOfGroup"] == "WINNER"
    assert identity["entityType"] == "solo"
    assert identity["groupCareerDebutYear"] == 2014
    assert identity["firstOfficialSoloReleaseYear"] == 2019
    assert identity["firstOfficialSoloReleaseDate"] == "2019-08-14"
    assert identity["canonicalDebutYearNotYetAssigned"] is True

    genie = jinu_packet["candidateProvider"]
    assert genie["provider"] == "genie"
    assert genie["providerArtistId"] == "80441171"
    assert genie["providerDisplay"] == "JINU (김진우)"
    assert genie["activityTypeRaw"] == "남성/솔로"
    assert genie["providerDebutFieldRaw"] == "2014년"
    assert genie["providerDebutYear"] == 2014
    assert genie["providerSongId"] == "89300603"
    assert genie["providerSongArtistLinkExact"] is True
    assert genie["providerSongArtistLinkIds"] == ["80441171"]
    assert genie["conflictingArtistIdOnOfficialSoloSong"] is False

    wrong = jinu_packet["rejectedPriorCandidate"]
    assert wrong["providerArtistId"] == "14946516"
    assert wrong["providerDebutYear"] == 1996
    assert wrong["rejectAsCanonicalJinuIdentity"] is True
    assert wrong["doesNotMakeCanonicalArtistUnsupported"] is True
    assert wrong["sourceOriginalCandidateReceiptPreserved"] is True
    assert wrong["providerArtistId"] != genie["providerArtistId"]
    assert jinu_row["genieProviderArtistId"] == wrong["providerArtistId"]

    lineage = jinu_packet["liveEvidence"]
    assert lineage["workflowRunId"] == 37778706306
    assert lineage["jobId"] == 113316044515
    assert lineage["workflowConclusion"] == "success"
    assert lineage["verifiedExactHead"] == "a639cdb9482df87c1a9194ccb044b4b374267d07"
    assert lineage["artifactId"] == 11550358996
    assert lineage["artifactDigest"] == (
        "sha256:0a4ed427cad7b0f4b1bfa4b5e7b64b1d98a24a6fe2fe20a5efbeb8ec69bd9ccd"
    )
    assert len(lineage["validatedChecks"]) == 6
    assert {x["evidenceType"] for x in jinu_packet["sourceEvidence"]} == {
        "provider_detail",
        "provider_song_native_artist_link",
        "label_official_discography",
        "contemporaneous_solo_era_report",
    }
    assert all(e["url"].startswith("https://") for e in jinu_packet["sourceEvidence"])

    gate = jinu_packet["reviewGate"]
    assert gate["identityEvidenceQualified"] is True
    assert gate["providerDebutYearMeansSoloDebut"] is False
    assert gate["groupCareerYearAndSoloReleaseYearMustRemainSeparate"] is True
    assert gate["canonicalYearScopePolicyHumanDecisionRequired"] is True
    assert gate["providerDebutYearMatchingStrictStrong26Contract"] is False
    assert gate["reviewStatus"] == "pending_human_review"
    assert gate["reviewer"] is None and gate["reviewedAt"] is None
    for key in (
        "approvedForSourceApplication",
        "approvedForMusicCompatibilityPromotion",
        "providerBindingApplied",
        "providerMutationAuthorized",
        "productActivationAuthorized",
        "scheduledCollectionAuthorized",
        "mainMergeAuthorized",
    ):
        assert gate[key] is False, key
    partition = jinu_packet["sourcePartitionAsOfCandidate"]
    assert (partition["supported"], partition["unresolved"], partition["unsupported"]) == (117, 238, 0)
    assert partition["jinuUnresolved"] is True
    assert partition["jinuSourceSupported"] is False
    assert "jinu" in unresolved and "jinu" not in supported
    assert not any(binding["providerArtistId"] == genie["providerArtistId"] for binding in strong["bindings"])
    assert jinu_packet["nextGate"] == (
        "JINU_80441171_HUMAN_REVIEW_YEAR_SCOPE_AND_BINDING_AUTHORIZATION_REQUIRED"
    )

    observation = queue["sourceIntegrityObservation"]
    assert observation["full264RawArtifact"] == {"ambiguousExact": 47, "ambiguousWrapper": 72}
    assert observation["full264CommittedReceipt"] == {"ambiguousExact": 46, "ambiguousWrapper": 73}
    assert observation["status"] == "reconciliation_required_do_not_overwrite_original_evidence"
    assert observation["affectsThisExact94PartialQueue"] is False

    safety = queue["safety"]
    for name in (
        "machineCandidateIsReviewedBinding",
        "partialMetadataAutoPromotion",
        "identityFuzzyAutoBinding",
        "ambiguousProviderIdAutoSelection",
        "unresolvedIsMissing",
        "unresolvedIsUnsupported",
        "productCohortExpansionAuthorized",
        "runtimeActivationAuthorized",
        "schedulerActivationAuthorized",
        "databaseMutationAuthorized",
        "deploymentAuthorized",
        "mainMergeAuthorized",
    ):
        assert safety[name] is False, name
    assert safety["canonicalArtistIdAuthoritative"] is True
    assert safety["providerDetailYearRequiredForStrong26EquivalentPromotion"] is True
    assert queue["nextGate"] == "MUSIC_GENIE_PARTIAL39_PROVIDER_AND_CANONICAL_DEBUT_EVIDENCE_REVIEW_REQUIRED"

    print(
        "PASS: Genie partial39 evidence triage | 7 provider-year missing | "
        "25 canonical-year missing | 7 both missing | "
        "39 unresolved | 3 debut-semantic scope holds | 8 external year records | 5 identity-era holds | JINU 80441171 review packet pending | Music 117/238/0 | Product unchanged"
    )


if __name__ == "__main__":
    main()
