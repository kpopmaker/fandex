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

    correction = jinu_live["debutFieldParserCorrectionV6"]
    assert correction["source"] == "music_genie_jinu_80441171_identity_review_packet_v1"
    assert correction["verifiedLiveRunId"] == 37778706306
    assert correction["artifactId"] == 11550358996
    assert correction["previousProviderDebutYearParsedNullWasParserLimitation"] is True
    assert correction["previousObservedWrongCandidate1996"] is True
    assert correction["alternateProviderDebutYearNowParsed"] == 2014
    assert correction["alternateProviderActivityType"] == "남성/솔로"
    assert correction["officialWinnerGroupDebutYear"] == 2014
    assert correction["officialSoloDebutYear"] == 2019
    assert correction["canonicalDebutYearStillNull"] is True
    assert correction["identityReviewCandidatePrepared"] is True
    assert correction["humanBindingApproval"] is False
    assert correction["sourceSupportedPromotion"] is False

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

    # A 6/6 live-qualified identity candidate is still not a human-reviewed binding.
    six_packet = load(SOURCE / "music_genie_partial39_six_year_match_review_packet_v1.json")
    assert six_packet["version"] == "music_genie_partial39_six_year_match_review_packet_v1"
    assert six_packet["status"] == "qualified_six_identity_year_evidence_human_review_pending"
    assert six_packet["canonicalUniverseCount"] == 355
    assert six_packet["provider"] == "genie"
    assert six_packet["source"] == "music_chart"
    verified = six_packet["validation"]
    assert verified["sourceHead"] == "8bffc02a486eb87a7abf1c1d18b2f3b6484f0731"
    assert verified["workflowRunId"] == 37780140385
    assert verified["jobId"] == 113320877994
    assert verified["conclusion"] == "success"
    assert verified["artifactId"] == 11551079972
    assert verified["artifactDigest"] == (
        "sha256:3d2581c018d5712cdc891c2ced4aadf74b590b76396490aaead56f4e27a2be6f"
    )
    assert (verified["validatedCount"], verified["failedCount"]) == (6, 0)
    expected_six = {
        "leehi": ("80158970", 2012),
        "jypark": ("14945855", 1994),
        "sf9": ("80546873", 2016),
        "b1a4": ("80131588", 2011),
        "jeongsewoon": ("80590751", 2017),
        "xlov": ("82757745", 2025),
    }
    six_rows = six_packet["reviewedCandidates"]
    assert len(six_rows) == len(expected_six) == 6
    assert {item["canonicalArtistId"] for item in six_rows} == set(expected_six)
    assert len({item["genieProviderArtistId"] for item in six_rows}) == 6
    for item in six_rows:
        ident = item["canonicalArtistId"]
        pid, year = expected_six[ident]
        source_candidate = next(row for row in rows if row["canonicalArtistId"] == ident)
        assert item["genieProviderArtistId"] == source_candidate["genieProviderArtistId"] == pid
        assert item["genieDebutYear"] == source_candidate["genieDebutYear"] == year
        assert source_candidate["canonicalDebutYear"] is None
        assert item["canonicalYearMissing"] is True
        assert item["sourceUrl"].startswith("https://")
        assert item["sourceGap"] == "canonical_debut_year_unavailable"
        assert item["exactSearchIdentityLiveValidated"] is True
        assert item["providerDetailTypeLiveValidated"] is True
        assert item["providerDetailYearLiveValidated"] is True
        assert item["sourceStatus"] == "unresolved"
        assert item["identityReviewDecision"] == "pending_human_review"
        assert item["reviewer"] is None and item["reviewedAt"] is None
        assert item["sourceBindingApproved"] is False
        assert item["sourceApplicationAuthorized"] is False
        assert item["productRuntimeAuthorized"] is False
        assert ident in unresolved and ident not in supported and ident not in targets
        assert not any(binding["canonicalArtistId"] == ident for binding in strong["bindings"])
    six_decision = six_packet["decision"]
    assert six_decision["reviewStatus"] == "pending_human_review"
    assert six_decision["decisionType"] is None
    assert six_decision["reviewer"] is None and six_decision["decisionAt"] is None
    assert six_decision["approvedCanonicalArtistIds"] == []
    assert six_decision["rejectedCanonicalArtistIds"] == []
    assert set(six_decision["deferredCanonicalArtistIds"]) == set(expected_six)
    for key in (
        "sourceRegistryModified", "sourceTargetModified",
        "licensedDataActivationAuthorized", "productActivationAuthorized",
        "mainMergeAuthorized",
    ):
        assert six_decision[key] is False, key
    projection = six_packet["sourceCompatibilityProjection"]
    assert (projection["currentSupported"], projection["currentUnresolved"], projection["currentUnsupported"]) == (117, 238, 0)
    assert (projection["possibleSupportedAfterApprovedApplication"], projection["possibleUnresolvedAfterApprovedApplication"]) == (123, 232)
    assert projection["isForecastOnly"] is True
    assert six_packet["nextGate"] == (
        "GENIE_SIX_METADATA_PARTIAL_YEAR_SCOPE_HUMAN_REVIEW_AND_SOURCE_APPLICATION_AUTHORIZATION_REQUIRED"
    )

    observation = queue["sourceIntegrityObservation"]
    assert observation["full264RawArtifact"] == {"ambiguousExact": 47, "ambiguousWrapper": 72}
    assert observation["full264CommittedReceipt"] == {"ambiguousExact": 46, "ambiguousWrapper": 73}
    assert observation["status"] == "resolved_as_distinct_discovery_runs_source_receipts_immutable"
    assert observation["originalReceiptArtifactId"] == 11456271955
    assert observation["embeddedExact94ArtifactId"] == 11456228049
    assert observation["reconciliationFile"] == "music_genie_full264_cross_run_reconciliation_v1.json"
    assert observation["dispositionChangedCanonicalArtistIds"] == ["superjunior", "maddox"]
    assert observation["identicalUniqueExact94Ids"] is True
    assert observation["currentSourceActivationAuthorized"] is False
    assert observation["affectsThisExact94PartialQueue"] is False

    cross = load(SOURCE / observation["reconciliationFile"])
    assert cross["version"] == "music_genie_full264_cross_run_source_reconciliation_v1"
    assert cross["status"] == (
        "resolved_distinct_discovery_runs_different_provider_search_results_no_source_promotion"
    )
    assert cross["provider"] == "genie" and cross["source"] == "music_chart"
    assert cross["canonicalUniverseCount"] == 355
    original_run = cross["snapshots"]["originalFull264"]
    embedded_run = cross["snapshots"]["embeddedInExact94"]
    assert original_run["runId"] == 37559756356
    assert original_run["artifactId"] == 11456271955
    assert original_run["artifactDigest"] == (
        "sha256:342d6bfc23ab8d39714058879101a16ca2c1ef7a89bf26407266848119005c0c"
    )
    assert embedded_run["runId"] == 37560176276
    assert embedded_run["artifactId"] == 11456228049
    assert embedded_run["artifactDigest"] == (
        "sha256:df2d9059f99d7ed4461c45ab72c5f15721daf27e0c0f7ba025bcfeae1282ba0f"
    )
    assert original_run["createdAt"] != embedded_run["createdAt"]
    assert original_run["requestCount"] == embedded_run["requestCount"] == 264
    for snapshot in (original_run, embedded_run):
        assert sum(snapshot["dispositionCounts"].values()) == 264
        assert snapshot["dispositionCounts"]["unique_exact_candidate"] == 94
    assert original_run["dispositionCounts"]["ambiguous_exact_candidates"] == 46
    assert embedded_run["dispositionCounts"]["ambiguous_exact_candidates"] == 47
    assert original_run["dispositionCounts"]["ambiguous_wrapper_candidates"] == 73
    assert embedded_run["dispositionCounts"]["ambiguous_wrapper_candidates"] == 72
    comparisons = cross["reconciliation"]
    assert comparisons["sameCanonicalIdUniverse"] is True
    assert comparisons["sameCanonicalIdCount"] == 264
    assert comparisons["allCanonicalRowsIdentical"] is False
    assert comparisons["rowsWithAnyRecordedContentDifference"] == 111
    assert comparisons["rowsWithDispositionDifference"] == 2
    assert comparisons["identicalUniqueExact94CanonicalArtistIds"] is True
    assert comparisons["identicalUniqueExact94Count"] == 94
    changes = comparisons["differingDispositions"]
    assert [row["canonicalArtistId"] for row in changes] == ["superjunior", "maddox"]
    assert changes[0]["originalDisposition"] == "ambiguous_wrapper_candidates"
    assert changes[0]["embeddedDisposition"] == "provider_candidates_without_alias_match"
    assert changes[0]["originalWrapperProviderArtistIds"] == ["21060178", "80150326"]
    assert changes[0]["embeddedWrapperProviderArtistIds"] == []
    assert changes[1]["originalDisposition"] == "provider_candidates_without_alias_match"
    assert changes[1]["embeddedDisposition"] == "ambiguous_exact_candidates"
    assert changes[1]["originalExactProviderArtistIds"] == []
    assert changes[1]["embeddedExactProviderArtistIds"] == ["80431028", "81384545"]
    assert all(not change["identityBindingAuthorized"] for change in changes)
    assert comparisons["netCountDelta"] == {
        "ambiguousExact": 1, "ambiguousWrapper": -1,
        "providerCandidatesWithoutAliasMatch": 0,
    }
    impact = comparisons["reviewImpact"]
    for no_change in (
        "exact94SelectionChanged", "strong26SelectionChanged",
        "partial39SelectionChanged", "superJuniorSourceSupported",
        "maddoxSourceSupported", "ambiguitiesAutoResolved",
        "sourceCompatibilityModified", "activeTargetSeedModified",
        "productActivationAuthorized", "mainMergeAuthorized",
    ):
        assert impact[no_change] is False, no_change
    assert cross["reviewStatus"] == (
        "source_provenance_reconciled_candidate_dispositions_still_unresolved"
    )



    # Provider album/song links resolve prior ambiguous artists, but never approve them.
    two_packet = load(SOURCE / "music_genie_superjunior_maddox_identity_review_packet_v1.json")
    assert two_packet["version"] == "music_genie_superjunior_maddox_identity_review_packet_v1"
    assert two_packet["status"] == (
        "provider_identity_evidence_qualified_human_review_and_scope_required_nonactivating"
    )
    assert two_packet["provider"] == "genie"
    assert two_packet["source"] == "music_chart"
    assert two_packet["sourceCanonicalUniverseCount"] == 355
    verified = two_packet["liveVerification"]
    assert verified["workflowRunId"] == 37783830387
    assert verified["investigationJobId"] == 113333373211
    assert verified["verifiedHead"] == "5cd164c2fe650eced08ee5becd224ffa088edb03"
    assert verified["artifactId"] == 11553078588
    assert verified["artifactDigest"] == (
        "sha256:09eeb8b970b4f6c92ecc1d1a9ae95f2f6c630dc080ad0fd7d203f25660de96ca"
    )
    assert verified["result"] == "success"
    assert verified["sourceProviderHttpOk"] is True
    assert verified["noProducerApprovedBindings"] is True
    assert len(two_packet["identityCandidates"]) == 2
    sj, maddox = two_packet["identityCandidates"]
    assert (sj["canonicalArtistId"], maddox["canonicalArtistId"]) == ("superjunior", "maddox")
    assert sj["canonicalDebutYear"] == 2005
    assert sj["canonicalEntityType"] == "group"
    assert sj["providerQualifiedCandidate"]["providerArtistId"] == "21060178"
    assert sj["providerQualifiedCandidate"]["providerDebutYear"] == 2005
    assert sj["providerQualifiedCandidate"]["providerActivityType"] == "남성/그룹"
    assert sj["providerQualifiedCandidate"]["sourceAliasWrapperReviewRequired"] is True
    assert sj["providerQualifiedCandidate"]["exactNameSearchReturned"] is False
    sj_native = sj["providerQualifiedCandidate"]["nativeSongLinks"]
    assert sj["providerQualifiedCandidate"]["twoIndependentNativeSongArtistLinksAgree"] is True
    assert len(sj_native) == 2
    assert {x["songId"] for x in sj_native} == {"33392229", "75594969"}
    assert all(x["exactProviderArtistId"] == "21060178" for x in sj_native)
    assert all(x["url"].startswith("https://www.genie.co.kr/detail/songInfo?") for x in sj_native)
    assert sj["otherHistoricalCandidate"]["excludedFromFullGroupSongLinks"] is True
    native_cross = verified["nativeGroupReleaseCrosscheck"]
    assert native_cross["workflowRunId"] == 37784929571
    assert native_cross["jobId"] == 113337120064
    assert native_cross["exactHead"] == "46170892c84a31521c576d7e01bfb4d654d1a80b"
    assert native_cross["artifactId"] == 11554181025
    assert native_cross["artifactDigest"] == (
        "sha256:face4ba0759703ee0094812dac670294e96294e5b86981da6305e177e6df0ed8"
    )
    assert native_cross["result"] == "success"
    assert native_cross["validatedGenieSongIds"] == ["33392229", "75594969"]
    assert native_cross["verifiedFullGroupId"] == "21060178"
    assert native_cross["confirmedNotSubunitId"] == "80150326"
    assert native_cross["allNativeArtistLinksHttp200"] is True
    assert native_cross["noBindingApplication"] is True
    assert sj["otherHistoricalCandidate"]["providerArtistId"] == "80150326"
    assert sj["otherHistoricalCandidate"]["shouldNotBindToSuperjuniorGroup"] is True
    assert sj["otherHistoricalCandidate"]["isSeparateSubunitOfCanonicalGroup"] is True
    assert set(sj["otherHistoricalCandidate"]["subunitMembers"]) == {"Donghae", "Eunhyuk"}
    assert sj["otherHistoricalCandidate"]["doesNotMakeSuperjuniorUnsupported"] is True

    assert maddox["independentDebutEvidence"]["officialSoloDebutDate"] == "2019-04-03"
    assert maddox["independentDebutEvidence"]["firstOfficialSoloYear"] == 2019
    assert maddox["independentDebutEvidence"]["url"].startswith("https://")
    md = maddox["providerQualifiedCandidate"]
    assert md["providerArtistId"] == "80624750"
    assert md["display"] == "마독스 (Maddox)"
    assert md["providerDebutYear"] == 2019
    assert md["providerActivityType"] == "남성/솔로"
    assert md["twoIndependentNativeSongArtistLinksAgree"] is True
    assert md["providerDebutYearMatchesReportedYear"] is True
    assert len(md["nativeSongLinks"]) == 2
    assert {x["songId"] for x in md["nativeSongLinks"]} == {"93307770", "90418457"}
    assert all(x["exactProviderArtistId"] == "80624750" for x in md["nativeSongLinks"])
    assert all(x["url"].startswith("https://") for x in md["nativeSongLinks"])
    assert {x["providerArtistId"] for x in maddox["otherHistoricalCandidates"]} == {
        "80431028", "81384545"
    }
    assert all(x["noKqSongBacklink"] for x in maddox["otherHistoricalCandidates"])
    assert all(not x.get("sourceBindingApproved", False) for x in (sj, maddox))
    assert sj["sourceStatus"] == maddox["sourceStatus"] == "unresolved"
    assert {"superjunior", "maddox"}.issubset(unresolved)
    assert {"superjunior", "maddox"}.isdisjoint(set(supported) | set(unsupported) | set(targets))
    assert not {"superjunior", "maddox"}.intersection(
        row["canonicalArtistId"] for row in strong["bindings"]
    )
    two_safety = two_packet["sourceSafety"]
    assert set(two_safety.values()) == {True}
    assert two_packet["sourcePartition"] == {"supported": 117, "unresolved": 238, "unsupported": 0}
    assert two_packet["nextGate"] == (
        "GENIE_SUPERJUNIOR_MADDOX_INDIVIDUAL_BINDING_AND_ALIAS_SCOPE_HUMAN_REVIEW_REQUIRED"
    )

    # A blank native Genie '년' field and matching romanized display are not a binding.
    missing14 = load(SOURCE / "music_genie_partial39_missing14_year_and_alias_conflict_review_packet_v1.json")
    assert missing14["version"] == (
        "music_genie_partial39_missing14_year_and_alias_conflict_review_packet_v1"
    )
    assert missing14["status"] == (
        "live_provider_blanks_and_four_independent_alternate_profiles_qualified_nonactivating"
    )
    assert missing14["source"] == "music_chart" and missing14["provider"] == "genie"
    assert missing14["canonicalUniverseCount"] == 355
    assert missing14["sourceGapCohorts"] == {
        "originalGenieYearOnlyMissing": 7,
        "originalBothYearsMissing": 7,
        "total14": 14,
    }
    origin = missing14["sourceLineage"]
    assert origin["originalGenieExact94RunId"] == 37560176276
    assert origin["readOnlyLiveRunId"] == 37787288229
    assert origin["liveJobId"] == 113345190993
    assert origin["liveExactHead"] == "4113b23b00bb33dfea329019e089050d2272ff6a"
    assert origin["artifactId"] == 11553979146
    assert origin["artifactDigest"] == (
        "sha256:d64b90f5542ceeb4962b9988618b383f5d1974ff10b76d46ecd58308fbd79d45"
    )
    records14 = missing14["historicalSelectedProviderRecords"]
    expected_ids14 = {
        "nexz", "boystory", "afterschool", "pow", "tiot", "mirae", "x1",
        "brothersu", "mino", "girlset", "ejel", "up10tion", "kard", "chen",
    }
    assert len(records14) == len(expected_ids14) == 14
    assert {row["canonicalArtistId"] for row in records14} == expected_ids14
    assert len({row["historicallySelectedProviderArtistId"] for row in records14}) == 14
    assert sum(row["canonicalDebutYear"] is not None for row in records14) == 7
    for row in records14:
        cid = row["canonicalArtistId"]
        originally_selected = next(x for x in rows if x["canonicalArtistId"] == cid)
        assert row["historicallySelectedProviderArtistId"] == originally_selected["genieProviderArtistId"]
        assert row["originalYearGap"] == originally_selected["evidenceGap"]
        assert row["canonicalDebutYear"] == originally_selected["canonicalDebutYear"]
        assert row["originalGenieDebutYear"] is None
        assert originally_selected["genieDebutYear"] is None
        assert row["currentGenieYearFieldRaw"] == "년"
        assert row["currentProviderDebutYear"] is None
        assert row["currentDetailFetchedHttp200"] is True
        assert row["currentProviderActivityTypeRaw"]
        assert row["providerAliasWasOriginalExact94Candidate"] is True
        assert row["identicalNamedEntitiesNotSufficientForBinding"] is True
        assert row["currentSourceState"] == "unresolved"
        for flag in ("automaticBindingApproved", "canonicalYearBackfillApproved", "sourceSupportedPromotionApproved"):
            assert row[flag] is False
        assert cid in unresolved and cid not in supported and cid not in unsupported
    expected_alternates = {
        "nexz": ("81122242", "82295319", "남성/그룹", 2023, 2024),
        "afterschool": ("82301148", "73393086", "여성/그룹", 2009, 2009),
        "pow": ("14942969", "82162931", "남성/그룹", 2023, 2023),
        "ejel": ("81567146", "81021446", "여성/솔로", 2021, None),
    }
    alternatives = missing14["alternativeIdentityReviewCandidates"]
    assert len(alternatives) == len(expected_alternates) == 4
    assert {x["canonicalArtistId"] for x in alternatives} == set(expected_alternates)
    assert len({x["qualifiedAlternateProviderArtistId"] for x in alternatives}) == 4
    for alt in alternatives:
        cid = alt["canonicalArtistId"]
        old_id, alternate_id, activity, year, canonical_year = expected_alternates[cid]
        assert alt["originalSelectedProviderArtistId"] == old_id
        assert alt["qualifiedAlternateProviderArtistId"] == alternate_id
        assert old_id != alternate_id
        assert alt["alternateActivityType"] == activity
        assert alt["alternateProviderDebutYear"] == year
        assert alt["canonicalDebutYear"] == canonical_year
        assert alt["providerDetailUrl"] == (
            "https://www.genie.co.kr/detail/artistInfo?xxnm=" + alternate_id
        )
        assert alt["liveDetailHttp200"] is True
        assert alt["liveAliasAndTypeAndYearMatched"] is True
        assert alt["reviewStatus"] == "identity_and_debut_scope_human_review_pending"
        assert alt["alternateProviderIdBindingApproved"] is False
        assert alt["sourceYearBackfillApproved"] is False
        assert alt["sourceSupportedPromotionApproved"] is False
        assert cid in unresolved and cid not in targets
    assert missing14["dispositionSummary"]["newProviderYearRecoveredOnHistoricallySelectedId"] == 0
    assert missing14["dispositionSummary"]["independentAlternateProfilesMetadataMatched"] == 4
    assert missing14["dispositionSummary"]["oldCandidateProviderIdsReplacedInAnyActiveSeed"] == 0
    assert missing14["dispositionSummary"]["chenSelectedCandidateRawActivityType"] == "여성/솔로"
    assert missing14["dispositionSummary"]["ejelSelectedCandidateRawActivityType"] == "남성/솔로"
    assert missing14["dispositionSummary"]["nexzAlternateGenieYear"] == 2023
    assert missing14["dispositionSummary"]["nexzCanonicalFormalDebutYear"] == 2024
    assert missing14["dispositionSummary"]["providerDebutYearCannotBeAssumedFormalReleaseDebut"] is True
    assert set(missing14["safety"].values()) == {True}
    assert missing14["currentMusicSourcePartition"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0,
    }
    assert missing14["nextGate"] == (
        "MISSING14_PROVIDER_IDENTITY_GENDER_SCOPE_ALTERNATE_DETAIL_HUMAN_REVIEW_REQUIRED"
    )

    # A native Genie song/album link and correct detail type are evidence, not approval.
    native7 = load(SOURCE / "music_genie_missing14_native_release_identity_review_packet_v1.json")
    assert native7["version"] == "music_genie_missing14_native_release_identity_review_packet_v1"
    assert native7["status"] == "seven_release_linked_provider_identities_qualified_review_pending"
    assert native7["provider"] == "genie" and native7["source"] == "music_chart"
    assert native7["artistUniverseCount"] == 355
    lineage = native7["immutableEvidence"]
    assert lineage["initialExact94RunId"] == 37560176276
    assert lineage["nativeLinkRunId"] == 37788670010
    assert lineage["nativeLinkJobId"] == 113349925471
    assert lineage["verifiedHead"] == "28877d8e47f5de5e5fd80ebaaea2a68dc51e41ba"
    assert lineage["artifactId"] == 11555756085
    assert lineage["artifactDigest"] == (
        "sha256:51216846ed023f7c4455ac8b4710bb32bd3f4e31f80eaf636e5f810f3d8747cc"
    )
    assert lineage["nativeSongOrAlbumHttp200Count"] == 7
    assert lineage["directArtistDetailHttp200Count"] == 7
    assert lineage["providerArtistNativeLinkQualifiedCount"] == 7
    assert lineage["providerIdentityTypeQualifiedCount"] == 7
    expected_native = {
        "nexz": ("81122242", "82295319", "남성/그룹", 2023, 2024, "87546464"),
        "afterschool": ("82301148", "73393086", "여성/그룹", 2009, 2009, "76758548"),
        "pow": ("14942969", "82162931", "남성/그룹", 2023, 2023, "103478669"),
        "ejel": ("81567146", "81021446", "여성/솔로", 2021, None, "108199234"),
        "chen": ("81098158", "80282512", "남성/솔로", 2014, None, "88728543"),
        "mirae": ("81608365", "81037720", "남성/그룹", 2021, 2021, "92651112"),
        "tiot": ("81972382", "82120880", "남성/그룹", 2023, 2024, "85026862"),
    }
    native_rows = native7["qualifiedRecords"]
    assert len(native_rows) == len(expected_native) == 7
    assert {r["canonicalArtistId"] for r in native_rows} == set(expected_native)
    assert len({r["independentlyQualifiedNativeProviderArtistId"] for r in native_rows}) == 7
    for row in native_rows:
        cid = row["canonicalArtistId"]
        old, new, typ, year, cyear, rid = expected_native[cid]
        historical = next(x for x in rows if x["canonicalArtistId"] == cid)
        assert row["oldCandidateProviderArtistId"] == historical["genieProviderArtistId"] == old
        assert historical["genieDebutYear"] is None
        assert historical["canonicalDebutYear"] == cyear
        assert row["independentlyQualifiedNativeProviderArtistId"] == new
        assert old != new
        assert row["activityType"] == typ
        assert row["genieProfileDebutYear"] == year
        assert row["canonicalDebutYear"] == cyear
        assert row["nativeRelease"]["nativeLinkedArtistId"] == new
        assert row["nativeRelease"]["releaseId"] == rid
        assert row["nativeRelease"]["url"].startswith("https://www.genie.co.kr/detail/")
        assert row["directArtistProfileUrl"].endswith("xxnm=" + new)
        for yes in (
            "liveReleaseHttp200", "liveProfileHttp200", "exactNativeLinkValidated",
            "profileNameAndEntityTypeValidated",
        ):
            assert row[yes] is True, (cid, yes)
        assert row["sourceStatus"] == "unresolved"
        assert row["humanReviewDecision"] == "pending"
        for no in ("providerBindingApplied", "canonicalDebutYearFilled", "sourceSupportedPromoted"):
            assert row[no] is False, (cid, no)
        assert cid in unresolved and cid not in supported and cid not in unsupported and cid not in targets
        assert all(x["canonicalArtistId"] != cid for x in strong["bindings"])
    assert {x["canonicalArtistId"] for x in native7["yearSemanticExceptions"]} == {
        "nexz", "chen", "tiot"
    }
    assert all(x["automaticYearEquivalence"] is False for x in native7["yearSemanticExceptions"])
    guard7 = native7["reviewControls"]
    assert guard7["reviewer"] is None and guard7["reviewedAt"] is None
    assert guard7["reviewDecision"] is None and guard7["approvedBindings"] == []
    assert set(guard7["deferredCanonicalArtistIds"]) == set(expected_native)
    for yes in (
        "nativeIdentityEvidenceIsNotHumanReviewedBinding", "missingYearDoesNotMeanUnsupported",
        "sourcePartitionUnchanged", "genieYearCannotOverrideCanonicalFormalDebutYear",
        "noFuzzyAliasAutoBinding", "noOldProviderIdAutomaticOverwrite",
    ):
        assert guard7[yes] is True, yes
    for no in (
        "productActivationAuthorized", "databaseMutationAuthorized",
        "schedulerActivationAuthorized", "mainMergeAuthorized",
    ):
        assert guard7[no] is False, no
    assert native7["partition"] == {"supported": 117, "unresolved": 238, "unsupported": 0}
    assert native7["nextGate"] == (
        "MISSING14_SEVEN_NATIVE_PROVIDER_IDENTITY_HUMAN_YEAR_SCOPE_AND_BINDING_REVIEW_REQUIRED"
    )

    # Remaining seven candidates are qualified or alias-only, never approved bindings.
    remaining7 = load(SOURCE / "music_genie_missing14_remaining7_identity_review_packet_v1.json")
    assert remaining7["version"] == "music_genie_missing14_remaining7_identity_review_packet_v1"
    assert remaining7["status"] == (
        "five_native_release_identity_candidates_and_two_alias_only_candidates_human_review_required"
    )
    assert remaining7["provider"] == "genie" and remaining7["source"] == "music_chart"
    assert remaining7["canonicalUniverseCount"] == 355
    lineage7 = remaining7["sourceLineage"]
    assert lineage7["originalExact94RunId"] == 37560176276
    assert lineage7["liveRunId"] == 37790480424
    assert lineage7["jobId"] == 113356228259
    assert lineage7["verifiedExactHead"] == "87f71d068f13e7a019915374146d856b4d532e21"
    assert lineage7["artifactId"] == 11556272318
    assert lineage7["artifactDigest"] == (
        "sha256:1b146eae1237df2fab8e8319d24fdcfb6625c3afff4f42cb098527c34b0ac114"
    )
    assert lineage7["liveJobResult"] == "success"
    assert (lineage7["nativeReleaseLinkedCount"], lineage7["exactAliasSearchOnlyCount"], lineage7["checkedCount"]) == (5, 2, 7)
    expected7 = {
        "brothersu": ("79983812", "80010932", "남성/솔로", 2010, None, "80643017"),
        "mino": ("80073343", "80438375", "남성/솔로", 2014, None, "88391129"),
        "kard": ("81305280", "80556366", "혼성/그룹", 2016, None, "87304018"),
        "up10tion": ("81290806", "80445602", "남성/그룹", 2015, None, "80749357"),
        "x1": ("81522270", "80743451", "남성/그룹", 2019, 2019, "89330963"),
        "boystory": ("80899341", "80899341", "남성/그룹", None, 2018, None),
        "girlset": ("83019445", "83019445", "여성/그룹", None, None, None),
    }
    remaining_rows = remaining7["identityRecords"]
    assert len(remaining_rows) == 7
    assert {x["canonicalArtistId"] for x in remaining_rows} == set(expected7)
    assert len({x["providerArtistIdCandidate"] for x in remaining_rows}) == 7
    assert sum(x["nativeRelease"] is not None for x in remaining_rows) == 5
    for r in remaining_rows:
        cid = r["canonicalArtistId"]
        old, new, typ, year, canonical_year, release_id = expected7[cid]
        source_candidate = next(x for x in rows if x["canonicalArtistId"] == cid)
        assert source_candidate["genieProviderArtistId"] == r["originalProviderArtistId"] == old
        assert source_candidate["genieDebutYear"] is None
        assert source_candidate["canonicalDebutYear"] == r["canonicalDebutYear"] == canonical_year
        assert r["providerArtistIdCandidate"] == new
        assert r["profileActivityType"] == typ
        assert r["providerDebutYear"] == year
        assert r["profileUrl"].endswith("xxnm=" + new)
        assert r["profileMatchValidated"] and r["providerDetailHttp200"]
        assert r["reviewStatus"] == "identity_and_year_scope_human_review_pending"
        assert r["sourceCompatibilityStatus"] == "unresolved"
        for no in ("reviewedBindingApproved", "sourceTargetRebound", "canonicalYearBackfilled", "sourceSupportedPromoted"):
            assert r[no] is False, (cid, no)
        if release_id is None:
            assert r["nativeRelease"] is None
            assert r["evidenceMethod"] == "provider_exact_alias_search_only"
            assert old == new
        else:
            assert r["evidenceMethod"] == "genie_native_release_link"
            assert r["nativeRelease"]["id"] == release_id
            assert r["nativeRelease"]["artistLinkedProviderId"] == new
            assert r["nativeRelease"]["url"].startswith("https://www.genie.co.kr/detail/")
            assert old != new
        assert cid in unresolved and cid not in supported and cid not in unsupported and cid not in targets
        assert all(x["canonicalArtistId"] != cid for x in strong["bindings"])
    semantic7 = remaining7["semanticReviewHolds"]
    assert semantic7["mino"] == {
        "providerYear": 2014, "groupCareerYear": 2014,
        "firstSoloAlbumYear": 2018, "autoYearEquivalence": False,
    }
    assert semantic7["kard"] == {
        "providerYear": 2016, "predebutActivityYear": 2016,
        "formalDebutYear": 2017, "autoYearEquivalence": False,
    }
    assert semantic7["boystory"]["providerDebutYear"] is None
    assert semantic7["boystory"]["requiresIndependentYearEvidence"] is True
    assert semantic7["girlset"]["providerDebutYear"] is None
    assert semantic7["girlset"]["groupRenameAndDebutAreDistinct"] is True
    guards7 = remaining7["guards"]
    assert guards7["reviewer"] is None
    assert guards7["reviewedAt"] is None
    assert guards7["approvalEvidence"] is None
    assert guards7["approvedIds"] == []
    assert set(guards7["deferredIds"]) == set(expected7)
    for yes in ("unresolvedIsNotUnsupported", "noAliasOnlyAutoBinding", "noNativeReleaseAutoBinding"):
        assert guards7[yes] is True
    for no in ("sourceTargetSeedUpdated", "sourceCompatibilityUpdated", "productCohortChanged",
               "dbModified", "schedulerChanged", "deploymentTriggered", "mainMergeApproved"):
        assert guards7[no] is False
    assert remaining7["sourcePartitionActual"] == {"supported": 117, "unresolved": 238, "unsupported": 0}
    assert remaining7["nextGate"] == "MISSING14_REMAINING7_PROVIDER_ID_AND_DEBUT_ERA_HUMAN_REVIEW_REQUIRED"

    # Last historical year-missing pair: BOY STORY native album; GIRLSET still alias-only.
    last2 = load(SOURCE / "music_genie_missing14_last2_native_release_review_packet_v1.json")
    assert last2["version"] == "music_genie_missing14_last2_native_release_review_packet_v1"
    assert last2["status"] == (
        "boystory_native_genie_album_link_qualified_girlset_provider_alias_only_pending"
    )
    assert last2["provider"] == "genie" and last2["source"] == "music_chart"
    assert last2["canonicalUniverseCount"] == 355
    receipt2 = last2["validation"]
    assert receipt2["historicalFull264AndExact94Immutable"] is True
    assert receipt2["firstLiveProbeHead"] == "c550fd7f02909c62933cf228b4708339aeb29548"
    assert receipt2["runId"] == 37861067555
    assert receipt2["jobId"] == 113596627420
    assert receipt2["result"] == "success"
    assert receipt2["artifactId"] == 11586232985
    assert receipt2["artifactDigest"] == (
        "sha256:3a3b1d65f80b7e6d4f0cc603a034f8be74b849c9e86c49efaf505a94787db14c"
    )
    assert receipt2["providerArtistDetailHttp200Count"] == 2
    assert receipt2["nativeAlbumExactIdConfirmedCount"] == 1
    assert receipt2["nativeGIRLSETSongLinkConfirmedCount"] == 0
    assert receipt2["notExaminedAllPossibleGIRLSETGenieReleases"] is True
    assert receipt2["jypOfficialContextRecordedNotFetchedByCollector"] is True
    a, b = last2["records"]
    assert (a["canonicalArtistId"], b["canonicalArtistId"]) == ("boystory", "girlset")
    assert (a["originalProviderArtistId"], b["originalProviderArtistId"]) == (
        "80899341", "83019445"
    )
    assert a["nativeQualifiedProviderArtistId"] == a["originalProviderArtistId"]
    assert a["providerDisplay"] == "BOY STORY"
    assert a["providerActivityType"] == "남성/그룹"
    assert a["canonicalDebutYear"] == 2018 and a["currentProviderDebutYear"] is None
    assert a["releaseEvidence"]["kind"] == "genie_native_album_artist_link"
    assert a["releaseEvidence"]["albumId"] == "85406781"
    assert a["releaseEvidence"]["url"] == (
        "https://www.genie.co.kr/detail/albumInfo?axnm=85406781"
    )
    assert a["releaseEvidence"]["singleExactLinkedProviderArtistId"] == "80899341"
    assert a["releaseEvidence"]["releaseDate"] == "2024-07-12"
    assert a["releaseEvidence"]["providerHttp200"] is True
    assert a["releaseEvidence"]["independentNativeAlbumToArtistMatch"] is True
    assert a["reviewStatus"] == "native_identity_qualified_year_evidence_missing_human_review_pending"
    assert b["providerQualifiedProfileArtistId"] == "83019445"
    assert b["providerDisplay"] == "GIRLSET" and b["providerActivityType"] == "여성/그룹"
    assert b["canonicalDebutYear"] is None and b["currentProviderDebutYear"] is None
    assert b["genieSearchEvidence"]["searchedQueries"] == [
        "GIRLSET Commas", "GIRLSET Little Miss", "GIRLSET",
    ]
    assert b["genieSearchEvidence"]["profilePageFetchedHttp200"] is True
    assert b["genieSearchEvidence"]["genieNativeSongOrAlbumArtistIdConfirmed"] is False
    assert b["genieSearchEvidence"]["confirmedNativeSongIds"] == []
    assert b["genieSearchEvidence"]["nonDiscoveryCannotProveGenieAbsence"] is True
    assert b["officialDiscographyContext"]["url"] == "https://girlset.jype.com/discography"
    assert b["officialDiscographyContext"]["commsReleaseDate"] == "2025-08-29"
    assert b["officialDiscographyContext"]["littleMissReleaseDate"] == "2025-11-14"
    assert b["officialDiscographyContext"]["jypReferenceSeparateFromGenieNativeEvidence"] is True
    assert b["reviewStatus"] == (
        "alias_only_unresolved_native_release_identity_and_epoch_review_pending"
    )
    for row in (a, b):
        assert row["reviewer"] is None
        assert row["sourceStatus"] == "unresolved"
        assert row["approvedReviewedBinding"] is False
        assert row["sourceSupportedPromoted"] is False
        cid = row["canonicalArtistId"]
        assert cid in unresolved and cid not in supported and cid not in targets
        assert all(r["canonicalArtistId"] != cid for r in strong["bindings"])
    assert a["canonicalDebutYearBackfillApplied"] is False
    summary2 = last2["missing14ResearchSummary"]
    assert summary2["originalHistoricalProviderYearMissing"] == 14
    assert summary2["independentlyGenieNativeReleaseLinkQualified"] == 13
    assert summary2["aliasOnlyRemaining"] == 1
    assert summary2["approvedBindingCount"] == 0
    assert summary2["isReviewCandidateCountNotSupportedCount"] is True
    assert summary2["sourcePartitionStill"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0,
    }
    assert sum(x["nativeRelease"] is not None for x in native7["qualifiedRecords"]) == 7
    assert sum(x["nativeRelease"] is not None for x in remaining7["identityRecords"]) == 5
    assert 7 + 5 + int(a["releaseEvidence"]["independentNativeAlbumToArtistMatch"]) == 13
    assert set(last2["safety"].values()) == {False}
    assert last2["nextGate"] == (
        "GENIE_BOYSTORY_YEAR_SCOPE_AND_GIRLSET_NATIVE_RELEASE_ID_HUMAN_REVIEW_REQUIRED"
    )

    # JYP alias-search homonyms can appear/disappear between live Genie snapshots;
    # independent native song backlinks do not authorize a reviewed binding.
    jyp_drift = load(SOURCE / "music_genie_jypark_alias_volatility_review_packet_v1.json")
    assert jyp_drift["version"] == "music_genie_jypark_search_alias_temporal_volatility_review_packet_v1"
    assert jyp_drift["status"] == (
        "live_alias_search_non_determinism_documented_native_link_identity_supported_no_binding"
    )
    assert jyp_drift["canonicalArtistId"] == "jypark"
    assert jyp_drift["originalProviderId"] == "14945855"
    assert jyp_drift["originalGenieDebutYear"] == 1994
    assert jyp_drift["independentCorroboratedDebutYear"] == 1994
    assert jyp_drift["originalCanonicalDebutYear"] is None
    first, repeat = jyp_drift["crossRunEvidence"]
    assert (first["runId"], repeat["runId"]) == (37861245410, 37861446921)
    assert first["sourceHead"] == "54c4f744698cba92e142a07d3a2a9f831b1c86b9"
    assert repeat["sourceHead"] == "7c7906287e5a301a0d79311ca899e463be6dcc35"
    assert (first["artifactId"], repeat["artifactId"]) == (11586292051, 11586149025)
    assert first["artifactDigest"] == (
        "sha256:b37a7473d3a5eae4a2789926037fbb6316f8ca8526a8393391be004be0a9f2a7"
    )
    assert repeat["artifactDigest"] == (
        "sha256:01da577174113b5a49ccfe9aed7e3ca68865384f1e97294f6688568b81407712"
    )
    assert first["result"] == "strict_alias_check_failed"
    assert first["failedIdentityCondition"] == "search_alias_identity_not_uniquely_pinned"
    assert first["observedExactAliasProviderIds"] == [
        "14945855", "80776748", "83183005",
    ]
    assert repeat["result"] == "strict_alias_check_passed"
    assert repeat["failedIdentityCondition"] is None
    assert repeat["observedExactAliasProviderIds"] == ["14945855"]
    assert (first["matchedStrictAliasCountInSix"], repeat["matchedStrictAliasCountInSix"]) == (5, 6)
    assert first["yearConflict"] is repeat["yearConflict"] is False
    assert first["automaticBindingAuthorized"] is repeat["automaticBindingAuthorized"] is False
    assert repeat["nativeSongsConvergeOnOriginalProviderId"] is True
    assert {x["songId"] for x in repeat["nativeSongArtistLinks"]} == {
        "83806325", "116052509",
    }
    assert all(x["nativeArtistId"] == "14945855" for x in repeat["nativeSongArtistLinks"])
    assert all(x["directProviderLinkHttp200"] for x in repeat["nativeSongArtistLinks"])
    drift = jyp_drift["searchTemporalVolatility"]
    assert (drift["firstExactNameSearchCandidateCount"], drift["secondExactNameSearchCandidateCount"]) == (3, 1)
    assert all(v is True for k, v in drift.items() if k not in (
        "firstExactNameSearchCandidateCount", "secondExactNameSearchCandidateCount"
    ))
    safety_jyp = jyp_drift["safety"]
    assert safety_jyp["pendingHumanReview"] is True
    assert safety_jyp["readOnlyResearchEvidenceOnly"] is True
    assert safety_jyp["existingSixReviewedBindingApplications"] == 0
    for k in (
        "musicSupportedChangeApproved", "originalCandidateProviderIdChanged",
        "canonicalYearBackfilled", "sourceCompatibilityUpdated", "productActivated",
        "schedulerOrDatabaseChanged", "mainMergeAuthorized", "productionDeploymentAuthorized",
    ):
        assert safety_jyp[k] is False, k
    assert jyp_drift["sourcePartitionActual"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0,
    }
    assert "jypark" in unresolved and "jypark" not in targets
    assert not any(x["canonicalArtistId"] == "jypark" for x in strong["bindings"])
    assert jyp_drift["nextGate"] == (
        "JYP_GENIE_ALIAS_VOLATILITY_INDEPENDENT_NATIVE_LINK_HUMAN_REVIEW_REQUIRED"
    )

    # Last missing14 candidate now has official Genie song-detail backlinks.
    # Historical alias-only receipt remains immutable as a separate older observation.
    native_girlset = load(
        SOURCE / "music_genie_girlset_native_song_attribution_review_packet_v1.json"
    )
    assert native_girlset["version"] == "music_genie_girlset_native_song_attribution_review_packet_v1"
    assert native_girlset["status"] == (
        "four_named_lead_songs_native_genie_attribution_qualified_human_year_epoch_review_pending"
    )
    assert native_girlset["canonicalArtistId"] == "girlset"
    assert native_girlset["provider"] == "genie"
    assert native_girlset["source"] == "music_chart"
    assert native_girlset["canonicalUniverseCount"] == 355
    assert native_girlset["historicalProviderArtistId"] == "83019445"
    assert native_girlset["currentNativeLinkedProviderArtistId"] == "83019445"
    assert native_girlset["originalCanonicalDebutYear"] is None
    assert native_girlset["originalGenieProfileDebutYear"] is None
    assert native_girlset["originalAliasOnlyReceipt"] == (
        "music_genie_missing14_last2_native_release_review_packet_v1.json"
    )
    live_girlset = native_girlset["providerPageInvestigation"]
    assert live_girlset["initialNoIdRunId"] == 37865597546
    assert live_girlset["initialNoIdArtifactId"] == 11587819564
    assert live_girlset["rowAttributeParsingRunId"] == 37865737240
    assert live_girlset["rowAttributeArtifactId"] == 11588296285
    assert live_girlset["expandedVerificationRunId"] == 37865842068
    assert live_girlset["expandedVerificationHead"] == (
        "3310a11e47111b3f341c1dae8a7c61476fe1eb76"
    )
    assert live_girlset["expandedVerificationJobId"] == 113612245328
    assert live_girlset["expandedVerificationArtifactId"] == 11587648959
    assert live_girlset["expandedVerificationArtifactDigest"] == (
        "sha256:8777c6164dd17d4697557fdbc8fd9728207ff22386af87ced5259d2bdea81ed9"
    )
    assert live_girlset["artistProfileHttpStatus"] == 200
    assert live_girlset["artistSongListHttpStatus"] == 200
    assert live_girlset["artistAlbumListHttpStatus"] == 200
    assert live_girlset["requestedDiscoveryPageCount"] == 10
    assert live_girlset["requestedSearchQueryCount"] == 7
    assert live_girlset["uniqueNativeCandidateCount"] == 38
    assert live_girlset["directNativeDetailVerificationCount"] == 30
    assert live_girlset["exactArtistNativeLinkedSongCount"] == 29
    assert live_girlset["contradictingNativeArtistIdCount"] == 0
    assert live_girlset["songRowsRequireSongidTableAttributeParsing"] is True
    assert live_girlset["initialNoIdResultWasCollectorBlindSpotNotEvidenceOfCatalogAbsence"] is True
    assert live_girlset["verifiedSongCountDoesNotRepresentUniquePrimaryReleases"] is True

    expected_girlset_songs = {
        "Commas": ("111546614", "2025-08-29"),
        "Little Miss": ("112640558", "2025-11-14"),
        "Tweak": ("114158735", "2026-03-06"),
        "CHAT": ("115957845", "2026-07-17"),
    }
    main_songs = native_girlset["primaryNativeSongs"]
    assert len(main_songs) == 4
    assert {x["title"] for x in main_songs} == set(expected_girlset_songs)
    assert len({x["songId"] for x in main_songs}) == 4
    for track in main_songs:
        sid, date = expected_girlset_songs[track["title"]]
        assert track["songId"] == sid
        assert track["reportedReleaseDate"] == date
        assert track["genieSongUrl"] == (
            "https://www.genie.co.kr/detail/songInfo?xgnm=" + sid
        )
        assert track["nativeLinkedArtistId"] == "83019445"
        assert track["providerDetailFetchedHttp200"] is True
        assert track["titlePresentOnNativeDetail"] is True
        assert track["nativeArtistLinkExclusiveForExactDisplay"] is True
        assert track["sourceReviewApproved"] is False

    original_girlset = next(x for x in rows if x["canonicalArtistId"] == "girlset")
    assert original_girlset["genieProviderArtistId"] == "83019445"
    assert original_girlset["canonicalDebutYear"] is None
    assert original_girlset["genieDebutYear"] is None
    assert "girlset" in unresolved
    assert "girlset" not in supported and "girlset" not in unsupported
    assert "girlset" not in targets
    assert all(x["canonicalArtistId"] != "girlset" for x in strong["bindings"])

    epoch = native_girlset["canonicalEpochReview"]
    assert epoch["vchaGroupHistoryYear"] == 2024
    assert epoch["girlsetRebrandYear"] == 2025
    assert epoch["genieProfileDebutYear"] is None
    assert epoch["canonicalDebutYear"] is None
    for key in (
        "groupIdentityContinuityVersusNewRebrandScopeUnresolved",
        "providerReleaseDatesAreNotCanonicalDebutYear",
        "doNotBackfillMissingYearFromEarliestSong",
    ):
        assert epoch[key] is True, key

    research14 = native_girlset["reconciledMissing14ResearchCohort"]
    assert research14["originalHistoricalGenieProviderDebutYearMissingCount"] == 14
    assert research14["priorNativeReleaseLinkedCount"] == 13
    assert research14["thisAdditionalNativeReleaseLinkedCanonicalArtistIds"] == ["girlset"]
    assert research14["nowNativeReleaseLinkedCandidateCount"] == 14
    assert research14["nowAliasOnlyCandidateCount"] == 0
    assert research14["currentApprovedReviewedBindingCount"] == 0
    assert research14["supportedIncreaseByThisResearch"] == 0
    assert research14["thisIsResearchEvidenceOnly"] is True
    assert last2["missing14ResearchSummary"]["aliasOnlyRemaining"] == 1
    assert last2["missing14ResearchSummary"]["independentlyGenieNativeReleaseLinkQualified"] == 13
    guards_girlset = native_girlset["reviewAndSafety"]
    assert guards_girlset["reviewer"] is None
    assert guards_girlset["reviewedAt"] is None
    assert guards_girlset["reviewDecision"] is None
    for key in (
        "providerIdentityBindingApproved", "canonicalDebutYearBackfilled",
        "sourceCompatibilityModified", "originalExact94EvidenceOverwritten",
        "productCohortExpanded", "databaseChanged", "schedulerChanged",
        "deploymentAuthorized", "mainMergeAuthorized",
    ):
        assert guards_girlset[key] is False, key
    assert guards_girlset["genieSongAttributionNotProviderLicense"] is True
    assert native_girlset["actualCandidatePartition"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0,
    }
    assert native_girlset["nextGate"] == (
        "GIRLSET_NATIVE_IDENTITY_CONFIRMED_YEAR_EPOCH_AND_PROVIDER_BINDING_HUMAN_REVIEW_REQUIRED"
    )

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
        "39 unresolved | 3 debut-semantic scope holds | 8 external year records | 5 identity-era holds | JINU review pending | six year-matched review pending | full264 source runs reconciled | 2 ambiguous artist identities qualified + SJ 2-song link | missing14 rechecked; 7 native-linked + 5 remaining native + BOY STORY album/1 GIRLSET alias-only held | JYP live alias volatility pinned | GIRLSET 4 lead-song native links + missing14 14/14 under review | Music 117/238/0 | Product unchanged"
    )


if __name__ == "__main__":
    main()
