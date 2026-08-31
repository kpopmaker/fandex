from pathlib import Path
from datetime import datetime
import json


VERSION = "naver_v3_artist_expansion_readiness_v1"

ARTIST_LIST = Path("artist_list.txt")
REPORT = Path("FANDEX_NAVER_V3_ARTIST_EXPANSION_READINESS_REPORT.txt")
JSON_OUT = Path("fandex_naver_v3_artist_expansion_readiness_latest.json")

TARGET_FILES = [
    "naver_full_pipeline_v3.py",
    "naver_publish_quality_v3.py",
    "naver_fandex_final_score_v3_batch.py",
    "naver_fandex_ranking_v3.py",
    "naver_fandex_export_v3_json.py",
    "naver_artist_report_v3.py",
    "naver_multi_collector_v2.py",
    "naver_batch_pipeline_v2.py",
    "naver_batch_pipeline_safe_v2.py",
]

KNOWN_ARTISTS = [
    "아이유",
    "에이티즈",
    "보이넥스트도어",
    "에스파",
    "아이브",
    "르세라핌",
    "뉴진스",
    "세븐틴",
    "스트레이키즈",
    "투모로우바이투게더",
]


def read_text(path):
    if not path.exists():
        return ""

    return path.read_text(encoding="utf-8", errors="replace")


def read_artist_list():
    if not ARTIST_LIST.exists():
        return []

    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def main():
    now = datetime.now().isoformat(timespec="seconds")
    artists = read_artist_list()

    file_checks = []

    for filename in TARGET_FILES:
        path = Path(filename)
        text = read_text(path)

        mentioned_artists = [
            artist for artist in KNOWN_ARTISTS
            if artist in text
        ]

        reads_artist_list = (
            "artist_list.txt" in text
            or "artist_list" in text
            or "ARTIST_LIST" in text
        )

        has_hardcoded_four_hint = all(
            artist in text for artist in ["아이유", "에이티즈", "보이넥스트도어", "에스파"]
        ) and not any(
            artist in text for artist in ["아이브", "르세라핌", "뉴진스", "세븐틴", "스트레이키즈", "투모로우바이투게더"]
        )

        file_checks.append({
            "file": filename,
            "exists": path.exists(),
            "size": path.stat().st_size if path.exists() else 0,
            "readsArtistListHint": reads_artist_list,
            "mentionedArtists": mentioned_artists,
            "mentionedArtistCount": len(mentioned_artists),
            "hardcodedFourHint": has_hardcoded_four_hint,
        })

    likely_dynamic = any(item["readsArtistListHint"] for item in file_checks)
    risky_hardcoded = [
        item for item in file_checks
        if item["exists"] and item["hardcodedFourHint"]
    ]

    lines = []
    lines.append("FANDEX Naver v3 Artist Expansion Readiness Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: audit only / no file mutation / no website public-data export")
    lines.append("")
    lines.append("artist_list.txt 현재 목록")
    lines.append("-" * 70)

    for idx, artist in enumerate(artists, start=1):
        lines.append(f"{idx}. {artist}")

    lines.append("")
    lines.append("Naver 관련 스크립트 검사")
    lines.append("-" * 70)

    for item in file_checks:
        status = "OK" if item["exists"] else "MISSING"
        lines.append(
            f"{status} {item['file']} | "
            f"readsArtistListHint={item['readsArtistListHint']} | "
            f"hardcodedFourHint={item['hardcodedFourHint']} | "
            f"mentioned={item['mentionedArtists']}"
        )

    lines.append("")
    lines.append("판단")
    lines.append("-" * 70)

    if likely_dynamic:
        lines.append("artist_list.txt를 읽는 흔적이 있습니다.")
        lines.append("다음 단계에서 Naver v3 dry-run/소규모 실행을 시도할 수 있습니다.")
    else:
        lines.append("artist_list.txt를 읽는 흔적이 약합니다.")
        lines.append("Naver v3 파이프라인이 4명 hardcoded일 가능성이 있어 패치가 필요합니다.")

    if risky_hardcoded:
        lines.append("")
        lines.append("hardcoded 4명 의심 파일")
        lines.append("-" * 70)
        for item in risky_hardcoded:
            lines.append(f"- {item['file']}")

    lines.append("")
    lines.append("다음 액션")
    lines.append("-" * 70)
    lines.append("1. 이 리포트를 확인")
    lines.append("2. artist_list.txt를 읽는 구조면 Naver v3 pipeline 실행")
    lines.append("3. 4명 hardcoded면 Naver v3 pipeline 대상 artist loader 패치")
    lines.append("4. Naver latest가 10명으로 확장되면 YouTube seed discovery로 이동")

    payload = {
        "version": VERSION,
        "createdAt": now,
        "artistList": artists,
        "artistCount": len(artists),
        "fileChecks": file_checks,
        "likelyDynamicArtistList": likely_dynamic,
        "riskyHardcodedFiles": risky_hardcoded,
    }

    REPORT.write_text("\n".join(lines), encoding="utf-8")
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("Naver v3 artist expansion readiness audit 완료")
    print("=" * 70)
    print(f"artist count: {len(artists)}")
    print(f"likelyDynamicArtistList: {likely_dynamic}")
    print(f"riskyHardcodedFiles: {len(risky_hardcoded)}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_V3_ARTIST_EXPANSION_READINESS_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()