from __future__ import annotations

import json
import py_compile
import shutil
import subprocess
import sys
import textwrap
from datetime import datetime
from pathlib import Path

VERSION = "promote_fandex_master_v10_apply_v1"
APPLY = "--apply" in sys.argv

CURRENT_MASTER = Path("fandex_master_ranking_latest.json")
CURRENT_REPORTS = Path("fandex_master_artist_reports_latest.json")
RUNNER = Path("run_fandex_daily_python_only.bat")
READINESS = Path("fandex_master_v9_promotion_readiness_latest.json")
PRECHECK = Path("fandex_master_v10_promotion_precheck_latest.json")
STATUS_LATEST = Path("fandex_python_status_report_latest.txt")
HEALTH_V2_LATEST = Path("fandex_python_health_check_v2_latest.txt")
MANIFEST = Path("fandex_v10_promotion_manifest_latest.json")

TARGET_VERSION = "fandex_master_v10_music_v2_lastfm_rolling_v1"
OLD_VERSION = "fandex_master_v7_youtube_v3_uncapped_cumulative"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_text(path: Path, text: str):
    path.write_text(textwrap.dedent(text).lstrip(), encoding="utf-8")


DAILY_V3 = r"""
from __future__ import annotations
import argparse
import csv
import subprocess
import sys
from datetime import datetime
from pathlib import Path

VERSION = "fandex_daily_python_only_v3_source_prep_no_master_no_site_export"


def run_step(step_no, title, script, args=None, log_rows=None):
    args = args or []
    log_rows = log_rows if log_rows is not None else []
    cmd = [sys.executable, script] + args

    print()
    print(f"[{step_no}. {title}]")
    print(f"실행 파일: {script}")
    if args:
        print(f"args: {' '.join(args)}")

    started_at = datetime.now().isoformat(timespec="seconds")
    result = subprocess.run(cmd, check=False)
    ended_at = datetime.now().isoformat(timespec="seconds")

    log_rows.append({
        "step": step_no,
        "title": title,
        "script": script,
        "args": " ".join(args),
        "status": "OK" if result.returncode == 0 else "FAIL",
        "returncode": result.returncode,
        "startedAt": started_at,
        "endedAt": ended_at,
    })

    if result.returncode != 0:
        raise SystemExit(result.returncode)


def write_log(rows, timestamp):
    path = Path(f"fandex_daily_python_only_v3_log_{timestamp}.csv")
    fields = [
        "step", "title", "script", "args", "status",
        "returncode", "startedAt", "endedAt"
    ]

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh-youtube", action="store_true")
    parser.add_argument("--skip-bugs", action="store_true")
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    rows = []

    print()
    print("FANDEX daily python-only v3 source preparation")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("production Master는 이 스크립트에서 생성하지 않습니다.")
    print("website public/data export는 실행하지 않습니다.")
    print("=" * 72)

    step = 1

    if not args.skip_bugs:
        run_step(
            step,
            "Bugs chart 자동 수집",
            "music_chart_collect_bugs_v1.py",
            log_rows=rows,
        )
        step += 1

        run_step(
            step,
            "Bugs 수집 결과 seed 반영",
            "music_chart_apply_bugs_results_v1.py",
            log_rows=rows,
        )
        step += 1

    if args.refresh_youtube:
        run_step(
            step,
            "YouTube metrics 재수집",
            "youtube_collect_video_metrics_v1.py",
            log_rows=rows,
        )
        step += 1

    run_step(
        step,
        "YouTube v3 점수 생성",
        "youtube_publish_v3.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 원점수 생성",
        "music_chart_publish_v1.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 seed 신선도 감사",
        "music_chart_seed_freshness_audit_v1.py",
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 stale decay 반영",
        "music_chart_apply_stale_decay_v2.py",
        ["--apply"],
        log_rows=rows,
    )
    step += 1

    run_step(
        step,
        "Legacy Music v1 schema presence v3 반영",
        "music_chart_schema_presence_v3.py",
        ["--apply"],
        log_rows=rows,
    )

    log = write_log(rows, timestamp)

    print()
    print("FANDEX daily python-only v3 source preparation complete")
    print(f"log: {log}")
    print("production Master modified here: FALSE")
    print("website public/data touched: FALSE")


if __name__ == "__main__":
    main()
"""


