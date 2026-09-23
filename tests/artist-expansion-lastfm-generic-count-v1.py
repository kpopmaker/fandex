import csv
import importlib.util
import tempfile
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
rolling = load_module(
    "lastfm_global_interest_rolling_v1",
    "scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_v1.py",
)
sync = load_module(
    "lastfm_sync_cloud_history_v1_1",
    "scripts/fandex-cloud-migration/source/lastfm_sync_cloud_history_v1_1.py",
)


def main():
    artists = [f"artist-{i:02d}" for i in range(11)]

    with tempfile.TemporaryDirectory() as tmp:
        seed_path = Path(tmp) / "seed.csv"
        with seed_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["artist", "query"])
            writer.writeheader()
            for artist in artists:
                writer.writerow({"artist": artist, "query": artist})

        original_seed = cloud.SEED_FILE
        cloud.SEED_FILE = seed_path
        try:
            seeds = cloud.read_seed()
        finally:
            cloud.SEED_FILE = original_seed

        assert len(seeds) == 11

        delta_rows = [
            {
                "artist": artist,
                "status": "delta_ready",
                "previousDate": "2026-09-22",
                "latestDate": "2026-09-23",
                "daysBetween": 1,
                "listenerDeltaPerDay": i + 1,
                "playcountDeltaPerDay": (i + 1) * 10,
            }
            for i, artist in enumerate(artists)
        ]

        score_path = Path(tmp) / "score.csv"
        original_score = cloud.SCORE_FILE
        cloud.SCORE_FILE = score_path
        try:
            scores = cloud.build_score(delta_rows)
        finally:
            cloud.SCORE_FILE = original_score

        assert len(scores) == 11
        assert sorted(row["rank"] for row in scores) == list(range(1, 12))

        rows = []
        for snapshot_date, multiplier in [
            ("2026-09-22", 1),
            ("2026-09-23", 2),
        ]:
            for i, artist in enumerate(artists):
                rows.append(
                    {
                        "snapshotDate": snapshot_date,
                        "artist": artist,
                        "listeners": str(1000 + multiplier * (i + 1)),
                        "playcount": str(10000 + multiplier * (i + 1) * 10),
                    }
                )

        dates = rolling.validate_history(rows)
        assert dates == ["2026-09-22", "2026-09-23"]

        sync_rows = [
            {
                "snapshotDate": row["snapshotDate"],
                "artist": row["artist"],
            }
            for row in rows
        ]
        sync_dates = sync.validate_cloud_dates(sync_rows)
        assert sync_dates == ["2026-09-22", "2026-09-23"]

        bad_sync_rows = sync_rows[:-1]
        try:
            sync.validate_cloud_dates(bad_sync_rows)
            raise AssertionError("expected incomplete cohort rejection")
        except RuntimeError as exc:
            assert "Incomplete Cloud snapshot" in str(exc)

    print("PASS: Last.fm generic artist-count regression supports 11 artists including cloud sync")


if __name__ == "__main__":
    main()
