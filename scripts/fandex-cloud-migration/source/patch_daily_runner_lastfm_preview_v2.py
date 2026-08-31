from pathlib import Path
import sys


VERSION = "patch_daily_runner_lastfm_preview_v2"

TARGET = Path(
    "run_fandex_daily_python_only.bat"
)

BACKUP = Path(
    "run_fandex_daily_python_only_before_lastfm_preview_v2.bat"
)


INSERT_ANCHOR = (
    "echo [5/7] Run Python health check"
)


PREVIEW_BLOCK = r'''echo [5/9] Build Last.fm score preview
py lastfm_global_interest_score_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm score preview failed.
    pause
    exit /b 1
)

echo.
echo [6/9] Build Last.fm Master impact preview
py lastfm_master_impact_preview_v1.py

if errorlevel 1 (
    echo.
    echo Last.fm Master impact preview failed.
    pause
    exit /b 1
)

echo.
echo [7/9] Run Python health check'''


STEP_REPLACEMENTS = {
    "echo [1/7] Run daily python-only v2 pipeline":
        "echo [1/9] Run daily python-only v2 pipeline",

    "echo [2/7] Run Last.fm collector v2":
        "echo [2/9] Run Last.fm collector v2",

    "echo [3/7] Append Last.fm daily history":
        "echo [3/9] Append Last.fm daily history",

    "echo [4/7] Build Last.fm global-interest delta":
        "echo [4/9] Build Last.fm global-interest delta",

    "echo [6/7] Archive generated timestamp/log/audit files":
        "echo [8/9] Archive generated timestamp/log/audit files",

    "echo [7/7] Current core files":
        "echo [9/9] Current core files",
}


def main():
    apply_mode = "--apply" in sys.argv

    print()
    print("FANDEX patch daily runner Last.fm preview v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode:",
        "APPLY" if apply_mode else "PREVIEW"
    )
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

    # 이미 성공적으로 설치됐으면 종료
    if (
        "py lastfm_global_interest_score_preview_v1.py"
        in original
        and
        "py lastfm_master_impact_preview_v1.py"
        in original
    ):
        print()
        print("ALREADY PATCHED")
        return

    if INSERT_ANCHOR not in original:
        raise SystemExit(
            "ERROR: Health Check anchor를 찾지 못했습니다."
        )

    patched = original

    # 1/7~4/7, 6/7~7/7 번호 변경
    for old, new in STEP_REPLACEMENTS.items():
        if old not in patched:
            raise SystemExit(
                f"ERROR: 단계 anchor 없음: {old}"
            )

        patched = patched.replace(
            old,
            new,
            1,
        )

    # 기존 5/7 Health Check 위치에
    # Preview 2단계 + 새 7/9 Health Check 삽입
    patched = patched.replace(
        INSERT_ANCHOR,
        PREVIEW_BLOCK,
        1,
    )

    # Core files 표시 추가
    CORE_ANCHOR = (
        "dir lastfm_global_interest_delta_v1_latest.csv"
    )

    if CORE_ANCHOR not in patched:
        raise SystemExit(
            "ERROR: Last.fm delta core anchor 없음"
        )

    patched = patched.replace(
        CORE_ANCHOR,
        CORE_ANCHOR
        + "\n"
        + "dir lastfm_global_interest_score_preview_v1_latest.csv\n"
        + "dir lastfm_master_impact_preview_v1_latest.csv",
        1,
    )

    required = [
        "echo [1/9] Run daily python-only v2 pipeline",
        "echo [2/9] Run Last.fm collector v2",
        "echo [3/9] Append Last.fm daily history",
        "echo [4/9] Build Last.fm global-interest delta",
        "echo [5/9] Build Last.fm score preview",
        "py lastfm_global_interest_score_preview_v1.py",
        "echo [6/9] Build Last.fm Master impact preview",
        "py lastfm_master_impact_preview_v1.py",
        "echo [7/9] Run Python health check",
        "echo [8/9] Archive generated timestamp/log/audit files",
        "echo [9/9] Current core files",
        "dir lastfm_global_interest_score_preview_v1_latest.csv",
        "dir lastfm_master_impact_preview_v1_latest.csv",
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
    print("step renumber 1/9~9/9: READY")
    print("Last.fm score preview insert: READY")
    print("Last.fm impact preview insert: READY")
    print("core file display insert: READY")

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY - 아직 수정하지 않았습니다."
        )
        print()
        print("적용 명령:")
        print(
            "py patch_daily_runner_lastfm_preview_v2.py --apply"
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
    print(f"originalCopy: {BACKUP}")
    print("lastfmScorePreviewInstalled: TRUE")
    print("lastfmImpactPreviewInstalled: TRUE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()