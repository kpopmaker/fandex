import csv
import importlib.util
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


music = load_module(
    "music_chart_discover_artist_candidates_v2",
    "scripts/fandex-cloud-migration/source/music_chart_discover_artist_candidates_v2.py",
)
lastfm = load_module(
    "lastfm_cloud_history_v1",
    "scripts/lastfm-cloud/lastfm_cloud_history_v1.py",
)


def main():
    music_payload = json.loads(
        (
            ROOT
            / "data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json"
        ).read_text(encoding="utf-8")
    )
    music_rows = music_payload["artists"]
    music_ids = [row["canonicalArtistId"] for row in music_rows]

    with (
        ROOT / "scripts/lastfm-cloud/lastfm_artist_seed_v1.csv"
    ).open("r", encoding="utf-8-sig", newline="") as f:
        lastfm_rows = list(csv.DictReader(f))
    lastfm_ids = [row["canonicalArtistId"] for row in lastfm_rows]

    assert len(music_ids) == 10
    assert len(lastfm_ids) == 10
    assert len(set(music_ids)) == len(music_ids)
    assert len(set(lastfm_ids)) == len(lastfm_ids)
    assert set(music_ids) == set(lastfm_ids)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        missing_music = tmp_path / "music_missing.json"
        missing_music.write_text(
            json.dumps(
                {
                    "artists": [
                        {
                            "artist": "Fixture A",
                            "aliases": ["Fixture A"],
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        try:
            music.load_target_artist_bindings(missing_music)
            raise AssertionError("expected missing music canonicalArtistId rejection")
        except RuntimeError as exc:
            assert "missing canonicalArtistId" in str(exc)

        duplicate_music = tmp_path / "music_duplicate.json"
        duplicate_music.write_text(
            json.dumps(
                {
                    "artists": [
                        {
                            "canonicalArtistId": "fixture-a",
                            "artist": "Fixture A",
                            "aliases": ["Fixture A"],
                        },
                        {
                            "canonicalArtistId": "fixture-a",
                            "artist": "Fixture B",
                            "aliases": ["Fixture B"],
                        },
                    ]
                }
            ),
            encoding="utf-8",
        )
        try:
            music.load_target_artist_bindings(duplicate_music)
            raise AssertionError("expected duplicate music canonicalArtistId rejection")
        except RuntimeError as exc:
            assert "Duplicate canonicalArtistId" in str(exc)

        missing_lastfm = tmp_path / "lastfm_missing.csv"
        missing_lastfm.write_text(
            "artist,query\nFixture A,Fixture A\n",
            encoding="utf-8",
        )
        original_seed = lastfm.SEED_FILE
        lastfm.SEED_FILE = missing_lastfm
        try:
            try:
                lastfm.read_seed()
                raise AssertionError(
                    "expected missing Last.fm canonicalArtistId rejection"
                )
            except RuntimeError as exc:
                assert "missing canonicalArtistId" in str(exc)
        finally:
            lastfm.SEED_FILE = original_seed

        duplicate_lastfm = tmp_path / "lastfm_duplicate.csv"
        duplicate_lastfm.write_text(
            (
                "canonicalArtistId,artist,query\n"
                "fixture-a,Fixture A,Fixture A\n"
                "fixture-a,Fixture B,Fixture B\n"
            ),
            encoding="utf-8",
        )
        original_seed = lastfm.SEED_FILE
        lastfm.SEED_FILE = duplicate_lastfm
        try:
            try:
                lastfm.read_seed()
                raise AssertionError(
                    "expected duplicate Last.fm canonicalArtistId rejection"
                )
            except RuntimeError as exc:
                assert "Duplicate canonicalArtistId" in str(exc)
        finally:
            lastfm.SEED_FILE = original_seed

    print(
        "PASS: Music and Last.fm source bindings share canonical ids "
        "and fail closed on invalid bindings"
    )


if __name__ == "__main__":
    main()
