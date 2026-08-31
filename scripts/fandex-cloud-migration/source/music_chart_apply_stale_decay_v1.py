import csv
import json
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_apply_stale_decay_v1"

MUSIC_RANKING_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
MUSIC_REPORTS_FILE = Path("fandex_music_chart_artist_reports_v1_latest.json")
AUDIT_FILE = Path("music_chart_seed_freshness_audit_latest.csv")

LATEST_RANKING_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
LATEST_REPORTS_FILE = Path("fandex_music_chart_artist_reports_v1_latest.json")
LATEST_DECAY_AUDIT_CSV = Path("music_chart_stale_decay_apply_audit_latest.csv")
REPORT_FILE = Path("FANDEX_MUSIC_CHART_STALE_DECAY_APPLY_REPORT.txt")


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


def make_key(row):
    return (
        normalize(row.get("artist")),
        normalize(row.get("platform")),
        normalize(row.get("chartName")),
        normalize(row.get("trackTitle")),
    )


def decay_factor(days_old, source_type):
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
        key = make_key(row)
        factor = decay_factor(
            days_old=row.get("daysOld"),
            source_type=row.get("sourceType"),
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


def adjust_music_payload(payload, decay_map):
    adjusted_ranking = []
    audit_rows = []

    for artist_item in ranking_rows(payload):
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
            key = make_key(entry)
            decay_info = decay_map.get(key, {
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

        best_entry = {}
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
        new_artist_item["bestEntry"] = best_entry
        new_artist_item["entries"] = adjusted_entries
        new_artist_item["meta"] = {
            "scoreVersion": VERSION,
            "scoreMode": "stale_decay_applied",
            "note": "Stale manual seed decay has been applied to official music chart latest.",
        }

        adjusted_ranking.append(new_artist_item)

    adjusted_ranking.sort(
        key=lambda item: safe_float(item.get("fandexMusicChartFinalPoint")),
        reverse=True,
    )

    for idx, item in enumerate(adjusted_ranking, start=1):
        item["rank"] = idx

    new_payload = dict(payload)
    new_payload["version"] = "fandex_music_chart_v1_stale_decay_applied"
    new_payload["staleDecayVersion"] = VERSION
    new_payload["staleDecayAppliedAt"] = datetime.now().isoformat(timespec="seconds")
    new_payload["scoreMode"] = "uncapped_cumulative_chart_entries_with_stale_decay"
    new_payload["staleDecayPolicy"] = {
        "auto_collected": 1.0,
        "manual_web_checkedDays0To3": 1.0,
        "manual_web_checkedDays4To7": 0.7,
        "manual_web_checkedDays8To14": 0.4,
        "manual_web_checkedDays15To30": 0.2,
        "manual_web_checkedDaysOver30": 0.0,
    }
    new_payload["ranking"] = adjusted_ranking

    return new_payload, audit_rows


def write_json(path, payload):
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_audit_csv(path, rows):
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


def write_reports_payload(path, music_payload):
    reports = {}

    for item in ranking_rows(music_payload):
        artist = item.get("artist", "")
        if not artist:
            continue

        reports[artist] = {
            "artist": artist,
            "rank": item.get("rank", ""),
            "fandexMusicChartFinalPoint": item.get("fandexMusicChartFinalPoint", 0),
            "originalFandexMusicChartFinalPoint": item.get("originalFandexMusicChartFinalPoint", ""),
            "deltaFromOriginalMusicPoint": item.get("deltaFromOriginalMusicPoint", ""),
            "coreSignal": item.get("coreSignal", ""),
            "entryCount": item.get("entryCount", ""),
            "platformPoints": item.get("platformPoints", {}),
            "chartTypePoints": item.get("chartTypePoints", {}),
            "trackPoints": item.get("trackPoints", {}),
            "bestEntry": item.get("bestEntry", {}),
            "entries": item.get("entries", []),
            "meta": item.get("meta", {}),
        }

    payload = {
        "version": "fandex_music_chart_artist_reports_v1_stale_decay_applied",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "scoreMode": "uncapped_cumulative_chart_entries_with_stale_decay",
        "reports": reports,
    }

    write_json(path, payload)


def main():
    import sys

    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart stale decay apply v1")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}")
    print()

    music_payload = read_json(MUSIC_RANKING_FILE)
    audit_rows = read_csv(AUDIT_FILE)
    decay_map = build_decay_map(audit_rows)

    adjusted_payload, decay_audit_rows = adjust_music_payload(music_payload, decay_map)

    timestamp_ranking = Path(f"fandex_music_chart_ranking_v1_stale_decay_applied_{timestamp}.json")
    timestamp_reports = Path(f"fandex_music_chart_artist_reports_v1_stale_decay_applied_{timestamp}.json")
    timestamp_audit = Path(f"music_chart_stale_decay_apply_audit_{timestamp}.csv")
    timestamp_report = Path(f"FANDEX_MUSIC_CHART_STALE_DECAY_APPLY_REPORT_{timestamp}.txt")

    write_json(timestamp_ranking, adjusted_payload)
    write_audit_csv(timestamp_audit, decay_audit_rows)
    write_reports_payload(timestamp_reports, adjusted_payload)

    lines = []
    lines.append("FANDEX Music Chart Stale Decay Apply Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append(f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}")
    lines.append("")
    lines.append("Music ranking after stale decay")
    lines.append("-" * 70)

    print("Music ranking after stale decay")
    print("-" * 70)

    for item in ranking_rows(adjusted_payload):
        line = (
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"Music {item.get('fandexMusicChartFinalPoint')} "
            f"(original {item.get('originalFandexMusicChartFinalPoint')}, "
            f"delta {item.get('deltaFromOriginalMusicPoint')}) | "
            f"platformPoints={item.get('platformPoints')}"
        )
        lines.append(line)
        print(line)

    lines.append("")
    lines.append("Entry-level audit")
    lines.append("-" * 70)

    for row in decay_audit_rows:
        lines.append(
            f"{row['artist']} | {row['platform']} | {row['trackTitle']} | "
            f"original={row['originalPoint']} | factor={row['decayFactor']} | "
            f"adjusted={row['adjustedPoint']} | "
            f"daysOld={row['daysOld']} | sourceType={row['sourceType']} | risk={row['riskLevel']}"
        )

    lines.append("")
    lines.append("Generated files")
    lines.append("-" * 70)
    lines.append(f"timestamp ranking: {timestamp_ranking}")
    lines.append(f"timestamp reports: {timestamp_reports}")
    lines.append(f"timestamp audit: {timestamp_audit}")

    if apply_mode:
        backup_ranking = Path(f"fandex_music_chart_ranking_v1_latest_backup_before_stale_decay_{timestamp}.json")
        backup_reports = Path(f"fandex_music_chart_artist_reports_v1_latest_backup_before_stale_decay_{timestamp}.json")

        shutil.copy2(LATEST_RANKING_FILE, backup_ranking)

        if LATEST_REPORTS_FILE.exists():
            shutil.copy2(LATEST_REPORTS_FILE, backup_reports)

        write_json(LATEST_RANKING_FILE, adjusted_payload)
        write_reports_payload(LATEST_REPORTS_FILE, adjusted_payload)
        write_audit_csv(LATEST_DECAY_AUDIT_CSV, decay_audit_rows)

        lines.append("")
        lines.append("APPLY result")
        lines.append("-" * 70)
        lines.append(f"latest ranking updated: {LATEST_RANKING_FILE}")
        lines.append(f"latest reports updated: {LATEST_REPORTS_FILE}")
        lines.append(f"backup ranking: {backup_ranking}")
        lines.append(f"backup reports: {backup_reports}")
        lines.append(f"latest audit csv: {LATEST_DECAY_AUDIT_CSV}")

    else:
        lines.append("")
        lines.append("DRY-RUN result")
        lines.append("-" * 70)
        lines.append("latest files were NOT modified.")
        lines.append("실제 반영하려면:")
        lines.append("py music_chart_apply_stale_decay_v1.py --apply")

    for path in [timestamp_report, REPORT_FILE]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Music chart stale decay apply v1 완료")
    print("=" * 70)
    print(f"리포트: {REPORT_FILE}")

    if apply_mode:
        print("latest music chart files updated.")
        print()
        print("다음 실행:")
        print("py fandex_master_score_v7.py")
        print("py fandex_python_health_check_v1.py")
    else:
        print("DRY-RUN 완료. latest는 수정하지 않았습니다.")
        print()
        print("실제 반영:")
        print("py music_chart_apply_stale_decay_v1.py --apply")


if __name__ == "__main__":
    main()