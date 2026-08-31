from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path

MASTER = Path(
    "fandex_master_ranking_latest.json"
)
LATEST = Path(
    "fandex_python_status_report_latest.txt"
)
VERSION = "fandex_python_status_report_v2"


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def main():
    if not MASTER.exists():
        raise RuntimeError(
            f"missing: {MASTER}"
        )

    payload = read_json(MASTER)

    lines = [
        "FANDEX Python Status Report v2",
        "=" * 88,
        (
            "createdAt: "
            + datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        (
            "masterVersion: "
            + str(
                payload.get(
                    "version"
                )
            )
        ),
        (
            "scoreMode: "
            + str(
                payload.get(
                    "scoreMode"
                )
            )
        ),
        (
            "productionFormula: "
            "Naver v3 + YouTube v3 "
            "+ Music v2 x0.25 "
            "+ Last.fm Rolling x0.25"
        ),
        "",
        "Current FANDEX production ranking",
        "-" * 88,
    ]

    for item in payload.get(
        "ranking",
        [],
    ):
        source_points = item.get(
            "sourcePoints",
            {},
        )

        naver = source_points.get(
            "naver",
            {},
        )
        youtube = source_points.get(
            "youtube",
            {},
        )
        music = source_points.get(
            "musicChart",
            {},
        )
        lastfm = source_points.get(
            "lastfm",
            {},
        )

        lines.append(
            f"{item.get('rank')}위 "
            f"{item.get('artist')} "
            f"| FANDEX "
            f"{item.get('fandexFinalPoint')} "
            f"| Naver "
            f"{naver.get('cumulativePoint', 0)} "
            f"| YouTube "
            f"{youtube.get('cumulativePoint', 0)} "
            f"| Music raw "
            f"{music.get('rawPoint', 0)} "
            f"x{music.get('scale', 0)}="
            f"{music.get('cumulativePoint', 0)} "
            f"| Last.fm raw "
            f"{lastfm.get('rawPoint', 0)} "
            f"x{lastfm.get('scale', 0)}="
            f"{lastfm.get('cumulativePoint', 0)}"
        )

    lines.extend([
        "",
        "Daily operation",
        "-" * 88,
        "run_fandex_daily_python_only.bat",
        "",
        "Safety",
        "-" * 88,
        (
            "Website public/data export is "
            "NOT part of the daily runner."
        ),
        "Do not run:",
        "py fandex_export_to_site_v1.py",
        "py fandex_publish_all_v5.py",
        (
            "py fandex_publish_all_v5.py "
            "--refresh-youtube"
        ),
    ])

    text = "\n".join(lines) + "\n"

    LATEST.write_text(
        text,
        encoding="utf-8",
    )

    print(text)


if __name__ == "__main__":
    main()
