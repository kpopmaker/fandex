import csv
import importlib.util
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
    "youtube_recovery_v3",
    "scripts/fandex-cloud-migration/source/"
    "youtube_discover_seed_candidates_artist_list_v2.py",
)
collector = load_module(
    "youtube_collector_recovery_v3",
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
    assert len(
        set(discover.CANONICAL_IDS.values())
    ) == 21

    assert discover.select_primary_query_alias(
        "방탄소년단"
    ) == "BTS"
    assert discover.select_primary_query_alias(
        "V"
    ) == "Kim Taehyung"
    assert discover.select_primary_query_alias(
        "정국"
    ) in {"Jung Kook", "Jungkook"}

    assert not discover.alias_matches_text(
        "IVE (아이브)",
        "V",
    )
    assert discover.alias_matches_text(
        "V 'FRI(END)S' Official MV",
        "V",
    )

    weak = discover.calc_score(
        "정국",
        "BTS (방탄소년단) '2.0' Official MV",
        "HYBE LABELS",
        "official_mv",
        10000000,
    )
    assert (
        weak["reviewEligibility"]
        == "weak_no_artist_specific_evidence"
    )
    assert weak["titleAliases"] == []
    assert (
        weak["channelClass"]
        == "unverified_channel"
    )

    strong = discover.calc_score(
        "정국",
        "Jung Kook 'Standing Next to You' Official MV",
        "HYBE LABELS",
        "official_mv",
        10000000,
    )
    assert (
        strong["reviewEligibility"]
        == "strong_artist_specific_evidence"
    )
    assert strong["titleAliases"]
    assert (
        strong["channelClass"]
        == "trusted_label_with_title_identity"
    )
    assert strong["score"] > weak["score"]

    v_strong = discover.calc_score(
        "V",
        "V 'FRI(END)S' Official MV",
        "HYBE LABELS",
        "official_mv",
        10000000,
    )
    assert (
        v_strong["reviewEligibility"]
        == "strong_artist_specific_evidence"
    )

    with tempfile.TemporaryDirectory() as tmp:
        seed = Path(tmp) / "seed.csv"
        with seed.open(
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

        rows = collector.read_csv(seed)
        normalized, skipped = (
            collector.normalize_seed_rows(rows)
        )
        assert not skipped
        assert (
            normalized[0]["canonicalArtistId"]
            == "bts"
        )

        original = (
            collector.request_youtube_videos
        )

        def fake_request(_api_key, ids):
            assert ids == ["abcdefghijk"]
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
            collector.request_youtube_videos = (
                original
            )

        assert not missing
        assert (
            metrics[0]["canonicalArtistId"]
            == "bts"
        )

    print(
        "PASS: YouTube recovery v3 uses distinctive queries, "
        "token-safe identity evidence, and canonical metrics"
    )


if __name__ == "__main__":
    main()
