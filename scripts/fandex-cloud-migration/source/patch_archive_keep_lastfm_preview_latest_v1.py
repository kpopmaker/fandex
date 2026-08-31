from pathlib import Path
import py_compile
import shutil
import sys


VERSION = "patch_archive_keep_lastfm_preview_latest_v1"

TARGET = Path(
    "fandex_archive_generated_files_v1.py"
)

BACKUP = Path(
    "fandex_archive_generated_files_v1_"
    "before_lastfm_preview_latest_v1.py"
)

ARCHIVE_ROOT = Path("archive")

KEEP_FILES = [
    "lastfm_global_interest_score_preview_v1_latest.csv",
    "lastfm_master_impact_preview_v1_latest.csv",
]

ANCHOR = (
    '    "fandex_python_status_report_latest.txt",'
)


def find_latest_archived_file(filename):
    if not ARCHIVE_ROOT.exists():
        return None

    folders = sorted(
        [
            p
            for p in ARCHIVE_ROOT.iterdir()
            if p.is_dir()
        ],
        key=lambda p: p.name,
        reverse=True,
    )

    for folder in folders:
        candidate = folder / filename

        if candidate.exists():
            return candidate

    return None


def main():
    apply_mode = "--apply" in sys.argv

    print()
    print(
        "FANDEX patch archive keep "
        "Last.fm preview latest v1"
    )
    print("=" * 78)
    print(f"version: {VERSION}")
    print(
        "mode:",
        "APPLY" if apply_mode else "PREVIEW"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 78)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 없음: {TARGET}"
        )

    original = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    missing_keep = [
        name
        for name in KEEP_FILES
        if f'"{name}"' not in original
    ]

    print()
    print(
        "KEEP_EXACT add count:",
        len(missing_keep),
    )

    for name in KEEP_FILES:
        status = (
            "ALREADY"
            if f'"{name}"' in original
            else "READY"
        )

        print(
            f"{status}: {name}"
        )

    print()
    print("현재 루트 파일 상태")

    restore_plan = []

    for name in KEEP_FILES:
        root_file = Path(name)

        if root_file.exists():
            print(
                f"OK root exists: {name}"
            )
            continue

        archived = find_latest_archived_file(
            name
        )

        if archived:
            print(
                f"RESTORE READY: "
                f"{archived} -> {name}"
            )

            restore_plan.append(
                (archived, root_file)
            )

        else:
            print(
                f"WARN archived copy not found: "
                f"{name}"
            )

    if not missing_keep and not restore_plan:
        print()
        print("ALREADY COMPLETE")
        return

    if missing_keep:
        if ANCHOR not in original:
            raise SystemExit(
                "ERROR: KEEP_EXACT anchor를 "
                "찾지 못했습니다."
            )

        insert_text = "\n".join(
            f'    "{name}",'
            for name in missing_keep
        )

        patched = original.replace(
            ANCHOR,
            ANCHOR
            + "\n"
            + insert_text,
            1,
        )

    else:
        patched = original

    for name in KEEP_FILES:
        if f'"{name}"' not in patched:
            raise SystemExit(
                f"ERROR: KEEP 검증 실패: {name}"
            )

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY - 아직 수정하지 않았습니다."
        )
        print()
        print("적용 명령:")
        print(
            "py "
            "patch_archive_keep_lastfm_preview_latest_v1.py "
            "--apply"
        )
        return

    BACKUP.write_text(
        original,
        encoding="utf-8",
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    try:
        py_compile.compile(
            str(TARGET),
            doraise=True,
        )

    except Exception as e:
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: syntax compile 실패. "
            "원본 자동 복구 완료.\n"
            + str(e)
        )

    restored = []

    for source, destination in restore_plan:
        shutil.copy2(
            source,
            destination,
        )

        restored.append(
            destination.name
        )

    verify_text = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    for name in KEEP_FILES:
        if f'"{name}"' not in verify_text:
            TARGET.write_text(
                original,
                encoding="utf-8",
            )

            raise SystemExit(
                f"ERROR: 적용 후 KEEP 검증 실패: "
                f"{name}"
            )

        if not Path(name).exists():
            raise SystemExit(
                f"ERROR: latest CSV 복구 실패: "
                f"{name}"
            )

    print()
    print("APPLY 완료")
    print(f"originalCopy: {BACKUP}")
    print("syntaxCompile: OK")

    for name in KEEP_FILES:
        print(
            f"KEEP_EXACT: {name}"
        )

    print(
        f"restoredFileCount: {len(restored)}"
    )

    for name in restored:
        print(
            f"RESTORED: {name}"
        )

    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()