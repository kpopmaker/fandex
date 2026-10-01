import csv
import importlib.util
import io
import json
import os
import sys
import tempfile
from contextlib import redirect_stdout
from datetime import date
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


rolling_score = load_module(
    "product_superset_rolling_score",
    "scripts/fandex-cloud-migration/source/"
    "lastfm_global_interest_rolling_score_preview_v1.py",
)
master = load_module(
    "product_superset_master",
    "scripts/fandex-cloud-migration/source/"
    "fandex_master_score_v10.py",
)
health = load_module(
    "product_superset_health",
    "scripts/fandex-cloud-migration/source/"
    "fandex_python_health_check_v3.py",
)
daily = load_module(
    "product_superset_daily",
    "scripts/fandex-cloud-migration/source/"
    "fandex_daily_summary_v3.py",
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
NAVER_SEED = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_naver_ranking_v3_latest.json"
)
YOUTUBE_SEED = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)
COMPAT_ACTIVE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "artist_source_compatibility_v1.json"
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


def assert_active_compatibility():
    compatibility = read_json(
        COMPAT_ACTIVE
    )
    music = compatibility["sources"][
        "music_chart"
    ]
    lastfm = compatibility["sources"][
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

    for source in [
        "music_chart",
        "lastfm",
    ]:
        row = compatibility["sources"][
            source
        ]
        supported = set(
            row["supportedCanonicalArtistIds"]
        )
        unresolved = set(
            row["unresolvedCanonicalArtistIds"]
        )
        unsupported = set(
            row["unsupportedCanonicalArtistIds"]
        )
        assert not (
            supported & unresolved
            or supported & unsupported
            or unresolved & unsupported
        )
        assert len(
            supported
            | unresolved
            | unsupported
        ) == 355


def product_names():
    naver = read_json(NAVER_SEED)
    youtube = read_json(YOUTUBE_SEED)
    naver_names = [
        row["artist"]
        for row in naver["ranking"]
    ]
    youtube_names = [
        row["artist"]
        for row in youtube["ranking"]
    ]
    assert len(naver_names) == 10
    assert naver_names == youtube_names
    return naver_names


def build_mixed_lastfm(tmp_path):
    active = read_csv(LASTFM_ACTIVE)
    candidate = read_csv(LASTFM_CANDIDATE)
    assert len(active) == 19
    assert len(candidate) == 19
    assert active == candidate

    product = set(product_names())
    active_ids = {
        row["canonicalArtistId"]
        for row in active
        if row["artist"] in product
    }
    assert len(active_ids) == 10

    today = date.today().isoformat()
    input_file = tmp_path / "rolling_input.csv"
    rows = []

    for index, seed in enumerate(
        candidate,
        start=1,
    ):
        ready = (
            seed["canonicalArtistId"]
            in active_ids
        )
        rows.append({
            "canonicalArtistId":
                seed["canonicalArtistId"],
            "artist":
                seed["artist"],
            "latestDate":
                today,
            "snapshotDateCount":
                "8" if ready else "1",
            "rolling3Status":
                "ready"
                if ready
                else "insufficient_history",
            "rolling3ListenerDeltaPerDay":
                str(100 + index)
                if ready
                else "",
            "rolling3PlaycountDeltaPerDay":
                str(1000 + index * 10)
                if ready
                else "",
            "rolling7Status":
                "ready"
                if ready
                else "insufficient_history",
            "rolling7ListenerDeltaPerDay":
                str(90 + index)
                if ready
                else "",
            "rolling7PlaycountDeltaPerDay":
                str(900 + index * 10)
                if ready
                else "",
        })

    write_csv(
        input_file,
        rows,
        rolling_score.REQUIRED_FIELDS,
    )

    output_csv = tmp_path / "lastfm_score.csv"
    output_json = tmp_path / "lastfm_score.json"

    originals = {
        "INPUT_FILE":
            rolling_score.INPUT_FILE,
        "OUTPUT_CSV":
            rolling_score.OUTPUT_CSV,
        "OUTPUT_JSON":
            rolling_score.OUTPUT_JSON,
    }
    rolling_score.INPUT_FILE = input_file
    rolling_score.OUTPUT_CSV = output_csv
    rolling_score.OUTPUT_JSON = output_json

    try:
        rolling_score.main()
    finally:
        for key, value in originals.items():
            setattr(
                rolling_score,
                key,
                value,
            )

    payload = read_json(output_json)
    output_rows = read_csv(output_csv)

    assert payload["artistCount"] == 19
    assert payload["scoreReadyCount"] == 10
    assert payload["activeMode"] == "mixed_by_artist"
    assert payload["activeModeCounts"] == {
        "insufficient_history": 9,
        "rolling3_50_rolling7_50": 10,
    }

    ready = [
        row
        for row in output_rows
        if row[
            "rollingCombinedPreviewPoint"
        ]
    ]
    pending = [
        row
        for row in output_rows
        if not row[
            "rollingCombinedPreviewPoint"
        ]
    ]

    assert len(ready) == 10
    assert len(pending) == 9
    assert {
        row["activeMode"]
        for row in ready
    } == {
        "rolling3_50_rolling7_50"
    }
    assert {
        row["status"]
        for row in ready
    } == {"ok"}
    assert {
        row["activeMode"]
        for row in pending
    } == {"insufficient_history"}

    return output_csv, output_json


def build_music_source(tmp_path):
    candidate = read_json(MUSIC_CANDIDATE)
    active = read_json(MUSIC_ACTIVE)
    assert len(active["artists"]) == 21
    assert len(candidate["artists"]) == 21
    assert active["artists"] == candidate["artists"]

    ranking = []
    today = date.today().isoformat()

    for index, row in enumerate(
        active["artists"],
        start=1,
    ):
        ranking.append({
            "canonicalArtistId":
                row["canonicalArtistId"],
            "artist":
                row["artist"],
            "fandexMusicChartFinalPoint":
                float(index),
            "score":
                float(index),
            "rankedPlatformCount":
                0,
            "rank":
                index,
        })

    path = tmp_path / "music.json"
    path.write_text(
        json.dumps(
            {
                "version":
                    "fandex_music_chart_v2_current_presence_parallel_v1",
                "snapshotDate":
                    today,
                "ranking":
                    ranking,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return path


def run_master(
    tmp_path,
    music_path,
    lastfm_csv,
    lastfm_json,
    naver_path=NAVER_SEED,
    youtube_path=YOUTUBE_SEED,
):
    master_path = tmp_path / "master.json"
    reports_path = tmp_path / "reports.json"
    audit_path = tmp_path / "audit.csv"
    report_path = tmp_path / "master.txt"
    backup_path = tmp_path / "backup"

    originals = {
        "NAVER": master.NAVER,
        "YOUTUBE": master.YOUTUBE,
        "MUSIC": master.MUSIC,
        "LASTFM_CSV": master.LASTFM_CSV,
        "LASTFM_JSON": master.LASTFM_JSON,
        "MASTER": master.MASTER,
        "REPORTS": master.REPORTS,
        "AUDIT": master.AUDIT,
        "REPORT": master.REPORT,
        "PREVIOUS_BACKUP":
            master.PREVIOUS_BACKUP,
    }

    master.NAVER = Path(naver_path)
    master.YOUTUBE = Path(youtube_path)
    master.MUSIC = Path(music_path)
    master.LASTFM_CSV = Path(lastfm_csv)
    master.LASTFM_JSON = Path(lastfm_json)
    master.MASTER = master_path
    master.REPORTS = reports_path
    master.AUDIT = audit_path
    master.REPORT = report_path
    master.PREVIOUS_BACKUP = backup_path

    try:
        master.main()
    finally:
        for key, value in originals.items():
            setattr(master, key, value)

    return (
        master_path,
        reports_path,
        audit_path,
        report_path,
    )


def assert_master_superset_contract(
    tmp_path,
    music_path,
    lastfm_csv,
    lastfm_json,
):
    (
        master_path,
        reports_path,
        _audit,
        _report,
    ) = run_master(
        tmp_path,
        music_path,
        lastfm_csv,
        lastfm_json,
    )

    payload = read_json(master_path)
    product = set(product_names())
    ranking = payload["ranking"]

    assert len(ranking) == 10
    assert {
        row["artist"]
        for row in ranking
    } == product

    cohort = payload["productCohort"]
    assert cohort["authority"] == (
        "naver_youtube_exact_parity"
    )
    assert cohort["artistCount"] == 10
    assert cohort["musicSourceArtistCount"] == 21
    assert cohort[
        "lastfmScoreReadyArtistCount"
    ] == 10
    assert cohort[
        "requiresSourceSuperset"
    ] is True

    lastfm_rows = {
        row["artist"]: row
        for row in read_csv(lastfm_csv)
    }

    for row in ranking:
        name = row["artist"]
        source = row["sourcePoints"]

        assert source["lastfm"][
            "activeMode"
        ] == "rolling3_50_rolling7_50"

        expected = round(
            float(
                source["naver"][
                    "cumulativePoint"
                ]
            )
            + float(
                source["youtube"][
                    "cumulativePoint"
                ]
            )
            + float(
                source["musicChart"][
                    "rawPoint"
                ]
            ) * 0.25
            + float(
                lastfm_rows[name][
                    "rollingCombinedPreviewPoint"
                ]
            ) * 0.25,
            2,
        )
        assert row["fandexFinalPoint"] == expected

    extras = {
        row["artist"]
        for row in read_json(
            MUSIC_CANDIDATE
        )["artists"]
    } - product

    assert extras
    assert extras.isdisjoint({
        row["artist"]
        for row in ranking
    })
    assert reports_path.exists()

    return master_path, reports_path


def expect_master_failure(
    label,
    tmp_path,
    music_path,
    lastfm_csv,
    lastfm_json,
    naver_path=NAVER_SEED,
    youtube_path=YOUTUBE_SEED,
    contains="",
):
    try:
        run_master(
            tmp_path / label,
            music_path,
            lastfm_csv,
            lastfm_json,
            naver_path,
            youtube_path,
        )
        raise AssertionError(
            "expected master failure: "
            + label
        )
    except FileNotFoundError:
        # run_master target directory must exist.
        raise
    except RuntimeError as exc:
        if contains:
            assert contains in str(exc)


def assert_fail_closed_cases(
    tmp_path,
    music_path,
    lastfm_csv,
    lastfm_json,
):
    product = product_names()

    missing_music_dir = (
        tmp_path / "missing_music"
    )
    missing_music_dir.mkdir()
    music_payload = read_json(music_path)
    music_payload["ranking"] = [
        row
        for row in music_payload["ranking"]
        if row["artist"] != product[0]
    ]
    missing_music = (
        missing_music_dir / "music.json"
    )
    missing_music.write_text(
        json.dumps(
            music_payload,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    expect_master_failure(
        "run",
        missing_music_dir,
        missing_music,
        lastfm_csv,
        lastfm_json,
        contains=(
            "Music source missing Product artists"
        ),
    )

    missing_lastfm_dir = (
        tmp_path / "missing_lastfm"
    )
    missing_lastfm_dir.mkdir()
    rows = read_csv(lastfm_csv)
    for row in rows:
        if row["artist"] == product[0]:
            row[
                "rollingCombinedPreviewPoint"
            ] = ""
            row["activeMode"] = (
                "insufficient_history"
            )
            row["status"] = (
                "insufficient_history"
            )
    missing_lastfm = (
        missing_lastfm_dir / "lastfm.csv"
    )
    write_csv(
        missing_lastfm,
        rows,
        rolling_score.OUTPUT_FIELDS,
    )
    expect_master_failure(
        "run",
        missing_lastfm_dir,
        music_path,
        missing_lastfm,
        lastfm_json,
        contains=(
            "Last.fm source missing Product-ready artists"
        ),
    )

    youtube_dir = (
        tmp_path / "youtube_mismatch"
    )
    youtube_dir.mkdir()
    youtube = read_json(YOUTUBE_SEED)
    youtube["ranking"] = (
        youtube["ranking"][:-1]
    )
    youtube_path = (
        youtube_dir / "youtube.json"
    )
    youtube_path.write_text(
        json.dumps(
            youtube,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    expect_master_failure(
        "run",
        youtube_dir,
        music_path,
        lastfm_csv,
        lastfm_json,
        youtube_path=youtube_path,
        contains="product cohort mismatch",
    )


def assert_health_and_daily(
    tmp_path,
    master_path,
    reports_path,
    music_path,
    lastfm_csv,
    lastfm_json,
):
    health_dir = tmp_path / "health"
    health_dir.mkdir()

    music_history = (
        health_dir / "music_history.csv"
    )
    music_payload = read_json(music_path)
    history_rows = [
        {
            "snapshotDate":
                music_payload["snapshotDate"],
            "artist":
                row["artist"],
        }
        for row in music_payload["ranking"]
    ]
    write_csv(
        music_history,
        history_rows,
        ["snapshotDate", "artist"],
    )

    runner = health_dir / "runner.bat"
    runner.write_text(
        "\n".join([
            "FANDEX Daily Python-Only Runner v8",
            "fandex_daily_python_only_v3.py",
            "music_chart_current_presence_publish_v2.py",
            "lastfm_sync_cloud_history_v1_1.py --apply",
            "lastfm_global_interest_rolling_score_preview_v1.py",
            "fandex_master_score_v10.py",
            "fandex_python_status_report_v2.py",
            "fandex_python_health_check_v3.py",
            "fandex_daily_summary_v3.py",
        ]),
        encoding="utf-8",
    )

    daily_stub = health_dir / "daily.py"
    daily_stub.write_text(
        "print('source prep only')\n",
        encoding="utf-8",
    )

    archive = health_dir / "archive.py"
    archive.write_text(
        '\n'.join([
            '"fandex_master_ranking_latest.json"',
            '"fandex_master_artist_reports_latest.json"',
        ]),
        encoding="utf-8",
    )

    health_latest = (
        health_dir / "health.txt"
    )

    originals = {
        "MASTER": health.MASTER,
        "REPORTS": health.REPORTS,
        "MUSIC": health.MUSIC,
        "MUSIC_HISTORY":
            health.MUSIC_HISTORY,
        "LASTFM_JSON":
            health.LASTFM_JSON,
        "LASTFM_CSV":
            health.LASTFM_CSV,
        "RUNNER": health.RUNNER,
        "DAILY": health.DAILY,
        "ARCHIVE": health.ARCHIVE,
        "LATEST": health.LATEST,
    }

    health.MASTER = master_path
    health.REPORTS = reports_path
    health.MUSIC = music_path
    health.MUSIC_HISTORY = music_history
    health.LASTFM_JSON = lastfm_json
    health.LASTFM_CSV = lastfm_csv
    health.RUNNER = runner
    health.DAILY = daily_stub
    health.ARCHIVE = archive
    health.LATEST = health_latest

    required_names = [
        "fandex_master_score_v10.py",
        "fandex_python_status_report_v2.py",
        "fandex_daily_summary_v3.py",
        "rollback_fandex_v10_promotion_v1.py",
    ]
    for name in required_names:
        (
            health_dir / name
        ).write_text(
            "# validation fixture\n",
            encoding="utf-8",
        )

    previous_cwd = Path.cwd()
    os.chdir(health_dir)
    try:
        output = io.StringIO()
        with redirect_stdout(output):
            health.main()
    finally:
        os.chdir(previous_cwd)
        for key, value in originals.items():
            setattr(health, key, value)

    health_text = health_latest.read_text(
        encoding="utf-8"
    )
    assert (
        "OK: FANDEX production v10 healthy"
        in health_text
    )
    assert "failCount: 0" in health_text
    assert "warnCount: 0" in health_text
    assert (
        "Music v2 source superset: "
        "source=21 / product=10 / extra=11"
        in health_text
    )
    assert (
        "Last.fm Product-ready superset: "
        "ready=10 / product=10 / extra=0"
        in health_text
    )
    assert (
        "activeMode: mixed_by_artist"
        in health_text
    )

    daily_originals = {
        "HEALTH": daily.HEALTH,
        "MASTER": daily.MASTER,
        "MUSIC": daily.MUSIC,
        "LASTFM": daily.LASTFM,
    }
    daily.HEALTH = health_latest
    daily.MASTER = master_path
    daily.MUSIC = music_path
    daily.LASTFM = lastfm_json

    try:
        output = io.StringIO()
        with redirect_stdout(output):
            result = daily.main()
        text = output.getvalue()
    finally:
        for key, value in daily_originals.items():
            setattr(daily, key, value)

    assert result == 0
    assert "DAILY RUN SUCCESS" in text
    assert (
        "21 source / 10 Product artists"
        in text
    )
    assert "/63 platforms" in text


def main():
    assert_active_compatibility()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        lastfm_csv, lastfm_json = (
            build_mixed_lastfm(
                tmp_path
            )
        )
        music_path = build_music_source(
            tmp_path
        )

        master_path, reports_path = (
            assert_master_superset_contract(
                tmp_path,
                music_path,
                lastfm_csv,
                lastfm_json,
            )
        )

        assert_fail_closed_cases(
            tmp_path,
            music_path,
            lastfm_csv,
            lastfm_json,
        )

        assert_health_and_daily(
            tmp_path,
            master_path,
            reports_path,
            music_path,
            lastfm_csv,
            lastfm_json,
        )

    print(
        "PASS: staged active Music 21 / Last.fm 19 "
        "operate as strict source supersets around "
        "the unchanged Product 10 cohort; mixed "
        "Last.fm readiness does not become zero or "
        "auto-activate"
    )


if __name__ == "__main__":
    main()
