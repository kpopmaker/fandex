import csv
import importlib.util
import json
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "scripts/fandex-cloud-migration/source"
LASTFM_DIR = ROOT / "scripts/lastfm-cloud"
sys.path.insert(0, str(SOURCE_DIR))
sys.path.insert(0, str(LASTFM_DIR))


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


music_discover = load_module(
    "promotion_active_music_discover",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_discover_artist_candidates_v2.py",
)
music_preview = load_module(
    "promotion_active_music_preview",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_current_presence_preview_v1.py",
)
music_history = load_module(
    "promotion_active_music_history",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_check_history_v1.py",
)
lastfm_cloud = load_module(
    "promotion_active_lastfm_cloud",
    "scripts/lastfm-cloud/lastfm_cloud_history_v1.py",
)
lastfm_rolling = load_module(
    "promotion_active_lastfm_rolling",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_rolling_v1.py",
)


MUSIC_ACTIVE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_v1.json"
)
MUSIC_CANDIDATE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "music_chart_artist_targets_candidate_v1.json"
)
LASTFM_ACTIVE = (
    ROOT
    / "scripts/lastfm-cloud/"
    "lastfm_artist_seed_v1.csv"
)
LASTFM_CANDIDATE = (
    ROOT
    / "scripts/lastfm-cloud/"
    "lastfm_artist_seed_candidate_v1.csv"
)
COMPAT_ACTIVE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_v1.json"
)
COMPAT_CANDIDATE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_candidate_v1.json"
)


def read_json(path):
    return json.loads(
        path.read_text(encoding="utf-8-sig")
    )


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def write_csv(path, rows, fields):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fields,
        )
        writer.writeheader()
        writer.writerows(rows)


def assert_active_promotion_files():
    active_music = read_json(MUSIC_ACTIVE)
    candidate_music = read_json(
        MUSIC_CANDIDATE
    )
    active_lastfm = read_csv(LASTFM_ACTIVE)
    candidate_lastfm = read_csv(
        LASTFM_CANDIDATE
    )
    active_compat = read_json(
        COMPAT_ACTIVE
    )
    candidate_compat = read_json(
        COMPAT_CANDIDATE
    )

    assert active_music["version"] == (
        "music_chart_artist_targets_v1"
    )
    assert (
        active_music["artists"]
        == candidate_music["artists"]
    )
    assert len(active_music["artists"]) == 21

    assert active_lastfm == candidate_lastfm
    assert len(active_lastfm) == 19

    music = active_compat["sources"][
        "music_chart"
    ]
    lastfm = active_compat["sources"][
        "lastfm"
    ]

    assert len(
        music["supportedCanonicalArtistIds"]
    ) == 21
    assert len(
        music["unresolvedCanonicalArtistIds"]
    ) == 334
    assert (
        music["unsupportedCanonicalArtistIds"]
        == []
    )

    assert len(
        lastfm["supportedCanonicalArtistIds"]
    ) == 19
    assert len(
        lastfm["unresolvedCanonicalArtistIds"]
    ) == 334
    assert set(
        lastfm["unsupportedCanonicalArtistIds"]
    ) == {"v", "lisa"}

    assert set(
        music["supportedCanonicalArtistIds"]
    ) == set(
        candidate_compat["sources"][
            "music_chart"
        ]["supportedCanonicalArtistIds"]
    )
    assert set(
        lastfm["supportedCanonicalArtistIds"]
    ) == set(
        candidate_compat["sources"][
            "lastfm"
        ]["supportedCanonicalArtistIds"]
    )

    for source in [
        "music_chart",
        "lastfm",
    ]:
        row = active_compat["sources"][
            source
        ]
        sets = [
            set(
                row[
                    "supportedCanonicalArtistIds"
                ]
            ),
            set(
                row[
                    "unresolvedCanonicalArtistIds"
                ]
            ),
            set(
                row[
                    "unsupportedCanonicalArtistIds"
                ]
            ),
        ]
        assert not (
            sets[0] & sets[1]
            or sets[0] & sets[2]
            or sets[1] & sets[2]
        )
        assert len(
            sets[0] | sets[1] | sets[2]
        ) == 355


