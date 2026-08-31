import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_export_to_site_v1"

SOURCE_FILES = [
    "fandex_master_ranking_latest.json",
    "fandex_master_artist_reports_latest.json",
]

OPTIONAL_SOURCE_FILES = [
    "fandex_naver_ranking_v3_latest.json",
    "fandex_youtube_ranking_v2_latest.json",
    "fandex_music_chart_ranking_v1_latest.json",
]


def read_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_site_data_dir():
    if len(sys.argv) >= 2:
        return Path(sys.argv[1]).expanduser().resolve()

    return Path.home() / "Desktop" / "fandex" / "public" / "data"


def validate_sources():
    problems = []

    for file_name in SOURCE_FILES:
        if not Path(file_name).exists():
            problems.append(f"{file_name} 파일 없음")

    if problems:
        return problems

    try:
        ranking = read_json("fandex_master_ranking_latest.json")
        version = ranking.get("version", "")
        score_mode = ranking.get("scoreMode", "")
        rows = ranking.get("ranking", [])

        if version != "fandex_master_v6_music_chart_uncapped_cumulative":
            problems.append(f"master version 이상: {version}")

        if score_mode != "uncapped_cumulative_source_points":
            problems.append(f"scoreMode 이상: {score_mode}")

        if not rows:
            problems.append("master ranking 데이터 없음")

        for item in rows:
            if not item.get("artist"):
                problems.append("artist 누락")
            if item.get("fandexFinalPoint") in [None, ""]:
                problems.append(f"{item.get('artist', '-')}: FANDEX 점수 누락")

    except Exception as e:
        problems.append(f"master ranking 검증 실패: {e}")

    return problems


def build_manifest(copied_files):
    ranking = read_json("fandex_master_ranking_latest.json")
    rows = ranking.get("ranking", [])

    return {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "sourceVersion": ranking.get("version", ""),
        "scoreMode": ranking.get("scoreMode", ""),
        "copiedFiles": copied_files,
        "topRanking": [
            {
                "rank": item.get("rank"),
                "artist": item.get("artist"),
                "fandexFinalPoint": item.get("fandexFinalPoint"),
            }
            for item in rows[:10]
        ],
    }


def main():
    print()
    print("FANDEX site data export v1 시작")
    print("=" * 60)

    problems = validate_sources()

    if problems:
        print("export 시작 전 검증 실패")
        for problem in problems:
            print(f"- {problem}")
        sys.exit(1)

    site_data_dir = get_site_data_dir()
    site_data_dir.mkdir(parents=True, exist_ok=True)

    copied_files = []

    for file_name in SOURCE_FILES + OPTIONAL_SOURCE_FILES:
        source = Path(file_name)

        if not source.exists():
            continue

        target = site_data_dir / file_name
        shutil.copy2(source, target)
        copied_files.append(file_name)
        print(f"복사 완료: {file_name}")

    manifest = build_manifest(copied_files)
    manifest_path = site_data_dir / "fandex_data_manifest_latest.json"
    write_json(manifest_path, manifest)

    print()
    print("FANDEX site data export v1 완료")
    print("=" * 60)
    print(f"복사 위치: {site_data_dir}")
    print("생성 파일: fandex_data_manifest_latest.json")

    print()
    print("웹사이트에서 우선 읽을 파일:")
    print("- /data/fandex_master_ranking_latest.json")
    print("- /data/fandex_master_artist_reports_latest.json")


if __name__ == "__main__":
    main()