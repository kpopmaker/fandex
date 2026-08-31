from __future__ import annotations

import csv
import json
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path


VERSION = "fandex_python_health_check_v2"

V1_SCRIPT = Path(
    "fandex_python_health_check_v1.py"
)

RUNNER_FILE = Path(
    "run_fandex_daily_python_only.bat"
)

MUSIC_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

LASTFM_HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

ROLLING_JSON = Path(
    "lastfm_global_interest_rolling_v1_latest.json"
)

ROLLING_CSV = Path(
    "lastfm_global_interest_rolling_v1_latest.csv"
)

ROLLING_SCORE_JSON = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.json"
)

ROLLING_SCORE_CSV = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

V7_MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

V8_MASTER_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)

V8_BUILDER_SCRIPT = Path(
    "fandex_master_v8_build_v1.py"
)

CLOUD_SYNC_SCRIPT = Path(
    "lastfm_sync_cloud_history_v1_1.py"
)

LATEST_REPORT = Path(
    "fandex_python_health_check_v2_latest.txt"
)


class Health:
    def __init__(self):
        self.lines = []
        self.fail_count = 0
        self.warn_count = 0

    def emit(self, text=""):
        print(text)
        self.lines.append(text)

    def section(self, title):
        self.emit()
        self.emit(title)
        self.emit("-" * 72)

    def ok(self, text):
        self.emit(f"OK   {text}")

    def info(self, text):
        self.emit(f"INFO {text}")

    def warn(self, text):
        self.warn_count += 1
        self.emit(f"WARN {text}")

    def fail(self, text):
        self.fail_count += 1
        self.emit(f"FAIL {text}")


