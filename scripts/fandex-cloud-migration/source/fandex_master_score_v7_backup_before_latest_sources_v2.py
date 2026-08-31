import csv
import json
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v7_youtube_v3_uncapped_cumulative"

MASTER_PREVIOUS_FILE = Path("fandex_master_ranking_latest.json")
MASTER_PREVIOUS_REPORTS_FILE = Path("fandex_master_artist_reports_latest.json")
YOUTUBE_V3_FILE = Path("fandex_youtube_ranking_v3_latest.json")
YOUTUBE_V3_REPORTS_FILE = Path("fandex_youtube_artist_reports_v3_latest.json")

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


def find_list(payload):
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        return []

    for key in ["ranking", "rankings", "artists", "data", "items", "results"]:
        value = payload.get(key)
        if isinstance(value, list):
            return value

    return []


def get_artist_name(item):
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
        "score",
        "cumulativePoint",
    ]:
        if key in item and item.get(key) not in [None, ""]:
            return safe_float(item.get(key))
    return 0.0


def get_source_point(item, source_key):
    source_points = item.get("sourcePoints") or {}
    source = source_points.get(source_key) or {}

    for key in ["cumulativePoint", "point", "score", "totalPoint"]:
        if key in source and source.get(key) not in [None, ""]:
            return safe_float(source.get(key))

    return 0.0


def make_previous_master_map(payload):
    result = {}

    for item in find_list(payload):
        if not isinstance(item, dict):
            continue

        artist = get_artist_name(item)

        if not artist:
            continue

        result[artist] = {
            "artist": artist,
            "previousMasterPoint": round(get_total_score(item), 4),
            "naverPoint": round(get_source_point(item, "naver"), 4),
            "youtubeV2Point": round(get_source_point(item, "youtube"), 4),
            "musicChartPoint": round(get_source_point(item, "musicChart"), 4),
            "raw": item,
        }

    return result


def make_youtube_v3_map(payload):
    result = {}

    for item in find_list(payload):
        if not isinstance(item, dict):
            continue

        artist = get_artist_name(item)

        if not artist:
            continue

        score = 0.0

        for key in ["youtubePoint", "cumulativePoint", "score", "youtubeScore"]:
            if key in item and item.get(key) not in [None, ""]:
                score = safe_float(item.get(key))
                break

        result[artist] = {
            "artist": artist,
            "youtubeV3Point": round(score, 4),
            "raw": item,
        }

    return result


def backup_existing_latest(timestamp):
    backup_dir = Path(f"master_v7_backup_before_apply_{timestamp}")
    backup_dir.mkdir(exist_ok=True)

    targets = [
        MASTER_PREVIOUS_FILE,
        MASTER_PREVIOUS_REPORTS_FILE,
    ]

    for target in targets:
        if target.exists():
            shutil.copy2(target, backup_dir / target.name)

    return backup_dir


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("FANDEX master score v7 공식 생성 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("공식: 기존 master의 네이버/음원 + YouTube v3")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    backup_dir = backup_existing_latest(timestamp)

    previous_payload = read_json(MASTER_PREVIOUS_FILE)
    youtube_v3_payload = read_json(YOUTUBE_V3_FILE)

    previous_map = make_previous_master_map(previous_payload)
    youtube_v3_map = make_youtube_v3_map(youtube_v3_payload)

    all_artists = sorted(set(previous_map) | set(youtube_v3_map))

    ranking = []
    reports = {}
    audit_rows = []

    for artist in all_artists:
        previous = previous_map.get(artist, {})
        youtube_v3 = youtube_v3_map.get(artist, {})

        naver_point = safe_float(previous.get("naverPoint"))
        youtube_v2_point = safe_float(previous.get("youtubeV2Point"))
        youtube_v3_point = safe_float(youtube_v3.get("youtubeV3Point"))
        music_point = safe_float(previous.get("musicChartPoint"))
        previous_master_point = safe_float(previous.get("previousMasterPoint"))

        total = naver_point + youtube_v3_point + music_point
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
                    "sourceVersion": "naver_v3_from_previous_master",
                },
                "youtube": {
                    "cumulativePoint": round(youtube_v3_point, 2),
                    "previousV2Point": round(youtube_v2_point, 2),
                    "sourceVersion": "youtube_v3",
                    "scoreMode": "uncapped_additive_log_points_scaled",
                },
                "musicChart": {
                    "cumulativePoint": round(music_point, 2),
                    "sourceVersion": "music_chart_v1_from_previous_master",
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
            "youtubeV2Point": item["sourcePoints"]["youtube"]["previousV2Point"],
            "youtubeV3Point": item["sourcePoints"]["youtube"]["cumulativePoint"],
            "musicChartPoint": item["sourcePoints"]["musicChart"]["cumulativePoint"],
        })

    ranking_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
        "sourceFiles": {
            "previousMaster": str(MASTER_PREVIOUS_FILE),
            "youtubeV3": str(YOUTUBE_V3_FILE),
        },
        "ranking": ranking,
    }

    reports_payload = {
        "version": VERSION,
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
        "youtubeV2Point",
        "youtubeV3Point",
        "musicChartPoint",
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
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("공식")
    lines.append("-" * 70)
    lines.append("FANDEX v7 = Naver v3 + YouTube v3 + Music chart v1")
    lines.append("YouTube v3는 additive log point scaled 방식")
    lines.append("")
    lines.append("Ranking")
    lines.append("-" * 70)

    for item in ranking:
        lines.append(
            f"{item['rank']}위 {item['artist']} | "
            f"FANDEX {item['fandexFinalPoint']} | "
            f"네이버 {item['sourcePoints']['naver']['cumulativePoint']} | "
            f"YouTube v2 {item['sourcePoints']['youtube']['previousV2Point']} → "
            f"YouTube v3 {item['sourcePoints']['youtube']['cumulativePoint']} | "
            f"음원 {item['sourcePoints']['musicChart']['cumulativePoint']} | "
            f"이전 대비 {item['deltaFromPreviousMaster']}"
        )

    lines.append("")
    lines.append("백업")
    lines.append("-" * 70)
    lines.append(f"기존 latest 백업 폴더: {backup_dir}")
    lines.append("")
    lines.append("주의")
    lines.append("- 웹사이트 public/data는 건드리지 않았다.")
    lines.append("- daily runner는 아직 v6를 호출할 수 있으므로 다음 단계에서 runner를 v7로 패치해야 한다.")

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
            f"/ YouTube v2 {item['sourcePoints']['youtube']['previousV2Point']} → "
            f"v3 {item['sourcePoints']['youtube']['cumulativePoint']} "
            f"/ 음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "
            f"/ 이전 대비 {item['deltaFromPreviousMaster']}"
        )

    print()
    print("=" * 70)
    print("FANDEX master score v7 공식 생성 완료")
    print("=" * 70)
    print(f"기존 latest 백업 폴더: {backup_dir}")
    print(f"타임스탬프 ranking JSON: {timestamp_ranking_json}")
    print(f"최신 ranking JSON: {LATEST_RANKING_JSON}")
    print(f"타임스탬프 report JSON: {timestamp_reports_json}")
    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")
    print(f"타임스탬프 audit CSV: {timestamp_audit_csv}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")
    print(f"리포트: {LATEST_TXT_REPORT}")
    print()
    print("확인:")
    print("notepad FANDEX_MASTER_V7_REPORT.txt")


if __name__ == "__main__":
    main()