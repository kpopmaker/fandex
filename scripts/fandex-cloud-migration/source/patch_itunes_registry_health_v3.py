import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "patch_itunes_registry_health_v3"

REGISTRY_FILE = Path("fandex_api_source_registry_v1.py")
HEALTH_FILE = Path("fandex_python_health_check_v1.py")

REGISTRY_PREVIEW = Path(
    "fandex_api_source_registry_v1_itunes_v2_preview.py"
)
HEALTH_PREVIEW = Path(
    "fandex_python_health_check_v1_itunes_v2_preview.py"
)

ITUNES_REQUIRED_FILES = [
    "itunes_track_seed_v2.csv",
    "itunes_track_metadata_v2_latest.csv",
    "fandex_itunes_track_metadata_v2_latest.json",
    "FANDEX_ITUNES_COLLECTOR_V2_REPORT.txt",
]

REGISTRY_BLOCK = [
    "    {",
    '        "sourceId": "itunes_search_api",',
    '        "displayName": "iTunes Search / Lookup API",',
    '        "category": "music_metadata",',
    '        "collectionMethod": "official_api",',
    '        "authRequired": "no",',
    '        "credentialEnv": "",',
    '        "autoCollectPossible": "yes",',
    '        "currentStatus": "active",',
    '        "priority": "medium",',
    '        "scoreUse": "metadata_only_not_fandex_score",',
    '        "reliability": "high_for_approved_id_lookup",',
    '        "difficulty": "low",',
    '        "pipelineRisk": "low",',
    (
        '        "notes": "v2 완료: 승인된 trackId 직접 조회, '
        '10명 검증, ok=10, error=0, warning=0. '
        'FANDEX Master 점수에는 사용하지 않음.",'
    ),
    "    },",
]

ITUNES_HEALTH_FUNCTION = '''
def check_itunes(lines):
    seed_path = Path("itunes_track_seed_v2.csv")
    csv_path = Path("itunes_track_metadata_v2_latest.csv")
    json_path = Path(
        "fandex_itunes_track_metadata_v2_latest.json"
    )
    report_path = Path(
        "FANDEX_ITUNES_COLLECTOR_V2_REPORT.txt"
    )

    lines.append("")
    lines.append("iTunes metadata v2 확인")
    lines.append("-" * 70)

    required_paths = [
        seed_path,
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
        seed_rows = read_csv(seed_path)
        metadata_rows = read_csv(csv_path)
        payload = read_json(json_path)

    except Exception as exc:
        lines.append(
            "WARN iTunes 파일 읽기 실패: "
            f"{type(exc).__name__}: {exc}"
        )
        return False

    seed_ok = len(seed_rows) == 10
    metadata_count_ok = len(metadata_rows) == 10

    invalid_rows = []

    for row in metadata_rows:
        artist = str(
            row.get("artist") or "(artist 없음)"
        ).strip()

        checks = {
            "validationStatus": (
                str(
                    row.get("validationStatus") or ""
                ).strip().lower()
                == "ok"
            ),
            "trackIdMatch": (
                str(
                    row.get("trackIdMatch") or ""
                ).strip().upper()
                == "TRUE"
            ),
            "artistIdMatch": (
                str(
                    row.get("artistIdMatch") or ""
                ).strip().upper()
                == "TRUE"
            ),
            "artistNameMatch": (
                str(
                    row.get("artistNameMatch") or ""
                ).strip().upper()
                == "TRUE"
            ),
            "trackNameMatch": (
                str(
                    row.get("trackNameMatch") or ""
                ).strip().upper()
                == "TRUE"
            ),
        }

        failed = [
            key
            for key, passed in checks.items()
            if not passed
        ]

        if failed:
            invalid_rows.append(
                f"{artist}: {', '.join(failed)}"
            )

    metadata_ok = (
        metadata_count_ok
        and not invalid_rows
    )

    json_ok = (
        isinstance(payload, dict)
        and payload.get("rowCount") == 10
        and payload.get("okCount") == 10
        and payload.get("errorCount") == 0
        and payload.get("warningCount") == 0
        and payload.get("scoreUsage")
        == "metadata_only_not_fandex_score"
        and payload.get("masterModified") is False
        and payload.get("websiteModified") is False
    )

    lines.append(
        f"{'OK' if seed_ok else 'WARN'} "
        f"iTunes seed row count: {len(seed_rows)}"
    )

    lines.append(
        f"{'OK' if metadata_count_ok else 'WARN'} "
        "iTunes metadata row count: "
        f"{len(metadata_rows)}"
    )

    lines.append(
        f"{'OK' if metadata_ok else 'WARN'} "
        "iTunes ID·이름 검증"
    )

    lines.append(
        f"{'OK' if json_ok else 'WARN'} "
        "iTunes JSON 요약 검증"
    )

    for item in invalid_rows:
        lines.append(f"WARN {item}")

    lines.append(
        "INFO scoreUsage: "
        "metadata_only_not_fandex_score"
    )
    lines.append("INFO masterModified: FALSE")
    lines.append("INFO websiteModified: FALSE")

    overall_ok = (
        seed_ok
        and metadata_ok
        and json_ok
    )

    if overall_ok:
        lines.append(
            "OK: iTunes v2 10명 메타데이터 정상"
        )
    else:
        lines.append(
            "WARN: iTunes v2 확인 필요"
        )

    return overall_ok
'''.strip().splitlines()