def read_json(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def safe_float(value, default=0.0):
    try:
        if value in [
            None,
            "",
        ]:
            return default

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return default


def check_required_files(h):
    h.section(
        "v2 필수 파일 확인"
    )

    files = [
        V1_SCRIPT,
        RUNNER_FILE,
        MUSIC_FILE,
        CLOUD_SYNC_SCRIPT,
        LASTFM_HISTORY_FILE,
        ROLLING_JSON,
        ROLLING_CSV,
        ROLLING_SCORE_JSON,
        ROLLING_SCORE_CSV,
        V7_MASTER_FILE,
        V8_MASTER_FILE,
        V8_BUILDER_SCRIPT,
    ]

    for path in files:
        if path.exists():
            h.ok(str(path))
        else:
            h.fail(
                f"missing: {path}"
            )


def check_music_v2(h):
    h.section(
        "Music stale decay v2 확인"
    )

    if not MUSIC_FILE.exists():
        h.fail(
            f"missing: {MUSIC_FILE}"
        )
        return

    payload = read_json(
        MUSIC_FILE
    )

    version = norm(
        payload.get(
            "staleDecayVersion"
        )
    )

    if (
        version
        == "music_chart_apply_stale_decay_v2"
    ):
        h.ok(
            f"staleDecayVersion: {version}"
        )
    else:
        h.fail(
            "unexpected staleDecayVersion: "
            f"{version}"
        )

    policy = payload.get(
        "staleDecayPolicy",
        {},
    )

    if (
        policy.get(
            "sourceTypeIndependent"
        )
        is True
    ):
        h.ok(
            "sourceTypeIndependent: TRUE"
        )
    else:
        h.fail(
            "sourceTypeIndependent is not TRUE"
        )

    expected = {
        "days0To3": 1.0,
        "days4To7": 0.7,
        "days8To14": 0.4,
        "days15To30": 0.2,
        "daysOver30": 0.0,
    }

    for key, expected_value in (
        expected.items()
    ):
        actual = policy.get(key)

        if actual == expected_value:
            h.ok(
                f"{key}: {actual}"
            )
        else:
            h.fail(
                f"{key}: "
                f"expected={expected_value}, "
                f"actual={actual}"
            )



    # ------------------------------------------------------------
    # Music source presence / explicit-zero validation
    # ------------------------------------------------------------

    ranking = payload.get(
        "ranking",
        [],
    )

    if not isinstance(
        ranking,
        list,
    ):
        h.fail(
            "Music ranking is not a list"
        )
        return

    artists = []
    zero_count = 0

    for row in ranking:

        if not isinstance(
            row,
            dict,
        ):
            continue

        artist = norm(
            row.get(
                "artist"
            )
        )

        if artist:
            artists.append(
                artist
            )

        raw_point = row.get(
            "fandexMusicChartFinalPoint",
            row.get(
                "score",
                0.0,
            ),
        )

        try:
            point = float(
                raw_point
                if raw_point not in [
                    None,
                    "",
                ]
                else 0.0
            )

        except Exception:
            point = 0.0

        if abs(point) <= 1e-9:
            zero_count += 1

    unique_artists = set(
        artists
    )

    if (
        len(ranking) == 10
        and len(
            unique_artists
        ) == 10
    ):
        h.ok(
            "Music present: 10/10"
        )

    else:
        h.fail(
            "Music presence mismatch: "
            f"rows={len(ranking)}, "
            f"uniqueArtists="
            f"{len(unique_artists)}/10"
        )

    zero_version = norm(
        payload.get(
            "zeroPresenceVersion"
        )
    )

    if (
        zero_version
        == "music_chart_zero_presence_from_history_v2"
    ):
        h.ok(
            "zeroPresenceVersion: "
            f"{zero_version}"
        )

    else:
        h.fail(
            "unexpected zeroPresenceVersion: "
            f"{zero_version or '-'}"
        )

    explicit_zero = payload.get(
        "explicitZeroArtists",
        [],
    )

    if isinstance(
        explicit_zero,
        list,
    ):
        h.ok(
            "explicitZeroArtists: "
            f"{len(explicit_zero)}"
        )

    else:
        h.fail(
            "explicitZeroArtists "
            "is not a list"
        )

    h.ok(
        "Music zeroPresent count: "
        f"{zero_count}"
    )

    zero_script = Path(
        "music_chart_zero_presence_from_history_v2.py"
    )

    if zero_script.exists():
        h.ok(
            "zero presence v2 script exists"
        )

    else:
        h.fail(
            "missing: "
            f"{zero_script}"
        )

    reports_file = Path(
        "fandex_music_chart_artist_reports_v1_latest.json"
    )

    if not reports_file.exists():

        h.fail(
            f"missing: {reports_file}"
        )

    else:

        reports_payload = read_json(
            reports_file
        )

        reports = reports_payload.get(
            "reports",
            {},
        )

        if not isinstance(
            reports,
            dict,
        ):
            h.fail(
                "Music artist reports "
                "is not a dict"
            )

        else:

            report_artists = {
                norm(key)
                for key in reports.keys()
                if norm(key)
            }

            if (
                len(reports) == 10
                and report_artists
                == unique_artists
            ):
                h.ok(
                    "Music reports present: "
                    "10/10"
                )

            else:
                h.fail(
                    "Music reports presence "
                    "mismatch: "
                    f"reports={len(reports)}, "
                    f"rankingArtists="
                    f"{len(unique_artists)}"
                )

def history_summary(h):
    h.section(
        "Last.fm Cloud-synced history 확인"
    )

    if not LASTFM_HISTORY_FILE.exists():
        h.fail(
            f"missing: {LASTFM_HISTORY_FILE}"
        )
        return None

    rows = read_csv(
        LASTFM_HISTORY_FILE
    )

    if not rows:
        h.fail(
            "Last.fm history is empty"
        )
        return None

    keys = set()
    duplicate_count = 0

    by_date = {}

    for row in rows:
        snapshot_date = norm(
            row.get("snapshotDate")
        )

        artist = norm(
            row.get("artist")
        )

        key = (
            snapshot_date,
            artist,
        )

        if key in keys:
            duplicate_count += 1

        keys.add(key)

        by_date.setdefault(
            snapshot_date,
            [],
        ).append(row)

    if duplicate_count == 0:
        h.ok(
            "snapshotDate/artist duplicate: 0"
        )
    else:
        h.fail(
            f"duplicate count: {duplicate_count}"
        )

    dates = sorted(
        by_date
    )

    latest_date = dates[-1]

    incomplete_dates = []

    for snapshot_date in dates:
        artist_count = len({
            norm(row.get("artist"))
            for row in by_date[
                snapshot_date
            ]
        })

        if artist_count != 10:
            incomplete_dates.append(
                (
                    snapshot_date,
                    artist_count,
                )
            )

    if not incomplete_dates:
        h.ok(
            "all snapshots complete: 10/10"
        )
    else:
        for (
            snapshot_date,
            artist_count,
        ) in incomplete_dates:
            h.fail(
                f"incomplete snapshot "
                f"{snapshot_date}: "
                f"{artist_count}/10"
            )

    h.ok(
        f"history rowCount: {len(rows)}"
    )

    h.ok(
        f"snapshotDateCount: {len(dates)}"
    )

    h.ok(
        f"latestDate: {latest_date}"
    )

    try:
        latest = date.fromisoformat(
            latest_date
        )

        age_days = (
            date.today() - latest
        ).days

        if age_days <= 1:
            h.ok(
                f"historyAgeDays: {age_days}"
            )
        elif age_days == 2:
            h.warn(
                f"historyAgeDays: {age_days}"
            )
        else:
            h.fail(
                f"historyAgeDays: {age_days}"
            )

    except Exception:
        h.fail(
            f"invalid latestDate: "
            f"{latest_date}"
        )

    return {
        "rows":
            rows,

        "dates":
            dates,

        "latestDate":
            latest_date,

        "snapshotDateCount":
            len(dates),
    }


def check_runner_cloud_source(h):
    h.section(
        "Daily runner Cloud Last.fm 구조 확인"
    )

    if not RUNNER_FILE.exists():
        h.fail(
            f"missing: {RUNNER_FILE}"
        )
        return

    text = RUNNER_FILE.read_text(
        encoding="utf-8-sig"
    )

    required_tokens = [
        (
            "lastfm_sync_cloud_history_v1_1.py --apply",
            "Cloud history sync",
        ),
        (
            "lastfm_global_interest_rolling_v1.py",
            "rolling calculation",
        ),
        (
            "lastfm_global_interest_rolling_score_preview_v1.py",
            "rolling score preview",
        ),
        (
            "fandex_master_v8_build_v1.py",
            "parallel Master v8 build",
        ),
        (
            "lastfm_rolling_master_impact_preview_v1.py",
            "rolling Master impact preview",
        ),
    ]

    for token, label in required_tokens:
        if token in text:
            h.ok(
                f"{label}: configured"
            )
        else:
            h.fail(
                f"{label}: missing"
            )

    forbidden_daily_tokens = [
        "lastfm_run_auto_v1.py",
        "lastfm_run_secure_v2.py",
        "lastfm_interest_history_v1.py",
        "py lastfm_master_impact_preview_v1.py",
    ]

    found = [
        token
        for token in forbidden_daily_tokens
        if token in text
    ]

    if not found:
        h.ok(
            "local Last.fm collector/history "
            "not used by daily runner"
        )
    else:
        h.fail(
            "local Last.fm fallback unexpectedly "
            "configured in daily runner: "
            + ", ".join(found)
        )


def check_rolling(h, history):
    h.section(
        "Last.fm rolling 계산 확인"
    )

    if history is None:
        h.fail(
            "history unavailable"
        )
        return

    if not ROLLING_JSON.exists():
        h.fail(
            f"missing: {ROLLING_JSON}"
        )
        return

    payload = read_json(
        ROLLING_JSON
    )

    snapshot_count = (
        history[
            "snapshotDateCount"
        ]
    )

    latest_date = (
        history[
            "latestDate"
        ]
    )

    rolling_latest = norm(
        payload.get(
            "latestDate"
        )
    )

    if rolling_latest == latest_date:
        h.ok(
            f"rolling latestDate: "
            f"{rolling_latest}"
        )
    else:
        h.fail(
            "rolling latestDate mismatch: "
            f"history={latest_date}, "
            f"rolling={rolling_latest}"
        )

    artist_count = safe_int(
        payload.get(
            "artistCount"
        )
    )

    if artist_count == 10:
        h.ok(
            "rolling artistCount: 10"
        )
    else:
        h.fail(
            f"rolling artistCount: "
            f"{artist_count}"
        )

    ready3 = safe_int(
        payload.get(
            "rolling3ReadyCount"
        )
    )

    ready7 = safe_int(
        payload.get(
            "rolling7ReadyCount"
        )
    )

    expected3 = (
        10
        if snapshot_count >= 3
        else 0
    )

    expected7 = (
        10
        if snapshot_count >= 7
        else 0
    )

    if ready3 == expected3:
        h.ok(
            f"rolling3ReadyCount: "
            f"{ready3}/10"
        )
    else:
        h.fail(
            "rolling3ReadyCount mismatch: "
            f"expected={expected3}, "
            f"actual={ready3}"
        )

    if ready7 == expected7:
        h.ok(
            f"rolling7ReadyCount: "
            f"{ready7}/10"
        )
    else:
        h.fail(
            "rolling7ReadyCount mismatch: "
            f"expected={expected7}, "
            f"actual={ready7}"
        )

    review_count = safe_int(
        payload.get(
            "needsReviewCount"
        )
    )

    if review_count == 0:
        h.ok(
            "rolling needsReviewCount: 0"
        )
    else:
        h.warn(
            f"rolling needsReviewCount: "
            f"{review_count}"
        )

    if (
        payload.get(
            "masterModified"
        )
        is False
    ):
        h.ok(
            "rolling masterModified: FALSE"
        )
    else:
        h.fail(
            "rolling masterModified "
            "is not FALSE"
        )

    if (
        payload.get(
            "websiteModified"
        )
        is False
    ):
        h.ok(
            "rolling websiteModified: FALSE"
        )
    else:
        h.fail(
            "rolling websiteModified "
            "is not FALSE"
        )


def check_rolling_score(
    h,
    history,
):
    h.section(
        "Last.fm rolling score preview 확인"
    )

    if history is None:
        h.fail(
            "history unavailable"
        )
        return

    if not ROLLING_SCORE_JSON.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_JSON}"
        )
        return

    payload = read_json(
        ROLLING_SCORE_JSON
    )

    snapshot_count = (
        history[
            "snapshotDateCount"
        ]
    )

    latest_date = (
        history[
            "latestDate"
        ]
    )

    score_latest = norm(
        payload.get(
            "latestDate"
        )
    )

    if score_latest == latest_date:
        h.ok(
            f"score latestDate: "
            f"{score_latest}"
        )
    else:
        h.fail(
            "score latestDate mismatch: "
            f"history={latest_date}, "
            f"score={score_latest}"
        )

    if snapshot_count < 3:
        expected_mode = (
            "insufficient_history"
        )
        expected_ready = 0

    elif snapshot_count < 7:
        expected_mode = (
            "rolling3_only"
        )
        expected_ready = 10

    else:
        expected_mode = (
            "rolling3_50_rolling7_50"
        )
        expected_ready = 10

    actual_mode = norm(
        payload.get(
            "activeMode"
        )
    )

    if actual_mode == expected_mode:
        h.ok(
            f"activeMode: "
            f"{actual_mode}"
        )
    else:
        h.fail(
            "activeMode mismatch: "
            f"expected={expected_mode}, "
            f"actual={actual_mode}"
        )

    actual_ready = safe_int(
        payload.get(
            "scoreReadyCount"
        )
    )

    if actual_ready == expected_ready:
        h.ok(
            f"scoreReadyCount: "
            f"{actual_ready}/10"
        )
    else:
        h.fail(
            "scoreReadyCount mismatch: "
            f"expected={expected_ready}, "
            f"actual={actual_ready}"
        )

    review_count = safe_int(
        payload.get(
            "needsReviewCount"
        )
    )

    if review_count == 0:
        h.ok(
            "score needsReviewCount: 0"
        )
    else:
        h.warn(
            f"score needsReviewCount: "
            f"{review_count}"
        )

    if (
        payload.get(
            "masterModified"
        )
        is False
    ):
        h.ok(
            "score masterModified: FALSE"
        )
    else:
        h.fail(
            "score masterModified "
            "is not FALSE"
        )

    if (
        payload.get(
            "websiteModified"
        )
        is False
    ):
        h.ok(
            "score websiteModified: FALSE"
        )
    else:
        h.fail(
            "score websiteModified "
            "is not FALSE"
        )



