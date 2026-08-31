import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_master_v7_preview_youtube_v3_uncapped_cumulative"

NAVER_FILE = Path("fandex_naver_ranking_v3_latest.json")
YOUTUBE_V3_FILE = Path("fandex_youtube_ranking_v3_latest.json")
MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
MASTER_V6_FILE = Path("fandex_master_ranking_latest.json")

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
    if not isinstance(item, dict):
        return ""

    for key in ["artist", "artistName", "name", "displayName"]:
        value = item.get(key)
        if value:
            return str(value).strip()

    return ""


def get_score(item, preferred_keys):
    if not isinstance(item, dict):
        return 0.0

    for key in preferred_keys:
        if key in item and item.get(key) not in [None, ""]:
            return safe_float(item.get(key))

    source_points = item.get("sourcePoints")
    if isinstance(source_points, dict):
        for source_name in ["naver", "youtube", "musicChart"]:
            source = source_points.get(source_name)
            if isinstance(source, dict):
                for key in ["cumulativePoint", "point", "score"]:
                    if key in source:
                        return safe_float(source.get(key))

    return 0.0


def make_source_map(payload, source_type):
    rows = find_list(payload)
    result = {}

    if source_type == "naver":
        score_keys = [
            "naverPoint",
            "naverScore",
            "naverFinalPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexPoint",
        ]
    elif source_type == "youtube":
        score_keys = [
            "youtubePoint",
            "youtubeScore",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
    elif source_type == "music":
        score_keys = [
            "musicPoint",
            "musicScore",
            "musicChartPoint",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]
    else:
        score_keys = ["score"]

    for item in rows:
        artist = get_artist_name(item)
        if not artist:
            continue

        result[artist] = {
            "artist": artist,
            "score": round(get_score(item, score_keys), 4),
            "raw": item,
        }

    return result


def make_v6_score_map(payload):
    rows = find_list(payload)
    result = {}

    for item in rows:
        artist = get_artist_name(item)
        if not artist:
            continue

        score = get_score(
            item,
            [
                "fandexFinalPoint",
                "fandexPoint",
                "masterPoint",
                "totalPoint",
                "score",
                "cumulativePoint",
            ],
        )

        result[artist] = round(score, 4)

    return result


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("FANDEX master score v7 preview 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 기존 master latest는 덮어쓰지 않습니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    naver_payload = read_json(NAVER_FILE)
    youtube_payload = read_json(YOUTUBE_V3_FILE)
    music_payload = read_json(MUSIC_FILE)

    v6_payload = read_json(MASTER_V6_FILE) if MASTER_V6_FILE.exists() else None

    naver_map = make_source_map(naver_payload, "naver")
    youtube_map = make_source_map(youtube_payload, "youtube")
    music_map = make_source_map(music_payload, "music")
    v6_map = make_v6_score_map(v6_payload) if v6_payload else {}

    all_artists = sorted(set(naver_map) | set(youtube_map) | set(music_map))

    ranking = []
    reports = {}
    audit_rows = []

    for artist in all_artists:
        naver_point = naver_map.get(artist, {}).get("score", 0.0)
        youtube_point = youtube_map.get(artist, {}).get("score", 0.0)
        music_point = music_map.get(artist, {}).get("score", 0.0)

        total = naver_point + youtube_point + music_point
        previous_v6 = v6_map.get(artist, 0.0)
        delta = total - previous_v6 if previous_v6 else 0.0

        item = {
            "artist": artist,
            "fandexFinalPoint": round(total, 2),
            "score": round(total, 2),
            "previousV6Point": round(previous_v6, 2) if previous_v6 else "",
            "deltaFromV6": round(delta, 2) if previous_v6 else "",
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": round(naver_point, 2),
                    "sourceVersion": "v3",
                },
                "youtube": {
                    "cumulativePoint": round(youtube_point, 2),
                    "sourceVersion": "v3",
                    "scoreMode": "uncapped_additive_log_points_scaled",
                },
                "musicChart": {
                    "cumulativePoint": round(music_point, 2),
                    "sourceVersion": "v1",
                },
            },
            "sourceTotalCheck": round(naver_point + youtube_point + music_point, 2),
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
            "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
            "sourcePoints": item["sourcePoints"],
            "note": "Preview only. Not replacing official master v6 latest yet.",
        }

        audit_rows.append({
            "rank": index,
            "artist": artist,
            "fandexFinalPointV7Preview": item["fandexFinalPoint"],
            "previousV6Point": item["previousV6Point"],
            "deltaFromV6": item["deltaFromV6"],
            "naverPoint": item["sourcePoints"]["naver"]["cumulativePoint"],
            "youtubeV3Point": item["sourcePoints"]["youtube"]["cumulativePoint"],
            "musicChartPoint": item["sourcePoints"]["musicChart"]["cumulativePoint"],
        })

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "scoreMode": "uncapped_cumulative_source_points_with_youtube_v3",
        "note": "Preview only. Existing fandex_master_ranking_latest.json is not modified.",
        "sourceFiles": {
            "naver": str(NAVER_FILE),
            "youtube": str(YOUTUBE_V3_FILE),
            "musicChart": str(MUSIC_FILE),
            "previousMaster": str(MASTER_V6_FILE),
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

    timestamp_json = Path(f"fandex_master_ranking_v7_preview_{timestamp}.json")
    timestamp_reports_json = Path(f"fandex_master_artist_reports_v7_preview_{timestamp}.json")
    timestamp_audit_csv = Path(f"fandex_master_score_v7_preview_audit_{timestamp}.csv")

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
    lines.append("FANDEX v7 preview = Naver v3 + YouTube v3 + Music chart v1")
    lines.append("기존 master v6 latest는 덮어쓰지 않음")
    lines.append("")
    lines.append("Ranking preview")
    lines.append("-" * 70)

    for item in ranking:
        lines.append(
            f"{item['rank']}위 {item['artist']} | "
            f"FANDEX v7 preview {item['fandexFinalPoint']} | "
            f"네이버 {item['sourcePoints']['naver']['cumulativePoint']} | "
            f"YouTube v3 {item['sourcePoints']['youtube']['cumulativePoint']} | "
            f"음원 {item['sourcePoints']['musicChart']['cumulativePoint']} | "
            f"v6 대비 {item['deltaFromV6']}"
        )

    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)
    lines.append("- 이 결과가 납득되면 다음 단계에서 master v7 공식 파일로 승격한다.")
    lines.append("- 승격 전까지는 fandex_master_ranking_latest.json을 건드리지 않는다.")
    lines.append("- Codex 작업 중이므로 public/data export는 여전히 금지.")

    timestamp_txt_report = Path(f"FANDEX_MASTER_V7_PREVIEW_REPORT_{timestamp}.txt")
    for path in [timestamp_txt_report, LATEST_TXT_REPORT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("FANDEX master v7 preview")
    print("-" * 70)

    for item in ranking:
        print(
            f"{item['rank']}위. {item['artist']} - FANDEX {item['fandexFinalPoint']}점 "
            f"/ 네이버 {item['sourcePoints']['naver']['cumulativePoint']} "
            f"/ YouTube v3 {item['sourcePoints']['youtube']['cumulativePoint']} "
            f"/ 음원 {item['sourcePoints']['musicChart']['cumulativePoint']} "
            f"/ v6 대비 {item['deltaFromV6']}"
        )

    print()
    print("=" * 70)
    print("FANDEX master score v7 preview 완료")
    print("=" * 70)
    print(f"타임스탬프 ranking JSON: {timestamp_json}")
    print(f"최신 ranking JSON: {LATEST_JSON}")
    print(f"타임스탬프 report JSON: {timestamp_reports_json}")
    print(f"최신 report JSON: {LATEST_REPORTS_JSON}")
    print(f"타임스탬프 audit CSV: {timestamp_audit_csv}")
    print(f"최신 audit CSV: {LATEST_AUDIT_CSV}")
    print(f"리포트: {LATEST_TXT_REPORT}")
    print()
    print("확인:")
    print("notepad FANDEX_MASTER_V7_PREVIEW_REPORT.txt")


if __name__ == "__main__":
    main()