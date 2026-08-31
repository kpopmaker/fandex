import csv
import json
import math
from datetime import datetime
from pathlib import Path


VERSION = "lastfm_global_interest_score_preview_v1"

INPUT_CSV = Path(
    "lastfm_global_interest_delta_v1_latest.csv"
)

OUTPUT_CSV = Path(
    "lastfm_global_interest_score_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_lastfm_global_interest_score_preview_v1_latest.json"
)

REPORT = Path(
    "FANDEX_LASTFM_GLOBAL_INTEREST_SCORE_PREVIEW_V1_REPORT.txt"
)


def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def log_minmax(values):
    """
    양수 변화량을 log1p로 압축한 뒤
    현재 10명 범위 안에서 0~100으로 정규화한다.
    """
    logged = [
        math.log1p(max(0.0, value))
        for value in values
    ]

    low = min(logged)
    high = max(logged)

    if high == low:
        return [50.0 for _ in logged]

    return [
        ((value - low) / (high - low)) * 100.0
        for value in logged
    ]


def main():
    print()
    print("FANDEX Last.fm Global Interest Score Preview v1")
    print("=" * 84)
    print(f"version: {VERSION}")
    print(
        "formula: "
        "50% listenerDeltaPerDay log-normalized "
        "+ 50% playcountDeltaPerDay log-normalized"
    )
    print("scoreUsage: preview_only_not_master_score")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 84)

    if not INPUT_CSV.exists():
        raise SystemExit(
            f"ERROR: 입력 파일 없음: {INPUT_CSV}"
        )

    with open(
        INPUT_CSV,
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        rows = list(csv.DictReader(f))

    if len(rows) != 10:
        raise SystemExit(
            f"ERROR: delta rowCount={len(rows)} / expected=10"
        )

    bad_status = [
        row
        for row in rows
        if row.get("status") != "delta_ready"
    ]

    if bad_status:
        print()
        print("ERROR: delta_ready가 아닌 artist 존재")

        for row in bad_status:
            print(
                row.get("artist"),
                row.get("status"),
            )

        raise SystemExit(1)

    listener_values = [
        safe_float(
            row.get("listenerDeltaPerDay")
        )
        for row in rows
    ]

    playcount_values = [
        safe_float(
            row.get("playcountDeltaPerDay")
        )
        for row in rows
    ]

    if any(v < 0 for v in listener_values):
        raise SystemExit(
            "ERROR: negative listener delta detected"
        )

    if any(v < 0 for v in playcount_values):
        raise SystemExit(
            "ERROR: negative playcount delta detected"
        )

    listener_norm = log_minmax(
        listener_values
    )

    playcount_norm = log_minmax(
        playcount_values
    )

    results = []

    for row, ln, pn in zip(
        rows,
        listener_norm,
        playcount_norm,
    ):
        listener_delta = safe_float(
            row.get("listenerDeltaPerDay")
        )

        playcount_delta = safe_float(
            row.get("playcountDeltaPerDay")
        )

        preview_point = (
            ln * 0.5
            + pn * 0.5
        )

        results.append({
            "artist": row.get("artist", ""),
            "previousDate": row.get(
                "previousDate",
                "",
            ),
            "latestDate": row.get(
                "latestDate",
                "",
            ),
            "daysBetween": row.get(
                "daysBetween",
                "",
            ),
            "listenerDeltaPerDay": round(
                listener_delta,
                4,
            ),
            "playcountDeltaPerDay": round(
                playcount_delta,
                4,
            ),
            "listenerLogNormalized": round(
                ln,
                4,
            ),
            "playcountLogNormalized": round(
                pn,
                4,
            ),
            "lastfmGlobalInterestPreviewPoint": round(
                preview_point,
                2,
            ),
            "status": "preview_ready",
        })

    results.sort(
        key=lambda x: (
            x[
                "lastfmGlobalInterestPreviewPoint"
            ],
            x["listenerDeltaPerDay"],
            x["playcountDeltaPerDay"],
        ),
        reverse=True,
    )

    for rank, item in enumerate(
        results,
        start=1,
    ):
        item["rank"] = rank

    fieldnames = [
        "rank",
        "artist",
        "previousDate",
        "latestDate",
        "daysBetween",
        "listenerDeltaPerDay",
        "playcountDeltaPerDay",
        "listenerLogNormalized",
        "playcountLogNormalized",
        "lastfmGlobalInterestPreviewPoint",
        "status",
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
        writer.writerows(results)

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "formula": {
            "listenerMetric":
                "listenerDeltaPerDay",
            "playcountMetric":
                "playcountDeltaPerDay",
            "transform":
                "log1p_then_cohort_minmax_0_100",
            "listenerWeight": 0.5,
            "playcountWeight": 0.5,
            "scoreRange": "0_to_100_relative_preview",
        },
        "scoreUsage":
            "preview_only_not_master_score",
        "masterModified": False,
        "websiteModified": False,
        "artistCount": len(results),
        "ranking": results,
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
        "FANDEX Last.fm Global Interest "
        "Score Preview v1",
        "=" * 84,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        "",
        "공식",
        "-" * 84,
        "listenerDeltaPerDay -> log1p -> "
        "10명 내 0~100 정규화 -> 50%",
        "playcountDeltaPerDay -> log1p -> "
        "10명 내 0~100 정규화 -> 50%",
        "",
        "주의",
        "-" * 84,
        "현재는 실제 2일치 데이터 기반 preview.",
        "Master FANDEX 점수에는 반영하지 않음.",
        "website public/data 수정 없음.",
        "",
        "Preview ranking",
        "-" * 84,
    ]

    print()
    print("Last.fm Global Interest preview ranking")
    print("-" * 84)

    for item in results:
        text = (
            f"{item['rank']}위 "
            f"{item['artist']} | "
            f"Preview "
            f"{item['lastfmGlobalInterestPreviewPoint']} | "
            f"listeners/day "
            f"{item['listenerDeltaPerDay']:.0f} | "
            f"playcount/day "
            f"{item['playcountDeltaPerDay']:.0f}"
        )

        print(text)
        lines.append(text)

    lines.extend([
        "",
        "=" * 84,
        f"artistCount: {len(results)}",
        f"CSV: {OUTPUT_CSV}",
        f"JSON: {OUTPUT_JSON}",
        f"report: {REPORT}",
        "scoreUsage: preview_only_not_master_score",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    REPORT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 84)
    print(f"artistCount: {len(results)}")
    print(f"CSV: {OUTPUT_CSV}")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"report: {REPORT}")
    print("scoreUsage: preview_only_not_master_score")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()