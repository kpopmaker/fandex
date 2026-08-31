from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "fandex_master_v8_lastfm_preview_v1"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

ROLLING_FILE = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

CSV_OUT = Path(
    "fandex_master_v8_lastfm_preview_v1_latest.csv"
)

JSON_OUT = Path(
    "fandex_master_v8_lastfm_preview_v1_latest.json"
)

REPORT_OUT = Path(
    "FANDEX_MASTER_V8_LASTFM_PREVIEW_V1_REPORT.txt"
)

LASTFM_SCALE = 0.25


def norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def safe_float(
    value: Any,
    default: float = 0.0,
) -> float:
    try:
        if value in [None, ""]:
            return default

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return default


def read_json(
    path: Path,
) -> Any:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def read_csv(
    path: Path,
) -> list[dict[str, str]]:
    if not path.exists():
        raise RuntimeError(
            f"Missing file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def get_master_rows(
    payload: Any,
) -> list[dict[str, Any]]:
    if not isinstance(
        payload,
        dict,
    ):
        raise RuntimeError(
            "Master payload must be dict."
        )

    rows = payload.get(
        "ranking"
    )

    if not isinstance(
        rows,
        list,
    ):
        raise RuntimeError(
            "Master ranking not found."
        )

    return rows


def get_artist(
    row: dict[str, Any],
) -> str:
    for key in [
        "artist",
        "artistName",
        "name",
    ]:
        value = norm(
            row.get(key)
        )

        if value:
            return value

    return ""


def get_master_score(
    row: dict[str, Any],
) -> float:
    for key in [
        "fandexScore",
        "fandexFinalPoint",
        "finalPoint",
        "score",
        "totalScore",
    ]:
        if key in row:
            return safe_float(
                row.get(key)
            )

    raise RuntimeError(
        f"Master score field not found: {row}"
    )


def get_component(
    row: dict[str, Any],
    keys: list[str],
) -> float:
    for key in keys:
        if key in row:
            return safe_float(
                row.get(key)
            )

    return 0.0


def detect_rolling_field(
    rows: list[dict[str, str]],
) -> str:
    candidates = [
        "rollingCombinedPreviewPoint",
        "rollingScore",
        "combinedRollingScore",
        "score",
    ]

    if not rows:
        raise RuntimeError(
            "Rolling CSV is empty."
        )

    fields = set(
        rows[0].keys()
    )

    for field in candidates:
        if field in fields:
            return field

    raise RuntimeError(
        "Rolling score field not found. "
        f"fields={sorted(fields)}"
    )


