import csv
import importlib.util
import json
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "scripts/fandex-cloud-migration/source"
sys.path.insert(0, str(SOURCE_DIR))


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


apply_preview = load_module(
    "candidate_apply_preview",
    "scripts/fandex-cloud-migration/source/"
    "artist_source_compatibility_application_preview_v1.py",
)
discover = load_module(
    "candidate_music_discover",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_discover_artist_candidates_v2.py",
)
preview = load_module(
    "candidate_music_preview",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_current_presence_preview_v1.py",
)
publish = load_module(
    "candidate_music_publish",
    "scripts/fandex-cloud-migration/source/"
    "music_chart_current_presence_publish_v2.py",
)
cloud = load_module(
    "candidate_lastfm_cloud",
    "scripts/lastfm-cloud/lastfm_cloud_history_v1.py",
)
rolling = load_module(
    "candidate_lastfm_rolling",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_rolling_v1.py",
)
sync = load_module(
    "candidate_lastfm_sync",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_sync_cloud_history_v1_1.py",
)
runner = load_module(
    "candidate_cloud_runner",
    "scripts/fandex-cloud-v10/fandex_cloud_runner_v1.py",
)
score = load_module(
    "candidate_lastfm_score",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_score_preview_v1.py",
)
rolling_score = load_module(
    "candidate_lastfm_rolling_score",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_rolling_score_preview_v1.py",
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
REVIEWS = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_reviews_v1.json"
)
APPLICATION = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_application_v1.json"
)


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def assert_materialization_matches_preview():
    registry = read_json(COMPAT_ACTIVE)
    reviews = read_json(REVIEWS)
    application = read_json(APPLICATION)
    active_music = read_json(MUSIC_ACTIVE)
    active_lastfm = read_csv(LASTFM_ACTIVE)

    generated = (
        apply_preview.build_application_preview(
            registry,
            reviews,
            application,
            active_music,
            active_lastfm,
        )
    )

    materialized_music = read_json(
        MUSIC_CANDIDATE
    )
    materialized_lastfm = read_csv(
        LASTFM_CANDIDATE
    )
    materialized_compat = read_json(
        COMPAT_CANDIDATE
    )

    assert (
        materialized_music["activationState"]
        == "candidate_only_not_active"
    )
    assert (
        materialized_compat["activationState"]
        == "candidate_only_not_active"
    )

    assert (
        materialized_music["artists"]
        == generated[
            "proposedMusicBindingConfig"
        ]["artists"]
    )
    assert (
        materialized_lastfm
        == generated[
            "proposedLastfmBindingRows"
        ]
    )

    for source in [
        "music_chart",
        "lastfm",
    ]:
        candidate_source = (
            materialized_compat["sources"][
                source
            ]
        )
        generated_source = (
            generated["proposedCompatibility"][
                source
            ]
        )

        for field in [
            "supportedCanonicalArtistIds",
            "unresolvedCanonicalArtistIds",
            "unsupportedCanonicalArtistIds",
        ]:
            assert set(
                candidate_source[field]
            ) == set(
                generated_source[field]
            )

    assert len(active_music["artists"]) == 10
    assert len(active_lastfm) == 10
    assert len(materialized_music["artists"]) == 21
    assert len(materialized_lastfm) == 19