BUILDER_V10 = r"""
from __future__ import annotations
import csv
import json
import shutil
from datetime import datetime
from pathlib import Path

VERSION = "fandex_master_v10_music_v2_lastfm_rolling_v1"
SCORE_MODE = "uncapped_cumulative_source_points_with_youtube_v3_music_chart_v2_x0_25_lastfm_rolling_x0_25"
MUSIC_SCALE = 0.25
LASTFM_SCALE = 0.25

NAVER = Path("fandex_naver_ranking_v3_latest.json")
YOUTUBE = Path("fandex_youtube_ranking_v3_latest.json")
MUSIC = Path("fandex_music_chart_ranking_v2_current_presence_latest.json")
LASTFM_CSV = Path("lastfm_global_interest_rolling_score_preview_v1_latest.csv")

LASTFM_JSON = Path(
    "fandex_lastfm_global_interest_rolling_score_preview_v1_latest.json"
)
if not LASTFM_JSON.exists():
    LASTFM_JSON = Path(
        "lastfm_global_interest_rolling_score_preview_v1_latest.json"
    )

MASTER = Path("fandex_master_ranking_latest.json")
REPORTS = Path("fandex_master_artist_reports_latest.json")
AUDIT = Path("fandex_master_v10_audit.csv")
REPORT = Path("FANDEX_MASTER_V10_REPORT.txt")
PREVIOUS_BACKUP = Path("master_v10_previous_latest")


def read_json(path):
    if not path.exists():
        raise RuntimeError(f"missing: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_csv(path):
    if not path.exists():
        raise RuntimeError(f"missing: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def norm(value):
    return "" if value is None else str(value).strip()


def num(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(str(value).replace(",", "").strip())
    except Exception:
        return default


def rows(payload):
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]

    if not isinstance(payload, dict):
        return []

    for key in [
        "ranking", "rankings", "artists", "items", "results", "data"
    ]:
        value = payload.get(key)
        if isinstance(value, list):
            return [x for x in value if isinstance(x, dict)]

    return []


def artist(row):
    for key in ["artist", "artistName", "name", "displayName"]:
        value = norm(row.get(key))
        if value:
            return value
    return ""


def first(row, keys):
    for key in keys:
        if key in row and row.get(key) not in [None, ""]:
            return num(row.get(key))
    return 0.0


def make_map(payload, keys):
    result = {}

    for row in rows(payload):
        name = artist(row)
        if name:
            result[name] = first(row, keys)

    return result


def previous_map():
    if not MASTER.exists():
        return {}

    payload = read_json(MASTER)
    result = {}

    for row in rows(payload):
        name = artist(row)
        if name:
            result[name] = first(
                row,
                [
                    "fandexFinalPoint",
                    "score",
                    "masterPoint",
                    "totalPoint",
                ],
            )

    return result


def main():
    naver = make_map(
        read_json(NAVER),
        [
            "fandexNaverFinalPoint",
            "fandexNaverPoint",
            "fandexNaverScore",
            "naverFinalPoint",
            "naverPoint",
            "naverScore",
            "naverTotalPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexFinalPoint",
        ],
    )

    youtube = make_map(
        read_json(YOUTUBE),
        [
            "youtubePoint",
            "youtubeFinalPoint",
            "youtubeScore",
            "cumulativePoint",
            "totalPoint",
            "score",
        ],
    )

    music_payload = read_json(MUSIC)

    music = make_map(
        music_payload,
        [
            "fandexMusicChartFinalPoint",
            "musicChartFinalPoint",
            "musicChartPoint",
            "musicV2Point",
            "musicPoint",
            "musicScore",
            "finalPoint",
            "score",
        ],
    )

    lastfm_rows = read_csv(LASTFM_CSV)

    if not lastfm_rows:
        raise RuntimeError("Last.fm rolling score CSV empty")

    fields = set(lastfm_rows[0].keys())

    score_field = next(
        (
            field
            for field in [
                "rollingCombinedPreviewPoint",
                "rollingCombinedPoint",
                "rollingScore",
                "score",
            ]
            if field in fields
        ),
        "",
    )

    if not score_field:
        raise RuntimeError("Last.fm rolling score field not found")

    lastfm = {}

    for row in lastfm_rows:
        name = norm(
            row.get("artist")
            or row.get("artistName")
            or row.get("name")
        )

        if name:
            lastfm[name] = num(row.get(score_field))

    sets = [
        set(naver),
        set(youtube),
        set(music),
        set(lastfm),
    ]

    if (
        any(artist_set != sets[0] for artist_set in sets[1:])
        or len(sets[0]) != 10
    ):
        raise RuntimeError(
            "source artist set mismatch: "
            + " | ".join(
                f"{name}={len(artist_set)}"
                for name, artist_set in zip(
                    ["naver", "youtube", "musicV2", "lastfm"],
                    sets,
                )
            )
        )

    rolling_payload = read_json(LASTFM_JSON)
    active_mode = norm(rolling_payload.get("activeMode"))

    if active_mode != "rolling3_50_rolling7_50":
        raise RuntimeError(
            f"unexpected Last.fm activeMode: {active_mode}"
        )

    old = previous_map()

    ranking = []
    report_map = {}

    for name in sorted(sets[0]):
        naver_point = round(naver[name], 2)
        youtube_point = round(youtube[name], 2)

        music_raw = round(music[name], 4)
        lastfm_raw = round(lastfm[name], 4)

        music_point = round(
            music_raw * MUSIC_SCALE,
            2,
        )

        lastfm_point = round(
            lastfm_raw * LASTFM_SCALE,
            2,
        )

        total = round(
            naver_point
            + youtube_point
            + music_point
            + lastfm_point,
            2,
        )

        previous = round(
            old.get(name, total),
            2,
        )

        item = {
            "artist": name,
            "fandexFinalPoint": total,
            "score": total,
            "previousMasterPoint": previous,
            "deltaFromPreviousMaster": round(
                total - previous,
                2,
            ),
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": naver_point,
                    "sourceVersion": "naver_v3",
                    "sourceReadMode": "latest_direct",
                },
                "youtube": {
                    "cumulativePoint": youtube_point,
                    "sourceVersion": "youtube_v3",
                    "sourceReadMode": "latest_direct",
                },
                "musicChart": {
                    "cumulativePoint": music_point,
                    "rawPoint": music_raw,
                    "scale": MUSIC_SCALE,
                    "sourceVersion": (
                        "fandex_music_chart_v2_"
                        "current_presence_parallel_v1"
                    ),
                    "sourceReadMode": (
                        "validated_current_presence_x0_25"
                    ),
                },
                "lastfm": {
                    "cumulativePoint": lastfm_point,
                    "rawPoint": lastfm_raw,
                    "scale": LASTFM_SCALE,
                    "activeMode": active_mode,
                    "sourceVersion": (
                        "lastfm_global_interest_"
                        "rolling_score_preview_v1"
                    ),
                    "sourceReadMode": (
                        "validated_rolling_x0_25"
                    ),
                },
            },
            "sourceTotalCheck": total,
        }

        ranking.append(item)

    ranking.sort(
        key=lambda row: (
            -row["fandexFinalPoint"],
            row["artist"],
        )
    )

    for rank, item in enumerate(
        ranking,
        start=1,
    ):
        item["rank"] = rank

        report_map[
            item["artist"]
        ] = {
            "artist": item["artist"],
            "rank": rank,
            "version": VERSION,
            "scoreMode": SCORE_MODE,
            "fandexFinalPoint": item["fandexFinalPoint"],
            "previousMasterPoint": item[
                "previousMasterPoint"
            ],
            "deltaFromPreviousMaster": item[
                "deltaFromPreviousMaster"
            ],
            "sourcePoints": item["sourcePoints"],
        }

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": SCORE_MODE,
        "production": True,
        "formula": (
            "Naver v3 + YouTube v3 "
            "+ Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        "sourceFiles": {
            "naver": str(NAVER),
            "youtube": str(YOUTUBE),
            "musicChart": str(MUSIC),
            "lastfmRolling": str(LASTFM_CSV),
        },
        "ranking": ranking,
    }

    reports_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": SCORE_MODE,
        "production": True,
        "reports": report_map,
    }

    PREVIOUS_BACKUP.mkdir(
        exist_ok=True
    )

    for path in [
        MASTER,
        REPORTS,
    ]:
        if path.exists():
            shutil.copy2(
                path,
                PREVIOUS_BACKUP / path.name,
            )

    MASTER.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    REPORTS.write_text(
        json.dumps(
            reports_payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    fieldnames = [
        "rank",
        "artist",
        "fandexFinalPoint",
        "previousMasterPoint",
        "deltaFromPreviousMaster",
        "naverPoint",
        "youtubePoint",
        "musicV2RawPoint",
        "musicV2Contribution",
        "lastfmRawPoint",
        "lastfmContribution",
    ]

    with AUDIT.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )
        writer.writeheader()

        for item in ranking:
            source_points = item["sourcePoints"]

            writer.writerow({
                "rank": item["rank"],
                "artist": item["artist"],
                "fandexFinalPoint": item[
                    "fandexFinalPoint"
                ],
                "previousMasterPoint": item[
                    "previousMasterPoint"
                ],
                "deltaFromPreviousMaster": item[
                    "deltaFromPreviousMaster"
                ],
                "naverPoint": source_points[
                    "naver"
                ]["cumulativePoint"],
                "youtubePoint": source_points[
                    "youtube"
                ]["cumulativePoint"],
                "musicV2RawPoint": source_points[
                    "musicChart"
                ]["rawPoint"],
                "musicV2Contribution": source_points[
                    "musicChart"
                ]["cumulativePoint"],
                "lastfmRawPoint": source_points[
                    "lastfm"
                ]["rawPoint"],
                "lastfmContribution": source_points[
                    "lastfm"
                ]["cumulativePoint"],
            })

    lines = [
        "FANDEX Master v10 Production Report",
        "=" * 88,
        (
            "createdAt: "
            + datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        f"version: {VERSION}",
        f"scoreMode: {SCORE_MODE}",
        (
            "formula: Naver v3 + YouTube v3 "
            "+ Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        "websiteModified: FALSE",
        "",
        "Ranking",
        "-" * 88,
    ]

    for item in ranking:
        source_points = item["sourcePoints"]

        lines.append(
            f"{item['rank']}위 "
            f"{item['artist']} "
            f"| FANDEX "
            f"{item['fandexFinalPoint']:.2f} "
            f"| Naver "
            f"{source_points['naver']['cumulativePoint']:.2f} "
            f"| YouTube "
            f"{source_points['youtube']['cumulativePoint']:.2f} "
            f"| Music "
            f"{source_points['musicChart']['rawPoint']:.2f} "
            f"x0.25="
            f"{source_points['musicChart']['cumulativePoint']:.2f} "
            f"| Last.fm "
            f"{source_points['lastfm']['rawPoint']:.2f} "
            f"x0.25="
            f"{source_points['lastfm']['cumulativePoint']:.2f}"
        )

    REPORT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    print()
    print(
        "FANDEX Master v10 production ranking"
    )
    print("=" * 88)

    for item in ranking:
        print(
            f"{item['rank']}위 "
            f"{item['artist']} "
            f"| {item['fandexFinalPoint']:.2f}"
        )

    print("=" * 88)
    print(f"version: {VERSION}")
    print("productionModified: TRUE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()
"""


