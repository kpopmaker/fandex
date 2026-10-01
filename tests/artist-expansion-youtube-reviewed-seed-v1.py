import copy
import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "scripts/fandex-cloud-migration/source"
)
sys.path.insert(0, str(SOURCE_DIR))


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


review = load_module(
    "youtube_reviewed_seed_candidate_v1_test",
    "scripts/fandex-cloud-migration/source/"
    "youtube_reviewed_seed_candidate_v1.py",
)


def main():
    targets = review.load_targets()
    payload = review.load_json(
        review.REVIEWS_FILE
    )
    approved = review.validate_reviews(
        payload,
        targets,
    )
    generated = review.build_seed_rows(
        approved,
        str(
            payload["sourceRun"][
                "workflowRunId"
            ]
        ),
    )
    materialized = review.read_candidate_file(
        review.CANDIDATE_FILE
    )

    assert generated == materialized
    assert len(approved) == 26
    assert len(materialized) == 26

    approved_ids = {
        row["canonicalArtistId"]
        for row in materialized
    }
    assert approved_ids == {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
        "jungkook",
        "jimin",
        "jennie",
        "lisa",
        "rose",
        "riize",
    }
    assert "v" not in approved_ids

    active = json.loads(
        (
            ROOT
            / "data/fandex-cloud-v10/seed/"
            "fandex_youtube_ranking_v3_latest.json"
        ).read_text(
            encoding="utf-8"
        )
    )
    assert len(active["ranking"]) == 10

    duplicate = copy.deepcopy(payload)
    duplicate["reviews"].append(
        copy.deepcopy(
            duplicate["reviews"][0]
        )
    )
    try:
        review.validate_reviews(
            duplicate,
            targets,
        )
        raise AssertionError(
            "expected duplicate review rejection"
        )
    except RuntimeError as exc:
        assert "Duplicate YouTube reviewId" in str(exc)

    bad_artist = copy.deepcopy(payload)
    bad_artist["reviews"][0][
        "canonicalArtistId"
    ] = "v"
    try:
        review.validate_reviews(
            bad_artist,
            targets,
        )
        raise AssertionError(
            "expected artist/canonical mismatch"
        )
    except RuntimeError as exc:
        assert (
            "artist/canonical mismatch"
            in str(exc)
        )

    bad_state = copy.deepcopy(payload)
    bad_state["reviews"][0][
        "activationState"
    ] = "active"
    try:
        review.validate_reviews(
            bad_state,
            targets,
        )
        raise AssertionError(
            "expected activation state rejection"
        )
    except RuntimeError as exc:
        assert (
            "reviewed_seed_candidate_only"
            in str(exc)
        )

    print(
        "PASS: first reviewed YouTube seed batch "
        "is deterministic, canonical, fail-closed, "
        "and non-activating"
    )


if __name__ == "__main__":
    main()
