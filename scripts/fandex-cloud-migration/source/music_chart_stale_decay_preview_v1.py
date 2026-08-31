import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_stale_decay_preview_v1"

MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
MASTER_FILE = Path("fandex_master_ranking_latest.json")
AUDIT_FILE = Path("music_chart_seed_freshness_audit_latest.csv")

REPORT = Path("FANDEX_MUSIC_CHART_STALE_DECAY_PREVIEW_REPORT.txt")
LATEST_MUSIC_PREVIEW = Path("fandex_music_chart_ranking_stale_decay_preview_latest.json")
LATEST_MASTER_PREVIEW = Path("fandex_master_ranking_stale_decay_preview_latest.json")
LATEST_AUDIT_CSV = Path("music_chart_stale_decay_preview_audit_latest.csv")


def read_json(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0
        return float(str(value).replace(",", "").strip())
    except Exception:
        return 0.0


def safe_int(value):
    try:
        if value in [None, ""]:
            return None
        return int(float(str(value).strip()))
    except Exception:
        return None


def normalize(value):
    return str(value or "").strip().lower()


def make_key_from_seed_like(row):
    return (
        normalize(row.get("artist")),
        normalize(row.get("platform")),
        normalize(row.get("chartName")),
        normalize(row.get("trackTitle")),
    )


def decay_factor_from_days(days_old, source_type, risk_level):
    """
    자동 수집 최신 row는 감점하지 않는다.
    오래된 manual_web_checked row만 시간에 따라 감점한다.
    """

    if source_type != "manual_web_checked":
        return 1.0

    days = safe_int(days_old)

    if days is None:
        return 0.2

    if days <= 3:
        return 1.0

    if days <= 7:
        return 0.7

    if days <= 14:
        return 0.4

    if days <= 30:
        return 0.2

    return 0.0


def build_decay_map(audit_rows):
    result = {}

    for row in audit_rows:
        key = make_key_from_seed_like(row)

        factor = decay_factor_from_days(
            days_old=row.get("daysOld"),
            source_type=row.get("sourceType"),
            risk_level=row.get("riskLevel"),
        )

        result[key] = {
            "factor": factor,
            "daysOld": row.get("daysOld", ""),
            "freshness": row.get("freshness", ""),
            "riskLevel": row.get("riskLevel", ""),
            "sourceType": row.get("sourceType", ""),
        }

    return result


def ranking_rows(payload):
    if isinstance(payload, dict) and isinstance(payload.get("ranking"), list):
        return [row for row in payload["ranking"] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def get_master_source_point(row, source_key):
    source_points = row.get("sourcePoints") or {}
    source = source_points.get(source_key) or {}
    return safe_float(source.get("cumulativePoint"))


def adjust_music_payload(music_payload, decay_map):
    adjusted_ranking = []
    audit_rows = []

    for artist_item in ranking_rows(music_payload):
        artist = artist_item.get("artist", "")
        entries = artist_item.get("entries", [])

        adjusted_entries = []
        platform_points = {}
        chart_type_points = {}
        track_points = {}

        original_total = safe_float(
            artist_item.get(
                "fandexMusicChartFinalPoint",
                artist_item.get("score", 0),
            )
        )

        adjusted_total = 0.0

        for entry in entries:
            entry_key = make_key_from_seed_like(entry)
            decay_info = decay_map.get(entry_key, {
                "factor": 1.0,
                "daysOld": "",
                "freshness": "unknown",
                "riskLevel": "UNKNOWN",
                "sourceType": "unknown",
            })

            original_point = safe_float(entry.get("musicChartPoint"))
            factor = safe_float(decay_info.get("factor"))
            adjusted_point = round(original_point * factor, 4)

            new_entry = dict(entry)
            new_entry["originalMusicChartPoint"] = round(original_point, 4)
            new_entry["staleDecayFactor"] = factor
            new_entry["musicChartPoint"] = adjusted_point
            new_entry["staleFreshness"] = decay_info.get("freshness", "")
            new_entry["staleRiskLevel"] = decay_info.get("riskLevel", "")
            new_entry["staleDaysOld"] = decay_info.get("daysOld", "")
            new_entry["staleSourceType"] = decay_info.get("sourceType", "")

            adjusted_entries.append(new_entry)

            adjusted_total += adjusted_point

            platform = entry.get("platform", "other")
            chart_type = entry.get("chartType", "other")
            track_title = entry.get("trackTitle", "")

            platform_points[platform] = round(platform_points.get(platform, 0.0) + adjusted_point, 4)
            chart_type_points[chart_type] = round(chart_type_points.get(chart_type, 0.0) + adjusted_point, 4)
            track_points[track_title] = round(track_points.get(track_title, 0.0) + adjusted_point, 4)

            audit_rows.append({
                "artist": artist,
                "platform": platform,
                "chartName": entry.get("chartName", ""),
                "trackTitle": track_title,
                "rank": entry.get("rank", ""),
                "chartDate": entry.get("chartDate", ""),
                "originalPoint": round(original_point, 4),
                "decayFactor": factor,
                "adjustedPoint": adjusted_point,
                "daysOld": decay_info.get("daysOld", ""),
                "freshness": decay_info.get("freshness", ""),
                "riskLevel": decay_info.get("riskLevel", ""),
                "sourceType": decay_info.get("sourceType", ""),
            })

        adjusted_total = round(adjusted_total, 4)

        best_entry = None
        if adjusted_entries:
            best_entry = max(adjusted_entries, key=lambda x: safe_float(x.get("musicChartPoint")))

        core_signal = ""
        if platform_points:
            core_signal = max(platform_points.items(), key=lambda x: x[1])[0]

        new_artist_item = dict(artist_item)
        new_artist_item["fandexMusicChartFinalPoint"] = round(adjusted_total, 2)
        new_artist_item["score"] = round(adjusted_total, 2)
        new_artist_item["originalFandexMusicChartFinalPoint"] = round(original_total, 2)
        new_artist_item["deltaFromOriginalMusicPoint"] = round(adjusted_total - original_total, 2)
        new_artist_item["coreSignal"] = core_signal
        new_artist_item["entryCount"] = len(adjusted_entries)
        new_artist_item["platformPoints"] = {k: round(v, 2) for k, v in platform_points.items()}
        new_artist_item["chartTypePoints"] = {k: round(v, 2) for k, v in chart_type_points.items()}
        new_artist_item["trackPoints"] = {k: round(v, 2) for k, v in track_points.items()}
        new_artist_item["bestEntry"] = best_entry or {}
        new_artist_item["entries"] = adjusted_entries
        new_artist_item["meta"] = {
            "scoreVersion": VERSION,
            "scoreMode": "stale_decay_preview",
            "note": "Preview only. Official music latest is not modified.",
        }

        adjusted_ranking.append(new_artist_item)

    adjusted_ranking.sort(
        key=lambda item: safe_float(item.get("fandexMusicChartFinalPoint")),
        reverse=True,
    )

    for idx, item in enumerate(adjusted_ranking, start=1):
        item["rank"] = idx

    preview_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "scoreMode": "stale_decay_preview",
        "policy": {
            "manual_web_checkedDays0To3": 1.0,
            "manual_web_checkedDays4To7": 0.7,
            "manual_web_checkedDays8To14": 0.4,
            "manual_web_checkedDays15To30": 0.2,
            "manual_web_checkedDaysOver30": 0.0,
            "auto_collected": 1.0,
        },
        "ranking": adjusted_ranking,
    }

    return preview_payload, audit_rows


def build_master_preview(master_payload, music_preview_payload):
    music_map = {}

    for item in ranking_rows(music_preview_payload):
        artist = item.get("artist", "")
        if not artist:
            continue

        music_map[artist] = safe_float(
            item.get("fandexMusicChartFinalPoint", item.get("score", 0))
        )

    master_preview_rows = []

    for row in ranking_rows(master_payload):
        artist = row.get("artist", "")
        if not artist:
            continue

        naver_point = get_master_source_point(row, "naver")
        youtube_point = get_master_source_point(row, "youtube")
        original_music_point = get_master_source_point(row, "musicChart")
        adjusted_music_point = music_map.get(artist, 0.0)

        total = naver_point + youtube_point + adjusted_music_point

        master_preview_rows.append({
            "artist": artist,
            "fandexFinalPoint": round(total, 2),
            "score": round(total, 2),
            "originalMasterPoint": safe_float(row.get("fandexFinalPoint", row.get("score", 0))),
            "deltaFromOriginalMaster": round(total - safe_float(row.get("fandexFinalPoint", row.get("score", 0))), 2),
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": round(naver_point, 2),
                    "sourceReadMode": "official_master_latest",
                },
                "youtube": {
                    "cumulativePoint": round(youtube_point, 2),
                    "sourceReadMode": "official_master_latest",
                },
                "musicChart": {
                    "cumulativePoint": round(adjusted_music_point, 2),
                    "originalPoint": round(original_music_point, 2),
                    "sourceReadMode": "stale_decay_preview_music",
                },
            },
            "sourceTotalCheck": round(total, 2),
        })

    master_preview_rows.sort(
        key=lambda item: safe_float(item.get("fandexFinalPoint")),
        reverse=True,
    )

    for idx, item in enumerate(master_preview_rows, start=1):
        item["rank"] = idx

    return {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "scoreMode": "master_with_stale_decay_music_preview",
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "ranking": master_preview_rows,
    }


