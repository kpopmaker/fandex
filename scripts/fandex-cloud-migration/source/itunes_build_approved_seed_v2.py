import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "itunes_build_approved_seed_v2"

LEGACY_SEED_FILE = Path("itunes_track_seed_v1.csv")
LEGACY_METADATA_FILE = Path("itunes_track_metadata_v1_latest.csv")
CANDIDATE_FILE = Path("itunes_artist_candidates_v2_latest.csv")

OUTPUT_SEED_FILE = Path("itunes_track_seed_v2.csv")
PREVIEW_FILE = Path("itunes_track_seed_v2_approved_preview_latest.csv")
LATEST_REPORT = Path("ITUNES_APPROVED_SEED_V2_REPORT_latest.txt")


REQUIRED_ARTISTS = [
    "아이유",
    "에이티즈",
    "보이넥스트도어",
    "에스파",
    "뉴진스",
    "르세라핌",
    "아이브",
    "세븐틴",
    "스트레이키즈",
    "투모로우바이투게더",
]


NEW_ARTIST_QUERY_NAMES = {
    "뉴진스": "NewJeans",
    "르세라핌": "LE SSERAFIM",
    "아이브": "IVE",
    "세븐틴": "SEVENTEEN",
    "스트레이키즈": "Stray Kids",
    "투모로우바이투게더": "TOMORROW X TOGETHER",
}


FIELDNAMES = [
    "artist",
    "trackTitle",
    "query",
    "country",
    "approvedArtistId",
    "approvedTrackId",
    "approvedITunesArtistName",
    "approvedITunesTrackName",
    "approvalSource",
    "memo",
]


def normalize(value):
    return " ".join(str(value or "").strip().casefold().split())


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"ERROR: 파일이 없습니다: {path}")

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


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
                extrasaction="ignore",
            )
            writer.writeheader()
            writer.writerows(rows)

    except PermissionError:
        raise SystemExit(
            f"ERROR: {path} 파일이 다른 프로그램에서 열려 있습니다.\n"
            "Excel, 메모장, VS Code에서 파일을 닫고 다시 실행하세요."
        )


def parse_rank(value):
    try:
        return int(float(str(value or "").strip()))
    except (ValueError, TypeError):
        return 999999


def build_legacy_rows(seed_rows, metadata_rows):
    metadata_map = {
        normalize(row.get("artist")): row
        for row in metadata_rows
        if normalize(row.get("artist"))
    }

    output = []
    missing = []

    for seed in seed_rows:
        artist = str(seed.get("artist") or "").strip()

        if not artist:
            continue

        metadata = metadata_map.get(normalize(artist))

        if not metadata:
            missing.append(
                f"{artist}: 기존 iTunes metadata 결과 없음"
            )
            continue

        artist_id = str(
            metadata.get("artistId") or ""
        ).strip()

        track_id = str(
            metadata.get("trackId") or ""
        ).strip()

        itunes_artist = str(
            metadata.get("itunesArtistName")
            or metadata.get("artistName")
            or ""
        ).strip()

        itunes_track = str(
            metadata.get("itunesTrackName")
            or metadata.get("trackName")
            or ""
        ).strip()

        if not artist_id or not track_id:
            missing.append(
                f"{artist}: artistId 또는 trackId 누락"
            )
            continue

        output.append(
            {
                "artist": artist,
                "trackTitle": str(
                    seed.get("trackTitle") or itunes_track
                ).strip(),
                "query": str(
                    seed.get("query") or ""
                ).strip(),
                "country": str(
                    seed.get("country") or "KR"
                ).strip(),
                "approvedArtistId": artist_id,
                "approvedTrackId": track_id,
                "approvedITunesArtistName": itunes_artist,
                "approvedITunesTrackName": itunes_track,
                "approvalSource": "legacy_v1_latest_metadata",
                "memo": (
                    str(seed.get("memo") or "").strip()
                    + "; approved_exact_id_v2"
                ).strip("; "),
            }
        )

    return output, missing


def build_new_rows(candidate_rows):
    output = []
    missing = []

    for artist, query_name in NEW_ARTIST_QUERY_NAMES.items():
        matches = []

        for row in candidate_rows:
            if normalize(row.get("artist")) != normalize(artist):
                continue

            exact = normalize(
                row.get("exactArtistMatch")
            ) == "true"

            if not exact:
                continue

            artist_id = str(
                row.get("artistId") or ""
            ).strip()

            track_id = str(
                row.get("trackId") or ""
            ).strip()

            if not artist_id or not track_id:
                continue

            matches.append(row)

        matches.sort(
            key=lambda row: (
                parse_rank(row.get("candidateRank")),
                -parse_rank(row.get("candidateScore")),
            )
        )

        if not matches:
            missing.append(
                f"{artist}: exact 후보 없음"
            )
            continue

        approved = matches[0]

        track_title = str(
            approved.get("itunesTrackName") or ""
        ).strip()

        output.append(
            {
                "artist": artist,
                "trackTitle": track_title,
                "query": f"{query_name} {track_title}".strip(),
                "country": str(
                    approved.get("country") or "KR"
                ).strip(),
                "approvedArtistId": str(
                    approved.get("artistId") or ""
                ).strip(),
                "approvedTrackId": str(
                    approved.get("trackId") or ""
                ).strip(),
                "approvedITunesArtistName": str(
                    approved.get("itunesArtistName") or ""
                ).strip(),
                "approvedITunesTrackName": track_title,
                "approvalSource": (
                    "itunes_candidates_v2_exact_rank1"
                ),
                "memo": (
                    "approved exact artist candidate; "
                    f"candidateRank={approved.get('candidateRank')}; "
                    f"collection={approved.get('collectionName')}"
                ),
            }
        )

    return output, missing


