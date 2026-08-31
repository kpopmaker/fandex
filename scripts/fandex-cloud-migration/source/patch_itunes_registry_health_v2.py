import re
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "patch_itunes_registry_health_v2"

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


REGISTRY_BLOCK = '''    {
        "sourceId": "itunes_search_api",
        "displayName": "iTunes Search / Lookup API",
        "category": "music_metadata",
        "collectionMethod": "official_api",
        "authRequired": "no",
        "credentialEnv": "",
        "autoCollectPossible": "yes",
        "currentStatus": "active",
        "priority": "medium",
        "scoreUse": "metadata_only_not_fandex_score",
        "reliability": "high_for_approved_id_lookup",
        "difficulty": "low",
        "pipelineRisk": "low",
        "notes": "v2 완료: 승인된 trackId 직접 조회, 10명 검증, ok=10, error=0, warning=0. FANDEX Master 점수에는 사용하지 않음.",
    },'''


ITUNES_HEALTH_FUNCTION = '''def check_itunes(lines):
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

    paths = [
        seed_path,
        csv_path,
        json_path,
        report_path,
    ]

    missing = [
        str(path)
        for path in paths
        if not path.exists()
    ]

    if missing:
        for path in missing:
            lines.append(f"WARN 파일 없음: {path}")

        return False

    try:
        seed_rows = read_csv(seed_path)
        metadata_rows = read_csv(csv_path)
        payload = read_json(json_path)

    except Exception as exc:
        lines.append(
            f"WARN iTunes 파일 읽기 실패: "
            f"{type(exc).__name__}: {exc}"
        )
        return False

    seed_ok = len(seed_rows) == 10
    result_count_ok = len(metadata_rows) == 10

    bad_rows = []

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
            bad_rows.append(
                f"{artist}: {', '.join(failed)}"
            )

    metadata_ok = (
        result_count_ok
        and not bad_rows
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
        f"{'OK' if result_count_ok else 'WARN'} "
        f"iTunes metadata row count: "
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

    if bad_rows:
        for item in bad_rows:
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
'''


def read_source(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    raw = path.read_bytes()
    has_bom = raw.startswith(b"\\xef\\xbb\\xbf")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise SystemExit(
            f"ERROR: UTF-8로 읽지 못했습니다: "
            f"{path}\\n{exc}"
        )

    newline = "\\r\\n" if "\\r\\n" in text else "\\n"

    return text, has_bom, newline


def write_source(path, text, has_bom):
    encoding = "utf-8-sig" if has_bom else "utf-8"
    path.write_text(text, encoding=encoding)


def patch_registry(text, newline):
    completed_marker = (
        '"scoreUse": '
        '"metadata_only_not_fandex_score"'
    )

    if completed_marker in text:
        return text, False

    pattern = (
        r'(?ms)^    \\{\\r?\\n'
        r'        "sourceId": '
        r'"itunes_search_api",\\r?\\n'
        r'.*?^    \\},'
    )

    replacement = REGISTRY_BLOCK.replace(
        "\\n",
        newline,
    )

    patched, count = re.subn(
        pattern,
        replacement,
        text,
        count=1,
    )

    if count != 1:
        raise SystemExit(
            "ERROR: iTunes 레지스트리 블록을 "
            f"정확히 찾지 못했습니다. count={count}"
        )

    return patched, True


def add_required_files(text, newline):
    start = text.find("REQUIRED_FILES = [")

    if start < 0:
        raise SystemExit(
            "ERROR: REQUIRED_FILES 시작점을 "
            "찾지 못했습니다."
        )

    close = text.find(
        f"{newline}]",
        start,
    )

    if close < 0:
        raise SystemExit(
            "ERROR: REQUIRED_FILES 종료점을 "
            "찾지 못했습니다."
        )

    block = text[start:close]

    missing = [
        file_name
        for file_name in ITUNES_REQUIRED_FILES
        if f'"{file_name}"' not in block
    ]

    if not missing:
        return text, False

    insertion = "".join(
        f'{newline}    "{file_name}",'
        for file_name in missing
    )

    patched = (
        text[:close]
        + insertion
        + text[close:]
    )

    return patched, True


def add_itunes_health_function(text, newline):
    if "def check_itunes(lines):" in text:
        return text, False

    anchor = "def check_archive(lines):"

    if anchor not in text:
        raise SystemExit(
            "ERROR: check_archive 함수 위치를 "
            "찾지 못했습니다."
        )

    function_text = ITUNES_HEALTH_FUNCTION.replace(
        "\\n",
        newline,
    )

    patched = text.replace(
        anchor,
        function_text
        + newline
        + newline
        + anchor,
        1,
    )

    return patched, True


def add_itunes_main_call(text, newline):
    call = "    results.append(check_itunes(lines))"

    if call in text:
        return text, False

    anchor = (
        "    results.append("
        "check_music_seed(lines))"
    )

    if anchor not in text:
        raise SystemExit(
            "ERROR: check_music_seed 실행 위치를 "
            "찾지 못했습니다."
        )

    patched = text.replace(
        anchor,
        anchor + newline + call,
        1,
    )

    return patched, True


def validate_source(text, file_name):
    try:
        compile(
            text,
            file_name,
            "exec",
        )
    except SyntaxError as exc:
        raise SystemExit(
            f"ERROR: 패치 후 문법 오류: "
            f"{file_name}\\n{exc}"
        )


def main():
    apply_mode = "--apply" in sys.argv
    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    registry_text, registry_bom, registry_newline = (
        read_source(REGISTRY_FILE)
    )

    health_text, health_bom, health_newline = (
        read_source(HEALTH_FILE)
    )

    registry_patched, registry_changed = (
        patch_registry(
            registry_text,
            registry_newline,
        )
    )

    health_patched, required_changed = (
        add_required_files(
            health_text,
            health_newline,
        )
    )

    health_patched, function_changed = (
        add_itunes_health_function(
            health_patched,
            health_newline,
        )
    )

    health_patched, main_changed = (
        add_itunes_main_call(
            health_patched,
            health_newline,
        )
    )

    validate_source(
        registry_patched,
        str(REGISTRY_FILE),
    )

    validate_source(
        health_patched,
        str(HEALTH_FILE),
    )

    print()
    print("FANDEX iTunes registry/health patch v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        f"mode: "
        f"{'APPLY' if apply_mode else 'DRY-RUN'}"
    )
    print(
        f"registryChanged: "
        f"{str(registry_changed).upper()}"
    )
    print(
        f"requiredFilesChanged: "
        f"{str(required_changed).upper()}"
    )
    print(
        f"healthFunctionChanged: "
        f"{str(function_changed).upper()}"
    )
    print(
        f"healthMainChanged: "
        f"{str(main_changed).upper()}"
    )
    print("syntaxCheck: OK")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    if not apply_mode:
        write_source(
            REGISTRY_PREVIEW,
            registry_patched,
            registry_bom,
        )

        write_source(
            HEALTH_PREVIEW,
            health_patched,
            health_bom,
        )

        print()
        print("DRY-RUN 완료")
        print(
            f"registry preview: "
            f"{REGISTRY_PREVIEW}"
        )
        print(
            f"health preview: "
            f"{HEALTH_PREVIEW}"
        )
        print()
        print("실제 적용:")
        print(
            "py patch_itunes_registry_health_v2.py "
            "--apply"
        )

        return 0

    backup_dir = Path(
        "patch_backup_before_itunes_registry_"
        f"health_v2_{timestamp}"
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
        registry_patched,
        registry_bom,
    )

    write_source(
        HEALTH_FILE,
        health_patched,
        health_bom,
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