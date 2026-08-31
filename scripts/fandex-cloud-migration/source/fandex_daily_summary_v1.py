import json
from pathlib import Path


HEALTH_FILE = Path(
    "fandex_python_health_check_v2_latest.txt"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

LASTFM_ROLLING_FILE = Path(
    "fandex_lastfm_global_interest_rolling_v1_latest.json"
)

if not LASTFM_ROLLING_FILE.exists():
    LASTFM_ROLLING_FILE = Path(
        "lastfm_global_interest_rolling_v1_latest.json"
    )

MASTER_V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

MASTER_V8_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)


def read_json(path):
    if not path.exists():
        return {}

    try:
        return json.loads(
            path.read_text(
                encoding="utf-8-sig"
            )
        )
    except Exception:
        return {}


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def health_status():
    if not HEALTH_FILE.exists():
        return (
            "MISSING",
            "?",
            "?",
        )

    text = HEALTH_FILE.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )

    if (
        "OK: FANDEX Python-only v2 healthy"
        in text
    ):
        status = "PASS"
    else:
        status = "FAIL"

    fail_count = "?"
    warn_count = "?"

    for line in text.splitlines():

        stripped = line.strip()

        if stripped.startswith(
            "failCount:"
        ):
            fail_count = (
                stripped.split(
                    ":",
                    1,
                )[1].strip()
            )

        elif stripped.startswith(
            "warnCount:"
        ):
            warn_count = (
                stripped.split(
                    ":",
                    1,
                )[1].strip()
            )

    return (
        status,
        fail_count,
        warn_count,
    )


def music_v2_summary():

    payload = read_json(
        MUSIC_V2_FILE
    )

    ranking = payload.get(
        "ranking",
        []
    )

    if not isinstance(
        ranking,
        list,
    ):
        ranking = []

    artist_count = len(
        {
            norm(
                row.get(
                    "artist"
                )
            )
            for row in ranking
            if isinstance(
                row,
                dict,
            )
            and norm(
                row.get(
                    "artist"
                )
            )
        }
    )

    ranked_platform_count = 0

    for row in ranking:

        if not isinstance(
            row,
            dict,
        ):
            continue

        try:
            ranked_platform_count += int(
                row.get(
                    "rankedPlatformCount",
                    0,
                )
                or 0
            )
        except Exception:
            pass

    snapshot_date = norm(
        payload.get(
            "snapshotDate"
        )
    )

    return (
        artist_count,
        ranked_platform_count,
        snapshot_date,
    )


def lastfm_latest_date():

    payload = read_json(
        LASTFM_ROLLING_FILE
    )

    latest_date = norm(
        payload.get(
            "latestDate"
        )
    )

    if latest_date:
        return latest_date

    rows = payload.get(
        "rows",
        []
    )

    if isinstance(
        rows,
        list,
    ):

        dates = {
            norm(
                row.get(
                    "latestDate"
                )
            )
            for row in rows
            if isinstance(
                row,
                dict,
            )
            and norm(
                row.get(
                    "latestDate"
                )
            )
        }

        if dates:
            return max(
                dates
            )

    return "-"


def main():

    (
        health,
        fail_count,
        warn_count,
    ) = health_status()

    (
        music_artist_count,
        ranked_platform_count,
        music_date,
    ) = music_v2_summary()

    lastfm_date = lastfm_latest_date()

    v7_ok = MASTER_V7_FILE.exists()
    v8_ok = MASTER_V8_FILE.exists()

    overall_pass = (
        health == "PASS"
        and fail_count == "0"
        and warn_count == "0"
        and music_artist_count == 10
        and v7_ok
        and v8_ok
    )

    print()
    print("=" * 60)
    print("FANDEX DAILY SUMMARY")
    print("=" * 60)

    print(
        f"Runner v6        : "
        f"{'PASS' if overall_pass else 'CHECK'}"
    )

    print(
        f"Health           : "
        f"{health} "
        f"(fail={fail_count}, warn={warn_count})"
    )

    print(
        f"Music v2         : "
        f"{music_artist_count}/10 artists"
    )

    print(
        f"Music v2 ranked  : "
        f"{ranked_platform_count}/30 platforms"
    )

    print(
        f"Music v2 latest  : "
        f"{music_date or '-'}"
    )

    print(
        f"Last.fm latest   : "
        f"{lastfm_date}"
    )

    print(
        f"Master v7        : "
        f"{'OK' if v7_ok else 'MISSING'}"
    )

    print(
        f"Master v8        : "
        f"{'OK' if v8_ok else 'MISSING'}"
    )

    print(
        "Website touched  : NO"
    )

    print("-" * 60)

    if overall_pass:
        print(
            "DAILY RUN SUCCESS"
        )
        print("=" * 60)
        return 0

    print(
        "DAILY RUN NEEDS REVIEW"
    )
    print("=" * 60)

    return 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
