from datetime import datetime
from pathlib import Path
import shutil


VERSION = "patch_health_check_v2_finalize_v1"

HEALTH_FILE = Path(
    "fandex_python_health_check_v2.py"
)

RUNNER_FILE = Path(
    "run_fandex_daily_python_only.bat"
)


def main():
    print()
    print("FANDEX Health Check v2 finalize patch")
    print("=" * 72)
    print(f"version: {VERSION}")
    print()

    if not HEALTH_FILE.exists():
        raise RuntimeError(
            f"Missing: {HEALTH_FILE}"
        )

    if not RUNNER_FILE.exists():
        raise RuntimeError(
            f"Missing: {RUNNER_FILE}"
        )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    # ------------------------------------------------------------
    # 1. Backup
    # ------------------------------------------------------------

    health_backup = Path(
        "fandex_python_health_check_v2_"
        f"before_finalize_fix_{timestamp}.py"
    )

    runner_backup = Path(
        "run_fandex_daily_python_only_"
        f"before_health_v2_finalize_fix_{timestamp}.bat"
    )

    shutil.copy2(
        HEALTH_FILE,
        health_backup,
    )

    shutil.copy2(
        RUNNER_FILE,
        runner_backup,
    )

    print(f"backup: {health_backup}")
    print(f"backup: {runner_backup}")
    print()

    # ------------------------------------------------------------
    # 2. Replace final section of Health Check v2
    # ------------------------------------------------------------

    text = HEALTH_FILE.read_text(
        encoding="utf-8-sig"
    )

    main_guard = (
        '\n\nif __name__ == "__main__":'
    )

    guard_pos = text.rfind(
        main_guard
    )

    if guard_pos == -1:
        raise RuntimeError(
            "Could not find main guard."
        )

    before_guard = text[
        :guard_pos
    ]

    # 마지막 h.section()이 최종 결과 섹션이어야 한다.
    section_pos = before_guard.rfind(
        "\n    h.section("
    )

    if section_pos == -1:
        raise RuntimeError(
            "Could not find final h.section()."
        )

    prefix = text[
        :section_pos
    ]

    suffix = text[
        guard_pos:
    ]

    new_final_block = r'''
    h.section(
        "Health Check v2 final result"
    )

    if h.fail_count == 0:
        if h.warn_count == 0:
            h.emit(
                "OK: FANDEX Python-only v2 healthy"
            )
        else:
            h.emit(
                "OK WITH WARNINGS: "
                "FANDEX Python-only v2 operational"
            )
    else:
        h.emit(
            "FAIL: FANDEX Python-only v2 needs review"
        )

    h.emit(
        f"failCount: {h.fail_count}"
    )

    h.emit(
        f"warnCount: {h.warn_count}"
    )

    h.emit(
        "masterModified: FALSE"
    )

    h.emit(
        "websiteModified: FALSE"
    )

    h.emit("=" * 72)

    timestamp_report = Path(
        "fandex_python_health_check_v2_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
        + ".txt"
    )

    report_text = "\n".join(
        h.lines
    )

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print(
        f"report: {timestamp_report}"
    )

    print(
        f"latest: {LATEST_REPORT}"
    )

    if h.fail_count > 0:
        sys.exit(1)
'''

    patched_health = (
        prefix
        + "\n"
        + new_final_block
        + suffix
    )

    HEALTH_FILE.write_text(
        patched_health,
        encoding="utf-8",
    )

    print(
        f"patched: {HEALTH_FILE}"
    )

    # ------------------------------------------------------------
    # 3. Fix runner latest health-check message
    # ------------------------------------------------------------

    runner_text = RUNNER_FILE.read_text(
        encoding="utf-8-sig"
    )

    old_echo = (
        "echo fandex_python_health_check_latest.txt"
    )

    new_echo = (
        "echo fandex_python_health_check_v2_latest.txt"
    )

    old_count = runner_text.count(
        old_echo
    )

    print(
        f"runnerOldEchoCount: {old_count}"
    )

    if old_count != 1:
        raise RuntimeError(
            "Expected exactly 1 old "
            "Latest health check echo line."
        )

    runner_text = runner_text.replace(
        old_echo,
        new_echo,
        1,
    )

    # 표시 문구도 v2로 명확히
    runner_text = runner_text.replace(
        "echo [8/10] Run Python health check",
        "echo [8/10] Run Python health check v2",
        1,
    )

    RUNNER_FILE.write_text(
        runner_text,
        encoding="utf-8",
    )

    print(
        f"patched: {RUNNER_FILE}"
    )

    # ------------------------------------------------------------
    # 4. Verification
    # ------------------------------------------------------------

    health_check = HEALTH_FILE.read_text(
        encoding="utf-8-sig"
    )

    runner_check = RUNNER_FILE.read_text(
        encoding="utf-8-sig"
    )

    required_health = [
        "Health Check v2 final result",
        "failCount:",
        "warnCount:",
        "masterModified: FALSE",
        "websiteModified: FALSE",
        "FANDEX Python-only v2 healthy",
    ]

    for token in required_health:
        if token not in health_check:
            raise RuntimeError(
                f"Health verification failed: {token}"
            )

    if (
        "echo fandex_python_health_check_v2_latest.txt"
        not in runner_check
    ):
        raise RuntimeError(
            "Runner latest health path "
            "verification failed."
        )

    print()
    print("=" * 72)
    print("PATCH COMPLETE")
    print()
    print(
        "Health Check v2 finalization: FIXED"
    )
    print(
        "Runner latest health report: v2"
    )
    print(
        "Master modified: FALSE"
    )
    print(
        "Website modified: FALSE"
    )


if __name__ == "__main__":
    main()