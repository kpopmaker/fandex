import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "patch_identity_map_health_v1"

HEALTH_FILE = Path(
    "fandex_python_health_check_v1.py"
)

HEALTH_PREVIEW = Path(
    "fandex_python_health_check_v1_identity_map_preview.py"
)


IDENTITY_REQUIRED_FILES = [
    "fandex_artist_identity_map_v1.csv",
    "fandex_artist_identity_map_latest.json",
    "FANDEX_ARTIST_IDENTITY_MAP_REPORT.txt",
]


IDENTITY_HEALTH_FUNCTION = r'''
def check_identity_map(lines):
    csv_path = Path(
        "fandex_artist_identity_map_v1.csv"
    )

    json_path = Path(
        "fandex_artist_identity_map_latest.json"
    )

    report_path = Path(
        "FANDEX_ARTIST_IDENTITY_MAP_REPORT.txt"
    )

    lines.append("")
    lines.append("Artist Identity Map v1 확인")
    lines.append("-" * 70)

    required_paths = [
        csv_path,
        json_path,
        report_path,
    ]

    missing = [
        str(path)
        for path in required_paths
        if not path.exists()
    ]

    if missing:
        for file_name in missing:
            lines.append(
                f"WARN 파일 없음: {file_name}"
            )

        return False

    try:
        rows = read_csv(csv_path)
        payload = read_json(json_path)

    except Exception as exc:
        lines.append(
            "WARN Identity Map 읽기 실패: "
            f"{type(exc).__name__}: {exc}"
        )

        return False

    row_count_ok = (
        len(rows) == 10
    )

    invalid_rows = []
    unexpected_warning_rows = []
    canonical_ids = []
    advisory_count = 0

    allowed_advisory = (
        "LASTFM_MBID_DIFFERS_FROM_MUSICBRAINZ"
    )

    for row in rows:
        artist = str(
            row.get("artist")
            or "(artist 없음)"
        ).strip()

        identity_ok = (
            str(
                row.get("identityStatus")
                or ""
            ).strip().lower()
            == "ok"
        )

        itunes_ok = (
            str(
                row.get("itunesVerified")
                or ""
            ).strip().upper()
            == "TRUE"
        )

        lastfm_ok = (
            str(
                row.get("lastfmVerified")
                or ""
            ).strip().upper()
            == "TRUE"
        )

        musicbrainz_ok = (
            str(
                row.get("musicbrainzVerified")
                or ""
            ).strip().upper()
            == "TRUE"
        )

        source_count_ok = (
            str(
                row.get("sourceCount")
                or ""
            ).strip()
            == "3"
        )

        canonical_mbid = str(
            row.get("musicbrainzMbid")
            or ""
        ).strip()

        if canonical_mbid:
            canonical_ids.append(
                canonical_mbid
            )

        warning_text = str(
            row.get("identityWarnings")
            or ""
        ).strip()

        warnings = [
            item.strip()
            for item in warning_text.split("|")
            if item.strip()
        ]

        unexpected = [
            item
            for item in warnings
            if item != allowed_advisory
        ]

        if allowed_advisory in warnings:
            advisory_count += 1

        if unexpected:
            unexpected_warning_rows.append(
                f"{artist}: "
                + ", ".join(unexpected)
            )

        failed = []

        if not identity_ok:
            failed.append(
                "identityStatus"
            )

        if not itunes_ok:
            failed.append(
                "itunesVerified"
            )

        if not lastfm_ok:
            failed.append(
                "lastfmVerified"
            )

        if not musicbrainz_ok:
            failed.append(
                "musicbrainzVerified"
            )

        if not source_count_ok:
            failed.append(
                "sourceCount"
            )

        if not canonical_mbid:
            failed.append(
                "musicbrainzMbid"
            )

        if failed:
            invalid_rows.append(
                f"{artist}: "
                + ", ".join(failed)
            )

    canonical_unique_ok = (
        len(canonical_ids) == 10
        and len(set(canonical_ids)) == 10
    )

    rows_ok = (
        row_count_ok
        and not invalid_rows
        and not unexpected_warning_rows
        and canonical_unique_ok
    )

    json_ok = (
        isinstance(payload, dict)
        and payload.get("artistCount") == 10
        and payload.get("sourceCount") == 3
        and payload.get("okCount") == 10
        and payload.get("errorCount") == 0
        and payload.get("warningArtistCount")
        == advisory_count
        and payload.get("scoreUsage")
        == "identity_metadata_only_not_fandex_score"
        and payload.get("masterModified") is False
        and payload.get("websiteModified") is False
    )

    lines.append(
        f"{'OK' if row_count_ok else 'WARN'} "
        f"Identity Map row count: {len(rows)}"
    )

    lines.append(
        f"{'OK' if canonical_unique_ok else 'WARN'} "
        "canonical MusicBrainz MBID unique count: "
        f"{len(set(canonical_ids))}"
    )

    lines.append(
        f"{'OK' if not invalid_rows else 'WARN'} "
        "iTunes·Last.fm·MusicBrainz "
        "3-source identity 검증"
    )

    lines.append(
        f"{'OK' if not unexpected_warning_rows else 'WARN'} "
        "Identity warning 정책 검증"
    )

    lines.append(
        f"{'OK' if json_ok else 'WARN'} "
        "Identity Map JSON 요약 검증"
    )

    for item in invalid_rows:
        lines.append(
            f"WARN {item}"
        )

    for item in unexpected_warning_rows:
        lines.append(
            f"WARN 예상하지 못한 warning: {item}"
        )

    lines.append(
        "INFO canonicalIdSource: MusicBrainz MBID"
    )

    lines.append(
        "INFO Last.fm MBID role: advisory reference"
    )

    lines.append(
        "INFO Last.fm↔MusicBrainz MBID advisory count: "
        f"{advisory_count}"
    )

    lines.append(
        "INFO scoreUsage: "
        "identity_metadata_only_not_fandex_score"
    )

    lines.append(
        "INFO masterModified: FALSE"
    )

    lines.append(
        "INFO websiteModified: FALSE"
    )

    overall_ok = (
        rows_ok
        and json_ok
    )

    if overall_ok:
        lines.append(
            "OK: Artist Identity Map "
            "10명 canonical identity 정상"
        )
    else:
        lines.append(
            "WARN: Artist Identity Map 확인 필요"
        )

    return overall_ok
'''.strip().splitlines()