def validate_music_candidate_pipeline(tmp_path):
    music_payload = read_json(
        MUSIC_CANDIDATE
    )
    artists = [
        row["artist"]
        for row in music_payload["artists"]
    ]
    canonical_ids = {
        row["canonicalArtistId"]
        for row in music_payload["artists"]
    }

    loaded, loaded_ids = (
        discover.load_target_artist_bindings(
            MUSIC_CANDIDATE
        )
    )
    assert len(loaded) == 21
    assert len(loaded_ids) == 21
    assert set(loaded_ids.values()) == canonical_ids

    mg_json = tmp_path / "mg.json"
    bugs_json = tmp_path / "bugs.json"
    current_json = tmp_path / "current.json"
    preview_csv = tmp_path / "preview.csv"
    preview_report = tmp_path / "preview.txt"

    mg_candidates = []
    bugs_candidates = []

    for index, artist in enumerate(
        artists,
        start=1,
    ):
        mg_candidates.extend(
            [
                {
                    "artist": artist,
                    "platform": "melon",
                    "rank": index,
                    "chartType": "daily",
                    "trackTitle":
                        f"{artist}-melon",
                },
                {
                    "artist": artist,
                    "platform": "genie",
                    "rank": index + 1,
                    "chartType": "daily",
                    "trackTitle":
                        f"{artist}-genie",
                },
            ]
        )
        bugs_candidates.append(
            {
                "artist": artist,
                "platform": "bugs",
                "rank": index + 2,
                "chartType": "realtime",
                "trackTitle":
                    f"{artist}-bugs",
            }
        )

    mg_json.write_text(
        json.dumps(
            {"candidates": mg_candidates},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    bugs_json.write_text(
        json.dumps(
            {"candidates": bugs_candidates},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    current_json.write_text(
        json.dumps(
            {
                "ranking": [
                    {
                        "artist": artist,
                        "fandexMusicChartFinalPoint":
                            0,
                    }
                    for artist in artists
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    originals = {
        "MG_JSON": preview.MG_JSON,
        "BUGS_JSON": preview.BUGS_JSON,
        "CURRENT_MUSIC_JSON":
            preview.CURRENT_MUSIC_JSON,
        "MUSIC_TARGET_BINDING_FILE":
            preview.MUSIC_TARGET_BINDING_FILE,
        "OUTPUT_CSV": preview.OUTPUT_CSV,
        "REPORT": preview.REPORT,
    }
    preview.MG_JSON = mg_json
    preview.BUGS_JSON = bugs_json
    preview.CURRENT_MUSIC_JSON = current_json
    preview.MUSIC_TARGET_BINDING_FILE = (
        MUSIC_CANDIDATE
    )
    preview.OUTPUT_CSV = preview_csv
    preview.REPORT = preview_report

    try:
        preview.main()
    finally:
        for key, value in originals.items():
            setattr(preview, key, value)

    preview_rows = read_csv(preview_csv)
    assert len(preview_rows) == 63
    assert {
        row["canonicalArtistId"]
        for row in preview_rows
    } == canonical_ids

    history_meta = tmp_path / "music_meta.json"
    latest_json = tmp_path / "music_latest.json"
    history_csv = tmp_path / "music_history.csv"
    report_file = tmp_path / "music_publish.txt"

    history_meta.write_text(
        json.dumps(
            {
                "latestCheckDate":
                    "2026-09-30"
            }
        ),
        encoding="utf-8",
    )

    originals = {
        "PREVIEW_FILE": publish.PREVIEW_FILE,
        "CHECK_HISTORY_JSON":
            publish.CHECK_HISTORY_JSON,
        "LATEST_JSON": publish.LATEST_JSON,
        "HISTORY_FILE": publish.HISTORY_FILE,
        "REPORT_FILE": publish.REPORT_FILE,
    }
    publish.PREVIEW_FILE = preview_csv
    publish.CHECK_HISTORY_JSON = history_meta
    publish.LATEST_JSON = latest_json
    publish.HISTORY_FILE = history_csv
    publish.REPORT_FILE = report_file

    try:
        publish.main()
    finally:
        for key, value in originals.items():
            setattr(publish, key, value)

    latest = read_json(latest_json)
    assert len(latest["ranking"]) == 21
    assert {
        row["canonicalArtistId"]
        for row in latest["ranking"]
    } == canonical_ids

    history_rows = read_csv(history_csv)
    assert len(history_rows) == 21
    assert {
        row["canonicalArtistId"]
        for row in history_rows
    } == canonical_ids


def validate_lastfm_candidate_pipeline(tmp_path):
    candidate_rows = read_csv(
        LASTFM_CANDIDATE
    )
    assert len(candidate_rows) == 19

    canonical_ids = {
        row["canonicalArtistId"]
        for row in candidate_rows
    }
    artists = [
        row["artist"]
        for row in candidate_rows
    ]
    assert len(canonical_ids) == 19
    assert len(set(artists)) == 19

    original_seed = cloud.SEED_FILE
    cloud.SEED_FILE = LASTFM_CANDIDATE
    try:
        seeds = cloud.read_seed()
    finally:
        cloud.SEED_FILE = original_seed

    assert len(seeds) == 19
    assert {
        row["canonicalArtistId"]
        for row in seeds
    } == canonical_ids

    for module in [
        rolling,
        sync,
        runner,
    ]:
        original = module.LASTFM_BINDING_FILE
        module.LASTFM_BINDING_FILE = (
            LASTFM_CANDIDATE
        )
        try:
            bindings = (
                module.load_lastfm_canonical_bindings()
            )
        finally:
            module.LASTFM_BINDING_FILE = original

        assert len(bindings) == 19
        assert set(bindings.values()) == canonical_ids

    delta_rows = []
    for index, row in enumerate(
        candidate_rows,
        start=1,
    ):
        delta_rows.append(
            {
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "status":
                    "delta_ready",
                "previousDate":
                    "2026-09-29",
                "latestDate":
                    "2026-09-30",
                "daysBetween":
                    1,
                "listenerDeltaPerDay":
                    index,
                "playcountDeltaPerDay":
                    index * 10,
            }
        )

    cloud_score = tmp_path / "cloud_score.csv"
    original_score = cloud.SCORE_FILE
    cloud.SCORE_FILE = cloud_score
    try:
        built_scores = cloud.build_score(
            delta_rows
        )
    finally:
        cloud.SCORE_FILE = original_score

    assert len(built_scores) == 19
    assert sorted(
        row["rank"]
        for row in built_scores
    ) == list(range(1, 20))

    delta_csv = tmp_path / "delta.csv"
    with delta_csv.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "canonicalArtistId",
                "artist",
                "previousDate",
                "latestDate",
                "daysBetween",
                "listenerDeltaPerDay",
                "playcountDeltaPerDay",
                "status",
            ],
        )
        writer.writeheader()
        writer.writerows(delta_rows)

    originals = {
        "INPUT_CSV": score.INPUT_CSV,
        "OUTPUT_CSV": score.OUTPUT_CSV,
        "OUTPUT_JSON": score.OUTPUT_JSON,
        "REPORT": score.REPORT,
    }
    score.INPUT_CSV = delta_csv
    score.OUTPUT_CSV = tmp_path / "score.csv"
    score.OUTPUT_JSON = tmp_path / "score.json"
    score.REPORT = tmp_path / "score.txt"
    try:
        score.main()
        score_payload = read_json(
            score.OUTPUT_JSON
        )
    finally:
        for key, value in originals.items():
            setattr(score, key, value)

    assert score_payload["artistCount"] == 19

    history_csv = tmp_path / "lastfm_history.csv"
    history_fields = [
        "snapshotDate",
        "snapshotAt",
        "canonicalArtistId",
        "artist",
        "lastfmName",
        "listeners",
        "playcount",
        "sourceVersion",
    ]

    with history_csv.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=history_fields,
        )
        writer.writeheader()
        for day_index in range(7):
            snapshot_date = (
                f"2026-09-{24 + day_index:02d}"
            )
            for artist_index, row in enumerate(
                candidate_rows,
                start=1,
            ):
                writer.writerow(
                    {
                        "snapshotDate":
                            snapshot_date,
                        "snapshotAt":
                            snapshot_date
                            + "T12:00:00",
                        "canonicalArtistId":
                            row["canonicalArtistId"],
                        "artist":
                            row["artist"],
                        "lastfmName":
                            row["query"],
                        "listeners":
                            100000
                            + artist_index * 100
                            + day_index
                            * artist_index,
                        "playcount":
                            1000000
                            + artist_index * 1000
                            + day_index
                            * artist_index
                            * 10,
                        "sourceVersion":
                            "candidate-fixture",
                    }
                )

    rolling_csv = tmp_path / "rolling.csv"
    rolling_json = tmp_path / "rolling.json"

    originals = {
        "HISTORY_FILE": rolling.HISTORY_FILE,
        "LASTFM_BINDING_FILE":
            rolling.LASTFM_BINDING_FILE,
        "OUTPUT_CSV": rolling.OUTPUT_CSV,
        "OUTPUT_JSON": rolling.OUTPUT_JSON,
    }
    rolling.HISTORY_FILE = history_csv
    rolling.LASTFM_BINDING_FILE = (
        LASTFM_CANDIDATE
    )
    rolling.OUTPUT_CSV = rolling_csv
    rolling.OUTPUT_JSON = rolling_json
    try:
        rolling.main()
    finally:
        for key, value in originals.items():
            setattr(rolling, key, value)

    rolling_rows = read_csv(rolling_csv)
    assert len(rolling_rows) == 19
    assert {
        row["canonicalArtistId"]
        for row in rolling_rows
    } == canonical_ids

    originals = {
        "INPUT_FILE":
            rolling_score.INPUT_FILE,
        "OUTPUT_CSV":
            rolling_score.OUTPUT_CSV,
        "OUTPUT_JSON":
            rolling_score.OUTPUT_JSON,
    }
    rolling_score.INPUT_FILE = rolling_csv
    rolling_score.OUTPUT_CSV = (
        tmp_path / "rolling_score.csv"
    )
    rolling_score.OUTPUT_JSON = (
        tmp_path / "rolling_score.json"
    )
    try:
        rolling_score.main()
        rolling_score_payload = read_json(
            rolling_score.OUTPUT_JSON
        )
    finally:
        for key, value in originals.items():
            setattr(
                rolling_score,
                key,
                value,
            )

    assert (
        rolling_score_payload["artistCount"]
        == 19
    )
    assert (
        rolling_score_payload[
            "scoreReadyCount"
        ]
        == 19
    )


def main():
    assert_materialization_matches_preview()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        validate_music_candidate_pipeline(
            tmp_path
        )
        validate_lastfm_candidate_pipeline(
            tmp_path
        )

    print(
        "PASS: materialized candidate configs match "
        "application preview and support Music 21 / "
        "Last.fm 19 generic pipelines without active mutation"
    )


if __name__ == "__main__":
    main()
