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