def assert_music_active_runtime(tmp_path):
    assert len(
        music_discover.TARGET_ARTISTS
    ) == 21
    assert len(
        music_discover.TARGET_CANONICAL_IDS
    ) == 21

    artists = list(
        music_discover.TARGET_ARTISTS.keys()
    )

    discovery_payload = {
        "createdAt":
            "2026-10-01T08:30:00+09:00",
        "targetArtists":
            artists,
        "targetCanonicalArtistIds": [
            music_discover.TARGET_CANONICAL_IDS[
                artist
            ]
            for artist in artists
        ],
        "targetArtistCount":
            21,
        "sourceCounts": {
            "melon_top100": 100,
            "genie_daily_page_1": 50,
            "genie_daily_page_2": 50,
            "genie_daily_page_3": 50,
            "genie_daily_page_4": 50,
        },
        "candidates": [],
    }

    checks = music_history.melon_genie_rows(
        discovery_payload
    )
    assert len(checks) == 42
    assert {
        row["artist"]
        for row in checks
    } == set(artists)

    baseline = read_json(
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "fandex_music_chart_ranking_v1_latest.json"
    )
    assert len(baseline["ranking"]) == 10

    mg = tmp_path / "mg.json"
    bugs = tmp_path / "bugs.json"
    current = tmp_path / "current.json"
    out = tmp_path / "preview.csv"
    report = tmp_path / "preview.txt"

    mg.write_text(
        json.dumps(
            {"candidates": []},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    bugs.write_text(
        json.dumps(
            {"candidates": []},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    current.write_text(
        json.dumps(
            baseline,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    originals = {
        "MG_JSON": music_preview.MG_JSON,
        "BUGS_JSON": music_preview.BUGS_JSON,
        "CURRENT_MUSIC_JSON":
            music_preview.CURRENT_MUSIC_JSON,
        "MUSIC_TARGET_BINDING_FILE":
            music_preview.MUSIC_TARGET_BINDING_FILE,
        "OUTPUT_CSV": music_preview.OUTPUT_CSV,
        "REPORT": music_preview.REPORT,
    }
    music_preview.MG_JSON = mg
    music_preview.BUGS_JSON = bugs
    music_preview.CURRENT_MUSIC_JSON = (
        current
    )
    music_preview.MUSIC_TARGET_BINDING_FILE = (
        MUSIC_ACTIVE
    )
    music_preview.OUTPUT_CSV = out
    music_preview.REPORT = report

    try:
        music_preview.main()
    finally:
        for key, value in originals.items():
            setattr(
                music_preview,
                key,
                value,
            )

    rows = read_csv(out)
    assert len(rows) == 63
    assert len({
        row["canonicalArtistId"]
        for row in rows
    }) == 21

    text = report.read_text(
        encoding="utf-8"
    )
    assert text.count(
        "current=UNAVAILABLE"
    ) == 11
    assert text.count(
        "delta=UNAVAILABLE"
    ) == 11


def make_lastfm_history(
    legacy_rows,
    active_rows,
):
    now = datetime.now(
        lastfm_cloud.KST
    ).date()
    previous = (
        now - timedelta(days=1)
    ).isoformat()
    today = now.isoformat()

    rows = []
    for snapshot_date in [
        previous,
        today,
    ]:
        for index, seed in enumerate(
            legacy_rows,
            start=1,
        ):
            rows.append(
                {
                    "snapshotDate":
                        snapshot_date,
                    "canonicalArtistId":
                        seed["canonicalArtistId"],
                    "artist":
                        seed["artist"],
                    "query":
                        seed["query"],
                    "lastfmName":
                        seed["query"],
                    "listeners":
                        str(100000 + index),
                    "playcount":
                        str(1000000 + index),
                    "collectedAt":
                        snapshot_date
                        + "T08:00:00+09:00",
                    "status":
                        "ok",
                }
            )
    return rows, today


def assert_lastfm_active_runtime(tmp_path):
    active_rows = read_csv(
        LASTFM_ACTIVE
    )
    assert len(active_rows) == 19

    original_seed = (
        lastfm_cloud.SEED_FILE
    )
    lastfm_cloud.SEED_FILE = (
        LASTFM_ACTIVE
    )
    try:
        seeds = lastfm_cloud.read_seed()
    finally:
        lastfm_cloud.SEED_FILE = (
            original_seed
        )
    assert len(seeds) == 19

    legacy_rows = active_rows[:10]
    history_rows, today = (
        make_lastfm_history(
            legacy_rows,
            active_rows,
        )
    )

    history_file = (
        tmp_path / "lastfm_history.csv"
    )
    write_csv(
        history_file,
        history_rows,
        lastfm_cloud.HISTORY_FIELDS,
    )

    original_history = (
        lastfm_cloud.HISTORY_FILE
    )
    original_fetch = (
        lastfm_cloud.fetch_artist_info
    )
    fetched = []

    def fake_fetch(seed, _api_key):
        fetched.append(
            seed["canonicalArtistId"]
        )
        return {
            "canonicalArtistId":
                seed["canonicalArtistId"],
            "artist":
                seed["artist"],
            "query":
                seed["query"],
            "lastfmName":
                seed["query"],
            "listeners":
                200000,
            "playcount":
                2000000,
        }

    lastfm_cloud.HISTORY_FILE = (
        history_file
    )
    lastfm_cloud.fetch_artist_info = (
        fake_fetch
    )
    try:
        merged, snapshot_date, appended = (
            lastfm_cloud.append_daily_snapshot(
                seeds,
                "fixture-key",
            )
        )
    finally:
        lastfm_cloud.HISTORY_FILE = (
            original_history
        )
        lastfm_cloud.fetch_artist_info = (
            original_fetch
        )

    assert snapshot_date == today
    assert appended is True
    assert len(fetched) == 9
    assert len([
        row
        for row in merged
        if row["snapshotDate"] == today
    ]) == 19

    rolling_rows = []
    dates = sorted({
        row["snapshotDate"]
        for row in merged
    })
    for row in merged:
        rolling_rows.append(
            {
                "snapshotDate":
                    row["snapshotDate"],
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "listeners":
                    row["listeners"],
                "playcount":
                    row["playcount"],
            }
        )

    original_binding = (
        lastfm_rolling.LASTFM_BINDING_FILE
    )
    lastfm_rolling.LASTFM_BINDING_FILE = (
        LASTFM_ACTIVE
    )
    try:
        hydrated = (
            lastfm_rolling.hydrate_history_canonical_ids(
                rolling_rows
            )
        )
        validated_dates = (
            lastfm_rolling.validate_history(
                hydrated
            )
        )
    finally:
        lastfm_rolling.LASTFM_BINDING_FILE = (
            original_binding
        )

    assert validated_dates == dates


def ranking_names(path):
    payload = read_json(path)
    rows = (
        payload.get("ranking")
        or payload.get("rankings")
        or []
    )
    return {
        (
            row.get("artist")
            or row.get("artistName")
            or row.get("name")
            or row.get("displayName")
            or ""
        ).strip()
        for row in rows
        if (
            row.get("artist")
            or row.get("artistName")
            or row.get("name")
            or row.get("displayName")
        )
    }


def assert_product_parity_blocker():
    naver = ranking_names(
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "fandex_naver_ranking_v3_latest.json"
    )
    youtube = ranking_names(
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "fandex_youtube_ranking_v3_latest.json"
    )
    master = ranking_names(
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "fandex_master_ranking_latest.json"
    )
    music = {
        row["artist"]
        for row in read_json(
            MUSIC_ACTIVE
        )["artists"]
    }
    lastfm = {
        row["artist"]
        for row in read_csv(
            LASTFM_ACTIVE
        )
    }

    assert len(naver) == 10
    assert len(youtube) == 10
    assert len(master) == 10
    assert len(music) == 21
    assert len(lastfm) == 19

    assert naver == youtube == master
    assert music != naver
    assert lastfm != naver
    assert music != lastfm

    master_source = (
        ROOT
        / "scripts/fandex-cloud-migration/source/"
        "fandex_master_score_v10.py"
    ).read_text(encoding="utf-8")
    assert "source artist set mismatch" in master_source
    assert "artist_set != sets[0]" in master_source

    print(
        "BLOCKED_BY_PRODUCT_SOURCE_PARITY: "
        "promotion source layer is ready, but "
        "Master v10 still requires exact NAVER/"
        "YouTube/Music/Last.fm artist-set equality"
    )


def main():
    assert_active_promotion_files()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        assert_music_active_runtime(
            tmp_path
        )
        assert_lastfm_active_runtime(
            tmp_path
        )

    assert_product_parity_blocker()

    print(
        "PASS: promotion branch stages active "
        "Music 21 / Last.fm 19 source bindings "
        "with safe cohort transitions and an "
        "explicit standalone-merge blocker"
    )


if __name__ == "__main__":
    main()
