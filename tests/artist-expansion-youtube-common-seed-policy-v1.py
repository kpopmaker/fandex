import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

POLICY = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_selection_policy_v1.json"
MANIFEST = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_manifest_v1.json"
TARGETS = ROOT / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
HANDOFF = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_rebaseline_policy_handoff_v1.json"
LINEAGE = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_lineage_status_v1.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    policy = read_json(POLICY)
    manifest = read_json(MANIFEST)
    targets = read_json(TARGETS)
    handoff = read_json(HANDOFF)
    lineage = read_json(LINEAGE)

    assert policy["version"] == "youtube_v3_common_seed_selection_policy_v1"
    assert policy["status"] == "materialized_for_rebaseline_evaluation_only"
    assert handoff["currentDecision"]["selectedOption"] == "approve_full_21_rebaseline"
    assert policy["authorization"]["rebaselinePreparationAuthorized"] is True
    assert policy["authorization"]["productExpansionAuthorized"] is False
    assert policy["authorization"]["productionActivationAuthorized"] is False

    target_ids = [
        row["canonicalArtistId"]
        for row in targets["artists"]
    ]
    assert len(target_ids) == 21
    assert len(set(target_ids)) == 21
    assert policy["targetCohort"]["canonicalArtistIds"] == target_ids

    rows = manifest["selectedVideos"]
    assert manifest["selectedArtistCount"] == 21
    assert manifest["selectedVideoCount"] == 74
    assert len(rows) == 74
    assert len({row["videoId"] for row in rows}) == 74
    assert {row["canonicalArtistId"] for row in rows} == set(target_ids)

    classes = {}
    for row in rows:
        classes[row["evidenceClass"]] = classes.get(row["evidenceClass"], 0) + 1
    assert classes == {
        "historical_approval_recovered": 47,
        "current_reviewed_approval": 27,
    }

    counts = manifest["videoCountByCanonicalArtistId"]
    assert set(counts) == set(target_ids)
    assert all(value > 0 for value in counts.values())
    assert sum(counts.values()) == 74

    coverage = policy["coverageSemantics"]
    assert coverage["perArtistVideoCap"] is None
    assert coverage["equalVideoCountRequired"] is False

    snapshot = policy["comparableMetricSnapshotContract"]
    assert snapshot["allSelectedVideoIdsRequired"] is True
    assert snapshot["oneCommonCollectionRunRequired"] is True
    assert snapshot["partialArtistSnapshotAllowed"] is False
    assert snapshot["zeroImputationAllowed"] is False

    score = policy["scoreContract"]
    assert score["formulaVersion"] == "youtube_publish_v3_uncapped_additive_scaled"
    assert score["sameFormulaForAllArtists"] is True
    assert score["perArtistFormulaOverrideAllowed"] is False
    assert score["thresholdForPromotionDefined"] is False
    assert score["frozenProductPointsReplacedByThisPolicy"] is False

    assert lineage["activeProductState"]["artistCount"] == 10
    assert lineage["productExpansion"]["expandedOrChangedYoutubeCohortAllowed"] is False
    assert lineage["fullReviewedCohortShadow"]["reviewedSeedVideoCount"] == 74

    safety = policy["safety"]
    assert safety["missingIsZero"] is False
    assert safety["automaticProductExpansionAllowed"] is False
    assert safety["automaticRescalingAllowed"] is False
    assert safety["activeYoutubeRankingModified"] is False
    assert safety["productRuntimeModified"] is False
    assert safety["databaseModified"] is False
    assert safety["schedulerModified"] is False
    assert safety["deploymentAuthorized"] is False

    assert policy["nextGate"]["code"] == "COMMON_21_ARTIST_METRIC_SNAPSHOT_REQUIRED"

    print(
        "PASS: common YouTube seed policy materialized | "
        "artists=21 | videos=74 | historical=47 | reviewed=27 | "
        "perArtistCap=NONE | ProductActivation=FALSE"
    )


if __name__ == "__main__":
    main()
