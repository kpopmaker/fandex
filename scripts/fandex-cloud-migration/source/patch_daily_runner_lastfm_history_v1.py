from pathlib import Path
import sys


VERSION = "patch_daily_runner_lastfm_history_v1"

TARGET = Path(
    "run_fandex_daily_python_only.bat"
)

BACKUP_COPY = Path(
    "run_fandex_daily_python_only_before_lastfm_history_v1.bat"
)

MARKER = "Run Last.fm collector v2"

DAILY_FAILURE_BLOCK = """if errorlevel 1 (
    echo.
    echo FANDEX daily python-only failed.
    pause
    exit /b 1
)"""

LASTFM_BLOCK = r'''
echo.
echo [2/7] Run Last.fm collector v2
py lastfm_run_secure_v2.py

if errorlevel 1 (
    echo.
    echo Last.fm collector failed.
    pause
    exit /b 1
)

echo.
echo [3/7] Append Last.fm daily history
py lastfm_interest_history_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm history failed.
    pause
    exit /b 1
)

echo.
echo [4/7] Build Last.fm global-interest delta
py lastfm_global_interest_delta_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm delta failed.
    pause
    exit /b 1
)
'''.strip("\n")


def main():
    apply_mode = "--apply" in sys.argv

    print()
    print("FANDEX patch daily runner Last.fm history v1")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + ("APPLY" if apply_mode else "PREVIEW")
    )
    print(f"target: {TARGET}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 파일 없음: {TARGET}"
        )

    original = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    if MARKER in original:
        print()
        print(
            "ALREADY PATCHED: "
            "Last.fm daily block 이미 존재"
        )
        return

    if DAILY_FAILURE_BLOCK not in original:
        raise SystemExit(
            "ERROR: daily pipeline anchor를 "
            "찾지 못했습니다."
        )

    patched = original

    # 기존 4단계 표기를 7단계로 변경
    replacements = {
        "echo [1/4] Run daily python-only v2 pipeline":
            "echo [1/7] Run daily python-only v2 pipeline",

        "echo [2/4] Run Python health check":
            "echo [5/7] Run Python health check",

        "echo [3/4] Archive generated timestamp/log/audit files":
            "echo [6/7] Archive generated timestamp/log/audit files",

        "echo [4/4] Current core files":
            "echo [7/7] Current core files",
    }

    for old, new in replacements.items():
        if old not in patched:
            raise SystemExit(
                "ERROR: 예상 runner 문구를 "
                f"찾지 못했습니다:\n{old}"
            )

        patched = patched.replace(
            old,
            new,
            1,
        )

    patched = patched.replace(
        DAILY_FAILURE_BLOCK,
        DAILY_FAILURE_BLOCK
        + "\n\n"
        + LASTFM_BLOCK,
        1,
    )

    # Current core files에도 Last.fm 핵심 상태 표시
    core_anchor = (
        "dir fandex_python_health_check_latest.txt"
    )

    if core_anchor not in patched:
        raise SystemExit(
            "ERROR: core files anchor를 "
            "찾지 못했습니다."
        )

    patched = patched.replace(
        core_anchor,
        core_anchor
        + "\n"
        + "dir lastfm_artist_interest_history_v1.csv\n"
        + "dir lastfm_global_interest_delta_v1_latest.csv",
        1,
    )

    required = [
        "echo [1/7] Run daily python-only v2 pipeline",
        "echo [2/7] Run Last.fm collector v2",
        "py lastfm_run_secure_v2.py",
        "echo [3/7] Append Last.fm daily history",
        "py lastfm_interest_history_v1.py",
        "echo [4/7] Build Last.fm global-interest delta",
        "py lastfm_global_interest_delta_v1.py",
        "echo [5/7] Run Python health check",
        "echo [6/7] Archive generated timestamp/log/audit files",
        "echo [7/7] Current core files",
        "dir lastfm_artist_interest_history_v1.csv",
        "dir lastfm_global_interest_delta_v1_latest.csv",
    ]

    missing = [
        item
        for item in required
        if item not in patched
    ]

    if missing:
        raise SystemExit(
            "ERROR: 패치 검증 실패:\n"
            + "\n".join(missing)
        )

    print()
    print("daily step 1/7: READY")
    print("Last.fm collector step 2/7: READY")
    print("Last.fm history step 3/7: READY")
    print("Last.fm delta step 4/7: READY")
    print("health check step 5/7: READY")
    print("archive step 6/7: READY")
    print("core files step 7/7: READY")

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY - 아직 수정하지 않았습니다."
        )
        print()
        print("적용 명령:")
        print(
            "py patch_daily_runner_lastfm_history_v1.py "
            "--apply"
        )
        return

    BACKUP_COPY.write_text(
        original,
        encoding="utf-8",
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    verify = TARGET.read_text(
        encoding="utf-8-sig",
        errors="strict",
    )

    missing_after = [
        item
        for item in required
        if item not in verify
    ]

    if missing_after:
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: 적용 후 검증 실패. "
            "원본 자동 복구 완료."
        )

    print()
    print("APPLY 완료")
    print(f"originalCopy: {BACKUP_COPY}")
    print("lastfmDailyCollectorInstalled: TRUE")
    print("lastfmDailyHistoryInstalled: TRUE")
    print("lastfmDailyDeltaInstalled: TRUE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()