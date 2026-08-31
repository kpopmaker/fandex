from __future__ import annotations

import py_compile
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fix_runner_v7_health_false_fail_v1"

RUNNER = Path(
    "run_fandex_daily_python_only.bat"
)

HEALTH = Path(
    "fandex_python_health_check_v2.py"
)

V9_HEALTH = Path(
    "fandex_master_v9_health_check_v1.py"
)

DAILY_SUMMARY = Path(
    "fandex_daily_summary_v2.py"
)


TIMESTAMP = datetime.now().strftime(
    "%Y%m%d_%H%M%S"
)


V9_HEADER = (
    "v9 Master is generated as a parallel "
    "Music v2 x0.25 + Last.fm x0.25 candidate."
)


def stop(message):
    print()
    print("=" * 80)
    print("STOP - NEEDS FIX")
    print("=" * 80)
    print(message)
    raise SystemExit(1)


def run_python(path):
    print()
    print("=" * 80)
    print(f"RUN: {path}")
    print("=" * 80)

    result = subprocess.run(
        [
            sys.executable,
            str(path),
        ],
        check=False,
    )

    if result.returncode != 0:
        stop(
            f"{path} failed "
            f"with exitCode="
            f"{result.returncode}"
        )


def main():
    print()
    print("=" * 80)
    print(
        "FANDEX Runner v7 Health False-Fail Fix v1"
    )
    print("=" * 80)

    print(
        f"version: {VERSION}"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "musicV2Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 80)


    # ========================================================
    # Required files
    # ========================================================

    for path in [
        RUNNER,
        HEALTH,
        V9_HEALTH,
        DAILY_SUMMARY,
    ]:

        if not path.exists():
            stop(
                f"Missing required file: "
                f"{path}"
            )


    # ========================================================
    # Backups
    # ========================================================

    runner_backup = Path(
        "run_fandex_daily_python_only_"
        "before_v7_health_fix_"
        f"{TIMESTAMP}.bat"
    )

    health_backup = Path(
        "fandex_python_health_check_v2_"
        "before_runner_v7_fix_"
        f"{TIMESTAMP}.py"
    )


    shutil.copy2(
        RUNNER,
        runner_backup,
    )

    shutil.copy2(
        HEALTH,
        health_backup,
    )


    print()
    print(
        f"runnerBackup: {runner_backup}"
    )

    print(
        f"healthBackup: {health_backup}"
    )


    # ========================================================
    # 1. Runner header:
    #
    # 잘못된 상태:
    # v9 Master is generated ...
    #
    # 정상 상태:
    # echo v9 Master is generated ...
    # ========================================================

    runner_text = RUNNER.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


    bare_line = V9_HEADER

    echo_line = (
        "echo "
        + V9_HEADER
    )


    if echo_line in runner_text:

        print()
        print(
            "Runner v9 header already fixed."
        )


    elif bare_line in runner_text:

        runner_text = runner_text.replace(
            bare_line,
            echo_line,
            1,
        )

        RUNNER.write_text(
            runner_text,
            encoding="utf-8-sig",
        )

        print()
        print(
            "Runner v9 header echo: FIXED"
        )


    else:

        stop(
            "Could not find expected "
            "v9 header line in Runner."
        )


    # ========================================================
    # Runner verification
    # ========================================================

    runner_verify = RUNNER.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


    if echo_line not in runner_verify:

        stop(
            "Runner v9 echo verification failed."
        )


    print(
        "runnerHeaderCheck: PASS"
    )


    # ========================================================
    # 2. Health expected Runner version:
    #
    # Runner v6 -> Runner v7
    # ========================================================

    health_text = HEALTH.read_text(
        encoding="utf-8",
        errors="replace",
    )


    before_v6 = health_text.count(
        "Runner v6"
    )

    before_v7 = health_text.count(
        "Runner v7"
    )


    print()
    print(
        "Health Runner version check"
    )

    print("-" * 80)

    print(
        f"Runner v6 occurrences before: "
        f"{before_v6}"
    )

    print(
        f"Runner v7 occurrences before: "
        f"{before_v7}"
    )


    if before_v6 > 0:

        health_text = health_text.replace(
            "Runner v6",
            "Runner v7",
        )

        HEALTH.write_text(
            health_text,
            encoding="utf-8",
        )

        print(
            "Health Runner version: "
            "v6 -> v7 FIXED"
        )


    elif before_v7 > 0:

        print(
            "Health already checks Runner v7."
        )


    else:

        stop(
            "Health file contains neither "
            "`Runner v6` nor `Runner v7`. "
            "Automatic patch stopped."
        )


    # ========================================================
    # Verify Health source
    # ========================================================

    health_verify = HEALTH.read_text(
        encoding="utf-8",
        errors="replace",
    )


    after_v6 = health_verify.count(
        "Runner v6"
    )

    after_v7 = health_verify.count(
        "Runner v7"
    )


    print(
        f"Runner v6 occurrences after: "
        f"{after_v6}"
    )

    print(
        f"Runner v7 occurrences after: "
        f"{after_v7}"
    )


    if after_v6 != 0:
        stop(
            "Runner v6 text still remains "
            "inside Health v2."
        )


    if after_v7 == 0:
        stop(
            "Runner v7 check was not found "
            "inside Health v2."
        )


    # ========================================================
    # Compile Health
    # ========================================================

    try:

        py_compile.compile(
            str(HEALTH),
            doraise=True,
        )

    except Exception as exc:

        stop(
            f"Health py_compile failed: "
            f"{exc}"
        )


    print(
        "healthPyCompile: PASS"
    )


    # ========================================================
    # IMPORTANT
    #
    # 전체 Runner는 다시 돌리지 않는다.
    #
    # 이미 2026-08-26 Music v2 / v9 데이터가
    # 정상 생성되었기 때문에 Health 이후 단계만 실행한다.
    # ========================================================


    # --------------------------------------------------------
    # Health v2
    # --------------------------------------------------------

    run_python(
        HEALTH
    )


    # --------------------------------------------------------
    # v9 Health
    # --------------------------------------------------------

    run_python(
        V9_HEALTH
    )


    # --------------------------------------------------------
    # Daily Summary v2
    # --------------------------------------------------------

    run_python(
        DAILY_SUMMARY
    )


    # ========================================================
    # Final
    # ========================================================

    print()
    print()
    print("=" * 80)
    print(
        "RUNNER v7 HEALTH REPAIR COMPLETE"
    )
    print("=" * 80)

    print(
        "Runner v9 header echo       : PASS"
    )

    print(
        "Health expected Runner      : v7"
    )

    print(
        "Python Health v2            : PASS"
    )

    print(
        "Master v9 Health            : PASS"
    )

    print(
        "Daily Summary v2            : PASS"
    )

    print(
        "productionV7Modified        : FALSE"
    )

    print(
        "musicV1Modified             : FALSE"
    )

    print(
        "musicV2Modified             : FALSE"
    )

    print(
        "websiteModified             : FALSE"
    )

    print()
    print(
        "DO NOT RUN THE FULL RUNNER AGAIN TODAY."
    )

    print()
    print(
        "NEXT NORMAL DAILY COMMAND:"
    )

    print(
        "run_fandex_daily_python_only.bat"
    )

    print("=" * 80)


if __name__ == "__main__":
    main()