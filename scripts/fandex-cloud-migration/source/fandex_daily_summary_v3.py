from __future__ import annotations
import json
from pathlib import Path

HEALTH = Path(
    "fandex_python_health_check_v3_latest.txt"
)
MASTER = Path(
    "fandex_master_ranking_latest.json"
)
MUSIC = Path(
    "fandex_music_chart_ranking_"
    "v2_current_presence_latest.json"
)

LASTFM = Path(
    "fandex_lastfm_global_interest_"
    "rolling_score_preview_v1_latest.json"
)
if not LASTFM.exists():
    LASTFM = Path(
        "lastfm_global_interest_"
        "rolling_score_preview_v1_latest.json"
    )

EXPECTED = (
    "fandex_master_v10_"
    "music_v2_lastfm_rolling_v1"
)


def read_json(path):
    if not path.exists():
        return {}

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def main():
    health_text = (
        HEALTH.read_text(
            encoding="utf-8-sig",
            errors="replace",
        )
        if HEALTH.exists()
        else ""
    )

    health_ok = (
        "OK: FANDEX production v10 healthy"
        in health_text
        and
        "failCount: 0"
        in health_text
        and
        "warnCount: 0"
        in health_text
    )

    master = read_json(
        MASTER
    )
    music = read_json(
        MUSIC
    )
    lastfm = read_json(
        LASTFM
    )

    master_ok = (
        master.get(
            "version"
        ) == EXPECTED
        and
        len(
            master.get(
                "ranking",
                [],
            )
        ) == 10
    )

    music_ranking = music.get(
        "ranking",
        [],
    )

    ranked_platforms = sum(
        int(
            row.get(
                "rankedPlatformCount"
            )
            or 0
        )
        for row in music_ranking
        if isinstance(
            row,
            dict,
        )
    )

    overall_ok = (
        health_ok
        and
        master_ok
        and
        len(
            music_ranking
        ) == 10
    )

    print()
    print("=" * 64)
    print("FANDEX DAILY SUMMARY")
    print("=" * 64)

    print(
        f"Runner v8        : "
        f"{'PASS' if overall_ok else 'CHECK'}"
    )

    print(
        f"Health v3        : "
        f"{'PASS' if health_ok else 'FAIL'}"
    )

    print(
        f"Master v10       : "
        f"{'OK' if master_ok else 'FAIL'}"
    )

    print(
        f"Music v2         : "
        f"{len(music_ranking)}/10 artists"
    )

    print(
        f"Music v2 ranked  : "
        f"{ranked_platforms}/30 platforms"
    )

    print(
        f"Music v2 latest  : "
        f"{music.get('snapshotDate', '-')}"
    )

    print(
        f"Last.fm latest   : "
        f"{lastfm.get('latestDate', '-')}"
    )

    print(
        "Website touched  : NO"
    )

    print("-" * 64)

    if overall_ok:
        print(
            "DAILY RUN SUCCESS"
        )
    else:
        print(
            "DAILY RUN NEEDS REVIEW"
        )

    print("=" * 64)

    return 0 if overall_ok else 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
