from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "data/fandex-cloud-v10/seed"


def load(filename: str) -> dict:
    return json.loads((SEED / filename).read_text(encoding="utf-8-sig"))


def main() -> None:
    source = load("music_genie_partial39_evidence_triage_v1.json")
    decision = load("music_genie_partial39_decision_readiness_review_packet_v1.json")
    native7 = load("music_genie_missing14_native_release_identity_review_packet_v1.json")
    other7 = load("music_genie_missing14_remaining7_identity_review_packet_v1.json")
    last2 = load("music_genie_missing14_last2_native_release_review_packet_v1.json")
    girlset = load("music_genie_girlset_native_song_attribution_review_packet_v1.json")
    jinu = load("music_genie_jinu_80441171_identity_review_packet_v1.json")
    six = load("music_genie_partial39_six_year_match_review_packet_v1.json")
    compat = load("artist_source_compatibility_v1.json")
    target = load("music_chart_artist_targets_v1.json")

    assert decision["version"] == "music_genie_partial39_decision_readiness_review_packet_v1"
    assert decision["status"] == "research_evidence_synthesis_only_all_human_decisions_pending"
    assert decision["basedOnExactResearchHead"] == "6556f91025685c412d2e50bb7a31aee23597b8ec"
    assert decision["canonicalUniverseCount"] == source["canonicalUniverseCount"] == 355
    assert decision["decisionPolicy"]["partial39SourceSupportedAutomaticPromotion"] is False
    assert decision["decisionPolicy"]["prodRuntimeSchedulerDatabaseDeploymentAndMainMergeAuthorized"] is False
    for path in decision["derivedFromPinnedEvidence"]:
        assert path.startswith("data/fandex-cloud-v10/seed/")
        assert (SEED / Path(path).name).exists(), path

    rows = decision["candidates"]
    originals = source["candidates"]
    assert len(rows) == len(originals) == 39
    assert [r["canonicalArtistId"] for r in rows] == [
        r["canonicalArtistId"] for r in originals
    ]
    assert len({r["canonicalArtistId"] for r in rows}) == 39
    active = compat["sources"]["music_chart"]
    supported = set(active["supportedCanonicalArtistIds"])
    unresolved = set(active["unresolvedCanonicalArtistIds"])
    unsupported = set(active["unsupportedCanonicalArtistIds"])
    target_ids = {r["canonicalArtistId"] for r in target["artists"]}
    assert (len(supported), len(unresolved), len(unsupported)) == (117, 238, 0)
    assert target_ids == supported
    assert len(supported | unresolved | unsupported) == 355
    assert decision["summary"]["actualStackedMusicPartition"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0,
    }

    native_a = {r["canonicalArtistId"]: r for r in native7["qualifiedRecords"]}
    native_b = {r["canonicalArtistId"]: r for r in other7["identityRecords"]}
    assert len(native_a) == 7 and len(native_b) == 7
    assert not set(native_a) & set(native_b)
    six_by_id = {r["canonicalArtistId"]: r for r in six["reviewedCandidates"]}
    year_by_id = {
        r["canonicalArtistId"]: r
        for r in source["independentDebutYearCorroborationV2"]["records"]
    }
    semantic = {
        r["canonicalArtistId"]
        for r in source["yearSemanticsReview"]["records"]
    }
    epoch = {
        r["canonicalArtistId"]
        for r in source["providerIdentityEpochReviewV3"]["individualRecords"]
    }
    last2_boy_story = next(
        r for r in last2["records"] if r["canonicalArtistId"] == "boystory"
    )

    lanes = Counter()
    changed_original_ids = 0
    for row, original in zip(rows, originals):
        artist_id = row["canonicalArtistId"]
        assert artist_id in unresolved and artist_id not in supported | unsupported
        assert row["originalResearchCandidate"] == {
            "providerArtistId": original["genieProviderArtistId"],
            "canonicalDebutYear": original["canonicalDebutYear"],
            "genieDebutYear": original["genieDebutYear"],
            "evidenceGap": original["evidenceGap"],
        }
        assert row["reviewerDecision"] == "pending"
        assert row["reviewer"] is None and row["reviewedAt"] is None
        for flag in (
            "reviewedBindingApproved", "supportedPromotionApproved",
            "productActivationApproved",
        ):
            assert row[flag] is False, (artist_id, flag)
        assert row["evidencePacketPaths"]
        assert len(row["evidencePacketPaths"]) == len(set(row["evidencePacketPaths"]))
        for path in row["evidencePacketPaths"]:
            assert (SEED / Path(path).name).exists(), path
        questions = row["unresolvedReviewerQuestions"]
        assert questions and len(set(questions)) == len(questions)
        if original["canonicalDebutYear"] is None:
            assert "DEFINE_CANONICAL_DEBUT_YEAR_SCOPE" in questions
        review = row["laterProviderIdentityEvidence"]
        later_id = review["qualifiedCandidateProviderArtistId"]
        assert review["differsFromOriginalResearchCandidate"] == (
            later_id is not None and later_id != original["genieProviderArtistId"]
        )
        if later_id != original["genieProviderArtistId"] and later_id is not None:
            assert "REVIEW_ORIGINAL_VS_NATIVE_PROVIDER_ID" in questions

        lane = row["evidenceReviewLane"]
        lanes[lane] += 1
        if artist_id in native_a or artist_id in native_b:
            assert lane == "historical_missing14_native_identity_qualified"
            if artist_id in native_a:
                item = native_a[artist_id]
                expected_id = item["independentlyQualifiedNativeProviderArtistId"]
                expected_year = item["genieProfileDebutYear"]
                release_url = item["nativeRelease"]["url"]
                assert item["exactNativeLinkValidated"] is True
            else:
                item = native_b[artist_id]
                expected_id = item["providerArtistIdCandidate"]
                expected_year = item["providerDebutYear"]
                release_url = item["nativeRelease"]["url"] if item["nativeRelease"] else None
                if artist_id == "boystory":
                    release_url = last2_boy_story["releaseEvidence"]["url"]
                if artist_id == "girlset":
                    release_url = girlset["primaryNativeSongs"][0]["genieSongUrl"]
            assert review["qualifiedCandidateProviderArtistId"] == expected_id
            assert review["providerDebutYearFromLaterQualifiedCandidate"] == expected_year
            assert review["nativeSongOrAlbumArtistLinkVerified"] is True
            assert review["nativeReleaseEvidenceUrl"] == release_url
            assert release_url.startswith("https://www.genie.co.kr/")
            if review["differsFromOriginalResearchCandidate"]:
                changed_original_ids += 1
        elif artist_id == "jinu":
            assert lane == "jinu_wrong_historical_candidate_review"
            assert review["qualifiedCandidateProviderArtistId"] == "80441171"
            assert review["qualifiedCandidateProviderArtistId"] == jinu["candidateProvider"]["providerArtistId"]
            assert review["nativeSongOrAlbumArtistLinkVerified"] is True
            assert review["providerDebutYearFromLaterQualifiedCandidate"] == 2014
            assert review["nativeReleaseEvidenceUrl"] == jinu["candidateProvider"]["providerSongUrl"]
            assert "REJECT_HISTORICAL_ID_FOR_WINNER_JINU_AND_REVIEW_ALTERNATE" in questions
        elif artist_id in six_by_id:
            assert lane == "six_year_match_review"
            item = six_by_id[artist_id]
            assert later_id == item["genieProviderArtistId"]
            assert review["providerDebutYearFromLaterQualifiedCandidate"] == item["genieDebutYear"]
            assert review["nativeSongOrAlbumArtistLinkVerified"] is False
        else:
            assert lane == "remaining_gap_or_semantics_research"
            assert later_id is None
            assert review["nativeSongOrAlbumArtistLinkVerified"] is False
            assert review["providerDebutYearFromLaterQualifiedCandidate"] is None
            assert review["nativeReleaseEvidenceUrl"] is None
            assert "QUALIFY_NATIVE_PROVIDER_IDENTITY_BEFORE_BINDING" in questions
            assert "PROVIDER_PROFILE_YEAR_ABSENT_NO_BACKFILL" not in questions

        if artist_id in year_by_id:
            evidence = row["independentYearCorroboration"]
            source_year = year_by_id[artist_id]
            assert evidence == {
                "reportedYear": source_year["externallyCorroboratedDebutYear"],
                "yearScope": source_year["evidenceYearSemantics"],
                "sourceUrl": source_year["url"],
            }
        else:
            assert row["independentYearCorroboration"] is None
        if artist_id in semantic:
            assert row["existingSemanticHold"] == "solo_vs_group_debut_year"
            assert "RESOLVE_SOLO_VS_GROUP_YEAR_SCOPE" in questions
        elif artist_id in epoch:
            assert row["existingSemanticHold"] == "group_solo_career_epoch"
            assert "RESOLVE_GROUP_SOLO_OR_CAREER_EPOCH" in questions
        elif artist_id == "girlset":
            assert row["existingSemanticHold"] == "rebrand_identity_epoch"
            assert "RESOLVE_VCHA_2024_TO_GIRLSET_2025_IDENTITY_EPOCH" in questions
        else:
            assert row["existingSemanticHold"] is None
        if artist_id == "jypark":
            assert "REVIEW_EXACT_ALIAS_TEMPORAL_HOMONYM_VOLATILITY" in questions

    assert changed_original_ids == 12
    expected_lanes = {
        "historical_missing14_native_identity_qualified": 14,
        "six_year_match_review": 6,
        "jinu_wrong_historical_candidate_review": 1,
        "remaining_gap_or_semantics_research": 18,
    }
    assert lanes == expected_lanes
    summary = decision["summary"]
    assert summary["totalCandidates"] == 39
    assert summary["mutuallyExclusiveEvidenceLanes"] == expected_lanes
    assert summary["historicalMissing14NativeIdentityQualified"] == 14
    assert summary["historicalMissing14ProviderCandidateChangedFromOriginal"] == 12
    assert summary["immutableOriginalResearchCandidateRetained"] == 39
    assert (summary["reviewedBindingApproved"], summary["supportedPromotionApproved"]) == (0, 0)
    assert decision["nextGate"] == (
        "PARTIAL39_HUMAN_CANONICAL_YEAR_SCOPE_AND_PROVIDER_BINDING_DECISION_BY_ARTIST_REQUIRED"
    )
    print(
        "PASS: Genie partial39 reviewer queue | 14 historical native-linked "
        "| 12 provisional-ID differences | 6 year-match | 1 JINU | "
        "18 remaining | 39 pending | Music 117/238/0 | Product unchanged"
    )


if __name__ == "__main__":
    main()
