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


recovery = load_module(
    "youtube_historical_seed_recovery",
    "scripts/fandex-cloud-migration/source/"
    "youtube_recover_historical_seed_v1.py",
)


def main():
    recovery.MANIFEST_FILE = (
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "youtube_historical_approved_seed_manifest_v1.json"
    )
    payload = recovery.read_manifest()

    assert payload["status"] == (
        "recovered_historical_approval_ids_candidate_only"
    )

    artists = payload["artists"]
    assert len(artists) == 10

    rows = [
        {
            "canonicalArtistId":
                artist["canonicalArtistId"],
            "artist":
                artist["artist"],
            **video,
        }
        for artist in artists
        for video in artist["videos"]
    ]

    assert len(rows) == 47
    assert len({
        row["videoId"]
        for row in rows
    }) == 47

    explicit = [
        row
        for row in rows
        if row.get("historicalVideoType")
    ]
    inherited = [
        row
        for row in rows
        if not row.get("historicalVideoType")
    ]

    assert len(explicit) == 13
    assert len(inherited) == 34

    assert {
        row["canonicalArtistId"]
        for row in rows
    } == {
        "iu",
        "aespa",
        "ateez",
        "boynextdoor",
        "ive",
        "lesserafim",
        "newjeans",
        "seventeen",
        "straykids",
        "txt",
    }

    print(
        "PASS: historical YouTube baseline manifest "
        "contains 10 artists / 47 unique approved video IDs "
        "with 13 explicit and 34 inherited-type approvals"
    )


if __name__ == "__main__":
    main()