STATUS_V2 = r"""
from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path

MASTER = Path(
    "fandex_master_ranking_latest.json"
)
LATEST = Path(
    "fandex_python_status_report_latest.txt"
)
VERSION = "fandex_python_status_report_v2"


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def main():
    if not MASTER.exists():
        raise RuntimeError(
            f"missing: {MASTER}"
        )

    payload = read_json(MASTER)

    lines = [
        "FANDEX Python Status Report v2",
        "=" * 88,
        (
            "createdAt: "
            + datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        (
            "masterVersion: "
            + str(
                payload.get(
                    "version"
                )
            )
        ),
        (
            "scoreMode: "
            + str(
                payload.get(
                    "scoreMode"
                )
            )
        ),
        (
            "productionFormula: "
            "Naver v3 + YouTube v3 "
            "+ Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        "",
        "Current FANDEX production ranking",
        "-" * 88,
    ]

    for item in payload.get(
        "ranking",
        [],
    ):
        source_points = item.get(
            "sourcePoints",
            {},
        )

        naver = source_points.get(
            "naver",
            {},
        )
        youtube = source_points.get(
            "youtube",
            {},
        )
        music = source_points.get(
            "musicChart",
            {},
        )
        lastfm = source_points.get(
            "lastfm",
            {},
        )

        lines.append(
            f"{item.get('rank')}위 "
            f"{item.get('artist')} "
            f"| FANDEX "
            f"{item.get('fandexFinalPoint')} "
            f"| Naver "
            f"{naver.get('cumulativePoint', 0)} "
            f"| YouTube "
            f"{youtube.get('cumulativePoint', 0)} "
            f"| Music raw "
            f"{music.get('rawPoint', 0)} "
            f"x{music.get('scale', 0)}="
            f"{music.get('cumulativePoint', 0)} "
            f"| Last.fm raw "
            f"{lastfm.get('rawPoint', 0)} "
            f"x{lastfm.get('scale', 0)}="
            f"{lastfm.get('cumulativePoint', 0)}"
        )

    lines.extend([
        "",
        "Daily operation",
        "-" * 88,
        "run_fandex_daily_python_only.bat",
        "",
        "Safety",
        "-" * 88,
        (
            "Website public/data export is "
            "NOT part of the daily runner."
        ),
        "Do not run:",
        "py fandex_export_to_site_v1.py",
        "py fandex_publish_all_v5.py",
        (
            "py fandex_publish_all_v5.py "
            "--refresh-youtube"
        ),
    ])

    text = "\n".join(lines) + "\n"

    LATEST.write_text(
        text,
        encoding="utf-8",
    )

    print(text)


if __name__ == "__main__":
    main()
"""


