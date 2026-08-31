import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "create_artist_expansion_targets_v1"

CSV_OUT = Path("artist_expansion_targets_v1.csv")
JSON_OUT = Path("artist_expansion_targets_v1.json")
REPORT = Path("FANDEX_ARTIST_EXPANSION_TARGETS_REPORT.txt")


TARGETS = [
    {
        "artist": "아이브",
        "englishName": "IVE",
        "priority": 1,
        "type": "girl_group",
        "reason": "대형 걸그룹 축 대표 후보",
        "naverKeyword": "아이브 IVE",
        "youtubeQuerySeed": "IVE official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
    {
        "artist": "르세라핌",
        "englishName": "LE SSERAFIM",
        "priority": 2,
        "type": "girl_group",
        "reason": "글로벌 팬덤/퍼포먼스 축 대표 후보",
        "naverKeyword": "르세라핌 LE SSERAFIM",
        "youtubeQuerySeed": "LE SSERAFIM official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
    {
        "artist": "뉴진스",
        "englishName": "NewJeans",
        "priority": 3,
        "type": "girl_group",
        "reason": "대중성/브랜드 화제성 축 대표 후보",
        "naverKeyword": "뉴진스 NewJeans",
        "youtubeQuerySeed": "NewJeans official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
    {
        "artist": "세븐틴",
        "englishName": "SEVENTEEN",
        "priority": 4,
        "type": "boy_group",
        "reason": "대형 보이그룹/팬덤 규모 축 대표 후보",
        "naverKeyword": "세븐틴 SEVENTEEN",
        "youtubeQuerySeed": "SEVENTEEN official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
    {
        "artist": "스트레이키즈",
        "englishName": "Stray Kids",
        "priority": 5,
        "type": "boy_group",
        "reason": "글로벌 보이그룹/해외 지표 축 대표 후보",
        "naverKeyword": "스트레이키즈 Stray Kids",
        "youtubeQuerySeed": "Stray Kids official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
    {
        "artist": "투모로우바이투게더",
        "englishName": "TXT",
        "priority": 6,
        "type": "boy_group",
        "reason": "4세대 보이그룹 비교 축 대표 후보",
        "naverKeyword": "투모로우바이투게더 TXT TOMORROW X TOGETHER",
        "youtubeQuerySeed": "TXT TOMORROW X TOGETHER official music video performance dance practice",
        "musicTrackHint": "",
        "status": "proposed",
    },
]


def main():
    now = datetime.now().isoformat(timespec="seconds")

    fieldnames = [
        "priority",
        "artist",
        "englishName",
        "type",
        "reason",
        "naverKeyword",
        "youtubeQuerySeed",
        "musicTrackHint",
        "status",
    ]

    with open(CSV_OUT, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(TARGETS)

    payload = {
        "version": VERSION,
        "createdAt": now,
        "targetCount": len(TARGETS),
        "scope": "proposal only / no source mutation / no website export",
        "targets": TARGETS,
        "nextStep": [
            "Review artist_expansion_targets_v1.csv.",
            "If approved, append these artists to artist_list.txt.",
            "Then expand Naver collection first.",
            "Then expand YouTube seed discovery.",
            "Then add music chart seed rows.",
        ],
    }

    JSON_OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    lines = []
    lines.append("FANDEX Artist Expansion Targets Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: proposal only / no file mutation except this report/csv/json")
    lines.append("")
    lines.append("확장 후보 6명")
    lines.append("-" * 70)

    for item in TARGETS:
        lines.append(
            f"{item['priority']}. {item['artist']} / {item['englishName']} / "
            f"{item['type']} / {item['reason']}"
        )

    lines.append("")
    lines.append("확장 적용 전 체크")
    lines.append("-" * 70)
    lines.append("1. 후보 6명이 맞는지 확인")
    lines.append("2. 교체할 후보가 있으면 artist_expansion_targets_v1.csv에서 수정")
    lines.append("3. 확정 후 artist_list.txt에 반영")
    lines.append("4. Naver v3 확장")
    lines.append("5. YouTube seed discovery 확장")
    lines.append("6. music_chart_seed_v1.csv 확장")
    lines.append("7. daily v2 실행")
    lines.append("8. health check")
    lines.append("9. 백업")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Artist expansion targets 생성 완료")
    print("=" * 70)
    print(f"targets csv: {CSV_OUT}")
    print(f"targets json: {JSON_OUT}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_ARTIST_EXPANSION_TARGETS_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()