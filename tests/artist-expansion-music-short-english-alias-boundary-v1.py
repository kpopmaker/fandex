import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


discover = load_module(
    "music_chart_discover_artist_candidates_v2_boundary",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_discover_artist_candidates_v2.py",
)


def main():
    candidate = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "music_chart_artist_targets_candidate_v1.json"
    )
    artists, canonical_ids = (
        discover.load_target_artist_bindings(
            candidate
        )
    )

    original_artists = discover.TARGET_ARTISTS
    original_ids = discover.TARGET_CANONICAL_IDS
    discover.TARGET_ARTISTS = artists
    discover.TARGET_CANONICAL_IDS = canonical_ids

    try:
        ive = discover.resolve_target_artist(
            "IVE (아이브)"
        )
        assert ive["status"] == "resolved"
        assert ive["canonicalArtistId"] == "ive"
        assert ive["artist"] == "아이브"

        v = discover.resolve_target_artist(
            "V"
        )
        assert v["status"] == "resolved"
        assert v["canonicalArtistId"] == "v"
        assert v["artist"] == "V"

        v_korean = discover.resolve_target_artist(
            "V (뷔)"
        )
        assert v_korean["status"] == "resolved"
        assert v_korean["canonicalArtistId"] == "v"

        blackpink = discover.resolve_target_artist(
            "BLACKPINK"
        )
        assert blackpink["status"] == "resolved"
        assert blackpink["canonicalArtistId"] == "blackpink"

        jennie = discover.resolve_target_artist(
            "JENNIE"
        )
        assert jennie["status"] == "resolved"
        assert jennie["canonicalArtistId"] == "jennie"

        assert not discover.alias_matches_chart_artist(
            "IVE (아이브)",
            "V",
        )
        assert discover.alias_matches_chart_artist(
            "V",
            "V",
        )
        assert discover.alias_matches_chart_artist(
            "IVE (아이브)",
            "IVE",
        )
    finally:
        discover.TARGET_ARTISTS = original_artists
        discover.TARGET_CANONICAL_IDS = original_ids

    print(
        "PASS: short English Music aliases require token boundaries "
        "without breaking exact V identity"
    )


if __name__ == "__main__":
    main()