HEALTH_V3 = r"""
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
"""


SUMMARY_V3 = r"""
from __future__ import annotations
import json
from pathlib import Path

HEALTH = Path(
    "fandex_python_health_check_v3_latest.txt"
)
MASTER = Path(
    "fandex_master_ranking_latest.json"
)
MUSIC = Path(
    "fandex_music_chart_ranking_"
    "v2_current_presence_latest.json"
)

LASTFM = Path(
    "fandex_lastfm_global_interest_"
    "rolling_score_preview_v1_latest.json"
)
if not LASTFM.exists():
    LASTFM = Path(
        "lastfm_global_interest_"
        "rolling_score_preview_v1_latest.json"
    )

EXPECTED = (
    "fandex_master_v10_"
    "music_v2_lastfm_rolling_v1"
)


def read_json(path):
    if not path.exists():
        return {}

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def main():
    health_text = (
        HEALTH.read_text(
            encoding="utf-8-sig",
            errors="replace",
        )
        if HEALTH.exists()
        else ""
    )

    health_ok = (
        "OK: FANDEX production v10 healthy"
        in health_text
        and
        "failCount: 0"
        in health_text
        and
        "warnCount: 0"
        in health_text
    )

    master = read_json(
        MASTER
    )
    music = read_json(
        MUSIC
    )
    lastfm = read_json(
        LASTFM
    )

    master_ok = (
        master.get(
            "version"
        ) == EXPECTED
        and
        len(
            master.get(
                "ranking",
                [],
            )
        ) == 10
    )

    music_ranking = music.get(
        "ranking",
        [],
    )

    ranked_platforms = sum(
        int(
            row.get(
                "rankedPlatformCount"
            )
            or 0
        )
        for row in music_ranking
        if isinstance(
            row,
            dict,
        )
    )

    overall_ok = (
        health_ok
        and
        master_ok
        and
        len(
            music_ranking
        ) == 10
    )

    print()
    print("=" * 64)
    print("FANDEX DAILY SUMMARY")
    print("=" * 64)

    print(
        f"Runner v8        : "
        f"{'PASS' if overall_ok else 'CHECK'}"
    )

    print(
        f"Health v3        : "
        f"{'PASS' if health_ok else 'FAIL'}"
    )

    print(
        f"Master v10       : "
        f"{'OK' if master_ok else 'FAIL'}"
    )

    print(
        f"Music v2         : "
        f"{len(music_ranking)}/10 artists"
    )

    print(
        f"Music v2 ranked  : "
        f"{ranked_platforms}/30 platforms"
    )

    print(
        f"Music v2 latest  : "
        f"{music.get('snapshotDate', '-')}"
    )

    print(
        f"Last.fm latest   : "
        f"{lastfm.get('latestDate', '-')}"
    )

    print(
        "Website touched  : NO"
    )

    print("-" * 64)

    if overall_ok:
        print(
            "DAILY RUN SUCCESS"
        )
    else:
        print(
            "DAILY RUN NEEDS REVIEW"
        )

    print("=" * 64)

    return 0 if overall_ok else 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
"""


