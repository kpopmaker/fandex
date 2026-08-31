import csv
import json
import subprocess
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_stale_adjusted_preview_v2_no_master_fallback"

SEED_FILE = Path("music_chart_seed_v1.csv")
AUDIT_FILE = Path("music_chart_seed_freshness_audit_latest.csv")
MASTER_FILE = Path("fandex_master_ranking_latest.json")
MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")

PREVIEW_SEED = Path("music_chart_seed_v1_stale_adjusted_preview_v2.csv")
TEMP_BACKUP = Path("music_chart_seed_v1_temp_backup_before_stale_preview_v2.csv")

REPORT = Path("FANDEX_MUSIC_CHART_STALE_ADJUSTED_PREVIEW_REPORT.txt")


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_json(path):
    path = Path(path)

    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, payload):
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def normalize(value):
    return str(value or "").strip().lower()


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0
        return float(str(value).replace(",", "").strip())
    except Exception:
        return 0.0


def make_key(row):
    return (
        normalize(row.get("artist")),
        normalize(row.get("platform")),
        normalize(row.get("chartName")),
        normalize(row.get("trackTitle")),
    )


def run_py(script_name):
    result = subprocess.run(
        ["py", script_name],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if result.returncode != 0:
        print()
        print(f"ERROR: {script_name} 실행 실패")
        print(result.stdout)
        print(result.stderr)
        raise SystemExit(result.returncode)

    return result


def ranking_rows(payload):
    if isinstance(payload, dict) and isinstance(payload.get("ranking"), list):
        return [row for row in payload["ranking"] if isinstance(row, dict)]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def get_source_point(master_row, source_key):
    source_points = master_row.get("sourcePoints") or {}
    source = source_points.get(source_key) or {}
    return safe_float(source.get("cumulativePoint"))


def build_music_map(music_payload):
    result = {}

    for row in ranking_rows(music_payload):
        artist = row.get("artist", "")
        if not artist:
            continue

        point = safe_float(
            row.get(
                "fandexMusicChartFinalPoint",
                row.get("score", row.get("musicChartPoint", 0)),
            )
        )

        result[artist] = point

    return result


def build_manual_master_preview(original_master_payload, preview_music_payload):
    music_map = build_music_map(preview_music_payload)

    preview_rows = []

    for row in ranking_rows(original_master_payload):
        artist = row.get("artist", "")
        if not artist:
            continue

        naver_point = get_source_point(row, "naver")
        youtube_point = get_source_point(row, "youtube")

        # 핵심: preview music에 없는 아티스트는 이전 음원 점수 fallback 금지
        music_point = music_map.get(artist, 0.0)

        total = naver_point + youtube_point + music_point

        preview_rows.append({
            "artist": artist,
            "fandexFinalPoint": round(total, 2),
            "score": round(total, 2),
            "sourcePoints": {
                "naver": {
                    "cumulativePoint": round(naver_point, 2),
                    "sourceReadMode": "original_master_source_for_preview",
                },
                "youtube": {
                    "cumulativePoint": round(youtube_point, 2),
                    "sourceReadMode": "original_master_source_for_preview",
                },
                "musicChart": {
                    "cumulativePoint": round(music_point, 2),
                    "sourceReadMode": (
                        "stale_adjusted_preview_music"
                        if artist in music_map
                        else "stale_adjusted_missing_treated_as_zero"
                    ),
                },
            },
            "sourceTotalCheck": round(total, 2),
        })

    preview_rows.sort(key=lambda item: item["fandexFinalPoint"], reverse=True)

    for index, row in enumerate(preview_rows, start=1):
        row["rank"] = index

    return {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "scoreMode": "preview_no_music_fallback",
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "note": "Stale music rows excluded. Missing preview music entries are treated as zero, not fallback.",
        "ranking": preview_rows,
    }


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart stale-adjusted preview v2 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("정책: HIGH manual stale row 제외 + master music fallback 금지")
    print("주의: 최종적으로 music_chart_seed_v1.csv는 원상복구합니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    seed_rows = read_csv(SEED_FILE)
    audit_rows = read_csv(AUDIT_FILE)

    original_master_payload = read_json(MASTER_FILE)

    high_stale_keys = set()

    for row in audit_rows:
        if (
            row.get("riskLevel") == "HIGH"
            and row.get("sourceType") == "manual_web_checked"
        ):
            high_stale_keys.add(make_key(row))

    preview_rows = []
    excluded_rows = []

    for row in seed_rows:
        key = make_key(row)

        if key in high_stale_keys:
            new_row = dict(row)
            new_row["rank"] = ""
            new_row["memo"] = (
                f"stale_adjusted_preview_v2_excluded; "
                f"originalRank={row.get('rank', '')}; "
                f"originalDate={row.get('chartDate', '')}; "
                f"originalMemo={row.get('memo', '')}"
            )
            preview_rows.append(new_row)

            excluded_rows.append({
                "artist": row.get("artist", ""),
                "platform": row.get("platform", ""),
                "chartName": row.get("chartName", ""),
                "trackTitle": row.get("trackTitle", ""),
                "oldRank": row.get("rank", ""),
                "oldDate": row.get("chartDate", ""),
            })
        else:
            preview_rows.append(dict(row))

    if not excluded_rows:
        print("제외 대상 없음")
        return

    fieldnames = list(seed_rows[0].keys()) if seed_rows else []
    write_csv(PREVIEW_SEED, preview_rows, fieldnames)

    print("제외 preview 대상")
    print("-" * 70)
    for row in excluded_rows:
        print(
            f"- {row['artist']} / {row['platform']} / {row['trackTitle']} "
            f"/ rank={row['oldRank']} / date={row['oldDate']}"
        )

    shutil.copy2(SEED_FILE, TEMP_BACKUP)

    try:
        shutil.copy2(PREVIEW_SEED, SEED_FILE)
        run_py("music_chart_publish_v1.py")
        preview_music_payload = read_json(MUSIC_FILE)

    finally:
        shutil.copy2(TEMP_BACKUP, SEED_FILE)
        run_py("music_chart_publish_v1.py")
        run_py("fandex_master_score_v7.py")

    preview_master_payload = build_manual_master_preview(
        original_master_payload=original_master_payload,
        preview_music_payload=preview_music_payload,
    )

    preview_music_json = Path(f"fandex_music_chart_ranking_stale_adjusted_preview_v2_{timestamp}.json")
    preview_master_json = Path(f"fandex_master_ranking_stale_adjusted_preview_v2_{timestamp}.json")

    write_json(preview_music_json, preview_music_payload)
    write_json(preview_master_json, preview_master_payload)

    lines = []
    lines.append("FANDEX Music Chart Stale-Adjusted Preview Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: preview only")
    lines.append("seedModifiedFinal: FALSE")
    lines.append("websitePublicDataTouched: FALSE")
    lines.append("")
    lines.append("정책")
    lines.append("-" * 70)
    lines.append("HIGH risk + manual_web_checked row는 preview에서 제외")
    lines.append("master preview에서는 music missing을 이전 점수로 fallback하지 않고 0점 처리")
    lines.append("원본 music_chart_seed_v1.csv는 실행 후 복구")
    lines.append("")
    lines.append("제외한 row")
    lines.append("-" * 70)

    for row in excluded_rows:
        lines.append(
            f"- {row['artist']} | {row['platform']} | {row['trackTitle']} | "
            f"rank={row['oldRank']} | date={row['oldDate']}"
        )

    lines.append("")
    lines.append("Stale-adjusted music ranking preview")
    lines.append("-" * 70)

    for item in ranking_rows(preview_music_payload):
        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"Music {item.get('fandexMusicChartFinalPoint', item.get('score'))} | "
            f"platformPoints={item.get('platformPoints')}"
        )

    lines.append("")
    lines.append("Stale-adjusted master ranking preview")
    lines.append("-" * 70)

    for item in ranking_rows(preview_master_payload):
        sp = item.get("sourcePoints", {})
        naver = sp.get("naver", {}).get("cumulativePoint")
        youtube = sp.get("youtube", {}).get("cumulativePoint")
        music = sp.get("musicChart", {}).get("cumulativePoint")
        music_mode = sp.get("musicChart", {}).get("sourceReadMode")

        line = (
            str(item.get("rank")) + "위 " + str(item.get("artist")) + " | "
            + "FANDEX " + str(item.get("fandexFinalPoint")) + " | "
            + "네이버 " + str(naver) + " | "
            + "YouTube " + str(youtube) + " | "
            + "음원 " + str(music) + " "
            + "(" + str(music_mode) + ")"
        )
        lines.append(line)

    lines.append("")
    lines.append("생성 파일")
    lines.append("-" * 70)
    lines.append(f"preview seed: {PREVIEW_SEED}")
    lines.append(f"preview music json: {preview_music_json}")
    lines.append(f"preview master json: {preview_master_json}")
    lines.append("")
    lines.append("주의")
    lines.append("- 이 결과는 preview다.")
    lines.append("- 공식 latest는 마지막에 원본 seed 기준으로 복구했다.")
    lines.append("- 결과가 너무 크게 출렁이면 완전 제외보다 감점 정책이 적합하다.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Music chart stale-adjusted preview v2 완료")
    print("=" * 70)
    print(f"리포트: {REPORT}")
    print(f"preview music json: {preview_music_json}")
    print(f"preview master json: {preview_master_json}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_MUSIC_CHART_STALE_ADJUSTED_PREVIEW_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()