from __future__ import annotations

import csv
import subprocess
import sys
from pathlib import Path


SUMMARY_V1 = Path(
    "fandex_daily_summary_v1.py"
)

V9_HEALTH = Path(
    "fandex_master_v9_health_check_latest.txt"
)

V9_HISTORY = Path(
    "fandex_master_v9_history_v1.csv"
)

V9_LATEST = Path(
    "fandex_master_v9_ranking_latest.json"
)


def v9_health_ok():
    if not V9_HEALTH.exists():
        return False

    text = V9_HEALTH.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    return (
        "OK: FANDEX Master v9 healthy"
        in text
        and
        "failCount: 0"
        in text
    )


def v9_history_state():
    if not V9_HISTORY.exists():
        return (
            0,
            "",
        )

    with V9_HISTORY.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        rows = list(
            csv.DictReader(
                file
            )
        )


    dates = sorted({
        str(
            row.get(
                "snapshotDate",
                ""
            )
            or ""
        ).strip()

        for row in rows

        if str(
            row.get(
                "snapshotDate",
                ""
            )
            or ""
        ).strip()
    })


    latest = (
        dates[
            -1
        ]
        if dates
        else ""
    )


    return (
        len(
            dates
        ),
        latest,
    )


def main():
    if not SUMMARY_V1.exists():
        raise RuntimeError(
            f"Missing: {SUMMARY_V1}"
        )


    result = subprocess.run(
        [
            sys.executable,
            str(
                SUMMARY_V1
            ),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


    if result.returncode != 0:

        print(
            result.stdout
        )

        print(
            result.stderr
        )

        raise SystemExit(
            result.returncode
        )


    text = result.stdout


    text = text.replace(
        "Runner v6",
        "Runner v7",
    )


    health_ok = (
        v9_health_ok()
    )


    (
        history_count,
        latest_date,
    ) = v9_history_state()


    v9_line = (
        "Master v9        : "
        + (
            "OK"
            if (
                health_ok
                and V9_LATEST.exists()
            )
            else "FAIL"
        )
    )


    history_line = (
        "v9 history       : "
        f"{history_count} snapshots"
    )


    if latest_date:

        history_line += (
            f" / latest "
            f"{latest_date}"
        )


    lines = text.splitlines()

    output = []

    inserted = False


    for line in lines:

        if (
            not inserted
            and line.strip().startswith(
                "Website touched"
            )
        ):

            output.append(
                v9_line
            )

            output.append(
                history_line
            )

            inserted = True


        output.append(
            line
        )


    if not inserted:

        output.append(
            v9_line
        )

        output.append(
            history_line
        )


    if not health_ok:

        output = [
            line.replace(
                "DAILY RUN SUCCESS",
                "DAILY RUN FAIL",
            )
            for line in output
        ]


    print(
        "\n".join(
            output
        )
    )


    if not health_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