def read_source(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    raw = path.read_bytes()
    has_bom = raw.startswith(b"\xef\xbb\xbf")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise SystemExit(
            f"ERROR: UTF-8 파일이 아닙니다: {path}\n{exc}"
        )

    newline = "\r\n" if "\r\n" in text else "\n"
    ended_with_newline = text.endswith(("\r\n", "\n"))

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


def patch_registry(lines):
    marker = '"sourceId": "itunes_search_api"'

    source_index = next(
        (
            index
            for index, line in enumerate(lines)
            if marker in line
        ),
        None,
    )

    if source_index is None:
        raise SystemExit(
            "ERROR: itunes_search_api 항목을 "
            "찾지 못했습니다."
        )

    start_index = source_index

    while (
        start_index >= 0
        and lines[start_index].strip() != "{"
    ):
        start_index -= 1

    if start_index < 0:
        raise SystemExit(
            "ERROR: iTunes 블록 시작점을 "
            "찾지 못했습니다."
        )

    end_index = source_index

    while (
        end_index < len(lines)
        and lines[end_index].strip() != "},"
    ):
        end_index += 1

    if end_index >= len(lines):
        raise SystemExit(
            "ERROR: iTunes 블록 종료점을 "
            "찾지 못했습니다."
        )

    current_block = lines[
        start_index:end_index + 1
    ]

    if current_block == REGISTRY_BLOCK:
        return lines, False

    patched = (
        lines[:start_index]
        + REGISTRY_BLOCK
        + lines[end_index + 1:]
    )

    return patched, True


def patch_required_files(lines):
    start_index = next(
        (
            index
            for index, line in enumerate(lines)
            if line.strip().startswith(
                "REQUIRED_FILES = ["
            )
        ),
        None,
    )

    if start_index is None:
        raise SystemExit(
            "ERROR: REQUIRED_FILES를 "
            "찾지 못했습니다."
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
            "ERROR: REQUIRED_FILES 종료점을 "
            "찾지 못했습니다."
        )

    required_block = "\n".join(
        lines[start_index:end_index + 1]
    )

    missing = [
        file_name
        for file_name in ITUNES_REQUIRED_FILES
        if f'"{file_name}"'
        not in required_block
    ]

    if not missing:
        return lines, False

    insertion = [
        f'    "{file_name}",'
        for file_name in missing
    ]

    patched = (
        lines[:end_index]
        + insertion
        + lines[end_index:]
    )

    return patched, True


def patch_health_function(lines):
    if any(
        line.startswith("def check_itunes(lines):")
        for line in lines
    ):
        return lines, False

    archive_index = next(
        (
            index
            for index, line in enumerate(lines)
            if line.startswith(
                "def check_archive(lines):"
            )
        ),
        None,
    )

    if archive_index is None:
        raise SystemExit(
            "ERROR: check_archive 함수를 "
            "찾지 못했습니다."
        )

    insertion = (
        ITUNES_HEALTH_FUNCTION
        + [""]
        + [""]
    )

    patched = (
        lines[:archive_index]
        + insertion
        + lines[archive_index:]
    )

    return patched, True


def patch_health_main(lines):
    call_line = (
        "    results.append(check_itunes(lines))"
    )

    if call_line in lines:
        return lines, False

    music_index = next(
        (
            index
            for index, line in enumerate(lines)
            if (
                "results.append("
                "check_music_seed(lines))"
            ) in line
        ),
        None,
    )

    if music_index is None:
        raise SystemExit(
            "ERROR: check_music_seed 호출 위치를 "
            "찾지 못했습니다."
        )

    patched = (
        lines[:music_index + 1]
        + [call_line]
        + lines[music_index + 1:]
    )

    return patched, True


def validate_python(lines, file_name):
    source = "\n".join(lines)

    try:
        compile(
            source,
            file_name,
            "exec",
        )
    except SyntaxError as exc:
        raise SystemExit(
            "ERROR: 패치 결과에 문법 오류가 있습니다.\n"
            f"파일: {file_name}\n"
            f"{exc}"
        )


def main():
    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    (
        registry_lines,
        registry_bom,
        registry_newline,
        registry_ended,
    ) = read_source(REGISTRY_FILE)

    (
        health_lines,
        health_bom,
        health_newline,
        health_ended,
    ) = read_source(HEALTH_FILE)

    registry_lines, registry_changed = (
        patch_registry(registry_lines)
    )

    health_lines, required_changed = (
        patch_required_files(health_lines)
    )

    health_lines, function_changed = (
        patch_health_function(health_lines)
    )

    health_lines, main_changed = (
        patch_health_main(health_lines)
    )

    validate_python(
        registry_lines,
        str(REGISTRY_FILE),
    )

    validate_python(
        health_lines,
        str(HEALTH_FILE),
    )

    print()
    print("FANDEX iTunes registry/health patch v3")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + ("APPLY" if apply_mode else "DRY-RUN")
    )
    print(
        "registryChanged: "
        f"{str(registry_changed).upper()}"
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
            REGISTRY_PREVIEW,
            registry_lines,
            registry_bom,
            registry_newline,
            registry_ended,
        )

        write_source(
            HEALTH_PREVIEW,
            health_lines,
            health_bom,
            health_newline,
            health_ended,
        )

        print()
        print("DRY-RUN 완료")
        print(
            f"registry preview: {REGISTRY_PREVIEW}"
        )
        print(
            f"health preview: {HEALTH_PREVIEW}"
        )
        print()
        print("실제 적용:")
        print(
            "py patch_itunes_registry_health_v3.py "
            "--apply"
        )
        return 0

    backup_dir = Path(
        "patch_backup_before_itunes_registry_"
        f"health_v3_{timestamp}"
    )

    backup_dir.mkdir(
        parents=True,
        exist_ok=False,
    )

    shutil.copy2(
        REGISTRY_FILE,
        backup_dir / REGISTRY_FILE.name,
    )

    shutil.copy2(
        HEALTH_FILE,
        backup_dir / HEALTH_FILE.name,
    )

    write_source(
        REGISTRY_FILE,
        registry_lines,
        registry_bom,
        registry_newline,
        registry_ended,
    )

    write_source(
        HEALTH_FILE,
        health_lines,
        health_bom,
        health_newline,
        health_ended,
    )

    print()
    print("=" * 76)
    print("패치 적용 완료")
    print("=" * 76)
    print(f"backupDir: {backup_dir}")
    print(f"updated: {REGISTRY_FILE}")
    print(f"updated: {HEALTH_FILE}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    return 0


if __name__ == "__main__":
    sys.exit(main())