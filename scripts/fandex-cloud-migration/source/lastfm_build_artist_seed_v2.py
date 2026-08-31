import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_build_artist_seed_v2"

LEGACY_SEED_FILE = Path("lastfm_artist_seed_v1.csv")
OUTPUT_SEED_FILE = Path("lastfm_artist_seed_v2.csv")
PREVIEW_FILE = Path(
    "lastfm_artist_seed_v2_preview_latest.csv"
)
LATEST_REPORT = Path(
    "LASTFM_ARTIST_SEED_V2_REPORT_latest.txt"
)


SEED_ROWS = [
    {
        "artist": "아이유",
        "query": "IU",
        "approvedLastfmName": "IU",
        "aliases": "IU|아이유",
        "memo": "Korean singer-songwriter IU",
    },
    {
        "artist": "에스파",
        "query": "aespa",
        "approvedLastfmName": "aespa",
        "aliases": "aespa|에스파",
        "memo": "K-pop girl group aespa",
    },
    {
        "artist": "에이티즈",
        "query": "ATEEZ",
        "approvedLastfmName": "ATEEZ",
        "aliases": "ATEEZ|에이티즈",
        "memo": "K-pop boy group ATEEZ",
    },
    {
        "artist": "보이넥스트도어",
        "query": "BOYNEXTDOOR",
        "approvedLastfmName": "BOYNEXTDOOR",
        "aliases": "BOYNEXTDOOR|보이넥스트도어",
        "memo": "K-pop boy group BOYNEXTDOOR",
    },
    {
        "artist": "아이브",
        "query": "IVE",
        "approvedLastfmName": "IVE",
        "aliases": "IVE|아이브",
        "memo": "K-pop girl group IVE",
    },
    {
        "artist": "르세라핌",
        "query": "LE SSERAFIM",
        "approvedLastfmName": "LE SSERAFIM",
        "aliases": "LE SSERAFIM|르세라핌",
        "memo": "K-pop girl group LE SSERAFIM",
    },
    {
        "artist": "뉴진스",
        "query": "NewJeans",
        "approvedLastfmName": "NewJeans",
        "aliases": "NewJeans|뉴진스",
        "memo": "K-pop girl group NewJeans",
    },
    {
        "artist": "세븐틴",
        "query": "SEVENTEEN",
        "approvedLastfmName": "SEVENTEEN",
        "aliases": "SEVENTEEN|세븐틴",
        "memo": "K-pop boy group SEVENTEEN",
    },
    {
        "artist": "스트레이키즈",
        "query": "Stray Kids",
        "approvedLastfmName": "Stray Kids",
        "aliases": "Stray Kids|스트레이키즈",
        "memo": "K-pop boy group Stray Kids",
    },
    {
        "artist": "투모로우바이투게더",
        "query": "TOMORROW X TOGETHER",
        "approvedLastfmName": "TOMORROW X TOGETHER",
        "aliases": (
            "TOMORROW X TOGETHER|TXT|"
            "투모로우바이투게더"
        ),
        "memo": "K-pop boy group TOMORROW X TOGETHER",
    },
]


FIELDNAMES = [
    "artist",
    "query",
    "approvedLastfmName",
    "aliases",
    "memo",
]


def write_csv(path, rows):
    try:
        with path.open(
            "w",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=FIELDNAMES,
            )
            writer.writeheader()
            writer.writerows(rows)

    except PermissionError:
        raise SystemExit(
            f"ERROR: {path} 파일이 다른 프로그램에서 "
            "열려 있습니다.\n"
            "Excel, 메모장, VS Code에서 닫고 "
            "다시 실행하세요."
        )


def validate_rows(rows):
    problems = []

    if len(rows) != 10:
        problems.append(
            f"전체 행 수 {len(rows)}, 정상 기준 10"
        )

    artists = [
        str(row.get("artist") or "").strip()
        for row in rows
    ]

    queries = [
        str(row.get("query") or "").strip()
        for row in rows
    ]

    if len(set(artists)) != 10:
        problems.append("아티스트 이름 중복 발견")

    for index, row in enumerate(rows, start=1):
        required = [
            "artist",
            "query",
            "approvedLastfmName",
            "aliases",
        ]

        for field in required:
            if not str(row.get(field) or "").strip():
                problems.append(
                    f"{index}행 {field} 누락"
                )

    if any(not query for query in queries):
        problems.append("빈 검색어 발견")

    return problems


def main():
    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    problems = validate_rows(SEED_ROWS)

    write_csv(
        PREVIEW_FILE,
        SEED_ROWS,
    )

    print()
    print("Last.fm artist seed v2 생성")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + ("APPLY" if apply_mode else "DRY-RUN")
    )
    print(f"rowCount: {len(SEED_ROWS)}")
    print(f"problemCount: {len(problems)}")
    print("legacySeedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print()

    print("10명 seed")
    print("-" * 76)

    for row in SEED_ROWS:
        print(
            f"{row['artist']} | "
            f"query={row['query']} | "
            f"approved={row['approvedLastfmName']}"
        )

    if problems:
        print()
        print("검증 문제")
        print("-" * 76)

        for problem in problems:
            print(problem)

    report_lines = [
        "FANDEX Last.fm Artist Seed v2 Report",
        "=" * 76,
        (
            "createdAt: "
            + datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        f"version: {VERSION}",
        (
            "mode: "
            + ("APPLY" if apply_mode else "DRY-RUN")
        ),
        "",
        "검증",
        "-" * 76,
        f"rowCount: {len(SEED_ROWS)}",
        f"problemCount: {len(problems)}",
        "",
        "seed",
        "-" * 76,
    ]

    for row in SEED_ROWS:
        report_lines.append(
            f"{row['artist']} | "
            f"query={row['query']} | "
            f"approved={row['approvedLastfmName']} | "
            f"aliases={row['aliases']}"
        )

    report_lines.extend(
        [
            "",
            "수정 여부",
            "-" * 76,
            "legacySeedModified: FALSE",
            "masterModified: FALSE",
            "websiteModified: FALSE",
        ]
    )

    if problems:
        report_lines.extend(
            [
                "",
                "검증 문제",
                "-" * 76,
                *problems,
            ]
        )

    report_text = "\n".join(report_lines)

    timestamp_report = Path(
        f"LASTFM_ARTIST_SEED_V2_REPORT_"
        f"{timestamp}.txt"
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    if problems:
        print()
        print("ERROR: seed 검증 실패")
        return 1

    if not apply_mode:
        print()
        print("DRY-RUN 완료")
        print(f"미리보기: {PREVIEW_FILE}")
        print(
            "lastfm_artist_seed_v1.csv는 "
            "수정하지 않았습니다."
        )
        print()
        print("실제 생성:")
        print(
            "py lastfm_build_artist_seed_v2.py "
            "--apply"
        )
        return 0

    if OUTPUT_SEED_FILE.exists():
        backup_file = Path(
            "lastfm_artist_seed_v2_"
            f"backup_before_apply_{timestamp}.csv"
        )

        shutil.copy2(
            OUTPUT_SEED_FILE,
            backup_file,
        )

        print(
            f"기존 v2 백업: {backup_file}"
        )

    write_csv(
        OUTPUT_SEED_FILE,
        SEED_ROWS,
    )

    print()
    print("=" * 76)
    print("Last.fm artist seed v2 생성 완료")
    print("=" * 76)
    print(f"출력: {OUTPUT_SEED_FILE}")
    print("행 수: 10")
    print("legacySeedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    return 0


if __name__ == "__main__":
    sys.exit(main())