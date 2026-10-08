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
        "39 unresolved | 3 debut-semantic scope holds | Music 117/238/0 | Product unchanged"
    )


if __name__ == "__main__":
    main()