def check_master_v8(
    h,
    history,
):
    h.section(
        "FANDEX Master v8 parallel candidate 확인"
    )

    if not V7_MASTER_FILE.exists():
        h.fail(
            f"missing: {V7_MASTER_FILE}"
        )
        return

    if not V8_MASTER_FILE.exists():
        h.fail(
            f"missing: {V8_MASTER_FILE}"
        )
        return

    if not ROLLING_SCORE_CSV.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_CSV}"
        )
        return

    if not ROLLING_SCORE_JSON.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_JSON}"
        )
        return


    v7 = read_json(
        V7_MASTER_FILE
    )

    v8 = read_json(
        V8_MASTER_FILE
    )

    rolling_score_payload = read_json(
        ROLLING_SCORE_JSON
    )

    rolling_rows = read_csv(
        ROLLING_SCORE_CSV
    )


    # --------------------------------------------------------
    # Production v7 validation
    # --------------------------------------------------------

    v7_version = norm(
        v7.get(
            "version"
        )
    )

    expected_v7_version = (
        "fandex_master_v7_youtube_v3_"
        "uncapped_cumulative"
    )

    if v7_version == expected_v7_version:
        h.ok(
            f"production v7 version: "
            f"{v7_version}"
        )
    else:
        h.fail(
            "production v7 version mismatch: "
            f"{v7_version}"
        )


    v7_rows = v7.get(
        "ranking",
        [],
    )

    if not isinstance(
        v7_rows,
        list,
    ):
        h.fail(
            "production v7 ranking "
            "is not a list"
        )
        return


    if len(v7_rows) == 10:
        h.ok(
            "production v7 artistCount: 10"
        )
    else:
        h.fail(
            "production v7 artistCount: "
            f"{len(v7_rows)}"
        )


    v7_lastfm_count = 0

    for row in v7_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue

        source_points = row.get(
            "sourcePoints",
            {},
        )

        if (
            isinstance(
                source_points,
                dict,
            )
            and "lastfm" in source_points
        ):
            v7_lastfm_count += 1


    if v7_lastfm_count == 0:
        h.ok(
            "production v7 Last.fm source absent: "
            "10/10"
        )
    else:
        h.fail(
            "production v7 unexpectedly contains "
            f"Last.fm source: {v7_lastfm_count}"
        )


    if (
        v7.get(
            "touchesWebsitePublicData"
        )
        is False
    ):
        h.ok(
            "production v7 "
            "touchesWebsitePublicData: FALSE"
        )
    else:
        h.fail(
            "production v7 "
            "touchesWebsitePublicData "
            "is not FALSE"
        )


    # --------------------------------------------------------
    # v8 top-level validation
    # --------------------------------------------------------

    v8_version = norm(
        v8.get(
            "version"
        )
    )

    expected_v8_version = (
        "fandex_master_v8_lastfm_rolling_v1"
    )

    if v8_version == expected_v8_version:
        h.ok(
            f"v8 version: {v8_version}"
        )
    else:
        h.fail(
            "v8 version mismatch: "
            f"{v8_version}"
        )


    expected_score_mode = (
        "uncapped_cumulative_source_points_"
        "with_youtube_v3_music_chart_v1_"
        "lastfm_rolling_x0_25"
    )

    actual_score_mode = norm(
        v8.get(
            "scoreMode"
        )
    )

    if (
        actual_score_mode
        == expected_score_mode
    ):
        h.ok(
            f"v8 scoreMode: "
            f"{actual_score_mode}"
        )
    else:
        h.fail(
            "v8 scoreMode mismatch: "
            f"{actual_score_mode}"
        )


    if (
        v8.get(
            "pythonOnly"
        )
        is True
    ):
        h.ok(
            "v8 pythonOnly: TRUE"
        )
    else:
        h.fail(
            "v8 pythonOnly is not TRUE"
        )


    if (
        v8.get(
            "touchesWebsitePublicData"
        )
        is False
    ):
        h.ok(
            "v8 touchesWebsitePublicData: FALSE"
        )
    else:
        h.fail(
            "v8 touchesWebsitePublicData "
            "is not FALSE"
        )


    v8_rows = v8.get(
        "ranking",
        [],
    )

    if not isinstance(
        v8_rows,
        list,
    ):
        h.fail(
            "v8 ranking is not a list"
        )
        return


    v8_artists = [
        norm(
            row.get(
                "artist"
            )
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]

    unique_v8_artists = {
        artist
        for artist in v8_artists
        if artist
    }


    if (
        len(v8_rows) == 10
        and len(
            unique_v8_artists
        ) == 10
    ):
        h.ok(
            "v8 artistCount: 10/10"
        )
    else:
        h.fail(
            "v8 artist presence mismatch: "
            f"rows={len(v8_rows)}, "
            f"unique={len(unique_v8_artists)}"
        )


    # --------------------------------------------------------
    # v7/v8 artist identity
    # --------------------------------------------------------

    v7_map = {}

    for row in v7_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue

        artist = norm(
            row.get(
                "artist"
            )
        )

        if not artist:
            continue

        v7_map[
            artist
        ] = safe_float(
            row.get(
                "fandexFinalPoint",
                row.get(
                    "score",
                    0.0,
                ),
            )
        )


    if set(
        v7_map.keys()
    ) == unique_v8_artists:
        h.ok(
            "v7/v8 artist set: MATCH 10/10"
        )
    else:
        h.fail(
            "v7/v8 artist set mismatch"
        )


    # --------------------------------------------------------
    # Rolling score source map
    # --------------------------------------------------------

    if not rolling_rows:
        h.fail(
            "rolling score CSV is empty"
        )
        return


    rolling_fields = set(
        rolling_rows[0].keys()
    )

    rolling_score_field = ""

    for candidate in [
        "rollingCombinedPreviewPoint",
        "rollingCombinedPoint",
        "rollingScore",
        "score",
    ]:
        if candidate in rolling_fields:
            rolling_score_field = candidate
            break


    if not rolling_score_field:
        h.fail(
            "rolling score field not found"
        )
        return


    h.ok(
        "rolling score field: "
        f"{rolling_score_field}"
    )


    rolling_map = {}

    for row in rolling_rows:

        artist = norm(
            row.get(
                "artist"
            )
        )

        if not artist:
            continue

        rolling_map[
            artist
        ] = safe_float(
            row.get(
                rolling_score_field
            )
        )


    if set(
        rolling_map.keys()
    ) == unique_v8_artists:
        h.ok(
            "v8/rolling artist set: "
            "MATCH 10/10"
        )
    else:
        h.fail(
            "v8/rolling artist set mismatch"
        )


    expected_mode = norm(
        rolling_score_payload.get(
            "activeMode"
        )
    )


    if not expected_mode:
        h.fail(
            "rolling score activeMode missing"
        )
        return


    # --------------------------------------------------------
    # Row-level v8 validation
    # --------------------------------------------------------

    lastfm_presence = 0
    scale_mismatch = []
    mode_mismatch = []
    contribution_mismatch = []
    source_total_mismatch = []
    final_score_mismatch = []
    base_score_mismatch = []
    delta_mismatch = []
    score_field_mismatch = []


    for row in v8_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue


        artist = norm(
            row.get(
                "artist"
            )
        )

        source_points = row.get(
            "sourcePoints",
            {},
        )


        if not isinstance(
            source_points,
            dict,
        ):
            h.fail(
                f"{artist}: "
                "sourcePoints is not a dict"
            )
            continue


        lastfm = source_points.get(
            "lastfm"
        )


        if not isinstance(
            lastfm,
            dict,
        ):
            continue


        lastfm_presence += 1


        # scale
        scale = safe_float(
            lastfm.get(
                "scale"
            ),
            -1.0,
        )

        if abs(
            scale - 0.25
        ) > 1e-9:
            scale_mismatch.append(
                artist
            )


        # active mode
        mode = norm(
            lastfm.get(
                "activeMode"
            )
        )

        if mode != expected_mode:
            mode_mismatch.append(
                artist
            )


        # exact contribution from RAW rolling score
        raw_rolling = rolling_map.get(
            artist
        )

        if raw_rolling is None:
            contribution_mismatch.append(
                artist
            )
            continue


        expected_contribution = round(
            raw_rolling * 0.25,
            2,
        )

        actual_contribution = safe_float(
            lastfm.get(
                "cumulativePoint"
            )
        )


        if abs(
            actual_contribution
            - expected_contribution
        ) > 0.001:
            contribution_mismatch.append(
                artist
            )


        # source total
        source_sum = round(
            sum(
                safe_float(
                    source_points
                    .get(
                        key,
                        {},
                    )
                    .get(
                        "cumulativePoint",
                        0.0,
                    )
                )
                for key in [
                    "naver",
                    "youtube",
                    "musicChart",
                    "lastfm",
                ]
            ),
            2,
        )


        source_total_check = safe_float(
            row.get(
                "sourceTotalCheck"
            )
        )


        if abs(
            source_sum
            - source_total_check
        ) > 0.001:
            source_total_mismatch.append(
                artist
            )


        # final score
        final_point = safe_float(
            row.get(
                "fandexFinalPoint"
            )
        )

        if abs(
            final_point
            - source_total_check
        ) > 0.001:
            final_score_mismatch.append(
                artist
            )


        score = safe_float(
            row.get(
                "score"
            )
        )

        if abs(
            score
            - final_point
        ) > 0.001:
            score_field_mismatch.append(
                artist
            )


        # base v7 score
        expected_base = v7_map.get(
            artist
        )

        previous_master = safe_float(
            row.get(
                "previousMasterPoint"
            )
        )


        if (
            expected_base is None
            or abs(
                previous_master
                - expected_base
            ) > 0.001
        ):
            base_score_mismatch.append(
                artist
            )


        # delta from v7
        delta = safe_float(
            row.get(
                "deltaFromPreviousMaster"
            )
        )

        if abs(
            delta
            - expected_contribution
        ) > 0.001:
            delta_mismatch.append(
                artist
            )


        # final = v7 + Last.fm
        if (
            expected_base is not None
            and abs(
                final_point
                - round(
                    expected_base
                    + expected_contribution,
                    2,
                )
            ) > 0.001
        ):
            final_score_mismatch.append(
                artist
            )


    # --------------------------------------------------------
    # Aggregate results
    # --------------------------------------------------------

    if lastfm_presence == 10:
        h.ok(
            "v8 Last.fm source presence: 10/10"
        )
    else:
        h.fail(
            "v8 Last.fm source presence: "
            f"{lastfm_presence}/10"
        )


    if not scale_mismatch:
        h.ok(
            "v8 Last.fm scale: 0.25 (10/10)"
        )
    else:
        h.fail(
            "v8 Last.fm scale mismatch: "
            + ", ".join(
                sorted(
                    set(
                        scale_mismatch
                    )
                )
            )
        )


    if not mode_mismatch:
        h.ok(
            "v8 Last.fm activeMode: "
            f"{expected_mode} (10/10)"
        )
    else:
        h.fail(
            "v8 Last.fm activeMode mismatch: "
            + ", ".join(
                sorted(
                    set(
                        mode_mismatch
                    )
                )
            )
        )


    if not contribution_mismatch:
        h.ok(
            "v8 Last.fm raw rolling ×0.25 "
            "mismatch: 0"
        )
    else:
        h.fail(
            "v8 Last.fm contribution mismatch: "
            + ", ".join(
                sorted(
                    set(
                        contribution_mismatch
                    )
                )
            )
        )


    if not source_total_mismatch:
        h.ok(
            "v8 sourceTotalCheck mismatch: 0"
        )
    else:
        h.fail(
            "v8 sourceTotalCheck mismatch: "
            + ", ".join(
                sorted(
                    set(
                        source_total_mismatch
                    )
                )
            )
        )


    if not final_score_mismatch:
        h.ok(
            "v8 final score mismatch: 0"
        )
    else:
        h.fail(
            "v8 final score mismatch: "
            + ", ".join(
                sorted(
                    set(
                        final_score_mismatch
                    )
                )
            )
        )


    if not score_field_mismatch:
        h.ok(
            "v8 fandexFinalPoint/score "
            "mismatch: 0"
        )
    else:
        h.fail(
            "v8 score field mismatch: "
            + ", ".join(
                sorted(
                    set(
                        score_field_mismatch
                    )
                )
            )
        )


    if not base_score_mismatch:
        h.ok(
            "v8 previousMasterPoint "
            "matches current v7: 10/10"
        )
    else:
        h.fail(
            "v8 previousMasterPoint mismatch: "
            + ", ".join(
                sorted(
                    set(
                        base_score_mismatch
                    )
                )
            )
        )


    if not delta_mismatch:
        h.ok(
            "v8 deltaFromPreviousMaster "
            "matches Last.fm: 10/10"
        )
    else:
        h.fail(
            "v8 deltaFromPreviousMaster mismatch: "
            + ", ".join(
                sorted(
                    set(
                        delta_mismatch
                    )
                )
            )
        )


    # --------------------------------------------------------
    # Rank validation
    # --------------------------------------------------------

    ranks = [
        safe_int(
            row.get(
                "rank"
            ),
            -1,
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]


    if sorted(
        ranks
    ) == list(
        range(
            1,
            11,
        )
    ):
        h.ok(
            "v8 rank sequence: 1-10"
        )
    else:
        h.fail(
            f"v8 rank sequence invalid: {ranks}"
        )


    scores = [
        safe_float(
            row.get(
                "fandexFinalPoint"
            )
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]


    descending = all(
        scores[index]
        >= scores[index + 1]
        for index in range(
            len(scores) - 1
        )
    )


    if descending:
        h.ok(
            "v8 ranking score order: DESC"
        )
    else:
        h.fail(
            "v8 ranking score order "
            "is not DESC"
        )


    if (
        history is not None
        and history.get(
            "snapshotDateCount",
            0,
        ) >= 7
    ):
        if (
            expected_mode
            == "rolling3_50_rolling7_50"
        ):
            h.ok(
                "v8 7-day activation state: READY"
            )
        else:
            h.fail(
                "v8 7-day activation mismatch: "
                f"{expected_mode}"
            )

def run_v1(h):
    h.section(
        "기존 Health Check v1 실행"
    )

    if not V1_SCRIPT.exists():
        h.fail(
            f"missing: {V1_SCRIPT}"
        )
        return

    result = subprocess.run(
        [
            sys.executable,
            str(V1_SCRIPT),
        ],
        check=False,
    )

    if result.returncode == 0:
        h.ok(
            "Health Check v1 passed"
        )
    else:
        h.fail(
            "Health Check v1 failed "
            f"with code "
            f"{result.returncode}"
        )


def main():
    h = Health()

    created_at = (
        datetime.now()
        .isoformat(
            timespec="seconds"
        )
    )

    h.emit()
    h.emit(
        "FANDEX Python Health Check v2"
    )
    h.emit("=" * 72)
    h.emit(
        f"createdAt: {created_at}"
    )
    h.emit(
        f"version: {VERSION}"
    )
    h.emit(
        "scope: Python-only / "
        "Cloud Last.fm + Rolling / "
        "no website export"
    )
    h.emit("=" * 72)

    run_v1(h)

    check_required_files(h)

    check_music_v2(h)

    history = history_summary(h)

    check_runner_cloud_source(h)

    check_rolling(
        h,
        history,
    )

    check_rolling_score(
        h,
        history,
    )

    check_master_v8(
        h,
        history,
    )


    h.section(
        "Health Check v2 final result"
    )

    if h.fail_count == 0:
        if h.warn_count == 0:
            h.emit(
                "OK: FANDEX Python-only v2 healthy"
            )
        else:
            h.emit(
                "OK WITH WARNINGS: "
                "FANDEX Python-only v2 operational"
            )
    else:
        h.emit(
            "FAIL: FANDEX Python-only v2 needs review"
        )

    h.emit(
        f"failCount: {h.fail_count}"
    )

    h.emit(
        f"warnCount: {h.warn_count}"
    )

    h.emit(
        "masterModified: FALSE"
    )

    h.emit(
        "websiteModified: FALSE"
    )

    h.emit("=" * 72)

    timestamp_report = Path(
        "fandex_python_health_check_v2_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
        + ".txt"
    )

    report_text = "\n".join(
        h.lines
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print(
        f"report: {timestamp_report}"
    )

    print(
        f"latest: {LATEST_REPORT}"
    )

    if h.fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
