import csv
import json
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v7_youtube_v3_uncapped_cumulative"
BUILD_PATCH = "latest_sources_v2"

PREVIOUS_MASTER_FILE = Path("fandex_master_ranking_latest.json")
PREVIOUS_REPORTS_FILE = Path("fandex_master_artist_reports_latest.json")

NAVER_FILE = Path("fandex_naver_ranking_v3_latest.json")
YOUTUBE_V3_FILE = Path("fandex_youtube_ranking_v3_latest.json")
MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")

LATEST_RANKING_JSON = Path("fandex_master_ranking_latest.json")
LATEST_REPORTS_JSON = Path("fandex_master_artist_reports_latest.json")
LATEST_AUDIT_CSV = Path("fandex_master_score_v7_audit_latest.csv")
LATEST_TXT_REPORT = Path("FANDEX_MASTER_V7_REPORT.txt")


def read_json(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0
        return float(str(value).replace(",", "").strip())
    except Exception:
        return 0.0


def iter_dicts(obj):
    if isinstance(obj, dict):
        yield obj
        for value in obj.values():
            yield from iter_dicts(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_dicts(item)


def get_artist_name(item):
    if not isinstance(item, dict):
        return ""

    for key in ["artist", "artistName", "name", "displayName"]:
        value = item.get(key)
        if value:
            return str(value).strip()

    return ""


def get_total_score(item):
    for key in [
        "fandexFinalPoint",
        "fandexPoint",
        "masterPoint",
        "totalPoint",
        "finalPoint",
        "cumulativePoint",
        "score",
    ]:
        if key in item and item.get(key) not in [None, ""]:
            return safe_float(item.get(key))

    return 0.0


def get_source_point_from_master_item(item, source_key):
    source_points = item.get("sourcePoints") or {}
    source = source_points.get(source_key) or {}

    for key in ["cumulativePoint", "point", "score", "totalPoint"]:
        if key in source and source.get(key) not in [None, ""]:
            return safe_float(source.get(key))

    return 0.0


def get_direct_source_score(item, source_type):
    source_key_map = {
        "naver": "naver",
        "youtube": "youtube",
        "music": "musicChart",
    }

    source_key = source_key_map.get(source_type)

    if source_key:
        source_points = item.get("sourcePoints") or {}
        source = source_points.get(source_key) or {}

        for key in ["cumulativePoint", "point", "score", "totalPoint"]:
            if key in source and source.get(key) not in [None, ""]:
                return safe_float(source.get(key))

    if source_type == "naver":
        keys = [
            "naverPoint",
            "naverScore",
            "fandexNaverPoint",
            "fandexNaverScore",
            "naverFinalPoint",
            "finalNaverPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexFinalPoint",
        ]
    elif source_type == "youtube":
        keys = [
            "youtubePoint",
            "youtubeScore",
            "youtubeFinalPoint",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
    elif source_type == "music":
        keys = [
            "musicChartPoint",
            "musicPoint",
            "musicScore",
            "chartPoint",
            "musicFinalPoint",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
    else:
        keys = ["score"]

    for key in keys:
        if key in item and item.get(key) not in [None, ""]:
            return safe_float(item.get(key))

    return 0.0


def make_previous_master_map(payload):
    result = {}

    for item in iter_dicts(payload):
        artist = get_artist_name(item)

        if not artist:
            continue

        naver_point = get_source_point_from_master_item(item, "naver")
        youtube_point = get_source_point_from_master_item(item, "youtube")
        music_point = get_source_point_from_master_item(item, "musicChart")
        total_point = get_total_score(item)

        if total_point <= 0 and naver_point <= 0 and youtube_point <= 0 and music_point <= 0:
            continue

        existing = result.get(artist)

        candidate = {
            "artist": artist,
            "previousMasterPoint": round(total_point, 4),
            "naverPoint": round(naver_point, 4),
            "youtubePoint": round(youtube_point, 4),
            "musicChartPoint": round(music_point, 4),
        }

        if not existing or candidate["previousMasterPoint"] > existing["previousMasterPoint"]:
            result[artist] = candidate

    return result


def make_latest_source_map(payload, source_type):
    result = {}

    for item in iter_dicts(payload):
        artist = get_artist_name(item)

        if not artist:
            continue

        score = get_direct_source_score(item, source_type)

        if score <= 0:
            continue

        existing = result.get(artist)

        candidate = {
            "artist": artist,
            "score": round(score, 4),
        }

        # 같은 아티스트가 여러 번 잡히면 가장 큰 점수를 공식 ranking row로 간주
        if not existing or candidate["score"] > existing["score"]:
            result[artist] = candidate

    return result


def backup_existing_latest(timestamp):
    backup_dir = Path(f"master_v7_backup_before_latest_sources_v2_{timestamp}")
    backup_dir.mkdir(exist_ok=True)

    for target in [PREVIOUS_MASTER_FILE, PREVIOUS_REPORTS_FILE]:
        if target.exists():
            shutil.copy2(target, backup_dir / target.name)

    return backup_dir


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("FANDEX master score v7 생성 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"buildPatch: {BUILD_PATCH}")
    print("공식: Naver latest + YouTube v3 latest + Music chart latest")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    previous_payload = read_json(PREVIOUS_MASTER_FILE)
    naver_payload = read_json(NAVER_FILE)
    youtube_payload = read_json(YOUTUBE_V3_FILE)
    music_payload = read_json(MUSIC_FILE)

    backup_dir = backup_existing_latest(timestamp)

    previous_map = make_previous_master_map(previous_payload)
    naver_map = make_latest_source_map(naver_payload, "naver")
    youtube_map = make_latest_source_map(youtube_payload, "youtube")
    music_map = make_latest_source_map(music_payload, "music")

    all_artists = sorted(
        set(previous_map)
        | set(naver_map)
        | set(youtube_map)
        | set(music_map)
    )

    ranking = []
    reports = {}
    audit_rows = []

    for artist in all_artists:
        previous = previous_map.get(artist, {})

        previous_master_point = safe_float(previous.get("previousMasterPoint"))
        previous_naver_point = safe_float(previous.get("naverPoint"))
        previous_youtube_point = safe_float(previous.get("youtubePoint"))
        previous_music_point = safe_float(previous.get("musicChartPoint"))

        naver_latest = safe_float(naver_map.get(artist, {}).get("score"))
        youtube_latest = safe_float(youtube_map.get(artist, {}).get("score"))
        music_latest = safe_float(music_map.get(artist, {}).get("score"))

        naver_point = naver_latest if naver_latest > 0 else previous_naver_point
        youtube_point = youtube_latest if youtube_latest > 0 else previous_youtube_point
        music_point = music_latest if music_latest > 0 else previous_music_point

        naver_source = "latest_naver_v3" if naver_latest > 0 else "fallback_previous_master"
        youtube_source = "latest_youtube_v3" if youtube_latest > 0 else "fallback_previous_master"
        music_source = "latest_music_chart_v1" if music_latest > 0 else "fallback_previous_master"

        total = naver_point + youtube_point + music_point
        delta = total - previous_master_point

        item = {
            "artist": artist,
            "fandexFinalPoint": round(total, 2),
            "score": round(total, 2),
            "previousMasterPoint": round(previous_master_point, 2),
            "deltaFromPreviousMaster": round(delta, 2),
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": round(naver_point, 2),
                    "sourceVersion": "naver_v3",
                    "sourceReadMode": naver_source,
                },
                "youtube": {
                    "cumulativePoint": round(youtube_point, 2),
                    "previousPoint": round(previous_youtube_point, 2),
                    "sourceVersion": "youtube_v3",
                    "sourceReadMode": youtube_source,
                    "scoreMode": "uncapped_additive_log_points_scaled",
                },
                "musicChart": {
                    "cumulativePoint": round(music_point, 2),
                    "previousPoint": round(previous_music_point, 2),
                    "sourceVersion": "music_chart_v1",
                    "sourceReadMode": music_source,
                },
            },
            "sourceTotalCheck": round(total, 2),
        }

        ranking.append(item)

    ranking.sort(key=lambda row: row["fandexFinalPoint"], reverse=True)

    for index, item in enumerate(ranking, start=1):
        item["rank"] = index

        artist = item["artist"]

        reports[artist] = {
            "artist": artist,
            "rank": index,
            "version": VERSION,
            "buildPatch": BUILD_PATCH,
            "fandexFinalPoint": item["fandexFinalPoint"],
            "previousMasterPoint": item["previousMasterPoint"],
            "deltaFromPreviousMaster": item["deltaFromPreviousMaster"],
            "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
            "sourcePoints": item["sourcePoints"],
        }

        audit_rows.append({
            "rank": index,
            "artist": artist,
            "fandexFinalPoint": item["fandexFinalPoint"],
            "previousMasterPoint": item["previousMasterPoint"],
            "deltaFromPreviousMaster": item["deltaFromPreviousMaster"],
            "naverPoint": item["sourcePoints"]["naver"]["cumulativePoint"],
            "naverSource": item["sourcePoints"]["naver"]["sourceReadMode"],
            "youtubePoint": item["sourcePoints"]["youtube"]["cumulativePoint"],
            "youtubeSource": item["sourcePoints"]["youtube"]["sourceReadMode"],
            "musicChartPoint": item["sourcePoints"]["musicChart"]["cumulativePoint"],
            "musicChartPreviousPoint": item["sourcePoints"]["musicChart"]["previousPoint"],
            "musicChartSource": item["sourcePoints"]["musicChart"]["sourceReadMode"],
        })

    ranking_payload = {
        "version": VERSION,
        "buildPatch": BUILD_PATCH,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
        "sourceFiles": {
            "naver": str(NAVER_FILE),
            "youtube": str(YOUTUBE_V3_FILE),
            "musicChart": str(MUSIC_FILE),
            "previousMaster": str(PREVIOUS_MASTER_FILE),
        },
        "ranking": ranking,
    }

    reports_payload = {
        "version": VERSION,
        "buildPatch": BUILD_PATCH,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
        "reports": reports,
    }

    timestamp_ranking_json = Path(f"fandex_master_ranking_v7_{timestamp}.json")
    timestamp_reports_json = Path(f"fandex_master_artist_reports_v7_{timestamp}.json")
    timestamp_audit_csv = Path(f"fandex_master_score_v7_audit_{timestamp}.csv")

    for path in [timestamp_ranking_json, LATEST_RANKING_JSON]:
        path.write_text(
            json.dumps(ranking_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    for path in [timestamp_reports_json, LATEST_REPORTS_JSON]:
        path.write_text(
            json.dumps(reports_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    fieldnames = [
        "rank",
        "artist",
        "fandexFinalPoint",
        "previousMasterPoint",
        "deltaFromPreviousMaster",
        "naverPoint",
        "naverSource",
        "youtubePoint",
        "youtubeSource",
        "musicChartPoint",
        "musicChartPreviousPoint",
        "musicChartSource",
    ]

    for path in [timestamp_audit_csv, LATEST_AUDIT_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(audit_rows)

    lines = []
    lines.append("FANDEX Master v7 Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append(f"buildPatch: {BUILD_PATCH}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("공식")
    lines.append("-" * 70)
    lines.append("FANDEX v7 = Naver v3 latest + YouTube v3 latest + Music chart v1 latest")
    lines.append("YouTube v3는 additive log point scaled 방식")
    lines.append("")
    lines.append("Ranking")
    lines.append("-" * 70)

    for item in ranking:
        lines.append(
            f"{item['rank']}위 {item['artist']} | "
            f"FANDEX {item['fandexFinalPoint']} | "
            f"네이버 {item['sourcePoints']['naver']['cumulativePoint']} "
            f"({item['sourcePoints']['naver']['sourceReadMode']}) | "
            f"YouTube {item['sourcePoints']['youtube']['cumulativePoint']} "
            f"({item['sourcePoints']['youtube']['sourceReadMode']}) | "
            f"음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "
            f"({item['sourcePoints']['musicChart']['sourceReadMode']}) | "
            f"이전 대비 {item['deltaFromPreviousMaster']}"
        )

    lines.append("")
    lines.append("백업")
    lines.append("-" * 70)
    lines.append(f"기존 latest 백업 폴더: {backup_dir}")
    lines.append("")
    lines.append("주의")
    lines.append("- 웹사이트 public/data는 건드리지 않았다.")
    lines.append("- master v7은 이제 Music chart latest를 직접 읽는다.")

    timestamp_txt_report = Path(f"FANDEX_MASTER_V7_REPORT_{timestamp}.txt")

    for path in [timestamp_txt_report, LATEST_TXT_REPORT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("FANDEX master v7 ranking")
    print("-" * 70)

    for item in ranking:
        print(
            f"{item['rank']}위. {item['artist']} - FANDEX {item['fandexFinalPoint']}점 "
            f"/ 네이버 {item['sourcePoints']['naver']['cumulativePoint']} "
            f"/ YouTube {item['sourcePoints']['youtube']['cumulativePoint']} "
            f"/ 음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "
            f"/ 이전 대비 {item['deltaFromPreviousMaster']}"
        )

    print()
    print("=" * 70)
    print("FANDEX master score v7 생성 완료")
    print("=" * 70)
    print(f"기존 latest 백업 폴더: {backup_dir}")
    print(f"최신 ranking JSON: {LATEST_RANKING_JSON}")
    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")
    print(f"리포트: {LATEST_TXT_REPORT}")
    print()
    print("확인:")
    print("notepad FANDEX_MASTER_V7_REPORT.txt")


if __name__ == "__main__":
    main()