def read_source(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    raw = path.read_bytes()

    has_bom = raw.startswith(
        b"\xef\xbb\xbf"
    )

    text = raw.decode(
        "utf-8-sig"
    )

    newline = (
        "\r\n"
        if "\r\n" in text
        else "\n"
    )

    ended_with_newline = text.endswith(
        ("\r\n", "\n")
    )

    return (
        text.splitlines(),
        has_bom,
        newline,
        ended_with_newline,
    )


def write_source(
    path,
    lines,
    has_bom,
    newline,
    ended_with_newline,
):
    text = newline.join(lines)

    if ended_with_newline:
        text += newline

    encoding = (
        "utf-8-sig"
        if has_bom
        else "utf-8"
    )

    path.write_text(
        text,
        encoding=encoding,
    )


def patch_required_files(lines):
    start_index = next(
        (
            index
            for index, line
            in enumerate(lines)
            if line.strip().startswith(
                "REQUIRED_FILES = ["
            )
        ),
        None,
    )

    if start_index is None:
        raise SystemExit(
            "ERROR: REQUIRED_FILES를 찾지 못했습니다."
        )

    end_index = None

    for index in range(
        start_index + 1,
        len(lines),
    ):
        if lines[index].strip() == "]":
            end_index = index
            break

    if end_index is None:
        raise SystemExit(
            "ERROR: REQUIRED_FILES 종료점을 찾지 못했습니다."
        )

    block = "\n".join(
        lines[start_index:end_index + 1]
    )

    missing = [
        file_name
        for file_name in IDENTITY_REQUIRED_FILES
        if f'"{file_name}"' not in block
    ]

    if not missing:
        return lines, False

    insertion = [
        f'    "{file_name}",'
        for file_name in missing
    ]

    return (
        lines[:end_index]
        + insertion
        + lines[end_index:]
    ), True


def patch_function(lines):
    if any(
        line.startswith(
            "def check_identity_map(lines):"
        )
        for line in lines
    ):
        return lines, False

    archive_index = next(
        (
            index
            for index, line
            in enumerate(lines)
            if line.startswith(
                "def check_archive(lines):"
            )
        ),
        None,
    )

    if archive_index is None:
        raise SystemExit(
            "ERROR: check_archive를 찾지 못했습니다."
        )

    insertion = (
        IDENTITY_HEALTH_FUNCTION
        + [""]
        + [""]
    )

    return (
        lines[:archive_index]
        + insertion
        + lines[archive_index:]
    ), True


def patch_main(lines):
    call_line = (
        "    results.append("
        "check_identity_map(lines))"
    )

    if call_line in lines:
        return lines, False

    musicbrainz_index = next(
        (
            index
            for index, line
            in enumerate(lines)
            if (
                "results.append("
                "check_musicbrainz(lines))"
                in line
            )
        ),
        None,
    )

    if musicbrainz_index is None:
        raise SystemExit(
            "ERROR: check_musicbrainz 호출을 "
            "찾지 못했습니다."
        )

    return (
        lines[:musicbrainz_index + 1]
        + [call_line]
        + lines[musicbrainz_index + 1:]
    ), True


def validate_python(lines):
    try:
        compile(
            "\n".join(lines),
            str(HEALTH_FILE),
            "exec",
        )

    except SyntaxError as exc:
        raise SystemExit(
            "ERROR: 패치 결과 문법 오류\n"
            f"{exc}"
        )


def main():
    apply_mode = (
        "--apply" in sys.argv
    )

    (
        lines,
        has_bom,
        newline,
        ended_with_newline,
    ) = read_source(
        HEALTH_FILE
    )

    (
        lines,
        required_changed,
    ) = patch_required_files(
        lines
    )

    (
        lines,
        function_changed,
    ) = patch_function(
        lines
    )

    (
        lines,
        main_changed,
    ) = patch_main(
        lines
    )

    validate_python(lines)

    print()
    print(
        "FANDEX Identity Map health patch v1"
    )
    print("=" * 76)

    print(
        f"version: {VERSION}"
    )

    print(
        "mode: "
        + (
            "APPLY"
            if apply_mode
            else "DRY-RUN"
        )
    )

    print(
        "requiredFilesChanged: "
        f"{str(required_changed).upper()}"
    )

    print(
        "healthFunctionChanged: "
        f"{str(function_changed).upper()}"
    )

    print(
        "healthMainChanged: "
        f"{str(main_changed).upper()}"
    )

    print("syntaxCheck: OK")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    if not apply_mode:
        write_source(
            HEALTH_PREVIEW,
            lines,
            has_bom,
            newline,
            ended_with_newline,
        )

        print()
        print("DRY-RUN 완료")
        print(
            f"health preview: {HEALTH_PREVIEW}"
        )

        print()
        print("실제 적용:")
        print(
            "py patch_identity_map_health_v1.py --apply"
        )

        return

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup_dir = Path(
        "patch_backup_before_"
        "identity_map_health_v1_"
        f"{timestamp}"
    )

    backup_dir.mkdir(
        parents=True,
        exist_ok=False,
    )

    shutil.copy2(
        HEALTH_FILE,
        backup_dir / HEALTH_FILE.name,
    )

    write_source(
        HEALTH_FILE,
        lines,
        has_bom,
        newline,
        ended_with_newline,
    )

    print()
    print("=" * 76)
    print("패치 적용 완료")
    print("=" * 76)
    print(
        f"backupDir: {backup_dir}"
    )
    print(
        f"updated: {HEALTH_FILE}"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()