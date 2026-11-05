import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BINDINGS = ROOT / "data/fandex-cloud-v10/seed/musicbrainz_21_artist_bindings_reviewed_v1.json"
TARGETS = ROOT / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
CANDIDATE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_v_lisa_candidate_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    bindings = read_json(BINDINGS)
    targets = read_json(TARGETS)
    candidate = read_json(CANDIDATE)

    rows = bindings["bindings"]
    assert bindings["version"] == "musicbrainz_21_artist_bindings_reviewed_v1"
    assert bindings["status"] == "reviewed_for_listenbrainz_shadow_only"
    assert len(rows) == 21
    assert len({r["canonicalArtistId"] for r in rows}) == 21
    assert len({r["musicBrainzArtistMbid"] for r in rows}) == 21

    expected_ids = {r["canonicalArtistId"] for r in targets["artists"]}
    assert {r["canonicalArtistId"] for r in rows} == expected_ids

    by_id = {r["canonicalArtistId"]: r for r in rows}
    assert by_id["v"]["musicBrainzArtistMbid"] == "83096042-3785-481e-8843-dee69f1aad12"
    assert by_id["lisa"]["musicBrainzArtistMbid"] == "30aeb57f-bb16-47fa-86ca-79fc57b4d12c"
    assert by_id["rose"]["musicBrainzArtistMbid"] == "7f233cda-eacb-4235-b681-5f7be343a1a2"
    assert by_id["jimin"]["musicBrainzArtistMbid"] == "d2582c77-6b0f-4b2f-802f-8f3cad1a5fec"
    assert by_id["jungkook"]["musicBrainzArtistMbid"] == "23c8056b-ee13-4cfc-a772-2f5292e35bb5"

    review = bindings["reviewSemantics"]
    assert review["canonicalArtistIdAuthoritative"] is True
    assert review["fuzzyAutoBindingAllowed"] is False
    assert review["displayNameOnlyBindingAllowed"] is False
    assert review["reviewedBindingDoesNotActivateProduct"] is True

    assert candidate["requiredNextValidation"]["code"] == "FULL_21_LISTENBRAINZ_CANONICAL_COHORT_SHADOW_REQUIRED"
    assert all(value is False for value in bindings["safety"].values())

    print("PASS: reviewed MusicBrainz 21 bindings | unique=21 | activation=FALSE")


if __name__ == "__main__":
    main()