def write_csv(path, rows):
    fieldnames = [
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "originalPoint",
        "decayFactor",
        "adjustedPoint",
        "daysOld",
        "freshness",
        "riskLevel",
        "sourceType",
    ]

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart stale decay preview v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: preview only. 공식 latest는 수정하지 않습니다.")
    print()

    music_payload = read_json(MUSIC_FILE)
    master_payload = read_json(MASTER_FILE)
    audit_rows = read_csv(AUDIT_FILE)

    decay_map = build_decay_map(audit_rows)

    music_preview_payload, decay_audit_rows = adjust_music_payload(
        music_payload=music_payload,
        decay_map=decay_map,
    )

    master_preview_payload = build_master_preview(
        master_payload=master_payload,
        music_preview_payload=music_preview_payload,
    )

    timestamp_music = Path(f"fandex_music_chart_ranking_stale_decay_preview_{timestamp}.json")
    timestamp_master = Path(f"fandex_master_ranking_stale_decay_preview_{timestamp}.json")
    timestamp_audit = Path(f"music_chart_stale_decay_preview_audit_{timestamp}.csv")
    timestamp_report = Path(f"FANDEX_MUSIC_CHART_STALE_DECAY_PREVIEW_REPORT_{timestamp}.txt")

    for path in [timestamp_music, LATEST_MUSIC_PREVIEW]:
        path.write_text(
            json.dumps(music_preview_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    for path in [timestamp_master, LATEST_MASTER_PREVIEW]:
        path.write_text(
            json.dumps(master_preview_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    for path in [timestamp_audit, LATEST_AUDIT_CSV]:
        write_csv(path, decay_audit_rows)

    lines = []
    lines.append("FANDEX Music Chart Stale Decay Preview Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: preview only")
    lines.append("seedModified: FALSE")
    lines.append("officialLatestModified: FALSE")
    lines.append("websitePublicDataTouched: FALSE")
    lines.append("")
    lines.append("감점 정책")
    lines.append("-" * 70)
    lines.append("auto_collected row: 100% 반영")
    lines.append("manual_web_checked 0~3일: 100% 반영")
    lines.append("manual_web_checked 4~7일: 70% 반영")
    lines.append("manual_web_checked 8~14일: 40% 반영")
    lines.append("manual_web_checked 15~30일: 20% 반영")
    lines.append("manual_web_checked 30일 초과: 0점")
    lines.append("")
    lines.append("Music stale-decay ranking preview")
    lines.append("-" * 70)

    for item in ranking_rows(music_preview_payload):
        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"Music {item.get('fandexMusicChartFinalPoint')} "
            f"(original {item.get('originalFandexMusicChartFinalPoint')}, "
            f"delta {item.get('deltaFromOriginalMusicPoint')}) | "
            f"platformPoints={item.get('platformPoints')}"
        )

    lines.append("")
    lines.append("Master stale-decay ranking preview")
    lines.append("-" * 70)

    for item in ranking_rows(master_preview_payload):
        sp = item.get("sourcePoints", {})
        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"FANDEX {item.get('fandexFinalPoint')} "
            f"(original {item.get('originalMasterPoint')}, "
            f"delta {item.get('deltaFromOriginalMaster')}) | "
            f"네이버 {sp.get('naver', {}).get('cumulativePoint')} | "
            f"YouTube {sp.get('youtube', {}).get('cumulativePoint')} | "
            f"음원 {sp.get('musicChart', {}).get('cumulativePoint')} "
            f"(original {sp.get('musicChart', {}).get('originalPoint')})"
        )

    lines.append("")
    lines.append("Entry-level decay audit")
    lines.append("-" * 70)

    for row in decay_audit_rows:
        lines.append(
            f"{row['artist']} | {row['platform']} | {row['trackTitle']} | "
            f"rank={row['rank']} | date={row['chartDate']} | "
            f"original={row['originalPoint']} | factor={row['decayFactor']} | "
            f"adjusted={row['adjustedPoint']} | "
            f"daysOld={row['daysOld']} | sourceType={row['sourceType']} | risk={row['riskLevel']}"
        )

    lines.append("")
    lines.append("생성 파일")
    lines.append("-" * 70)
    lines.append(f"music preview json: {timestamp_music}")
    lines.append(f"master preview json: {timestamp_master}")
    lines.append(f"audit csv: {timestamp_audit}")
    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)
    lines.append("- 완전 제외보다 순위 출렁임이 적으면 stale decay 정책이 적합하다.")
    lines.append("- 그래도 오래된 수동 seed의 영향력을 줄일 수 있다.")
    lines.append("- 납득되면 다음 단계에서 music_chart_publish_v1.py에 stale decay를 옵션/공식으로 반영한다.")

    for path in [timestamp_report, REPORT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Music stale-decay master preview")
    print("-" * 70)
    for item in ranking_rows(master_preview_payload):
        sp = item.get("sourcePoints", {})
        print(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"FANDEX {item.get('fandexFinalPoint')} | "
            f"음원 {sp.get('musicChart', {}).get('cumulativePoint')} "
            f"(original {sp.get('musicChart', {}).get('originalPoint')})"
        )

    print()
    print("=" * 70)
    print("Music chart stale decay preview v1 완료")
    print("=" * 70)
    print(f"리포트: {REPORT}")
    print(f"music preview latest: {LATEST_MUSIC_PREVIEW}")
    print(f"master preview latest: {LATEST_MASTER_PREVIEW}")
    print(f"audit csv latest: {LATEST_AUDIT_CSV}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_MUSIC_CHART_STALE_DECAY_PREVIEW_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()