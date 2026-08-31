import csv
import json
import shutil
from datetime import date, datetime
from pathlib import Path


VERSION = "music_chart_apply_stale_decay_v2"

MUSIC_RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

LATEST_RANKING_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

LATEST_REPORTS_FILE = Path(
    "fandex_music_chart_artist_reports_v1_latest.json"
)

LATEST_DECAY_AUDIT_CSV = Path(
    "music_chart_stale_decay_apply_audit_latest.csv"
)

REPORT_FILE = Path(
    "FANDEX_MUSIC_CHART_STALE_DECAY_APPLY_REPORT_V2.txt"
)


def read_json(path):
    if not path.exists():
        raise SystemExit(
            f"File not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return 0.0


def normalize(value):
    return str(
        value or ""
    ).strip()


def parse_chart_date(value):
    try:
        return date.fromisoformat(
            normalize(value)
        )
    except Exception:
        return None


def calculate_days_old(
    chart_date_value,
    as_of_date,
):
    chart_date = parse_chart_date(
        chart_date_value
    )

    if chart_date is None:
        return None

    days_old = (
        as_of_date - chart_date
    ).days

    if days_old < 0:
        return 0

    return days_old


def decay_factor(days_old):
    # v2:
    # sourceType과 관계없이
    # chartDate의 나이만으로 감쇠한다.

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


def infer_source_type(entry):
    existing = normalize(
        entry.get(
            "staleSourceType"
        )
    )

    if (
        existing
        and existing != "unknown"
    ):
        return existing

    memo = normalize(
        entry.get("memo")
    ).lower()

    if "auto_collected" in memo:
        return "auto_collected"

    if (
        "approved_by="
        "music_chart_apply_approved_candidates"
        in memo
    ):
        return "approved_candidate"

    if "web_checked" in memo:
        return "manual_web_checked"

    return "unknown"


def original_entry_point(entry):
    # 중요:
    # latest 파일이 이미 v1 decay를 거친 상태여도
    # 재감쇠하지 않는다.
    #
    # originalMusicChartPoint가 있으면
    # 항상 그것을 원점수로 사용한다.

    original = entry.get(
        "originalMusicChartPoint"
    )

    if original not in [
        None,
        "",
    ]:
        return safe_float(
            original
        )

    return safe_float(
        entry.get(
            "musicChartPoint"
        )
    )


def ranking_rows(payload):
    if (
        isinstance(payload, dict)
        and isinstance(
            payload.get("ranking"),
            list,
        )
    ):
        return [
            row
            for row in payload[
                "ranking"
            ]
            if isinstance(row, dict)
        ]

    if isinstance(payload, list):
        return [
            row
            for row in payload
            if isinstance(row, dict)
        ]

    return []


def adjust_music_payload(
    payload,
    as_of_date,
):
    adjusted_ranking = []
    audit_rows = []

    for artist_item in ranking_rows(
        payload
    ):
        artist = normalize(
            artist_item.get("artist")
        )

        entries = artist_item.get(
            "entries",
            [],
        )

        adjusted_entries = []

        platform_points = {}
        chart_type_points = {}
        track_points = {}

        current_total = safe_float(
            artist_item.get(
                "fandexMusicChartFinalPoint",
                artist_item.get(
                    "score",
                    0,
                ),
            )
        )

        original_total = 0.0
        adjusted_total = 0.0

        for entry in entries:
            chart_date = normalize(
                entry.get(
                    "chartDate"
                )
            )

            days_old = (
                calculate_days_old(
                    chart_date,
                    as_of_date,
                )
            )

            factor = decay_factor(
                days_old
            )

            original_point = (
                original_entry_point(
                    entry
                )
            )

            adjusted_point = round(
                original_point
                * factor,
                4,
            )

            original_total += (
                original_point
            )

            adjusted_total += (
                adjusted_point
            )

            source_type = (
                infer_source_type(
                    entry
                )
            )

            new_entry = dict(
                entry
            )

            new_entry[
                "originalMusicChartPoint"
            ] = round(
                original_point,
                4,
            )

            new_entry[
                "staleDecayFactor"
            ] = factor

            new_entry[
                "musicChartPoint"
            ] = adjusted_point

            new_entry[
                "staleFreshness"
            ] = freshness(
                days_old
            )

            new_entry[
                "staleRiskLevel"
            ] = risk_level(
                days_old
            )

            new_entry[
                "staleDaysOld"
            ] = (
                ""
                if days_old is None
                else days_old
            )

            new_entry[
                "staleSourceType"
            ] = source_type

            new_entry[
                "staleDecayPolicy"
            ] = (
                "source_independent_age_based_v2"
            )

            adjusted_entries.append(
                new_entry
            )

            platform = normalize(
                entry.get(
                    "platform",
                    "other",
                )
            )

            chart_type = normalize(
                entry.get(
                    "chartType",
                    "other",
                )
            )

            track_title = normalize(
                entry.get(
                    "trackTitle"
                )
            )

            platform_points[
                platform
            ] = round(
                platform_points.get(
                    platform,
                    0.0,
                )
                + adjusted_point,
                4,
            )

            chart_type_points[
                chart_type
            ] = round(
                chart_type_points.get(
                    chart_type,
                    0.0,
                )
                + adjusted_point,
                4,
            )

            track_points[
                track_title
            ] = round(
                track_points.get(
                    track_title,
                    0.0,
                )
                + adjusted_point,
                4,
            )

            audit_rows.append({
                "artist":
                    artist,

                "platform":
                    platform,

                "chartName":
                    normalize(
                        entry.get(
                            "chartName"
                        )
                    ),

                "trackTitle":
                    track_title,

                "rank":
                    entry.get(
                        "rank",
                        "",
                    ),

                "chartDate":
                    chart_date,

                "daysOld":
                    (
                        ""
                        if days_old is None
                        else days_old
                    ),

                "sourceType":
                    source_type,

                "originalPoint":
                    round(
                        original_point,
                        4,
                    ),

                "decayFactor":
                    factor,

                "adjustedPoint":
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

        original_total = round(
            original_total,
            4,
        )

        adjusted_total = round(
            adjusted_total,
            4,
        )

        best_entry = {}

        if adjusted_entries:
            best_entry = max(
                adjusted_entries,
                key=lambda item:
                    safe_float(
                        item.get(
                            "musicChartPoint"
                        )
                    ),
            )

        core_signal = ""

        if platform_points:
            core_signal = max(
                platform_points.items(),
                key=lambda item:
                    item[1],
            )[0]

        new_artist_item = dict(
            artist_item
        )

        new_artist_item[
            "fandexMusicChartFinalPoint"
        ] = round(
            adjusted_total,
            2,
        )

        new_artist_item[
            "score"
        ] = round(
            adjusted_total,
            2,
        )

        new_artist_item[
            "originalFandexMusicChartFinalPoint"
        ] = round(
            original_total,
            2,
        )

        new_artist_item[
            "currentFandexMusicChartFinalPointBeforeV2"
        ] = round(
            current_total,
            2,
        )

        new_artist_item[
            "deltaFromOriginalMusicPoint"
        ] = round(
            adjusted_total
            - original_total,
            2,
        )

        new_artist_item[
            "deltaFromCurrentMusicPoint"
        ] = round(
            adjusted_total
            - current_total,
            2,
        )

        new_artist_item[
            "coreSignal"
        ] = core_signal

        new_artist_item[
            "entryCount"
        ] = len(
            adjusted_entries
        )

        new_artist_item[
            "platformPoints"
        ] = {
            key: round(
                value,
                2,
            )
            for key, value
            in platform_points.items()
        }

        new_artist_item[
            "chartTypePoints"
        ] = {
            key: round(
                value,
                2,
            )
            for key, value
            in chart_type_points.items()
        }

        new_artist_item[
            "trackPoints"
        ] = {
            key: round(
                value,
                2,
            )
            for key, value
            in track_points.items()
        }

        new_artist_item[
            "bestEntry"
        ] = best_entry

        new_artist_item[
            "entries"
        ] = adjusted_entries

        new_artist_item[
            "meta"
        ] = {
            "scoreVersion":
                VERSION,

            "scoreMode":
                "stale_decay_all_sources",

            "note":
                (
                    "Source-type-independent "
                    "age-based stale decay "
                    "has been applied."
                ),
        }

        adjusted_ranking.append(
            new_artist_item
        )

    adjusted_ranking.sort(
        key=lambda item:
            safe_float(
                item.get(
                    "fandexMusicChartFinalPoint"
                )
            ),
        reverse=True,
    )

    for rank, item in enumerate(
        adjusted_ranking,
        start=1,
    ):
        item["rank"] = rank

    new_payload = dict(
        payload
    )

    new_payload[
        "version"
    ] = (
        "fandex_music_chart_v1_"
        "stale_decay_all_sources_v2"
    )

    new_payload[
        "staleDecayVersion"
    ] = VERSION

    new_payload[
        "staleDecayAppliedAt"
    ] = datetime.now().isoformat(
        timespec="seconds"
    )

    new_payload[
        "staleDecayAsOfDate"
    ] = as_of_date.isoformat()

    new_payload[
        "scoreMode"
    ] = (
        "uncapped_cumulative_chart_entries_"
        "with_source_independent_stale_decay"
    )

    new_payload[
        "staleDecayPolicy"
    ] = {
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

        "missingChartDate":
            0.0,
    }

    new_payload[
        "ranking"
    ] = adjusted_ranking

    return (
        new_payload,
        audit_rows,
    )


def write_json(
    path,
    payload,
):
    path.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def write_audit_csv(
    path,
    rows,
):
    fieldnames = [
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "daysOld",
        "sourceType",
        "originalPoint",
        "decayFactor",
        "adjustedPoint",
        "freshness",
        "riskLevel",
    ]

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
        writer.writerows(
            rows
        )


def write_reports_payload(
    path,
    music_payload,
):
    reports = {}

    for item in ranking_rows(
        music_payload
    ):
        artist = normalize(
            item.get("artist")
        )

        if not artist:
            continue

        reports[artist] = {
            "artist":
                artist,

            "rank":
                item.get(
                    "rank",
                    "",
                ),

            "fandexMusicChartFinalPoint":
                item.get(
                    "fandexMusicChartFinalPoint",
                    0,
                ),

            "originalFandexMusicChartFinalPoint":
                item.get(
                    "originalFandexMusicChartFinalPoint",
                    "",
                ),

            "currentFandexMusicChartFinalPointBeforeV2":
                item.get(
                    "currentFandexMusicChartFinalPointBeforeV2",
                    "",
                ),

            "deltaFromOriginalMusicPoint":
                item.get(
                    "deltaFromOriginalMusicPoint",
                    "",
                ),

            "deltaFromCurrentMusicPoint":
                item.get(
                    "deltaFromCurrentMusicPoint",
                    "",
                ),

            "coreSignal":
                item.get(
                    "coreSignal",
                    "",
                ),

            "entryCount":
                item.get(
                    "entryCount",
                    "",
                ),

            "platformPoints":
                item.get(
                    "platformPoints",
                    {},
                ),

            "chartTypePoints":
                item.get(
                    "chartTypePoints",
                    {},
                ),

            "trackPoints":
                item.get(
                    "trackPoints",
                    {},
                ),

            "bestEntry":
                item.get(
                    "bestEntry",
                    {},
                ),

            "entries":
                item.get(
                    "entries",
                    [],
                ),

            "meta":
                item.get(
                    "meta",
                    {},
                ),
        }

    payload = {
        "version":
            (
                "fandex_music_chart_artist_reports_"
                "v1_stale_decay_all_sources_v2"
            ),

        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "scoreMode":
            (
                "source_independent_"
                "age_based_stale_decay"
            ),

        "reports":
            reports,
    }

    write_json(
        path,
        payload,
    )


def main():
    import sys

    apply_mode = (
        "--apply"
        in sys.argv
    )

    as_of_date = date.today()

    timestamp = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    print()
    print(
        "Music chart stale decay apply v2"
    )
    print("=" * 72)
    print(
        f"version: {VERSION}"
    )
    print(
        f"mode: "
        f"{'APPLY' if apply_mode else 'DRY-RUN'}"
    )
    print(
        f"asOfDate: "
        f"{as_of_date.isoformat()}"
    )
    print(
        "policy: sourceType-independent"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )
    print("=" * 72)

    music_payload = read_json(
        MUSIC_RANKING_FILE
    )

    (
        adjusted_payload,
        decay_audit_rows,
    ) = adjust_music_payload(
        music_payload,
        as_of_date,
    )

    timestamp_ranking = Path(
        "fandex_music_chart_ranking_"
        "v1_stale_decay_v2_"
        f"{timestamp}.json"
    )

    timestamp_reports = Path(
        "fandex_music_chart_artist_reports_"
        "v1_stale_decay_v2_"
        f"{timestamp}.json"
    )

    timestamp_audit = Path(
        "music_chart_stale_decay_"
        "apply_v2_audit_"
        f"{timestamp}.csv"
    )

    timestamp_report = Path(
        "FANDEX_MUSIC_CHART_"
        "STALE_DECAY_APPLY_V2_"
        f"{timestamp}.txt"
    )

    write_json(
        timestamp_ranking,
        adjusted_payload,
    )

    write_reports_payload(
        timestamp_reports,
        adjusted_payload,
    )

    write_audit_csv(
        timestamp_audit,
        decay_audit_rows,
    )

    lines = []

    lines.append(
        "FANDEX Music Chart "
        "Stale Decay Apply v2"
    )

    lines.append("=" * 72)

    lines.append(
        f"createdAt: "
        f"{datetime.now().isoformat(timespec='seconds')}"
    )

    lines.append(
        f"asOfDate: "
        f"{as_of_date.isoformat()}"
    )

    lines.append(
        f"mode: "
        f"{'APPLY' if apply_mode else 'DRY-RUN'}"
    )

    lines.append(
        "sourceTypeIndependent: TRUE"
    )

    lines.append("")
    lines.append(
        "Music ranking after stale decay"
    )
    lines.append("-" * 72)

    print()
    print(
        "Music ranking after stale decay"
    )
    print("-" * 72)

    for item in ranking_rows(
        adjusted_payload
    ):
        line = (
            f"{item.get('rank')} | "
            f"{item.get('artist')} | "
            f"current="
            f"{item.get('currentFandexMusicChartFinalPointBeforeV2')} | "
            f"v2="
            f"{item.get('fandexMusicChartFinalPoint')} | "
            f"deltaCurrent="
            f"{item.get('deltaFromCurrentMusicPoint')} | "
            f"original="
            f"{item.get('originalFandexMusicChartFinalPoint')}"
        )

        print(line)
        lines.append(line)

    lines.append("")
    lines.append(
        "Entry-level audit"
    )
    lines.append("-" * 72)

    for row in decay_audit_rows:
        lines.append(
            f"{row['artist']} | "
            f"{row['platform']} | "
            f"{row['trackTitle']} | "
            f"date={row['chartDate']} | "
            f"days={row['daysOld']} | "
            f"source={row['sourceType']} | "
            f"original={row['originalPoint']} | "
            f"factor={row['decayFactor']} | "
            f"adjusted={row['adjustedPoint']}"
        )

    if apply_mode:
        backup_ranking = Path(
            "fandex_music_chart_ranking_"
            "v1_latest_backup_before_"
            "stale_decay_v2_"
            f"{timestamp}.json"
        )

        backup_reports = Path(
            "fandex_music_chart_artist_reports_"
            "v1_latest_backup_before_"
            "stale_decay_v2_"
            f"{timestamp}.json"
        )

        shutil.copy2(
            LATEST_RANKING_FILE,
            backup_ranking,
        )

        if LATEST_REPORTS_FILE.exists():
            shutil.copy2(
                LATEST_REPORTS_FILE,
                backup_reports,
            )

        write_json(
            LATEST_RANKING_FILE,
            adjusted_payload,
        )

        write_reports_payload(
            LATEST_REPORTS_FILE,
            adjusted_payload,
        )

        write_audit_csv(
            LATEST_DECAY_AUDIT_CSV,
            decay_audit_rows,
        )

        lines.append("")
        lines.append(
            "APPLY result"
        )
        lines.append("-" * 72)
        lines.append(
            f"latest ranking updated: "
            f"{LATEST_RANKING_FILE}"
        )
        lines.append(
            f"latest reports updated: "
            f"{LATEST_REPORTS_FILE}"
        )
        lines.append(
            f"backup ranking: "
            f"{backup_ranking}"
        )
        lines.append(
            f"backup reports: "
            f"{backup_reports}"
        )

    else:
        lines.append("")
        lines.append(
            "DRY-RUN result"
        )
        lines.append("-" * 72)
        lines.append(
            "latest files were NOT modified."
        )

    lines.append("")
    lines.append(
        "masterModified: FALSE"
    )
    lines.append(
        "websiteModified: FALSE"
    )

    for report_path in [
        timestamp_report,
        REPORT_FILE,
    ]:
        report_path.write_text(
            "\n".join(lines),
            encoding="utf-8",
        )

    print()
    print("=" * 72)

    if apply_mode:
        print(
            "APPLY complete."
        )
        print(
            "Latest Music files updated."
        )
    else:
        print(
            "DRY-RUN complete."
        )
        print(
            "Latest Music files were NOT modified."
        )

    print(
        f"report: {REPORT_FILE}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()