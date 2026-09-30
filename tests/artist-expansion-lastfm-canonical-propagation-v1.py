import csv
import importlib.util
import json
import tempfile
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


cloud = load_module(
    "lastfm_cloud_history_v1",
    "scripts/lastfm-cloud/lastfm_cloud_history_v1.py",
)
delta = load_module(
    "lastfm_global_interest_delta_v1",
    "scripts/fandex-cloud-migration/source/lastfm_global_interest_delta_v1.py",
)
rolling = load_module(
    "lastfm_global_interest_rolling_v1",
    "scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_v1.py",
)
rolling_score = load_module(
    "lastfm_global_interest_rolling_score_preview_v1",
    "scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_score_preview_v1.py",
)
score = load_module(
    "lastfm_global_interest_score_preview_v1",
    "scripts/fandex-cloud-migration/source/lastfm_global_interest_score_preview_v1.py",
)
sync = load_module(
    "lastfm_sync_cloud_history_v1_1",
    "scripts/fandex-cloud-migration/source/lastfm_sync_cloud_history_v1_1.py",
)


def read_rows(path):
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main():
    artists = [
        ("canonical-a", "Artist A"),
        ("canonical-b", "Artist B"),
    ]

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        seed = tmp_path / "lastfm_seed.csv"

        with seed.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["canonicalArtistId", "artist", "query"],
            )
            writer.writeheader()
            for canonical_id, artist in artists:
                writer.writerow(
                    {
                        "canonicalArtistId": canonical_id,
                        "artist": artist,
                        "query": artist,
                    }
                )

        original_cloud_seed = cloud.SEED_FILE
        cloud.SEED_FILE = seed
        try:
            seeds = cloud.read_seed()
        finally:
            cloud.SEED_FILE = original_cloud_seed

        legacy_history = [
            {
                "snapshotDate": "2026-09-29",
                "artist": artist,
                "query": artist,
                "lastfmName": artist,
                "listeners": "100",
                "playcount": "1000",
                "collectedAt": "2026-09-29T01:00:00+09:00",
                "status": "ok",
            }
            for _, artist in artists
        ]
        hydrated = cloud.hydrate_history_canonical_ids(
            legacy_history,
            seeds,
        )
        assert {
            row["canonicalArtistId"]
            for row in hydrated
        } == {"canonical-a", "canonical-b"}

        bad_history = [dict(hydrated[0])]
        bad_history[0]["canonicalArtistId"] = "wrong-id"
        try:
            cloud.hydrate_history_canonical_ids(
                bad_history,
                seeds,
            )
            raise AssertionError(
                "expected cloud canonical mismatch rejection"
            )
        except RuntimeError as exc:
            assert "canonicalArtistId mismatch" in str(exc)

        bindings = {
            artist: canonical_id
            for canonical_id, artist in artists
        }
        projected = sync.project_cloud_row(
            {
                "snapshotDate": "2026-09-29",
                "artist": "Artist A",
                "lastfmName": "Artist A",
                "listeners": "100",
                "playcount": "1000",
                "collectedAt": "2026-09-29T01:00:00+09:00",
            },
            "lastfm_cloud_history_v1",
            bindings,
        )
        assert projected["canonicalArtistId"] == "canonical-a"

        try:
            sync.project_cloud_row(
                {
                    "snapshotDate": "2026-09-29",
                    "canonicalArtistId": "wrong-id",
                    "artist": "Artist A",
                    "lastfmName": "Artist A",
                    "listeners": "100",
                    "playcount": "1000",
                    "collectedAt": "2026-09-29T01:00:00+09:00",
                },
                "lastfm_cloud_history_v1",
                bindings,
            )
            raise AssertionError(
                "expected sync canonical mismatch rejection"
            )
        except RuntimeError as exc:
            assert "canonicalArtistId mismatch" in str(exc)

        history = tmp_path / "history.csv"
        fields = [
            "snapshotDate",
            "snapshotAt",
            "canonicalArtistId",
            "artist",
            "lastfmName",
            "listeners",
            "playcount",
            "sourceVersion",
        ]
        with history.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            start = date(2026, 9, 24)
            for day_index in range(7):
                snapshot_date = (start + timedelta(days=day_index)).isoformat()
                for artist_index, (canonical_id, artist) in enumerate(artists):
                    writer.writerow(
                        {
                            "snapshotDate": snapshot_date,
                            "snapshotAt": snapshot_date + "T01:00:00",
                            "canonicalArtistId": canonical_id,
                            "artist": artist,
                            "lastfmName": artist,
                            "listeners": 1000
                            + day_index * 10
                            + artist_index,
                            "playcount": 10000
                            + day_index * 100
                            + artist_index,
                            "sourceVersion": "fixture",
                        }
                    )

        delta_csv = tmp_path / "delta.csv"
        delta_json = tmp_path / "delta.json"
        delta_report = tmp_path / "delta.txt"
        original_delta = (
            delta.HISTORY_FILE,
            delta.LASTFM_BINDING_FILE,
            delta.OUTPUT_CSV,
            delta.OUTPUT_JSON,
            delta.OUTPUT_REPORT,
        )
        delta.HISTORY_FILE = history
        delta.LASTFM_BINDING_FILE = seed
        delta.OUTPUT_CSV = delta_csv
        delta.OUTPUT_JSON = delta_json
        delta.OUTPUT_REPORT = delta_report
        try:
            delta.main()
        finally:
            (
                delta.HISTORY_FILE,
                delta.LASTFM_BINDING_FILE,
                delta.OUTPUT_CSV,
                delta.OUTPUT_JSON,
                delta.OUTPUT_REPORT,
            ) = original_delta

        delta_rows = read_rows(delta_csv)
        assert {
            row["canonicalArtistId"]
            for row in delta_rows
        } == {"canonical-a", "canonical-b"}

        score_csv = tmp_path / "score.csv"
        score_json = tmp_path / "score.json"
        score_report = tmp_path / "score.txt"
        original_score = (
            score.INPUT_CSV,
            score.OUTPUT_CSV,
            score.OUTPUT_JSON,
            score.REPORT,
        )
        score.INPUT_CSV = delta_csv
        score.OUTPUT_CSV = score_csv
        score.OUTPUT_JSON = score_json
        score.REPORT = score_report
        try:
            score.main()
        finally:
            (
                score.INPUT_CSV,
                score.OUTPUT_CSV,
                score.OUTPUT_JSON,
                score.REPORT,
            ) = original_score

        assert {
            row["canonicalArtistId"]
            for row in read_rows(score_csv)
        } == {"canonical-a", "canonical-b"}

        rolling_csv = tmp_path / "rolling.csv"
        rolling_json = tmp_path / "rolling.json"
        original_rolling = (
            rolling.HISTORY_FILE,
            rolling.LASTFM_BINDING_FILE,
            rolling.OUTPUT_CSV,
            rolling.OUTPUT_JSON,
        )
        rolling.HISTORY_FILE = history
        rolling.LASTFM_BINDING_FILE = seed
        rolling.OUTPUT_CSV = rolling_csv
        rolling.OUTPUT_JSON = rolling_json
        try:
            rolling.main()
        finally:
            (
                rolling.HISTORY_FILE,
                rolling.LASTFM_BINDING_FILE,
                rolling.OUTPUT_CSV,
                rolling.OUTPUT_JSON,
            ) = original_rolling

        assert {
            row["canonicalArtistId"]
            for row in read_rows(rolling_csv)
        } == {"canonical-a", "canonical-b"}

        rolling_score_csv = tmp_path / "rolling_score.csv"
        rolling_score_json = tmp_path / "rolling_score.json"
        original_rolling_score = (
            rolling_score.INPUT_FILE,
            rolling_score.OUTPUT_CSV,
            rolling_score.OUTPUT_JSON,
        )
        rolling_score.INPUT_FILE = rolling_csv
        rolling_score.OUTPUT_CSV = rolling_score_csv
        rolling_score.OUTPUT_JSON = rolling_score_json
        try:
            rolling_score.main()
        finally:
            (
                rolling_score.INPUT_FILE,
                rolling_score.OUTPUT_CSV,
                rolling_score.OUTPUT_JSON,
            ) = original_rolling_score

        assert {
            row["canonicalArtistId"]
            for row in read_rows(rolling_score_csv)
        } == {"canonical-a", "canonical-b"}

        rolling_payload = json.loads(
            rolling_score_json.read_text(encoding="utf-8")
        )
        assert rolling_payload["artistCount"] == 2
        assert rolling_payload["scoreReadyCount"] == 2

    print(
        "PASS: Last.fm canonical identity propagates from binding "
        "through history, sync, delta, rolling, and score outputs"
    )


if __name__ == "__main__":
    main()
