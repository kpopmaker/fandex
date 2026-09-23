import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module():
    path = ROOT / "scripts/fandex-cloud-migration/source/music_chart_discover_artist_candidates_v2.py"
    spec = importlib.util.spec_from_file_location("music_discovery", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main():
    module = load_module()

    module.KNOWN_ARTIST_ALIASES = {
        **module.KNOWN_ARTIST_ALIASES,
        "registered-outside-music-targets": ["등록90"],
    }

    rows = [
        {
            "artistName": "aespa",
            "platform": "melon",
            "sourceKey": "melon_top100",
            "trackTitle": "Known Song",
        },
        {
            "artistName": "등록90",
            "platform": "melon",
            "sourceKey": "melon_top100",
            "trackTitle": "Already Registered Outside Target Set",
        },
        {
            "artistName": "UNREGISTERED ARTIST",
            "platform": "melon",
            "sourceKey": "melon_top100",
            "trackTitle": "Song A",
        },
        {
            "artistName": "UNREGISTERED ARTIST",
            "platform": "genie",
            "sourceKey": "genie_daily_page_1",
            "trackTitle": "Song B",
        },
        {
            "artistName": "새로운가수",
            "platform": "genie",
            "sourceKey": "genie_daily_page_1",
            "trackTitle": "Song C",
        },
        {
            "artistName": "",
            "platform": "melon",
            "sourceKey": "melon_top100",
            "trackTitle": "Ignored",
        },
    ]

    candidates = module.build_catalog_candidates(rows, "2026-09-23")

    assert len(candidates) == 2

    first = candidates[0]
    assert first["displayArtist"] == "UNREGISTERED ARTIST"
    assert first["evidenceCount"] == 2
    assert first["platforms"] == ["genie", "melon"]
    assert first["sourceKeys"] == ["genie_daily_page_1", "melon_top100"]
    assert first["sampleTracks"] == ["Song A", "Song B"]
    assert first["status"] == "identity_review_required"
    assert first["autoPromote"] is False

    second = candidates[1]
    assert second["displayArtist"] == "새로운가수"
    assert second["evidenceCount"] == 1
    assert second["status"] == "identity_review_required"
    assert second["autoPromote"] is False

    assert all(row["displayArtist"] != "aespa" for row in candidates)
    assert all(row["displayArtist"] != "등록90" for row in candidates)

    print("PASS: unmatched chart artists become review-only catalog candidates")


if __name__ == "__main__":
    main()
