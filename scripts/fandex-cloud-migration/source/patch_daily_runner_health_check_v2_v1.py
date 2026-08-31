from datetime import datetime
from pathlib import Path
import shutil


VERSION = "patch_daily_runner_health_check_v2_v1"

TARGET = Path(
    "run_fandex_daily_python_only.bat"
)

OLD_HEALTH = (
    "py fandex_python_health_check_v1.py"
)

NEW_HEALTH = (
    "py fandex_python_health_check_v2.py"
)

OLD_DIR_LINE = (
    "dir fandex_python_health_check_latest.txt"
)

NEW_DIR_LINES = (
    "dir fandex_python_health_check_latest.txt\n"
    "dir fandex_python_health_check_v2_latest.txt"
)


def main():
    print()
    print(
        "FANDEX Daily Runner "
        "Health Check v2 Patch"
    )
    print("=" * 72)
    print(f"version: {VERSION}")
    print()

    if not TARGET.exists():
        raise RuntimeError(
            f"Target not found: {TARGET}"
        )

    text = TARGET.read_text(
        encoding="utf-8-sig"
    )

    health_count = text.count(
        OLD_HEALTH
    )

    dir_count = text.count(
        OLD_DIR_LINE
    )

    print(
        f"oldHealthReferenceCount: "
        f"{health_count}"
    )

    print(
        f"healthLatestDirCount: "
        f"{dir_count}"
    )

    if health_count != 1:
        raise RuntimeError(
            "Expected exactly 1 old "
            "health-check command."
        )

    if dir_count != 1:
        raise RuntimeError(
            "Expected exactly 1 health "
            "latest dir line."
        )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    backup = TARGET.with_name(
        "run_fandex_daily_python_only_"
        "before_health_check_v2_"
        f"{timestamp}.bat"
    )

    shutil.copy2(
        TARGET,
        backup,
    )

    patched = text.replace(
        OLD_HEALTH,
        NEW_HEALTH,
        1,
    )

    patched = patched.replace(
        OLD_DIR_LINE,
        NEW_DIR_LINES,
        1,
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    final_text = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if OLD_HEALTH in final_text:
        raise RuntimeError(
            "Old Health Check command "
            "still exists."
        )

    if final_text.count(
        NEW_HEALTH
    ) != 1:
        raise RuntimeError(
            "Health Check v2 command "
            "verification failed."
        )

    if (
        "dir fandex_python_health_check_v2_latest.txt"
        not in final_text
    ):
        raise RuntimeError(
            "Health Check v2 latest "
            "file was not added."
        )

    print()
    print(f"backup: {backup}")
    print(f"patched: {TARGET}")
    print()
    print("PATCH COMPLETE")
    print(
        "Daily runner health check: v2"
    )
    print(
        "Master modified: FALSE"
    )
    print(
        "Website modified: FALSE"
    )


if __name__ == "__main__":
    main()