import json
from datetime import date, datetime
from pathlib import Path


VERSION = "music_chart_stale_decay_all_sources_preview_v1"

INPUT_FILE = Path("fandex_music_chart_ranking_v1_latest.json")
OUTPUT_FILE = Path(
    "music_chart_stale_decay_all_sources_preview_v1_latest.json"
)
REPORT_FILE = Path(
    "MUSIC_CHART_STALE_DECAY_ALL_SOURCES_PREVIEW_V1.txt"
)


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0
        return float(str(value).replace(",", "").strip())
    except Exception:
        return 0.0


def parse_date(value):
    try:
        return date.fromisoformat(str(value).strip())
    except Exception:
        return None


def decay_factor(days_old):
    if days_old is None:
        return 0.0

    if days_old <= 3:
        return 1.0

    if days_old <= 7:
        return 0.7

    if days_old <= 14:
        return 0.4

    if days_old <= 30:
        return 0.2

    return 0.0


def freshness(days_old):
    if days_old is None:
        return "unknown"

    if days_old <= 3:
        return "fresh"

    if days_old <= 7:
        return "stale"

    return "old"


def risk_level(days_old):
    if days_old is None:
        return "UNKNOWN"

    if days_old <= 3:
        return "LOW"

    if days_old <= 7:
        return "MEDIUM"

    return "HIGH"


def ranking_rows(payload):
    if (
        isinstance(payload, dict)
        and isinstance(payload.get("ranking"), list)
    ):
        return [
            row
            for row in payload["ranking"]
            if isinstance(row, dict)
        ]

    return []


def main():
    print()
    print("Music chart stale decay ALL SOURCES preview v1")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: PREVIEW ONLY")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    if not INPUT_FILE.exists():
        raise SystemExit(
            f"ERROR: file not found: {INPUT_FILE}"
        )

    with INPUT_FILE.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        payload = json.load(f)

    today = date.today()

    preview_ranking = []
    preview_entries = []

    for artist_item in ranking_rows(payload):
        artist = artist_item.get("artist", "")
        entries = artist_item.get("entries", [])

        adjusted_total = 0.0

        for entry in entries:
            chart_date = parse_date(
                entry.get("chartDate")
            )

            days_old = None

            if chart_date is not None:
                days_old = (
                    today - chart_date
                ).days

                if days_old < 0:
                    days_old = 0

            factor = decay_factor(
                days_old
            )

            # 중요:
            # 현재 latest가 이미 stale decay 적용본일 수 있으므로
            # musicChartPoint를 다시 감쇠하지 않는다.
            # 원래 점수가 저장되어 있으면 그것을 기준으로 재계산.
            if (
                entry.get(
                    "originalMusicChartPoint"
                )
                not in [None, ""]
            ):
                original_point = safe_float(
                    entry.get(
                        "originalMusicChartPoint"
                    )
                )
            else:
                original_point = safe_float(
                    entry.get(
                        "musicChartPoint"
                    )
                )

            adjusted_point = round(
                original_point * factor,
                4,
            )

            adjusted_total += (
                adjusted_point
            )

            preview_entries.append({
                "artist":
                    artist,

                "platform":
                    entry.get(
                        "platform",
                        "",
                    ),

                "trackTitle":
                    entry.get(
                        "trackTitle",
                        "",
                    ),

                "chartDate":
                    entry.get(
                        "chartDate",
                        "",
                    ),

                "daysOld":
                    days_old,

                "sourceType":
                    entry.get(
                        "staleSourceType",
                        "",
                    ),

                "originalPoint":
                    round(
                        original_point,
                        4,
                    ),

                "decayFactor":
                    factor,

                "previewPoint":
                    adjusted_point,

                "freshness":
                    freshness(
                        days_old
                    ),

                "riskLevel":
                    risk_level(
                        days_old
                    ),
            })

        adjusted_total = round(
            adjusted_total,
            2,
        )

        current_point = safe_float(
            artist_item.get(
                "fandexMusicChartFinalPoint",
                artist_item.get(
                    "score",
                    0,
                ),
            )
        )

        preview_ranking.append({
            "artist":
                artist,

            "currentMusicPoint":
                round(
                    current_point,
                    2,
                ),

            "allSourceDecayPreviewPoint":
                adjusted_total,

            "deltaFromCurrent":
                round(
                    adjusted_total
                    - current_point,
                    2,
                ),
        })

    preview_ranking.sort(
        key=lambda x:
            x[
                "allSourceDecayPreviewPoint"
            ],
        reverse=True,
    )

    for rank, item in enumerate(
        preview_ranking,
        start=1,
    ):
        item["previewRank"] = rank

    output = {
        "version":
            VERSION,

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "asOfDate":
            today.isoformat(),

        "mode":
            "preview_only",

        "policy": {
            "sourceTypeIndependent":
                True,

            "days0To3":
                1.0,

            "days4To7":
                0.7,

            "days8To14":
                0.4,

            "days15To30":
                0.2,

            "daysOver30":
                0.0,
        },

        "ranking":
            preview_ranking,

        "entries":
            preview_entries,

        "masterModified":
            False,

        "websiteModified":
            False,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    lines = []

    lines.append(
        "Music Chart All-Source "
        "Stale Decay Preview v1"
    )
    lines.append("=" * 72)
    lines.append(
        f"asOfDate: {today.isoformat()}"
    )
    lines.append(
        "masterModified: FALSE"
    )
    lines.append(
        "websiteModified: FALSE"
    )
    lines.append("")
    lines.append(
        "Preview ranking"
    )
    lines.append("-" * 72)

    print()
    print("Preview ranking")
    print("-" * 72)

    for item in preview_ranking:
        line = (
            f"{item['previewRank']} | "
            f"{item['artist']} | "
            f"current={item['currentMusicPoint']} | "
            f"preview="
            f"{item['allSourceDecayPreviewPoint']} | "
            f"delta={item['deltaFromCurrent']}"
        )

        print(line)
        lines.append(line)

    lines.append("")
    lines.append(
        "Entry-level preview"
    )
    lines.append("-" * 72)

    for row in preview_entries:
        lines.append(
            f"{row['artist']} | "
            f"{row['platform']} | "
            f"{row['trackTitle']} | "
            f"date={row['chartDate']} | "
            f"days={row['daysOld']} | "
            f"source={row['sourceType']} | "
            f"original={row['originalPoint']} | "
            f"factor={row['decayFactor']} | "
            f"preview={row['previewPoint']}"
        )

    REPORT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print(f"output: {OUTPUT_FILE}")
    print(f"report: {REPORT_FILE}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()