from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "data/fandex-cloud-v10/seed"


def load(name: str) -> dict:
    return json.loads((SEED / name).read_text(encoding="utf-8-sig"))


def main() -> None:
    audit = load("music_genie_partial39_debut_epoch_scope_review_packet_v1.json")
    original = load("music_genie_partial39_evidence_triage_v1.json")
    queue = load("music_genie_partial39_decision_readiness_review_packet_v1.json")
    assert audit["version"] == "music_genie_partial39_debut_epoch_scope_review_packet_v1"
    assert audit["status"] == (
        "independent_scope_evidence_plus_reviewer_decision_options_no_automatic_policy"
    )
    assert audit["sourcePinnedHead"] == "ad9787199b3396ede61d590d4a9e7621d4149db9"
    assert audit["humanApprovalState"] == "all_39_pending"
    assert audit["sourceCandidatePartitionUnchanged"] == {
        "supported": 117, "unresolved": 238, "unsupported": 0
    }
    assert audit["criteria"] == {
        "nativeArtistLinkOnlyQualifiesProviderIdentityNotDebutEvent": True,
        "providerProfileYearMustNotDetermineSoloVsGroupScope": True,
        "predebutReleaseNotAutomaticallyEquivalentToFormalDebut": True,
        "successorBrandNameYearNotAutomaticallyEquivalentToPredecessorDebut": True,
        "reviewerMayChooseYearOnlyAfterExplicitCanonicalEntityScopeAndYearMeaning": True,
        "noFallbackFromMissingToZeroOrStable": True,
        "twoConflictingYearEventsMustRemainSeparate": True,
        "allOriginalPinnedYearsMustRemainUnchanged": True,
        "exactProviderProfileAndYearMatchDoesNotQualifyNativeSongArtistLink": True,
    }

    by_id = {r["canonicalArtistId"]: r for r in audit["records"]}
    orig = {r["canonicalArtistId"]: r for r in original["candidates"]}
    decision = {r["canonicalArtistId"]: r for r in queue["candidates"]}
    assert len(by_id) == len(orig) == len(decision) == 39
    assert set(by_id) == set(orig) == set(decision)
    assert list(by_id) == list(decision)
    source_year = {
        r["canonicalArtistId"]: r
        for r in original["independentDebutYearCorroborationV2"]["records"]
    }
    semantic = {
        r["canonicalArtistId"]: r for r in original["yearSemanticsReview"]["records"]
    }
    epoch = {
        r["canonicalArtistId"]: r
        for r in original["providerIdentityEpochReviewV3"]["individualRecords"]
    }
    assert len(semantic) == 3 and len(epoch) == 5
    assert not set(semantic) & set(epoch)

    for artist_id, r in by_id.items():
        o, d = orig[artist_id], decision[artist_id]
        pinned, native = d["originalResearchCandidate"], d["laterProviderIdentityEvidence"]
        assert r["originalPinnedGenieArtistId"] == o["genieProviderArtistId"]
        assert r["originalPinnedGenieArtistId"] == pinned["providerArtistId"]
        assert r["reviewCandidateGenieArtistId"] == native["qualifiedCandidateProviderArtistId"]
        assert r["originalCanonicalDebutYear"] == o["canonicalDebutYear"]
        assert r["originalGenieProfileDebutYear"] == o["genieDebutYear"]
        assert r["nativeGenieProfileDebutYear"] == native["providerDebutYearFromLaterQualifiedCandidate"]
        assert r["originalVsNativeProviderIdDiffers"] is (
            r["originalPinnedGenieArtistId"] != r["reviewCandidateGenieArtistId"]
        )
        assert r["originalVsNativeProviderIdDiffers"] == native["differsFromOriginalResearchCandidate"]
        assert r["nativeAttributionQualified"] is native["nativeSongOrAlbumArtistLinkVerified"]
        assert r["nativeAttributionEvidenceUrl"] == native["nativeReleaseEvidenceUrl"]
        if r["nativeAttributionQualified"]:
            assert r["attributionEvidenceClass"] == "provider_native_song_or_album_artist_link"
            assert r["nativeAttributionEvidenceUrl"].startswith("https://www.genie.co.kr/")
        else:
            assert r["attributionEvidenceClass"] == (
                "exact_provider_profile_and_reported_year_only_native_link_pending"
            )
            assert r["nativeAttributionEvidenceUrl"] is None
            assert "qualify_provider_native_song_or_album_artist_link_before_binding" in (
                r["humanReviewRequired"]
            )
        assert r["existingSemanticHold"] == d["existingSemanticHold"]
        assert r["independentDebutYearEvidence"] == d["independentYearCorroboration"]
        assert r["proposedCanonicalDebutYear"] is None
        assert r["overwriteOriginalCanonicalDebutYearAuthorized"] is False
        assert r["originallyPinnedResearchValuesRetained"] is True
        assert r["eligibility"] == "review_evidence_only"
        assert r["approval"] == {
            "providerIdentityBinding": "pending",
            "canonicalEntityScope": "pending",
            "debutEventType": "pending",
            "canonicalYearApplication": "pending",
            "sourcePromotion": "not_authorized",
            "productActivation": "not_authorized",
        }
        gates = r["humanReviewRequired"]
        assert len(gates) == len(set(gates))
        assert "human_signoff_on_entity_scope_and_provider_binding" in gates
        if r["originalVsNativeProviderIdDiffers"]:
            assert "review_original_vs_native_provider_artist_id" in gates
        if o["canonicalDebutYear"] is None:
            assert "review_canonical_debut_year_definition_for_named_entity" in gates
        if r["nativeGenieProfileDebutYear"] is None:
            assert "keep_provider_profile_year_absent" in gates
        if artist_id in source_year:
            assert "review_independent_year_scope_not_auto_backfill" in gates
        if artist_id in semantic or artist_id in epoch:
            assert "adjudicate_group_career_vs_solo_named_artist_debut" in gates
            source = semantic.get(artist_id) or epoch.get(artist_id)
            expected_solo = source["independentlyReportedSoloDebutYear"]
            events = r["pinnedSourceEventsAndNewlyVerifiedExternalEvents"]
            assert any(e["event"] == "named_solo_debut" and e["year"] == expected_solo
                       for e in events)
        if artist_id == "girlset":
            assert "adjudicate_predecessor_entity_vs_successor_rebrand_entity" in gates
        for e in r["pinnedSourceEventsAndNewlyVerifiedExternalEvents"]:
            assert isinstance(e["year"], int) and 1900 <= e["year"] <= 2026
            if "sources" in e:
                assert e["sources"] and all(str(url).startswith("https://") for url in e["sources"])
            else:
                assert str(e["sourceUrl"]).startswith("https://")
            assert e["event"] and e["sourceContext"]

    p = audit["summary"]
    assert p == {
        "cases": 39,
        "originalIdDiffers": 13,
        "canonicalYearAlreadyPresent": 7,
        "nativeProfileYearAbsent": 2,
        "explicitSemanticHolds": 9,
        "newExternalIndependentScopeEvidenceArtists": 3,
        "noExplicitScopeEventEvidence": 21,
        "zeroHumanApprovals": True,
        "nativeAttributionQualifiedCount": 33,
        "nativeAttributionNotYetQualifiedCount": 6,
    }
    externals = {
        "nexz": {("pre_debut_release", 2023), ("formal_group_debut", 2024)},
        "kard": {("pre_debut_project", 2016), ("formal_group_debut", 2017)},
        "girlset": {("predecessor_group_formal_debut", 2024),
                    ("successor_group_rebrand", 2025)},
    }
    for artist, expected in externals.items():
        events = by_id[artist]["pinnedSourceEventsAndNewlyVerifiedExternalEvents"]
        observed = {
            (e["event"], e["year"]) for e in events
            if e["sourceContext"].startswith("external_public_")
        }
        assert observed == expected, (artist, observed)
        assert all(e["publisher"] and e["sourceUrl"].startswith("https://")
                   for e in events if e["sourceContext"].startswith("external_public_"))
    assert {artist for artist, item in by_id.items() if not item["nativeAttributionQualified"]} == {
        "leehi", "jypark", "sf9", "b1a4", "jeongsewoon", "xlov",
    }
    assert by_id["tiot"]["pinnedSourceEventsAndNewlyVerifiedExternalEvents"] == []
    assert "obtain_independent_primary_or_contemporaneous_predebut_formal_release_evidence" in (
        by_id["tiot"]["humanReviewRequired"]
    )
    assert "reject_historical_homonym_before_selecting_alternate_provider_id" in (
        by_id["jinu"]["humanReviewRequired"]
    )
    assert "revalidate_temporal_homonym_provider_alias" in (
        by_id["jypark"]["humanReviewRequired"]
    )
    assert sum(1 for r in by_id.values()
               if "adjudicate_predebut_or_first_public_release_vs_formal_debut"
               in r["humanReviewRequired"]) == 3
    assert sum(1 for r in by_id.values()
               if "adjudicate_group_career_vs_solo_named_artist_debut"
               in r["humanReviewRequired"]) == 8
    assert sum(1 for r in by_id.values()
               if r["approval"]["sourcePromotion"] == "not_authorized") == 39
    assert Counter(r["eligibility"] for r in by_id.values()) == {
        "review_evidence_only": 39
    }
    print(
        "PASS: Genie partial39 debut-event scope audit | 39 pending "
        "| 13 original/candidate IDs differ | 9 explicit semantic holds "
        "| 33 native-linked and 6 profile-year candidates "
        "| NEXZ/KARD/GIRLSET external event evidence | no auto-year or promotion"
    )


if __name__ == "__main__":
    main()
