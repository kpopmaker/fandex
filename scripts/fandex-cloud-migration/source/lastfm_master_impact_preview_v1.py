import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_master_impact_preview_v1"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

LASTFM_FILE = Path(
    "lastfm_global_interest_score_preview_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "lastfm_master_impact_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_lastfm_master_impact_preview_v1_latest.json"
)

REPORT = Path(
    "FANDEX_LASTFM_MASTER_IMPACT_PREVIEW_V1_REPORT.txt"
)

SCALES = [
    0.25,
    0.50,
    1.00,
]


def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def get_master_rows(payload):
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        return []

    for key in [
        "ranking",
        "rankings",
        "artists",
        "items",
        "results",
        "data",
    ]:
        value = payload.get(key)

        if isinstance(value, list):
            return value

    return []


def get_artist(row):
    for key in [
        "artist",
        "artistName",
        "name",
    ]:
        value = row.get(key)

        if value:
            return str(value).strip()

    return ""


def get_master_score(row):
    for key in [
        "fandexFinalPoint",
        "score",
        "totalPoint",
    ]:
        if key in row and row.get(key) not in [None, ""]:
            return safe_float(
                row.get(key)
            )

    return 0.0


def main():
    print()
    print("FANDEX Last.fm Master Impact Preview v1")
    print("=" * 88)
    print(f"version: {VERSION}")
    print(
        "purpose: Last.fm preview score의 "
        "Master 영향도 sensitivity test"
    )
    print(
        "scales: "
        + ", ".join(
            str(x)
            for x in SCALES
        )
    )
    print("scoreUsage: impact_preview_only")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 88)

    if not MASTER_FILE.exists():
        raise SystemExit(
            f"ERROR: Master 없음: {MASTER_FILE}"
        )

    if not LASTFM_FILE.exists():
        raise SystemExit(
            f"ERROR: Last.fm preview 없음: {LASTFM_FILE}"
        )

    master_payload = json.loads(
        MASTER_FILE.read_text(
            encoding="utf-8-sig"
        )
    )

    master_rows = get_master_rows(
        master_payload
    )

    if len(master_rows) != 10:
        raise SystemExit(
            "ERROR: Master artist count "
            f"{len(master_rows)} / expected 10"
        )

    master_map = {}

    for row in master_rows:
        artist = get_artist(row)

        if not artist:
            continue

        master_map[artist] = {
            "masterPoint":
                get_master_score(row),
        }

    with open(
        LASTFM_FILE,
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        lastfm_rows = list(
            csv.DictReader(f)
        )

    if len(lastfm_rows) != 10:
        raise SystemExit(
            "ERROR: Last.fm artist count "
            f"{len(lastfm_rows)} / expected 10"
        )

    lastfm_map = {}

    for row in lastfm_rows:
        artist = (
            row.get("artist") or ""
        ).strip()

        if not artist:
            continue

        lastfm_map[artist] = safe_float(
            row.get(
                "lastfmGlobalInterestPreviewPoint"
            )
        )

    master_artists = set(
        master_map
    )

    lastfm_artists = set(
        lastfm_map
    )

    if master_artists != lastfm_artists:
        print()
        print("ERROR: artist set mismatch")

        print(
            "Master only:",
            sorted(
                master_artists
                - lastfm_artists
            ),
        )

        print(
            "Last.fm only:",
            sorted(
                lastfm_artists
                - master_artists
            ),
        )

        raise SystemExit(1)

    baseline = sorted(
        [
            {
                "artist": artist,
                "masterPoint":
                    info["masterPoint"],
            }
            for artist, info
            in master_map.items()
        ],
        key=lambda x: x["masterPoint"],
        reverse=True,
    )

    baseline_rank = {
        row["artist"]: index
        for index, row
        in enumerate(
            baseline,
            start=1,
        )
    }

    all_rows = []

    scenarios = {}

    print()
    print("Impact scenarios")
    print("-" * 88)

    for scale in SCALES:
        scenario_rows = []

        for artist in master_map:
            master_point = (
                master_map[artist][
                    "masterPoint"
                ]
            )

            lastfm_point = (
                lastfm_map[artist]
            )

            added = (
                lastfm_point
                * scale
            )

            preview_total = (
                master_point
                + added
            )

            scenario_rows.append({
                "artist": artist,
                "baselineRank":
                    baseline_rank[artist],
                "masterPoint":
                    round(
                        master_point,
                        2,
                    ),
                "lastfmPreviewPoint":
                    round(
                        lastfm_point,
                        2,
                    ),
                "scale":
                    scale,
                "lastfmAddedPoint":
                    round(
                        added,
                        2,
                    ),
                "previewMasterPoint":
                    round(
                        preview_total,
                        2,
                    ),
            })

        scenario_rows.sort(
            key=lambda x:
                x["previewMasterPoint"],
            reverse=True,
        )

        print()
        print(
            f"Last.fm scale x{scale:.2f}"
        )

        print("-" * 88)

        for rank, row in enumerate(
            scenario_rows,
            start=1,
        ):
            row["previewRank"] = rank

            row["rankChange"] = (
                row["baselineRank"]
                - rank
            )

            all_rows.append(
                dict(row)
            )

            sign = ""

            if row["rankChange"] > 0:
                sign = (
                    f"+{row['rankChange']}"
                )

            elif row["rankChange"] < 0:
                sign = str(
                    row["rankChange"]
                )

            else:
                sign = "0"

            print(
                f"{rank}위 "
                f"{row['artist']} | "
                f"{row['previewMasterPoint']:.2f} | "
                f"Last.fm +"
                f"{row['lastfmAddedPoint']:.2f} | "
                f"rankChange {sign}"
            )

        scenarios[
            f"{scale:.2f}"
        ] = scenario_rows

    fieldnames = [
        "scale",
        "previewRank",
        "baselineRank",
        "rankChange",
        "artist",
        "masterPoint",
        "lastfmPreviewPoint",
        "lastfmAddedPoint",
        "previewMasterPoint",
    ]

    with open(
        OUTPUT_CSV,
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        writer.writerows(
            all_rows
        )

    payload = {
        "version": VERSION,
        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),
        "purpose":
            "lastfm_master_weight_sensitivity_preview",
        "scales": SCALES,
        "scoreUsage":
            "impact_preview_only_not_master_score",
        "masterModified": False,
        "websiteModified": False,
        "baselineRanking": baseline,
        "scenarios": scenarios,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    lines = [
        "FANDEX Last.fm Master "
        "Impact Preview v1",
        "=" * 88,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        "",
        "Master 파일은 수정하지 않는다.",
        "Last.fm preview scale별 "
        "순위 영향만 비교한다.",
        "",
    ]

    for scale in SCALES:
        lines.append(
            f"Scenario x{scale:.2f}"
        )

        lines.append(
            "-" * 88
        )

        for row in scenarios[
            f"{scale:.2f}"
        ]:
            lines.append(
                f"{row['previewRank']}위 "
                f"{row['artist']} | "
                f"{row['previewMasterPoint']:.2f} | "
                f"baselineRank="
                f"{row['baselineRank']} | "
                f"rankChange="
                f"{row['rankChange']}"
            )

        lines.append("")

    lines.extend([
        "=" * 88,
        f"CSV: {OUTPUT_CSV}",
        f"JSON: {OUTPUT_JSON}",
        f"report: {REPORT}",
        "scoreUsage: "
        "impact_preview_only_not_master_score",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print(f"CSV: {OUTPUT_CSV}")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"report: {REPORT}")
    print(
        "scoreUsage: "
        "impact_preview_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()