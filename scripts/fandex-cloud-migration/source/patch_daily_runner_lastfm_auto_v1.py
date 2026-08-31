from pathlib import Path
import sys


VERSION = (
    "patch_daily_runner_lastfm_auto_v1"
)

TARGET = Path(
    "run_fandex_daily_python_only.bat"
)

BACKUP = Path(
    "run_fandex_daily_python_only_"
    "before_lastfm_auto_v1.bat"
)

OLD = (
    "py lastfm_run_secure_v2.py"
)

NEW = (
    "py lastfm_run_auto_v1.py"
)


def main():
    apply_mode = (
        "--apply" in sys.argv
    )

    print()
    print(
        "FANDEX patch daily runner "
        "Last.fm auto v1"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + (
            "APPLY"
            if apply_mode
            else "PREVIEW"
        )
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 없음: {TARGET}"
        )

    original = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if NEW in original:
        print()
        print(
            "ALREADY PATCHED"
        )
        return

    if OLD not in original:
        raise SystemExit(
            "ERROR: 기존 Last.fm runner "
            "명령을 찾지 못함"
        )

    patched = original.replace(
        OLD,
        NEW,
        1,
    )

    print()
    print(
        f"OLD: {OLD}"
    )
    print(
        f"NEW: {NEW}"
    )

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY"
        )
        print()
        print(
            "py "
            "patch_daily_runner_lastfm_auto_v1.py "
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

    verify = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if (
        NEW not in verify
        or OLD in verify
    ):
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: 검증 실패. "
            "원본 자동 복구 완료."
        )

    print()
    print("APPLY 완료")
    print(
        f"originalCopy: {BACKUP}"
    )
    print(
        "lastfmAutoRunnerInstalled: TRUE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()