ROLLBACK = r"""
from __future__ import annotations
import json
import shutil
from datetime import datetime
from pathlib import Path

MANIFEST = Path(
    "fandex_v10_promotion_manifest_latest.json"
)


def main():
    if not MANIFEST.exists():
        raise RuntimeError(
            "promotion manifest missing"
        )

    data = json.loads(
        MANIFEST.read_text(
            encoding="utf-8-sig"
        )
    )

    backup = Path(
        data.get(
            "backupDir",
            "",
        )
    )

    if not backup.exists():
        raise RuntimeError(
            f"backup directory missing: {backup}"
        )

    safety = Path(
        "rollback_snapshot_before_restore_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    safety.mkdir()

    for name in [
        "run_fandex_daily_python_only.bat",
        "fandex_master_ranking_latest.json",
        "fandex_master_artist_reports_latest.json",
        "fandex_python_status_report_latest.txt",
    ]:
        path = Path(name)

        if path.exists():
            shutil.copy2(
                path,
                safety / path.name,
            )

    restored = []

    for path in backup.iterdir():
        if path.is_file():
            target = Path(
                path.name
            )

            shutil.copy2(
                path,
                target,
            )

            restored.append(
                path.name
            )

    data[
        "status"
    ] = "ROLLED_BACK_MANUALLY"

    data[
        "rolledBackAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    data[
        "rollbackSafetySnapshot"
    ] = str(safety)

    MANIFEST.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "ROLLBACK COMPLETE"
    )

    print(
        "restored: "
        + ", ".join(
            sorted(restored)
        )
    )

    print(
        f"safety snapshot: {safety}"
    )

    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()
"""


