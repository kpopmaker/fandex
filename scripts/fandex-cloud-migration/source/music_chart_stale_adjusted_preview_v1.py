import csv
import json
import subprocess
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_stale_adjusted_preview_v1"

SEED_FILE = Path("music_chart_seed_v1.csv")
AUDIT_FILE = Path("music_chart_seed_freshness_audit_latest.csv")

PREVIEW_SEED = Path("music_chart_seed_v1_stale_adjusted_preview.csv")
ORIGINAL_BACKUP_TEMP = Path("music_chart_seed_v1_temp_backup_before_stale_preview.csv")

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


def normalize(value):
    return str(value or "").strip().lower()


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

    return {
        "script": script_name,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def read_json(path):
    path = Path(path)

    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart stale-adjusted preview 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 최종적으로 music_chart_seed_v1.csv는 원상복구합니다.")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    seed_rows = read_csv(SEED_FILE)
    audit_rows = read_csv(AUDIT_FILE)

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
            excluded = dict(row)
            excluded["rank"] = ""
            excluded["memo"] = (
                f"stale_adjusted_preview_excluded; "
                f"originalRank={row.get('rank', '')}; "
                f"originalDate={row.get('chartDate', '')}; "
                f"originalMemo={row.get('memo', '')}"
            )
            preview_rows.append(excluded)

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

    fieldnames = list(seed_rows[0].keys()) if seed_rows else []
    write_csv(PREVIEW_SEED, preview_rows, fieldnames)

    print("제외 preview 대상")
    print("-" * 70)
    for row in excluded_rows:
        print(
            f"- {row['artist']} / {row['platform']} / {row['trackTitle']} "
            f"/ rank={row['oldRank']} / date={row['oldDate']}"
        )

    if not excluded_rows:
        print("제외 대상 없음")
        return

    shutil.copy2(SEED_FILE, ORIGINAL_BACKUP_TEMP)

    try:
        # 임시로 preview seed를 공식 seed 위치에 올려서 기존 publish 로직 재사용
        shutil.copy2(PREVIEW_SEED, SEED_FILE)

        music_result = run_py("music_chart_publish_v1.py")
        master_result = run_py("fandex_master_score_v7.py")

        music_payload = read_json("fandex_music_chart_ranking_v1_latest.json")
        master_payload = read_json("fandex_master_ranking_latest.json")

    finally:
        # 반드시 원본 seed 복구
        shutil.copy2(ORIGINAL_BACKUP_TEMP, SEED_FILE)

        # 원본 seed 기준으로 다시 publish/master 복구
        restore_music_result = run_py("music_chart_publish_v1.py")
        restore_master_result = run_py("fandex_master_score_v7.py")

    preview_music_json = Path(f"fandex_music_chart_ranking_stale_adjusted_preview_{timestamp}.json")
    preview_master_json = Path(f"fandex_master_ranking_stale_adjusted_preview_{timestamp}.json")

    preview_music_json.write_text(
        json.dumps(music_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    preview_master_json.write_text(
        json.dumps(master_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

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

    for item in music_payload.get("ranking", []):
        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"Music {item.get('fandexMusicChartFinalPoint', item.get('score'))} | "
            f"platformPoints={item.get('platformPoints')}"
        )

    lines.append("")
    lines.append("Stale-adjusted master ranking preview")
    lines.append("-" * 70)

    for item in master_payload.get("ranking", []):
        sp = item.get("sourcePoints", {})
        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"FANDEX {item.get('fandexFinalPoint')} | "
            f"네이버 {sp.get('naver', {}).get('cumulativePoint')} | "
            f"YouTube {sp.get('youtube', {}).get('cumulativePoint')} | "
            f"음원 {sp.get('musicChart', {}).get('cumulativePoint')}"
        )

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
    lines.append("- 결과가 납득되면 다음 단계에서 stale policy를 music publish에 정식 반영한다.")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Music chart stale-adjusted preview 완료")
    print("=" * 70)
    print(f"리포트: {REPORT}")
    print(f"preview music json: {preview_music_json}")
    print(f"preview master json: {preview_master_json}")
    print()
    print("확인:")
    print("notepad FANDEX_MUSIC_CHART_STALE_ADJUSTED_PREVIEW_REPORT.txt")


if __name__ == "__main__":
    main()