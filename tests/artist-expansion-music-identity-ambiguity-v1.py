import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


discover = load_module(
    "music_chart_discover_artist_candidates_v2",
    "scripts/fandex-cloud-migration/source/music_chart_discover_artist_candidates_v2.py",
)


def main():
    original_targets = discover.TARGET_ARTISTS

    discover.TARGET_ARTISTS = {
        "artist-a": ["Alpha", "A"],
        "artist-b": ["Alpha", "B"],
    }
    try:
        resolution = discover.resolve_target_artist("Alpha")
        assert resolution["status"] == "ambiguous"
        assert [row["artist"] for row in resolution["matches"]] == [
            "artist-a",
            "artist-b",
        ]
        assert discover.find_target_artist("Alpha") is None

        ambiguities = []
        candidates = discover.build_candidates(
            [
                {
                    "artistName": "Alpha",
                    "platform": "melon",
                    "chartName": "Top 100",
                    "trackTitle": "Collision Track",
                    "rank": 1,
                    "chartType": "daily",
                    "sourceKey": "melon_top100",
                    "rankSource": "fixture",
                    "sourceUrl": "https://example.com/collision",
                }
            ],
            "2026-09-30",
            ambiguities,
        )
        assert candidates == []
        assert len(ambiguities) == 1
        assert ambiguities[0]["matchedArtist"] == "Alpha"
        assert ambiguities[0]["candidateArtists"] == ["artist-a", "artist-b"]
    finally:
        discover.TARGET_ARTISTS = original_targets

    discover.TARGET_ARTISTS = {
        "artist-c": ["Gamma", "Gamma Unit"],
    }
    try:
        resolution = discover.resolve_target_artist("Gamma Unit")
        assert resolution["status"] == "resolved"
        assert resolution["artist"] == "artist-c"
        assert resolution["matchedAlias"] == "Gamma Unit"
        assert discover.find_target_artist("Gamma Unit") == (
            "artist-c",
            "Gamma Unit",
        )
    finally:
        discover.TARGET_ARTISTS = original_targets

    print("PASS: Music alias ambiguity fails closed and remains auditable")


if __name__ == "__main__":
    main()
