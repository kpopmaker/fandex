import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v7_preview_fix_v1_replace_youtube_v3"

MASTER_V6_FILE = Path("fandex_master_ranking_latest.json")
YOUTUBE_V3_FILE = Path("fandex_youtube_ranking_v3_latest.json")

LATEST_JSON = Path("fandex_master_ranking_v7_preview_latest.json")
LATEST_REPORTS_JSON = Path("fandex_master_artist_reports_v7_preview_latest.json")
LATEST_AUDIT_CSV = Path("fandex_master_score_v7_preview_audit_latest.csv")
LATEST_TXT_REPORT = Path("FANDEX_MASTER_V7_PREVIEW_REPORT.txt")


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


def make_v6_map(payload):
    result = {}

    for item in find_list(payload):
        if not isinstance(item, dict):
            continue

        artist = get_artist_name(item)

        if not artist:
            continue

        naver_point = get_source_point(item, "naver")
        youtube_point = get_source_point(item, "youtube")
        music_point = get_source_point(item, "musicChart")

        # 혹시 sourcePoints 구조가 없을 때를 대비한 fallback
        total_score = get_total_score(item)

        result[artist] = {
            "artist": artist,
            "previousV6Point": round(total_score, 4),
            "naverPoint": round(naver_point, 4),
            "youtubeV2Point": round(youtube_point, 4),
            "musicChartPoint": round(music_point, 4),
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


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("FANDEX master score v7 preview fix 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("공식: master v6의 네이버/음원 + YouTube v3")
    print("주의: 기존 master latest는 덮어쓰지 않습니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    master_v6_payload = read_json(MASTER_V6_FILE)
    youtube_v3_payload = read_json(YOUTUBE_V3_FILE)

    v6_map = make_v6_map(master_v6_payload)
    youtube_v3_map = make_youtube_v3_map(youtube_v3_payload)

    all_artists = sorted(set(v6_map) | set(youtube_v3_map))

    ranking = []
    reports = {}
    audit_rows = []

    for artist in all_artists:
        v6 = v6_map.get(artist, {})
        youtube_v3 = youtube_v3_map.get(artist, {})

        naver_point = safe_float(v6.get("naverPoint"))
        old_youtube_point = safe_float(v6.get("youtubeV2Point"))
        youtube_v3_point = safe_float(youtube_v3.get("youtubeV3Point"))
        music_point = safe_float(v6.get("musicChartPoint"))
        previous_v6 = safe_float(v6.get("previousV6Point"))

        total = naver_point + youtube_v3_point + music_point
        delta = total - previous_v6

        item = {
            "artist": artist,
            "fandexFinalPoint": round(total, 2),
            "score": round(total, 2),
            "previousV6Point": round(previous_v6, 2),
            "deltaFromV6": round(delta, 2),
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": round(naver_point, 2),
                    "sourceVersion": "v3_from_master_v6",
                },
                "youtube": {
                    "cumulativePoint": round(youtube_v3_point, 2),
                    "previousV2Point": round(old_youtube_point, 2),
                    "sourceVersion": "v3",
                    "scoreMode": "uncapped_additive_log_points_scaled",
                },
                "musicChart": {
                    "cumulativePoint": round(music_point, 2),
                    "sourceVersion": "v1_from_master_v6",
                },
            },
            "sourceTotalCheck": round(naver_point + youtube_v3_point + music_point, 2),
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
            "previousV6Point": item["previousV6Point"],
            "deltaFromV6": item["deltaFromV6"],
            "scoreMode": "uncapped_cumulative_source_points_replace_youtube_v3",
            "sourcePoints": item["sourcePoints"],
            "note": "Preview only. Not replacing official master latest yet.",
        }

        audit_rows.append({
            "rank": index,
            "artist": artist,
            "fandexFinalPointV7Preview": item["fandexFinalPoint"],
            "previousV6Point": item["previousV6Point"],
            "deltaFromV6": item["deltaFromV6"],
            "naverPoint": item["sourcePoints"]["naver"]["cumulativePoint"],
            "youtubeV2Point": item["sourcePoints"]["youtube"]["previousV2Point"],
            "youtubeV3Point": item["sourcePoints"]["youtube"]["cumulativePoint"],
            "musicChartPoint": item["sourcePoints"]["musicChart"]["cumulativePoint"],
        })

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_replace_youtube_v3",
        "note": "Preview only. Existing fandex_master_ranking_latest.json is not modified.",
        "sourceFiles": {
            "masterV6": str(MASTER_V6_FILE),
            "youtubeV3": str(YOUTUBE_V3_FILE),
        },
        "ranking": ranking,
    }

    reports_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_replace_youtube_v3",
        "reports": reports,
    }

    timestamp_json = Path(f"fandex_master_ranking_v7_preview_fix_{timestamp}.json")
    timestamp_reports_json = Path(f"fandex_master_artist_reports_v7_preview_fix_{timestamp}.json")
    timestamp_audit_csv = Path(f"fandex_master_score_v7_preview_fix_audit_{timestamp}.csv")

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
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
        "fandexFinalPointV7Preview",
        "previousV6Point",
        "deltaFromV6",
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
    lines.append("FANDEX Master v7 Preview Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("공식")
    lines.append("-" * 70)
    lines.append("FANDEX v7 preview = master v6의 Naver + YouTube v3 + master v6의 Music chart")
    lines.append("기존 master latest는 덮어쓰지 않음")
    lines.append("")
    lines.append("Ranking preview")
    lines.append("-" * 70)

    for item in ranking:
        lines.append(
            f"{item['rank']}위 {item['artist']} | "
            f"FANDEX v7 preview {item['fandexFinalPoint']} | "
            f"네이버 {item['sourcePoints']['naver']['cumulativePoint']} | "
            f"YouTube v2 {item['sourcePoints']['youtube']['previousV2Point']} → "
            f"YouTube v3 {item['sourcePoints']['youtube']['cumulativePoint']} | "
            f"음원 {item['sourcePoints']['musicChart']['cumulativePoint']} | "
            f"v6 대비 {item['deltaFromV6']}"
        )

    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)
    lines.append("- 네이버/음원이 0으로 나오면 실패다.")
    lines.append("- 이 결과가 납득되면 다음 단계에서 master v7 공식 파일로 승격한다.")
    lines.append("- 승격 전까지는 fandex_master_ranking_latest.json을 건드리지 않는다.")
    lines.append("- Codex 작업 중이므로 public/data export는 여전히 금지.")

    timestamp_txt_report = Path(f"FANDEX_MASTER_V7_PREVIEW_REPORT_fix_{timestamp}.txt")

    for path in [timestamp_txt_report, LATEST_TXT_REPORT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("FANDEX master v7 preview fix")
    print("-" * 70)

    for item in ranking:
        print(
            f"{item['rank']}위. {item['artist']} - FANDEX {item['fandexFinalPoint']}점 "
            f"/ 네이버 {item['sourcePoints']['naver']['cumulativePoint']} "
            f"/ YouTube v2 {item['sourcePoints']['youtube']['previousV2Point']} → "
            f"v3 {item['sourcePoints']['youtube']['cumulativePoint']} "
            f"/ 음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "
            f"/ v6 대비 {item['deltaFromV6']}"
        )

    print()
    print("=" * 70)
    print("FANDEX master score v7 preview fix 완료")
    print("=" * 70)
    print(f"최신 ranking JSON: {LATEST_JSON}")
    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")
    print(f"리포트: {LATEST_TXT_REPORT}")
    print()
    print("확인:")
    print("notepad FANDEX_MASTER_V7_PREVIEW_REPORT.txt")


if __name__ == "__main__":
    main()