RUNNER_V8 = r"""
@echo off
chcp 65001 > nul
cd /d "%USERPROFILE%\Desktop\naver_data_collector"

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v8 - Production Master v10
echo ============================================================
echo This runner does NOT export to website public/data.
echo Production formula: Naver v3 + YouTube v3 + Music v2 x0.25 + Last.fm Rolling x0.25
echo Last.fm daily history source: GitHub Cloud History.
echo Legacy v7/v8/v9 builders are preserved but NOT executed.
echo.

echo [1/16] Prepare Python-only sources
py fandex_daily_python_only_v3.py
if errorlevel 1 goto :fail

echo.
echo [2/16] Discover Melon + Genie current presence for all 10 artists
py music_chart_discover_artist_candidates_v2.py
if errorlevel 1 goto :fail

echo.
echo [3/16] Discover Bugs current presence for all 10 artists
py music_chart_discover_bugs_all_targets_v1.py
if errorlevel 1 goto :fail

echo.
echo [4/16] Update Music chart check history
py music_chart_check_history_v1.py
if errorlevel 1 goto :fail

echo.
echo [5/16] Build Music v2 current-presence preview
py music_chart_current_presence_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [6/16] Publish Music v2 current-presence snapshot
py music_chart_current_presence_publish_v2.py
if errorlevel 1 goto :fail

echo.
echo [7/16] Sync GitHub Cloud Last.fm history to local
py lastfm_sync_cloud_history_v1_1.py --apply
if errorlevel 1 goto :fail

echo.
echo [8/16] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py
if errorlevel 1 goto :fail

echo.
echo [9/16] Build Last.fm 1-day score preview
py lastfm_global_interest_score_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [10/16] Build Last.fm rolling windows
py lastfm_global_interest_rolling_v1.py
if errorlevel 1 goto :fail

echo.
echo [11/16] Build Last.fm rolling score
py lastfm_global_interest_rolling_score_preview_v1.py
if errorlevel 1 goto :fail

echo.
echo [12/16] Build production FANDEX Master v10
py fandex_master_score_v10.py
if errorlevel 1 goto :fail

echo.
echo [13/16] Build production status report
py fandex_python_status_report_v2.py
if errorlevel 1 goto :fail

echo.
echo [14/16] Run production Health v3
py fandex_python_health_check_v3.py
if errorlevel 1 goto :fail

echo.
echo [15/16] Archive generated timestamp/log/audit files
py fandex_archive_generated_files_v1.py --apply
if errorlevel 1 goto :fail

echo.
echo [16/16] Current core files
dir fandex_master_ranking_latest.json
dir fandex_master_artist_reports_latest.json
dir fandex_music_chart_ranking_v2_current_presence_latest.json
dir music_chart_current_presence_history_v2.csv
dir lastfm_global_interest_rolling_score_preview_v1_latest.csv
dir fandex_python_status_report_latest.txt
dir fandex_python_health_check_v3_latest.txt

echo.
echo ============================================================
echo FANDEX Daily Python-Only Runner v8 Complete
echo ============================================================
echo Production Master: v10
echo Music source: Music v2 current presence x0.25
echo Last.fm source: rolling x0.25
echo Website public/data was NOT touched.
echo.
echo ============================================================
echo Daily Summary
echo ============================================================
py fandex_daily_summary_v3.py
if errorlevel 1 goto :fail

echo.
pause
exit /b 0

:fail
echo.
echo ============================================================
echo FANDEX DAILY RUN FAILED
echo ============================================================
echo Review the failed step above.
pause
exit /b 1
"""