def main():
    print()
    print(
        "FANDEX Master v8 "
        "Last.fm Rolling Preview v1"
    )
    print("=" * 88)
    print(
        f"version: {VERSION}"
    )
    print(
        f"lastfmScale: {LASTFM_SCALE}"
    )
    print(
        "formula: Master v7 "
        "+ Last.fm Rolling × 0.25"
    )
    print(
        "mode: PREVIEW ONLY"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 88)

    master_payload = read_json(
        MASTER_FILE
    )

    master_rows = get_master_rows(
        master_payload
    )

    rolling_rows = read_csv(
        ROLLING_FILE
    )

    if len(master_rows) != 10:
        raise RuntimeError(
            "Expected Master 10 artists, "
            f"got {len(master_rows)}."
        )

    rolling_field = (
        detect_rolling_field(
            rolling_rows
        )
    )

    print()
    print(
        "detectedRollingScoreField: "
        f"{rolling_field}"
    )

    rolling_map = {}

    for row in rolling_rows:
        artist = norm(
            row.get("artist")
        )

        if not artist:
            continue

        if artist in rolling_map:
            raise RuntimeError(
                "Duplicate rolling artist: "
                f"{artist}"
            )

        rolling_map[
            artist
        ] = safe_float(
            row.get(
                rolling_field
            )
        )

    master_artists = [
        get_artist(row)
        for row in master_rows
    ]

    missing = [
        artist
        for artist in master_artists
        if artist not in rolling_map
    ]

    extra = [
        artist
        for artist in rolling_map
        if artist not in master_artists
    ]

    if missing:
        raise RuntimeError(
            "Missing Last.fm Rolling: "
            + ", ".join(missing)
        )

    if extra:
        raise RuntimeError(
            "Unexpected Last.fm artists: "
            + ", ".join(extra)
        )

    result = []

    for old_rank, row in enumerate(
        master_rows,
        start=1,
    ):
        artist = get_artist(
            row
        )

        base_score = get_master_score(
            row
        )

        naver = get_component(
            row,
            [
                "naverPoint",
                "naverScore",
                "naver",
            ],
        )

        youtube = get_component(
            row,
            [
                "youtubePoint",
                "youtubeScore",
                "youtube",
            ],
        )

        music = get_component(
            row,
            [
                "musicChartPoint",
                "musicPoint",
                "musicScore",
                "music",
            ],
        )

        rolling = rolling_map[
            artist
        ]

        lastfm_point = round(
            rolling
            * LASTFM_SCALE,
            2,
        )

        v8_score = round(
            base_score
            + lastfm_point,
            2,
        )

        contribution_pct = (
            round(
                lastfm_point
                / v8_score
                * 100,
                2,
            )
            if v8_score
            else 0.0
        )

        result.append({
            "artist":
                artist,

            "v7Rank":
                old_rank,

            "v7Score":
                round(
                    base_score,
                    2,
                ),

            "naverPoint":
                round(
                    naver,
                    2,
                ),

            "youtubePoint":
                round(
                    youtube,
                    2,
                ),

            "musicPoint":
                round(
                    music,
                    2,
                ),

            "lastfmRollingPoint":
                round(
                    rolling,
                    2,
                ),

            "lastfmScale":
                LASTFM_SCALE,

            "lastfmContribution":
                lastfm_point,

            "lastfmContributionPct":
                contribution_pct,

            "v8PreviewScore":
                v8_score,
        })

    result.sort(
        key=lambda row: (
            -row[
                "v8PreviewScore"
            ],
            row[
                "artist"
            ],
        )
    )

    for new_rank, row in enumerate(
        result,
        start=1,
    ):
        row[
            "v8PreviewRank"
        ] = new_rank

        row[
            "rankChange"
        ] = (
            row[
                "v7Rank"
            ]
            - new_rank
        )

    print()
    print(
        "Master v8 preview ranking"
    )
    print("-" * 88)

    for row in result:
        change = row[
            "rankChange"
        ]

        sign = (
            "+"
            if change > 0
            else ""
        )

        print(
            f"{row['v8PreviewRank']}위 "
            f"{row['artist']} | "
            f"v7={row['v7Score']:.2f} | "
            f"Last.fm="
            f"{row['lastfmRollingPoint']:.2f}"
            f" × {LASTFM_SCALE}"
            f" = +{row['lastfmContribution']:.2f} | "
            f"v8={row['v8PreviewScore']:.2f} | "
            f"rankChange="
            f"{sign}{change} | "
            f"Last.fm share="
            f"{row['lastfmContributionPct']:.2f}%"
        )

    fieldnames = [
        "v8PreviewRank",
        "artist",
        "v7Rank",
        "rankChange",
        "v7Score",
        "naverPoint",
        "youtubePoint",
        "musicPoint",
        "lastfmRollingPoint",
        "lastfmScale",
        "lastfmContribution",
        "lastfmContributionPct",
        "v8PreviewScore",
    ]

    with CSV_OUT.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for row in result:
            writer.writerow({
                key:
                    row.get(
                        key,
                        "",
                    )
                for key in fieldnames
            })

    json_payload = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "mode":
            "preview_only",

        "baseMasterVersion":
            norm(
                master_payload.get(
                    "version"
                )
            ),

        "formula":
            (
                "master_v7 + "
                "lastfm_rolling * 0.25"
            ),

        "lastfmScale":
            LASTFM_SCALE,

        "rollingScoreField":
            rolling_field,

        "artistCount":
            len(result),

        "masterModified":
            False,

        "websiteModified":
            False,

        "ranking":
            result,
    }

    JSON_OUT.write_text(
        json.dumps(
            json_payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    report_lines = [
        (
            "FANDEX Master v8 "
            "Last.fm Rolling Preview v1"
        ),
        "=" * 88,
        f"version: {VERSION}",
        (
            "formula: Master v7 "
            "+ Last.fm Rolling × 0.25"
        ),
        (
            f"rollingScoreField: "
            f"{rolling_field}"
        ),
        (
            f"artistCount: "
            f"{len(result)}"
        ),
        "",
        "Ranking",
        "-" * 88,
    ]

    for row in result:
        report_lines.append(
            (
                f"{row['v8PreviewRank']}위 "
                f"{row['artist']} | "
                f"v7={row['v7Score']:.2f} | "
                f"Last.fm="
                f"+{row['lastfmContribution']:.2f} | "
                f"v8={row['v8PreviewScore']:.2f} | "
                f"rankChange="
                f"{row['rankChange']:+d} | "
                f"share="
                f"{row['lastfmContributionPct']:.2f}%"
            )
        )

    report_lines.extend([
        "",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT_OUT.write_text(
        "\n".join(
            report_lines
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print(
        f"artistCount: {len(result)}"
    )
    print(
        f"CSV: {CSV_OUT}"
    )
    print(
        f"JSON: {JSON_OUT}"
    )
    print(
        f"report: {REPORT_OUT}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()