def validate_rows(rows):
    problems = []

    artist_map = {}
    track_id_map = {}

    for row in rows:
        artist = row["artist"]
        track_id = row["approvedTrackId"]

        artist_map.setdefault(artist, []).append(row)
        track_id_map.setdefault(track_id, []).append(artist)

    for artist in REQUIRED_ARTISTS:
        count = len(artist_map.get(artist, []))

        if count != 1:
            problems.append(
                f"{artist}: 행 수 {count}, 정상 기준 1"
            )

    for track_id, artists in track_id_map.items():
        if not track_id:
            problems.append("빈 approvedTrackId 발견")
        elif len(artists) > 1:
            problems.append(
                f"trackId 중복 {track_id}: {artists}"
            )

    if len(rows) != 10:
        problems.append(
            f"전체 행 수 {len(rows)}, 정상 기준 10"
        )

    return problems


def main():
    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    seed_rows = read_csv(LEGACY_SEED_FILE)
    metadata_rows = read_csv(LEGACY_METADATA_FILE)
    candidate_rows = read_csv(CANDIDATE_FILE)

    legacy_rows, legacy_missing = build_legacy_rows(
        seed_rows,
        metadata_rows,
    )

    new_rows, new_missing = build_new_rows(
        candidate_rows
    )

    combined = legacy_rows + new_rows

    order_map = {
        artist: index
        for index, artist in enumerate(REQUIRED_ARTISTS)
    }

    combined.sort(
        key=lambda row: order_map.get(
            row["artist"],
            999,
        )
    )

    missing = legacy_missing + new_missing
    problems = validate_rows(combined)

    write_csv(PREVIEW_FILE, combined)

    print()
    print("iTunes 승인 seed v2 생성")
    print("=" * 76)
    print(f"실행 모드: {'APPLY' if apply_mode else 'DRY-RUN'}")
    print(f"기존 v1 이관: {len(legacy_rows)}")
    print(f"신규 후보 승인: {len(new_rows)}")
    print(f"전체 승인 행: {len(combined)}")
    print(f"누락: {len(missing)}")
    print(f"검증 문제: {len(problems)}")
    print()

    print("승인된 10명")
    print("-" * 76)

    for row in combined:
        print(
            f"{row['artist']} | "
            f"{row['approvedITunesArtistName']} | "
            f"{row['approvedITunesTrackName']} | "
            f"artistId={row['approvedArtistId']} | "
            f"trackId={row['approvedTrackId']}"
        )

    if missing:
        print()
        print("누락")
        print("-" * 76)

        for item in missing:
            print(item)

    if problems:
        print()
        print("검증 문제")
        print("-" * 76)

        for item in problems:
            print(item)

    report_lines = [
        "FANDEX iTunes Approved Seed v2 Report",
        "=" * 76,
        f"createdAt: {datetime.now().isoformat(timespec='seconds')}",
        f"version: {VERSION}",
        f"mode: {'APPLY' if apply_mode else 'DRY-RUN'}",
        "",
        "검증 결과",
        "-" * 76,
        f"legacyCount: {len(legacy_rows)}",
        f"newApprovedCount: {len(new_rows)}",
        f"totalCount: {len(combined)}",
        f"missingCount: {len(missing)}",
        f"problemCount: {len(problems)}",
        "",
        "승인 행",
        "-" * 76,
    ]

    for row in combined:
        report_lines.append(
            f"{row['artist']} | "
            f"{row['approvedITunesArtistName']} | "
            f"{row['approvedITunesTrackName']} | "
            f"artistId={row['approvedArtistId']} | "
            f"trackId={row['approvedTrackId']} | "
            f"source={row['approvalSource']}"
        )

    report_lines.extend(
        [
            "",
            "출력",
            "-" * 76,
            f"previewFile: {PREVIEW_FILE}",
            f"outputSeedFile: {OUTPUT_SEED_FILE}",
            f"seedV1Modified: FALSE",
            f"masterModified: FALSE",
            f"websiteModified: FALSE",
        ]
    )

    if missing:
        report_lines.extend(
            ["", "누락", "-" * 76, *missing]
        )

    if problems:
        report_lines.extend(
            ["", "검증 문제", "-" * 76, *problems]
        )

    report_text = "\n".join(report_lines)

    timestamp_report = Path(
        f"ITUNES_APPROVED_SEED_V2_REPORT_{timestamp}.txt"
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    if missing or problems:
        print()
        print("ERROR: 검증 실패")
        print("원본 seed와 master는 수정하지 않았습니다.")
        return 1

    if not apply_mode:
        print()
        print("DRY-RUN 완료")
        print(f"미리보기: {PREVIEW_FILE}")
        print("itunes_track_seed_v1.csv는 수정하지 않았습니다.")
        print()
        print("실제 생성:")
        print("py itunes_build_approved_seed_v2.py --apply")
        return 0

    if OUTPUT_SEED_FILE.exists():
        backup_file = Path(
            "itunes_track_seed_v2_backup_before_apply_"
            f"{timestamp}.csv"
        )
        shutil.copy2(
            OUTPUT_SEED_FILE,
            backup_file,
        )
        print(f"기존 v2 백업: {backup_file}")

    write_csv(OUTPUT_SEED_FILE, combined)

    print()
    print("=" * 76)
    print("iTunes 승인 seed v2 생성 완료")
    print("=" * 76)
    print(f"출력 seed: {OUTPUT_SEED_FILE}")
    print("행 수: 10")
    print("seedV1Modified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    return 0


if __name__ == "__main__":
    sys.exit(main())