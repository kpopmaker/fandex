from datetime import datetime
from pathlib import Path
import shutil


VERSION = "patch_daily_music_stale_decay_v2_v1"

TARGETS = [
    Path("fandex_daily_python_only_v2.py"),
    Path("fandex_python_health_check_v1.py"),
]

OLD = "music_chart_apply_stale_decay_v1.py"
NEW = "music_chart_apply_stale_decay_v2.py"


def main():
    print()
    print("FANDEX Music stale decay v2 pipeline patch")
    print("=" * 72)
    print(f"version: {VERSION}")
    print()

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    for path in TARGETS:
        if not path.exists():
            raise RuntimeError(
                f"Target file not found: {path}"
            )

        text = path.read_text(
            encoding="utf-8-sig"
        )

        count = text.count(OLD)

        print(
            f"{path}: oldReferenceCount={count}"
        )

        if count != 1:
            raise RuntimeError(
                f"Expected exactly 1 reference in {path}, "
                f"found {count}. No patch applied."
            )

    print()
    print("Validation passed.")
    print("Creating backups...")

    backups = []

    for path in TARGETS:
        backup = path.with_name(
            f"{path.stem}_before_music_stale_decay_v2_"
            f"{timestamp}{path.suffix}"
        )

        shutil.copy2(
            path,
            backup,
        )

        backups.append(backup)

        print(
            f"backup: {backup}"
        )

    print()
    print("Applying exact replacements...")

    for path in TARGETS:
        text = path.read_text(
            encoding="utf-8-sig"
        )

        patched = text.replace(
            OLD,
            NEW,
            1,
        )

        path.write_text(
            patched,
            encoding="utf-8",
        )

        print(
            f"patched: {path}"
        )

    print()
    print("Post-patch verification")
    print("-" * 72)

    for path in TARGETS:
        text = path.read_text(
            encoding="utf-8-sig"
        )

        old_count = text.count(OLD)
        new_count = text.count(NEW)

        print(
            f"{path}: "
            f"old={old_count}, "
            f"new={new_count}"
        )

        if old_count != 0:
            raise RuntimeError(
                f"Old reference still exists: {path}"
            )

        if new_count != 1:
            raise RuntimeError(
                f"Unexpected new reference count: "
                f"{path} = {new_count}"
            )

    print()
    print("=" * 72)
    print("PATCH COMPLETE")
    print()
    print("Daily pipeline:")
    print(
        "music_chart_apply_stale_decay_v2.py --apply"
    )
    print()
    print("Health check:")
    print(
        "music_chart_apply_stale_decay_v2.py"
    )
    print()
    print("Master modified: FALSE")
    print("Music latest modified: FALSE")
    print("Website modified: FALSE")


if __name__ == "__main__":
    main()