GENERATED = {
    "fandex_daily_python_only_v3.py": DAILY_V3,
    "fandex_master_score_v10.py": BUILDER_V10,
    "fandex_python_status_report_v2.py": STATUS_V2,
    "fandex_python_health_check_v3.py": HEALTH_V3,
    "fandex_daily_summary_v3.py": SUMMARY_V3,
    "rollback_fandex_v10_promotion_v1.py": ROLLBACK,
}


def validate_preconditions():
    required = [
        CURRENT_MASTER,
        CURRENT_REPORTS,
        RUNNER,
        READINESS,
        PRECHECK,
        Path("fandex_naver_ranking_v3_latest.json"),
        Path("fandex_youtube_ranking_v3_latest.json"),
        Path(
            "fandex_music_chart_ranking_"
            "v2_current_presence_latest.json"
        ),
        Path(
            "lastfm_global_interest_"
            "rolling_score_preview_v1_latest.csv"
        ),
    ]

    missing = [
        str(path)
        for path in required
        if not path.exists()
    ]

    if missing:
        raise RuntimeError(
            "missing required files: "
            + ", ".join(missing)
        )

    current = read_json(
        CURRENT_MASTER
    )

    if current.get(
        "version"
    ) == TARGET_VERSION:
        raise RuntimeError(
            "production is already v10; "
            "do not apply again"
        )

    if current.get(
        "version"
    ) != OLD_VERSION:
        raise RuntimeError(
            "unexpected current production version: "
            + str(
                current.get(
                    "version"
                )
            )
        )

    readiness = read_json(
        READINESS
    )

    if (
        readiness.get(
            "decision"
        ) != "READY"
        or readiness.get(
            "blockers"
        )
        or readiness.get(
            "severeRisks"
        )
        or readiness.get(
            "warnings"
        )
    ):
        raise RuntimeError(
            "v9 readiness is not clean READY"
        )

    precheck = read_json(
        PRECHECK
    )

    if (
        precheck.get(
            "decision"
        ) != "PASS"
        or precheck.get(
            "blockers"
        )
    ):
        raise RuntimeError(
            "v10 promotion precheck "
            "is not clean PASS"
        )

    runner_text = RUNNER.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    if (
        "FANDEX Daily Python-Only Runner v7"
        not in runner_text
    ):
        raise RuntimeError(
            "current Runner v7 signature missing"
        )

    if (
        "fandex_master_v9_daily_parallel_v1.py"
        not in runner_text
    ):
        raise RuntimeError(
            "current Runner v9 parallel step "
            "missing; unexpected source state"
        )

    for name, source in GENERATED.items():
        compile(
            textwrap.dedent(
                source
            ).lstrip(),
            name,
            "exec",
        )


def backup_state():
    stamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup = Path(
        f"fandex_v10_promotion_backup_{stamp}"
    )

    backup.mkdir()

    targets = [
        RUNNER,
        CURRENT_MASTER,
        CURRENT_REPORTS,
        STATUS_LATEST,
        HEALTH_V2_LATEST,
    ]

    for path in targets:
        if path.exists():
            shutil.copy2(
                path,
                backup / path.name,
            )

    return backup


def restore_backup(backup: Path):
    for path in backup.iterdir():
        if path.is_file():
            shutil.copy2(
                path,
                Path(path.name),
            )


def run_script(name):
    print()
    print(
        f"> {sys.executable} {name}"
    )

    result = subprocess.run(
        [
            sys.executable,
            name,
        ],
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"{name} failed with code "
            f"{result.returncode}"
        )


