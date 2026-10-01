import csv
import importlib.util
import json
import tempfile
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
    "youtube_discovery_recovery",
    "scripts/fandex-cloud-migration/source/"
    "youtube_discover_seed_candidates_artist_list_v2.py",
)
collector = load_module(
    "youtube_collector_recovery",
    "scripts/fandex-cloud-migration/source/"
    "youtube_collect_video_metrics_v1.py",
)


def main():
    discover.TARGET_CONFIG = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "music_chart_artist_targets_candidate_v1.json"
    )
    artists = discover.read_artist_list()

    assert len(artists) == 21
    assert len(discover.CANONICAL_IDS) == 21
    assert len(set(discover.CANONICAL_IDS.values())) == 21
    assert discover.CANONICAL_IDS["아이유"] == "iu"
    assert discover.CANONICAL_IDS["방탄소년단"] == "bts"
    assert discover.CANONICAL_IDS["V"] == "v"
    assert discover.CANONICAL_IDS["RIIZE"] == "riize"

    queries = discover.build_queries("방탄소년단")
    assert queries
    assert all("BTS" in query for query in queries)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        seed_path = tmp_path / "seed.csv"

        with seed_path.open(
            "w",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=collector.SEED_FIELDS,
            )
            writer.writeheader()
            writer.writerow({
                "canonicalArtistId": "bts",
                "artist": "방탄소년단",
                "videoId": "abcdefghijk",
                "sourceUrl":
                    "https://www.youtube.com/watch?v=abcdefghijk",
                "videoType": "official_mv",
                "memo": "fixture",
            })

        rows = collector.read_csv(seed_path)
        normalized, skipped = (
            collector.normalize_seed_rows(rows)
        )
        assert not skipped
        assert normalized == [{
            "canonicalArtistId": "bts",
            "artist": "방탄소년단",
            "videoId": "abcdefghijk",
            "sourceUrl":
                "https://www.youtube.com/watch?v=abcdefghijk",
            "videoType": "official_mv",
            "memo": "fixture",
            "row": 2,
        }]

        original = collector.request_youtube_videos

        def fake_request(_api_key, video_ids):
            assert video_ids == ["abcdefghijk"]
            return {
                "items": [{
                    "id": "abcdefghijk",
                    "snippet": {
                        "title": "fixture",
                        "publishedAt":
                            "2026-09-30T00:00:00Z",
                    },
                    "statistics": {
                        "viewCount": "1000",
                        "likeCount": "100",
                        "commentCount": "10",
                    },
                }]
            }

        collector.request_youtube_videos = (
            fake_request
        )
        try:
            metrics, _raw, missing = (
                collector.collect_video_metrics(
                    normalized,
                    "fixture-key",
                )
            )
        finally:
            collector.request_youtube_videos = original

        assert not missing
        assert len(metrics) == 1
        assert metrics[0]["canonicalArtistId"] == "bts"
        assert metrics[0]["artist"] == "방탄소년단"

    print(
        "PASS: recovered YouTube discovery uses 21 canonical "
        "targets and metrics preserve canonicalArtistId"
    )


if __name__ == "__main__":
    main()
