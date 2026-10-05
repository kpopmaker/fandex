import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

LINEAGE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_v3_lineage_status_v1.json"
)
YOUTUBE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)
MASTER = (
    ROOT
    / "scripts/fandex-cloud-migration/source/"
    "fandex_master_score_v10.py"
)


def read_json(path: Path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def load_master():
    spec = importlib.util.spec_from_file_location(
        "fandex_master_score_v10_lineage_test",
        MASTER,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main():
    assert LINEAGE.exists(), (
        "Master-required YouTube lineage status is missing."
    )

    lineage = read_json(LINEAGE)
    youtube = read_json(YOUTUBE)
    master = load_master()

    assert lineage["version"] == (
        "youtube_v3_lineage_status_v1"
    )
    assert lineage["source"] == "youtube_v3"

    active = lineage["activeProductState"]
    assert active["mode"] == (
        "frozen_cutover_snapshot"
    )
    assert active["artistCount"] == 10

    frozen_names = {
        row["artist"]
        for row in active["canonicalArtists"]
    }
    frozen_ids = {
        row["canonicalArtistId"]
        for row in active["canonicalArtists"]
    }

    ranking = youtube["ranking"]
    ranking_names = {
        row["artist"]
        for row in ranking
    }

    assert len(ranking) == 10
    assert len(frozen_names) == 10
    assert len(frozen_ids) == 10
    assert ranking_names == frozen_names

    expansion = lineage["productExpansion"]
    assert expansion["eligibility"] == (
        "blocked_incomplete_legacy_scale_lineage"
    )
    assert (
        expansion["currentFrozenCohortAllowed"]
        is True
    )
    assert (
        expansion[
            "expandedOrChangedYoutubeCohortAllowed"
        ]
        is False
    )

    safety = lineage["safety"]
    assert safety["missingIsZero"] is False
    assert (
        safety["reviewedSeedImpliesProductEligibility"]
        is False
    )
    assert (
        safety["automaticRescalingAllowed"]
        is False
    )
    assert (
        safety["automaticProductExpansionAllowed"]
        is False
    )

    shadow = lineage["fullReviewedCohortShadow"]
    assert shadow["conclusion"] == "success"
    assert shadow["targetArtistCount"] == 21
    assert shadow["reviewedSeedVideoCount"] == 74
    assert (
        shadow["historicalLineageComplete"]
        is False
    )
    assert (
        shadow[
            "commonSeedSelectionPolicyEstablished"
        ]
        is False
    )
    assert shadow["rebaselineAuthorized"] is False
    assert (
        shadow["activeYouTubeRankingModified"]
        is False
    )

    assert (
        master.YOUTUBE_LINEAGE_STATUS.resolve()
        == LINEAGE.resolve()
    )
    assert master.YOUTUBE_LINEAGE_STATUS.exists()

    # Mirror the Master guard boundary:
    # frozen cohort is allowed while any changed cohort
    # remains blocked until lineage marks it eligible.
    frozen_cohort = frozen_names
    current_cohort = ranking_names
    assert current_cohort == frozen_cohort

    changed_cohort = set(current_cohort)
    changed_cohort.add("BLACKPINK")
    assert changed_cohort != frozen_cohort
    assert expansion["eligibility"] != "eligible"
    assert (
        expansion[
            "expandedOrChangedYoutubeCohortAllowed"
        ]
        is False
    )

    print(
        "PASS: YouTube v3 lineage status restored | "
        "frozenProduct=10 | shadowTarget=21 | "
        "expansion=blocked_fail_closed"
    )


if __name__ == "__main__":
    main()
