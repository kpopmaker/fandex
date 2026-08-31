from __future__ import annotations
import json
import shutil
from datetime import datetime
from pathlib import Path

MANIFEST = Path(
    "fandex_v10_promotion_manifest_latest.json"
)


def main():
    if not MANIFEST.exists():
        raise RuntimeError(
            "promotion manifest missing"
        )

    data = json.loads(
        MANIFEST.read_text(
            encoding="utf-8-sig"
        )
    )

    backup = Path(
        data.get(
            "backupDir",
            "",
        )
    )

    if not backup.exists():
        raise RuntimeError(
            f"backup directory missing: {backup}"
        )

    safety = Path(
        "rollback_snapshot_before_restore_"
        + datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    safety.mkdir()

    for name in [
        "run_fandex_daily_python_only.bat",
        "fandex_master_ranking_latest.json",
        "fandex_master_artist_reports_latest.json",
        "fandex_python_status_report_latest.txt",
    ]:
        path = Path(name)

        if path.exists():
            shutil.copy2(
                path,
                safety / path.name,
            )

    restored = []

    for path in backup.iterdir():
        if path.is_file():
            target = Path(
                path.name
            )

            shutil.copy2(
                path,
                target,
            )

            restored.append(
                path.name
            )

    data[
        "status"
    ] = "ROLLED_BACK_MANUALLY"

    data[
        "rolledBackAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    data[
        "rollbackSafetySnapshot"
    ] = str(safety)

    MANIFEST.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "ROLLBACK COMPLETE"
    )

    print(
        "restored: "
        + ", ".join(
            sorted(restored)
        )
    )

    print(
        f"safety snapshot: {safety}"
    )

    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()
