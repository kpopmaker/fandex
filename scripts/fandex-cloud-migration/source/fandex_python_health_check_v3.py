from __future__ import annotations
import csv
import json
import sys
from datetime import date, datetime
from pathlib import Path

VERSION = "fandex_python_health_check_v3"

MASTER_VERSION = (
    "fandex_master_v10_"
    "music_v2_lastfm_rolling_v1"
)

SCORE_MODE = (
    "uncapped_cumulative_source_points_"
    "with_youtube_v3_"
    "music_chart_v2_x0_25_"
    "lastfm_rolling_x0_25"
)

MASTER = Path(
    "fandex_master_ranking_latest.json"
)
REPORTS = Path(
    "fandex_master_artist_reports_latest.json"
)
MUSIC = Path(
    "fandex_music_chart_ranking_"
    "v2_current_presence_latest.json"
)
MUSIC_HISTORY = Path(
    "music_chart_current_presence_history_v2.csv"
)

LASTFM_JSON = Path(
    "fandex_lastfm_global_interest_"
    "rolling_score_preview_v1_latest.json"
)
if not LASTFM_JSON.exists():
    LASTFM_JSON = Path(
        "lastfm_global_interest_"
        "rolling_score_preview_v1_latest.json"
    )

LASTFM_CSV = Path(
    "lastfm_global_interest_"
    "rolling_score_preview_v1_latest.csv"
)

