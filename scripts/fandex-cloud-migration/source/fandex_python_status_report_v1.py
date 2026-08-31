import csv
import json
from datetime import datetime
from pathlib import Path


MASTER_FILE = Path("fandex_master_ranking_latest.json")
YOUTUBE_FILE = Path("fandex_youtube_ranking_v2_latest.json")
MUSIC_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
SEED_FILE = Path("music_chart_seed_v1.csv")

LATEST_REPORT_FILE = Path("fandex_python_status_report_latest.txt")


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def clean(value):
    return (value or "").strip()


def main():
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = Path(f"fandex_python_status_report_v1_{now}.txt")

    if not MASTER_FILE.exists():
        raise SystemExit("fandex_master_ranking_latest.json 파일이 없습니다.")

    master = read_json(MASTER_FILE)
    ranking = master.get("ranking", [])

    lines = []

    lines.append("FANDEX Python Status Report v1")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"masterVersion: {master.get('version')}")
    lines.append(f"scoreMode: {master.get('scoreMode')}")
    lines.append("")
    lines.append("현재 FANDEX master ranking")
    lines.append("-" * 70)

    for item in ranking:
        source_points = item.get("sourcePoints", {})
        naver = source_points.get("naver", {})
        youtube = source_points.get("youtube", {})
        music = source_points.get("musicChart", {})

        lines.append(
            f"{item.get('rank')}위 {item.get('artist')} | "
            f"FANDEX {item.get('fandexFinalPoint')} | "
            f"네이버 {naver.get('cumulativePoint', 0)} | "
            f"유튜브 {youtube.get('cumulativePoint', 0)} | "
            f"음원 {music.get('cumulativePoint', 0)}"
        )

    lines.append("")
    lines.append("음원 seed 상태")
    lines.append("-" * 70)

    if SEED_FILE.exists():
        seed_rows = read_csv(SEED_FILE)

        for row in seed_rows:
            rank = clean(row.get("rank")) or "미진입/스킵"
            lines.append(
                f"{clean(row.get('artist'))} | "
                f"{clean(row.get('platform'))} | "
                f"{clean(row.get('chartName'))} | "
                f"{clean(row.get('trackTitle'))} | "
                f"rank={rank} | "
                f"date={clean(row.get('chartDate'))}"
            )
    else:
        lines.append("music_chart_seed_v1.csv 없음")

    lines.append("")
    lines.append("최근 사용 명령")
    lines.append("-" * 70)
    lines.append("하루 운영:")
    lines.append("run_fandex_daily_python_only.bat")
    lines.append("")
    lines.append("Python 내부 전체 갱신 v2:")
    lines.append("py fandex_daily_python_only_v2.py")
    lines.append("")
    lines.append("YouTube 재수집 포함:")
    lines.append("set YOUTUBE_API_KEY=실제_API_KEY")
    lines.append("py fandex_daily_python_only_v2.py --refresh-youtube")
    lines.append("")
    lines.append("Bugs 음원만 갱신:")
    lines.append("py fandex_music_refresh_bugs_python_only_v1.py")
    lines.append("")
    lines.append("주의:")
    lines.append("웹사이트 public/data를 건드리지 않으려면 아래 명령은 실행하지 말 것.")
    lines.append("py fandex_export_to_site_v1.py")
    lines.append("py fandex_publish_all_v5.py")
    lines.append("py fandex_publish_all_v5.py --refresh-youtube")

    report_text = "\n".join(lines)

    report_file.write_text(report_text, encoding="utf-8")
    LATEST_REPORT_FILE.write_text(report_text, encoding="utf-8")

    print()
    print("FANDEX Python status report 생성 완료")
    print("=" * 70)
    print(f"리포트 파일: {report_file}")
    print(f"최신 리포트 파일: {LATEST_REPORT_FILE}")
    print()
    print(report_text)


if __name__ == "__main__":
    main()