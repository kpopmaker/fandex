import csv
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path


VERSION = "test_lastfm_global_interest_delta_v1"

HISTORY_FILE = Path(
    "lastfm_artist_interest_history_v1.csv"
)

DELTA_SCRIPT = Path(
    "lastfm_global_interest_delta_v1.py"
)

DELTA_CSV = Path(
    "lastfm_global_interest_delta_v1_latest.csv"
)


def read_csv(path):
    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def write_csv(path, fieldnames, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )
        writer.writeheader()
        writer.writerows(rows)


def run_delta():
    env = {
        **os.environ,
        "PYTHONIOENCODING": "utf-8",
    }

    result = subprocess.run(
        [
            sys.executable,
            str(DELTA_SCRIPT),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise AssertionError(
            "delta script 실행 실패"
        )

    return result.stdout


def expect(condition, message):
    if not condition:
        raise AssertionError(message)

    print(f"OK {message}")


def main():
    print()
    print(
        "FANDEX Last.fm delta self-test v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    if not HISTORY_FILE.exists():
        raise SystemExit(
            f"ERROR: history 없음: {HISTORY_FILE}"
        )

    if not DELTA_SCRIPT.exists():
        raise SystemExit(
            f"ERROR: delta script 없음: {DELTA_SCRIPT}"
        )

    original_bytes = HISTORY_FILE.read_bytes()

    passed = False

    try:
        rows = read_csv(HISTORY_FILE)

        expect(
            len(rows) == 10,
            "현재 history row count 10",
        )

        fieldnames = list(rows[0].keys())

        synthetic_rows = list(rows)

        for row in rows:
            original_date = datetime.strptime(
                row["snapshotDate"],
                "%Y-%m-%d",
            )

            fake_date = (
                original_date
                + timedelta(days=1)
            )

            new_row = dict(row)

            new_row["snapshotDate"] = (
                fake_date.strftime(
                    "%Y-%m-%d"
                )
            )

            new_row["snapshotAt"] = (
                fake_date.strftime(
                    "%Y-%m-%dT12:00:00"
                )
            )

            new_row["listeners"] = str(
                int(row["listeners"])
                + 100
            )

            new_row["playcount"] = str(
                int(row["playcount"])
                + 1000
            )

            synthetic_rows.append(
                new_row
            )

        write_csv(
            HISTORY_FILE,
            fieldnames,
            synthetic_rows,
        )

        output = run_delta()

        print()
        print(output)

        delta_rows = read_csv(
            DELTA_CSV
        )

        expect(
            len(delta_rows) == 10,
            "delta output row count 10",
        )

        ready_rows = [
            row
            for row in delta_rows
            if row.get("status")
            == "delta_ready"
        ]

        expect(
            len(ready_rows) == 10,
            "10명 모두 delta_ready",
        )

        expect(
            all(
                row.get("listenerDelta")
                == "100"
                for row in ready_rows
            ),
            "listenerDelta 100",
        )

        expect(
            all(
                row.get("playcountDelta")
                == "1000"
                for row in ready_rows
            ),
            "playcountDelta 1000",
        )

        expect(
            all(
                row.get("daysBetween")
                == "1"
                for row in ready_rows
            ),
            "daysBetween 1",
        )

        passed = True

    finally:
        HISTORY_FILE.write_bytes(
            original_bytes
        )

        restore_output = run_delta()

        restored = (
            HISTORY_FILE.read_bytes()
            == original_bytes
        )

        print()
        print(
            "history restored: "
            + (
                "TRUE"
                if restored
                else "FALSE"
            )
        )

        print(
            "delta baseline rebuilt: TRUE"
        )

        if not restored:
            raise AssertionError(
                "history 원본 복구 실패"
            )

    print()
    print("=" * 80)

    if passed:
        print("passed: 6/6")
        print(
            "OK: 2일 snapshot delta 계산 정상"
        )
        print(
            "OK: history 원본 복구 정상"
        )

    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()