import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_exact34_application_receipt_v1.json"
TARGET = ROOT / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
REVIEW = ROOT / "data/fandex-cloud-v10/seed/music_chart_full355_exact34_reviewed_bindings_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    receipt = read_json(RECEIPT)
    target = read_json(TARGET)
    compat = read_json(COMPAT)
    review = read_json(REVIEW)

    assert receipt["version"] == "music_chart_full355_exact34_application_receipt_v1"
    assert receipt["status"] == "source_application_validated_non_product"

    applied = receipt["application"]
    assert applied["activeMusicTargetSeedModifiedOnCandidateBranch"] is True
    assert applied["sourceCompatibilityRegistryModifiedOnCandidateBranch"] is True
    assert applied["previousTargetCount"] == 21
    assert applied["appliedReviewedBindingCount"] == 34
    assert applied["targetCount"] == 55
    assert applied["previousSupportedCount"] == 21
    assert applied["supportedCount"] == 55
    assert applied["previousUnresolvedCount"] == 334
    assert applied["unresolvedCount"] == 300
    assert applied["unsupportedCount"] == 0

    exact=set(review["reviewedSupportedCanonicalArtistIds"])
    assert len(exact) == 34
    assert set(applied["appliedCanonicalArtistIds"]) == exact

    target_ids={row["canonicalArtistId"] for row in target["artists"]}
    assert len(target["artists"]) == 55
    assert len(target_ids) == 55
    assert exact <= target_ids
    assert target["reviewedExpansion"]["addedCanonicalArtistCount"] == 34
    assert target["reviewedExpansion"]["productCohortExpansionAuthorized"] is False
    assert target["reviewedExpansion"]["runtimeActivationAuthorized"] is False

    music=compat["sources"]["music_chart"]
    supported=set(music["supportedCanonicalArtistIds"])
    unresolved=set(music["unresolvedCanonicalArtistIds"])
    unsupported=set(music["unsupportedCanonicalArtistIds"])
    assert len(supported) == 55
    assert len(unresolved) == 300
    assert len(unsupported) == 0
    assert exact <= supported
    assert exact.isdisjoint(unresolved)
    assert supported.isdisjoint(unresolved)
    assert len(supported | unresolved | unsupported) == 355

    live=receipt["liveValidation"]
    assert live["runId"] == 37555541001
    assert live["jobId"] == 112580796451
    assert live["head"] == "c0b5bedaaa144d43dc367daee4c7173be4553c6b"
    assert live["conclusion"] == "success"
    assert live["parsedChartRowCount"] == 300
    assert live["candidateRowCount"] == 145
    assert live["candidateCanonicalArtistCount"] == 46
    assert live["exact34ObservedCount"] == 34
    assert live["exact34MissingCanonicalArtistIds"] == []
    assert live["identityAmbiguityCount"] == 0
    assert sum(live["sourceCounts"].values()) == 300

    artifact=receipt["artifact"]
    assert artifact["artifactId"] == 11454329130
    assert artifact["digest"] == "sha256:a753e592725836d417013bf1d054721986a95c02141e41a60ff21abdabb8c60d"

    decision=receipt["decision"]
    assert decision["sourceApplicationValidated"] is True
    assert decision["sourceBindingExpansionReadyForArtistExpansionLine"] is True
    assert decision["productCohortExpansionAuthorized"] is False
    assert decision["productRuntimeActivationAuthorized"] is False
    assert decision["schedulerActivationAuthorized"] is False
    assert decision["databaseMutationAuthorized"] is False
    assert decision["deploymentAuthorized"] is False
    assert decision["mainMergeAuthorized"] is False

    remaining=receipt["remainingMusicCoverage"]
    assert remaining["supportedCount"] == 55
    assert remaining["unresolvedCount"] == 300
    assert remaining["unsupportedCount"] == 0
    assert remaining["immediatelyReviewableCompositeCandidateCount"] == 35
    assert remaining["nextGate"] == "MUSIC_FULL355_COMPOSITE35_REVIEW_REQUIRED"

    assert all(value is False for value in receipt["safety"].values())

    print(
        "PASS: Music exact34 source application | "
        "targets=55 | compatibility=55/300/0 | "
        "liveExact=34/34 | ambiguity=0 | Product=UNCHANGED"
    )


if __name__ == "__main__":
    main()
