import csv
import importlib.util
import io
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


music_preview = load_module(
    "promotion_music_preview",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_current_presence_preview_v1.py",
)
music_history = load_module(
    "promotion_music_history",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_check_history_v1.py",
)
lastfm_cloud = load_module(
    "promotion_lastfm_cloud",
    "scripts/lastfm-cloud/lastfm_cloud_history_v1.py",
)
lastfm_sync = load_module(
    "promotion_lastfm_sync",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_sync_cloud_history_v1_1.py",
)
lastfm_rolling = load_module(
    "promotion_lastfm_rolling",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_rolling_v1.py",
)
runner = load_module(
    "promotion_cloud_runner",
    "scripts/fandex-cloud-v10/fandex_cloud_runner_v1.py",
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


def music_transition(tmp_path):
    candidate = read_json(MUSIC_CANDIDATE)
    artists = [
        row["artist"]
        for row in candidate["artists"]
    ]
    canonical_ids = {
        row["canonicalArtistId"]
        for row in candidate["artists"]
    }
    assert len(artists) == 21
    assert len(canonical_ids) == 21

    discovery_payload = {
        "createdAt": "2026-10-01T08:30:00+09:00",
        "targetArtists": artists,
        "targetArtistCount": 21,
        "sourceCounts": {
            "melon_top100": 100,
            "genie_daily_page_1": 50,
            "genie_daily_page_2": 50,
            "genie_daily_page_3": 50,
            "genie_daily_page_4": 50,
        },
        "candidates": [],
    }
    assert (
        music_history.get_discovery_artists(
            discovery_payload
        )
        == artists
    )
    mg_rows = music_history.melon_genie_rows(
        discovery_payload
    )
    assert len(mg_rows) == 42
    assert {
        row["artist"]
        for row in mg_rows
    } == set(artists)
    assert {
        row["status"]
        for row in mg_rows
    } == {"NOT_RANKED"}

    active_baseline = read_json(
        ROOT
        / "data/fandex-cloud-v10/seed/"
        "fandex_music_chart_ranking_v1_latest.json"
    )
    assert len(active_baseline["ranking"]) == 10

    mg_file = tmp_path / "mg.json"
    bugs_file = tmp_path / "bugs.json"
    current_file = tmp_path / "current.json"
    output_file = tmp_path / "preview.csv"
    report_file = tmp_path / "preview.txt"

    mg_file.write_text(
        json.dumps(
            {
                "candidates": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    bugs_file.write_text(
        json.dumps(
            {
                "candidates": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    current_file.write_text(
        json.dumps(
            active_baseline,
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
    music_preview.MG_JSON = mg_file
    music_preview.BUGS_JSON = bugs_file
    music_preview.CURRENT_MUSIC_JSON = current_file
    music_preview.MUSIC_TARGET_BINDING_FILE = (
        MUSIC_CANDIDATE
    )
    music_preview.OUTPUT_CSV = output_file
    music_preview.REPORT = report_file

    try:
        music_preview.main()
    finally:
        for key, value in originals.items():
            setattr(
                music_preview,
                key,
                value,
            )

    rows = read_csv(output_file)
    assert len(rows) == 63
    assert {
        row["canonicalArtistId"]
        for row in rows
    } == canonical_ids

    report = report_file.read_text(
        encoding="utf-8"
    )
    unavailable_lines = [
        line
        for line in report.splitlines()
        if "current=UNAVAILABLE" in line
    ]
    assert len(unavailable_lines) == 11
    assert "delta=UNAVAILABLE" in report


def make_history_rows(active_rows, candidate_rows):
    now = datetime.now(
        lastfm_cloud.KST
    ).date()
    previous = (
        now - timedelta(days=1)
    ).isoformat()
    today = now.isoformat()

    active_by_id = {
        row["canonicalArtistId"]: row
        for row in active_rows
    }

    rows = []
    for snapshot_date, source_rows in [
        (previous, active_rows),
        (today, active_rows),
    ]:
        for index, seed in enumerate(
            source_rows,
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

    return rows, previous, today, active_by_id


def lastfm_same_day_expansion(tmp_path):
    active_rows = read_csv(LASTFM_ACTIVE)
    candidate_rows = read_csv(
        LASTFM_CANDIDATE
    )
    assert len(active_rows) == 10
    assert len(candidate_rows) == 19

    history_rows, _previous, today, _ = (
        make_history_rows(
            active_rows,
            candidate_rows,
        )
    )

    history_file = (
        tmp_path / "cloud_history.csv"
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
    lastfm_cloud.HISTORY_FILE = history_file

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

    lastfm_cloud.fetch_artist_info = (
        fake_fetch
    )

    try:
        merged, snapshot_date, appended = (
            lastfm_cloud.append_daily_snapshot(
                candidate_rows,
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

    today_rows = [
        row
        for row in merged
        if row["snapshotDate"] == today
    ]
    assert len(today_rows) == 19
    assert {
        row["canonicalArtistId"]
        for row in today_rows
    } == {
        row["canonicalArtistId"]
        for row in candidate_rows
    }


def projected_local_rows(
    active_rows,
    candidate_rows,
):
    today = datetime.now(
        lastfm_cloud.KST
    ).date()
    d1 = (
        today - timedelta(days=2)
    ).isoformat()
    d2 = (
        today - timedelta(days=1)
    ).isoformat()

    rows = []
    for snapshot_date, seeds in [
        (d1, active_rows),
        (d2, candidate_rows),
    ]:
        for index, seed in enumerate(
            seeds,
            start=1,
        ):
            rows.append(
                {
                    "snapshotDate":
                        snapshot_date,
                    "snapshotAt":
                        snapshot_date
                        + "T08:00:00",
                    "canonicalArtistId":
                        seed["canonicalArtistId"],
                    "artist":
                        seed["artist"],
                    "lastfmName":
                        seed["query"],
                    "listeners":
                        str(300000 + index),
                    "playcount":
                        str(3000000 + index),
                    "sourceVersion":
                        "fixture",
                }
            )
    return rows


def lastfm_monotonic_validators(tmp_path):
    active_rows = read_csv(LASTFM_ACTIVE)
    candidate_rows = read_csv(
        LASTFM_CANDIDATE
    )
    local_rows = projected_local_rows(
        active_rows,
        candidate_rows,
    )

    original_binding = (
        lastfm_rolling.LASTFM_BINDING_FILE
    )
    lastfm_rolling.LASTFM_BINDING_FILE = (
        LASTFM_CANDIDATE
    )
    try:
        hydrated = (
            lastfm_rolling.hydrate_history_canonical_ids(
                local_rows
            )
        )
        dates = (
            lastfm_rolling.validate_history(
                hydrated
            )
        )
        assert len(dates) == 2
    finally:
        lastfm_rolling.LASTFM_BINDING_FILE = (
            original_binding
        )

    cloud_rows = []
    for row in local_rows:
        cloud_rows.append(
            {
                "snapshotDate":
                    row["snapshotDate"],
                "artist":
                    row["artist"],
                "lastfmName":
                    row["lastfmName"],
                "listeners":
                    row["listeners"],
                "playcount":
                    row["playcount"],
                "collectedAt":
                    row["snapshotAt"]
                    + "+09:00",
            }
        )

    assert len(
        lastfm_sync.validate_cloud_dates(
            cloud_rows
        )
    ) == 2

    shrink_rows = []
    dates = sorted({
        row["snapshotDate"]
        for row in cloud_rows
    })
    for row in cloud_rows:
        if (
            row["snapshotDate"] == dates[0]
            or row["artist"]
            in {
                seed["artist"]
                for seed in active_rows
            }
        ):
            shrink_rows.append(row)

    # 10 -> 19 is valid; 19 -> 10 must fail.
    expanded_then_shrunk = (
        cloud_rows
        + [
            {
                **row,
                "snapshotDate":
                    datetime.now(
                        lastfm_cloud.KST
                    ).date().isoformat(),
            }
            for row in cloud_rows
            if (
                row["snapshotDate"]
                == dates[0]
            )
        ]
    )
    try:
        lastfm_sync.validate_cloud_dates(
            expanded_then_shrunk
        )
        raise AssertionError(
            "expected Last.fm cohort shrink rejection"
        )
    except RuntimeError as exc:
        assert "shrank" in str(exc)


class FakeResponse:
    def __init__(self, text):
        self._text = text

    def read(self):
        return self._text.encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(
        self,
        exc_type,
        exc,
        tb,
    ):
        return False


def runner_bootstrap_expansion(tmp_path):
    active_rows = read_csv(LASTFM_ACTIVE)
    candidate_rows = read_csv(
        LASTFM_CANDIDATE
    )
    local_rows = projected_local_rows(
        active_rows,
        candidate_rows,
    )

    output = io.StringIO()
    fields = [
        "snapshotDate",
        "canonicalArtistId",
        "artist",
        "lastfmName",
        "listeners",
        "playcount",
        "collectedAt",
    ]
    writer = csv.DictWriter(
        output,
        fieldnames=fields,
    )
    writer.writeheader()

    for row in local_rows:
        writer.writerow(
            {
                "snapshotDate":
                    row["snapshotDate"],
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "lastfmName":
                    row["lastfmName"],
                "listeners":
                    row["listeners"],
                "playcount":
                    row["playcount"],
                "collectedAt":
                    row["snapshotAt"]
                    + "+09:00",
            }
        )

    original_urlopen = (
        runner.urllib.request.urlopen
    )
    original_binding = (
        runner.LASTFM_BINDING_FILE
    )
    original_local = runner.LASTFM_LOCAL

    runner.LASTFM_BINDING_FILE = (
        LASTFM_CANDIDATE
    )
    runner.LASTFM_LOCAL = (
        tmp_path / "runner_history.csv"
    )
    runner.urllib.request.urlopen = (
        lambda *args, **kwargs:
            FakeResponse(output.getvalue())
    )

    try:
        runner.bootstrap_lastfm_history()
    finally:
        runner.urllib.request.urlopen = (
            original_urlopen
        )
        runner.LASTFM_BINDING_FILE = (
            original_binding
        )
        runner.LASTFM_LOCAL = (
            original_local
        )

    rows = read_csv(
        tmp_path / "runner_history.csv"
    )
    assert len(rows) == 29
    assert len({
        row["canonicalArtistId"]
        for row in rows
        if row["snapshotDate"]
        == max(
            item["snapshotDate"]
            for item in rows
        )
    }) == 19


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        music_transition(tmp_path)
        lastfm_same_day_expansion(
            tmp_path
        )
        lastfm_monotonic_validators(
            tmp_path
        )
        runner_bootstrap_expansion(
            tmp_path
        )

    print(
        "PASS: source promotion transition supports "
        "Music 10-baseline -> 21 bindings and "
        "Last.fm 10-history -> 19 bindings without "
        "cohort shrink or missing-as-zero semantics"
    )


if __name__ == "__main__":
    main()