RUNNER = Path(
    "run_fandex_daily_python_only.bat"
)
DAILY = Path(
    "fandex_daily_python_only_v3.py"
)
ARCHIVE = Path(
    "fandex_archive_generated_files_v1.py"
)
LATEST = Path(
    "fandex_python_health_check_v3_latest.txt"
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
        self.emit("-" * 88)

    def ok(self, text):
        self.emit(f"OK   {text}")

    def fail(self, text):
        self.fail_count += 1
        self.emit(f"FAIL {text}")

    def warn(self, text):
        self.warn_count += 1
        self.emit(f"WARN {text}")


def norm(value):
    return "" if value is None else str(value).strip()


def num(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(
            str(value)
            .replace(",", "")
            .strip()
        )
    except Exception:
        return default


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
    ) as f:
        return list(
            csv.DictReader(f)
        )


def finish(health):
    health.section(
        "Health Check v3 final result"
    )

    if (
        health.fail_count == 0
        and health.warn_count == 0
    ):
        health.emit(
            "OK: FANDEX production v10 healthy"
        )

    elif health.fail_count == 0:
        health.emit(
            "OK WITH WARNINGS: "
            "FANDEX production v10 operational"
        )

    else:
        health.emit(
            "FAIL: FANDEX production "
            "v10 needs review"
        )

    health.emit(
        f"failCount: "
        f"{health.fail_count}"
    )

    health.emit(
        f"warnCount: "
        f"{health.warn_count}"
    )

    health.emit(
        "websiteModified: FALSE"
    )

    health.emit("=" * 88)

    LATEST.write_text(
        "\n".join(
            health.lines
        ) + "\n",
        encoding="utf-8",
    )

    print(
        f"latest: {LATEST}"
    )

    if health.fail_count:
        sys.exit(1)


def main():
    health = Health()

    health.emit()
    health.emit(
        "FANDEX Python Health Check v3"
    )
    health.emit("=" * 88)
    health.emit(
        "createdAt: "
        + datetime.now().isoformat(
            timespec="seconds"
        )
    )
    health.emit(
        f"version: {VERSION}"
    )
    health.emit(
        "scope: production v10 / "
        "Music v2 x0.25 / "
        "Last.fm Rolling x0.25 / "
        "no website export"
    )
    health.emit("=" * 88)

    required = [
        MASTER,
        REPORTS,
        MUSIC,
        MUSIC_HISTORY,
        LASTFM_JSON,
        LASTFM_CSV,
        RUNNER,
        DAILY,
        ARCHIVE,
        Path("fandex_master_score_v10.py"),
        Path(
            "fandex_python_status_report_v2.py"
        ),
        Path(
            "fandex_daily_summary_v3.py"
        ),
        Path(
            "rollback_fandex_v10_"
            "promotion_v1.py"
        ),
    ]

    health.section(
        "Required files"
    )

    for path in required:
        if path.exists():
            health.ok(
                str(path)
            )
        else:
            health.fail(
                f"missing: {path}"
            )

    if health.fail_count:
        finish(health)
        return

    master = read_json(MASTER)

    health.section(
        "Production Master v10"
    )

    if norm(
        master.get("version")
    ) == MASTER_VERSION:
        health.ok(
            f"version: {MASTER_VERSION}"
        )
    else:
        health.fail(
            "version mismatch: "
            + str(
                master.get(
                    "version"
                )
            )
        )

    if norm(
        master.get("scoreMode")
    ) == SCORE_MODE:
        health.ok(
            f"scoreMode: {SCORE_MODE}"
        )
    else:
        health.fail(
            "scoreMode mismatch: "
            + str(
                master.get(
                    "scoreMode"
                )
            )
        )

    if master.get(
        "production"
    ) is True:
        health.ok(
            "production: TRUE"
        )
    else:
        health.fail(
            "production is not TRUE"
        )

    if master.get(
        "pythonOnly"
    ) is True:
        health.ok(
            "pythonOnly: TRUE"
        )
    else:
        health.fail(
            "pythonOnly is not TRUE"
        )

    if master.get(
        "touchesWebsitePublicData"
    ) is False:
        health.ok(
            "touchesWebsitePublicData: FALSE"
        )
    else:
        health.fail(
            "touchesWebsitePublicData "
            "is not FALSE"
        )

    ranking = master.get(
        "ranking",
        [],
    )

    artists = [
        norm(
            row.get("artist")
        )
        for row in ranking
        if isinstance(
            row,
            dict,
        )
    ]

    if (
        len(ranking) == 10
        and len(set(artists)) == 10
    ):
        health.ok(
            "artistCount: 10/10"
        )
    else:
        health.fail(
            "artistCount mismatch: "
            f"rows={len(ranking)}, "
            f"unique={len(set(artists))}"
        )

    ranks = [
        int(
            row.get("rank") or 0
        )
        for row in ranking
        if isinstance(
            row,
            dict,
        )
    ]

    if ranks == list(
        range(
            1,
            11,
        )
    ):
        health.ok(
            "rank sequence: 1-10"
        )
    else:
        health.fail(
            f"rank sequence invalid: {ranks}"
        )

    scores = [
        num(
            row.get(
                "fandexFinalPoint"
            )
        )
        for row in ranking
        if isinstance(
            row,
            dict,
        )
    ]

    if all(
        scores[index]
        >= scores[index + 1]
        for index in range(
            len(scores) - 1
        )
    ):
        health.ok(
            "score order: DESC"
        )
    else:
        health.fail(
            "score order is not DESC"
        )

    arithmetic_bad = []
    source_bad = []
    scale_bad = []

    for row in ranking:
        name = norm(
            row.get("artist")
        )

        source_points = row.get(
            "sourcePoints",
            {},
        )

        if set(
            source_points.keys()
        ) != {
            "naver",
            "youtube",
            "musicChart",
            "lastfm",
        }:
            source_bad.append(name)
            continue

        music = source_points[
            "musicChart"
        ]

        lastfm = source_points[
            "lastfm"
        ]

        if (
            abs(
                num(
                    music.get("scale")
                ) - 0.25
            )
            > 1e-9
            or
            abs(
                num(
                    lastfm.get("scale")
                ) - 0.25
            )
            > 1e-9
        ):
            scale_bad.append(name)

        total = round(
            sum(
                num(
                    source_points[
                        key
                    ].get(
                        "cumulativePoint"
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

        if (
            abs(
                total
                - num(
                    row.get(
                        "fandexFinalPoint"
                    )
                )
            )
            > 0.001
            or
            abs(
                total
                - num(
                    row.get(
                        "sourceTotalCheck"
                    )
                )
            )
            > 0.001
        ):
            arithmetic_bad.append(name)

    if not source_bad:
        health.ok(
            "source structure: 10/10"
        )
    else:
        health.fail(
            "source structure mismatch: "
            + ", ".join(source_bad)
        )

    if not scale_bad:
        health.ok(
            "Music/Last.fm scale: "
            "0.25 (10/10)"
        )
    else:
        health.fail(
            "scale mismatch: "
            + ", ".join(scale_bad)
        )

    if not arithmetic_bad:
        health.ok(
            "production arithmetic mismatch: 0"
        )
    else:
        health.fail(
            "arithmetic mismatch: "
            + ", ".join(
                arithmetic_bad
            )
        )

    music_payload = read_json(
        MUSIC
    )

    health.section(
        "Music v2 source"
    )

    music_ranking = music_payload.get(
        "ranking",
        [],
    )

    music_artists = {
        norm(
            row.get("artist")
        )
        for row in music_ranking
        if isinstance(
            row,
            dict,
        )
        and norm(
            row.get("artist")
        )
    }

    if (
        len(music_ranking) == 10
        and len(
            music_artists
        ) == 10
    ):
        health.ok(
            "Music v2 artistCount: 10/10"
        )
    else:
        health.fail(
            "Music v2 artistCount mismatch: "
            f"{len(music_ranking)}/"
            f"{len(music_artists)}"
        )

    music_date = norm(
        music_payload.get(
            "snapshotDate"
        )
    )

    try:
        music_age = (
            date.today()
            - date.fromisoformat(
                music_date
            )
        ).days

        if music_age <= 1:
            health.ok(
                f"Music v2 ageDays: "
                f"{music_age}"
            )
        else:
            health.fail(
                f"Music v2 ageDays: "
                f"{music_age}"
            )

    except Exception:
        health.fail(
            "invalid Music v2 snapshotDate: "
            f"{music_date}"
        )

    history_rows = read_csv(
        MUSIC_HISTORY
    )

    history_keys = set()
    duplicate_count = 0

    for row in history_rows:
        key = (
            norm(
                row.get(
                    "snapshotDate"
                )
            ),
            norm(
                row.get(
                    "artist"
                )
            ),
        )

        if key in history_keys:
            duplicate_count += 1

        history_keys.add(key)

    if duplicate_count == 0:
        health.ok(
            "Music v2 history duplicate: 0"
        )
    else:
        health.fail(
            "Music v2 history duplicate: "
            f"{duplicate_count}"
        )

    lastfm_payload = read_json(
        LASTFM_JSON
    )

    health.section(
        "Last.fm rolling source"
    )

    if norm(
        lastfm_payload.get(
            "activeMode"
        )
    ) == "rolling3_50_rolling7_50":
        health.ok(
            "activeMode: "
            "rolling3_50_rolling7_50"
        )
    else:
        health.fail(
            "activeMode mismatch: "
            + str(
                lastfm_payload.get(
                    "activeMode"
                )
            )
        )

    if int(
        lastfm_payload.get(
            "scoreReadyCount"
        )
        or 0
    ) == 10:
        health.ok(
            "scoreReadyCount: 10/10"
        )
    else:
        health.fail(
            "scoreReadyCount: "
            + str(
                lastfm_payload.get(
                    "scoreReadyCount"
                )
            )
        )

    lastfm_date = norm(
        lastfm_payload.get(
            "latestDate"
        )
    )

    try:
        lastfm_age = (
            date.today()
            - date.fromisoformat(
                lastfm_date
            )
        ).days

        if lastfm_age <= 1:
            health.ok(
                f"Last.fm ageDays: "
                f"{lastfm_age}"
            )
        elif lastfm_age == 2:
            health.warn(
                f"Last.fm ageDays: "
                f"{lastfm_age}"
            )
        else:
            health.fail(
                f"Last.fm ageDays: "
                f"{lastfm_age}"
            )

    except Exception:
        health.fail(
            "invalid Last.fm latestDate: "
            f"{lastfm_date}"
        )

    health.section(
        "Runner v8 structure"
    )

    runner_text = RUNNER.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    required_tokens = [
        "FANDEX Daily Python-Only Runner v8",
        "fandex_daily_python_only_v3.py",
        "music_chart_current_presence_publish_v2.py",
        "lastfm_sync_cloud_history_v1_1.py --apply",
        "lastfm_global_interest_rolling_score_preview_v1.py",
        "fandex_master_score_v10.py",
        "fandex_python_status_report_v2.py",
        "fandex_python_health_check_v3.py",
        "fandex_daily_summary_v3.py",
    ]

    for token in required_tokens:
        if token in runner_text:
            health.ok(
                f"runner token: {token}"
            )
        else:
            health.fail(
                f"runner token missing: {token}"
            )

    forbidden_tokens = [
        "fandex_master_score_v7.py",
        "fandex_master_v8_build_v1.py",
        "fandex_master_v9_daily_parallel_v1.py",
        "fandex_export_to_site_v1.py",
        "fandex_publish_all_v5.py",
    ]

    found = [
        token
        for token in forbidden_tokens
        if token in runner_text
    ]

    if not found:
        health.ok(
            "legacy/website production "
            "runner tokens absent"
        )
    else:
        health.fail(
            "forbidden runner tokens: "
            + ", ".join(found)
        )

    daily_text = DAILY.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    if (
        "fandex_master_score_v7.py"
        not in daily_text
        and
        "fandex_master_score_v10.py"
        not in daily_text
    ):
        health.ok(
            "daily v3 source-prep "
            "does not build Master"
        )
    else:
        health.fail(
            "daily v3 unexpectedly "
            "builds Master"
        )

    archive_text = ARCHIVE.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    protected = [
        '"fandex_master_ranking_latest.json"',
        '"fandex_master_artist_reports_latest.json"',
    ]

    if all(
        token in archive_text
        for token in protected
    ):
        health.ok(
            "production latest archive "
            "protection: configured"
        )
    else:
        health.fail(
            "production latest archive "
            "protection missing"
        )

    finish(health)


if __name__ == "__main__":
    main()