def main():
    print()
    print("=" * 96)
    print(
        "FANDEX Master v10 "
        "Production Promotion"
    )
    print("=" * 96)

    print(
        f"version: {VERSION}"
    )

    print(
        f"mode: "
        f"{'APPLY' if APPLY else 'DRY-RUN'}"
    )

    print(
        "website public/data touched: FALSE"
    )

    print("=" * 96)

    validate_preconditions()

    print(
        "PRECHECK: PASS"
    )
    print(
        "v9 readiness: READY"
    )
    print(
        "v10 parity precheck: PASS"
    )
    print(
        "current production: v7"
    )
    print(
        "target production: v10"
    )
    print(
        "new runner: v8 / 16 steps"
    )
    print(
        "legacy v7/v8/v9 scripts: "
        "PRESERVED, NOT EXECUTED"
    )
    print(
        "archive script: UNCHANGED "
        "(production latest filenames "
        "are already protected)"
    )
    print(
        "rollback script: WILL BE CREATED"
    )

    if not APPLY:
        print()
        print(
            "DRY-RUN COMPLETE"
        )
        print(
            "NO FILES MODIFIED"
        )
        print(
            "NEXT: py "
            "promote_fandex_master_v10_"
            "apply_v1.py --apply"
        )
        return

    backup = backup_state()

    manifest = {
        "version": VERSION,
        "status": "APPLYING",
        "startedAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "backupDir": str(backup),
        "oldProductionVersion": OLD_VERSION,
        "targetProductionVersion": TARGET_VERSION,
        "websiteModified": False,
    }

    MANIFEST.write_text(
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    try:
        for name, source in GENERATED.items():
            write_text(
                Path(name),
                source,
            )

        write_text(
            RUNNER,
            RUNNER_V8,
        )

        for name in GENERATED:
            py_compile.compile(
                name,
                doraise=True,
            )

        run_script(
            "fandex_master_score_v10.py"
        )

        run_script(
            "fandex_python_status_report_v2.py"
        )

        run_script(
            "fandex_python_health_check_v3.py"
        )

        run_script(
            "fandex_daily_summary_v3.py"
        )

        final = read_json(
            CURRENT_MASTER
        )

        if final.get(
            "version"
        ) != TARGET_VERSION:
            raise RuntimeError(
                "postcondition master "
                "version mismatch: "
                + str(
                    final.get(
                        "version"
                    )
                )
            )

        health_text = Path(
            "fandex_python_health_check_v3_latest.txt"
        ).read_text(
            encoding="utf-8-sig",
            errors="replace",
        )

        if (
            "OK: FANDEX production v10 healthy"
            not in health_text
            or
            "failCount: 0"
            not in health_text
            or
            "warnCount: 0"
            not in health_text
        ):
            raise RuntimeError(
                "postcondition Health v3 "
                "not clean PASS"
            )

        manifest[
            "status"
        ] = "PROMOTED"

        manifest[
            "completedAt"
        ] = datetime.now().isoformat(
            timespec="seconds"
        )

        manifest[
            "runnerVersion"
        ] = "v8"

        manifest[
            "healthVersion"
        ] = "v3"

        manifest[
            "summaryVersion"
        ] = "v3"

        MANIFEST.write_text(
            json.dumps(
                manifest,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        print()
        print("=" * 96)
        print(
            "FANDEX v10 PRODUCTION "
            "PROMOTION SUCCESS"
        )
        print("=" * 96)

        print(
            f"backupDir: {backup}"
        )

        print(
            f"manifest: {MANIFEST}"
        )

        print(
            "production: v10"
        )

        print(
            "runner: v8"
        )

        print(
            "Health v3: PASS"
        )

        print(
            "Website public/data touched: NO"
        )

        print(
            "Do NOT run the full daily "
            "Runner again today."
        )

        print("=" * 96)

    except Exception as exc:
        print()
        print(
            "PROMOTION APPLY FAILED"
        )

        print(
            "reason: "
            f"{type(exc).__name__}: {exc}"
        )

        print(
            "AUTO-ROLLBACK START"
        )

        restore_backup(
            backup
        )

        manifest[
            "status"
        ] = "AUTO_ROLLED_BACK"

        manifest[
            "failedAt"
        ] = datetime.now().isoformat(
            timespec="seconds"
        )

        manifest[
            "failure"
        ] = (
            f"{type(exc).__name__}: {exc}"
        )

        MANIFEST.write_text(
            json.dumps(
                manifest,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        print(
            "AUTO-ROLLBACK COMPLETE"
        )

        print(
            "production/runner restored "
            "from backup"
        )

        print(
            "websiteModified: FALSE"
        )

        raise SystemExit(1)


if __name__ == "__main__":
    main()
