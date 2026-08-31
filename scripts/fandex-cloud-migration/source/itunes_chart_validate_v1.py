import csv
import json
from pathlib import Path
from datetime import datetime


VERSION = "itunes_chart_validate_v1"

SEED_FILE = Path(
    "itunes_chart_seed_v1.csv"
)

IDENTITY_FILE = Path(
    "fandex_artist_identity_map_v1.csv"
)

OUTPUT_CSV = Path(
    "itunes_chart_validation_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_itunes_chart_validation_v1_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_ITUNES_CHART_VALIDATION_V1_REPORT.txt"
)

OUTPUT_FIELDS = [
    "artist",
    "itunesArtistId",
    "identityMatch",
    "chartCountry",
    "chartName",
    "chartRank",
    "trackTitle",
    "trackId",
    "chartDate",
    "sourceType",
    "sourceUrl",
    "identityReady",
    "chartReady",
    "validationStatus",
    "validationWarnings",
]


def read_csv(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일 없음: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=OUTPUT_FIELDS,
        )
        writer.writeheader()
        writer.writerows(rows)


def truth(value):
    return "TRUE" if value else "FALSE"


def parse_rank(value):
    text = str(
        value or ""
    ).strip()

    if not text:
        return None

    try:
        rank = int(text)

        if rank <= 0:
            return None

        return rank

    except ValueError:
        return None


def valid_date(value):
    text = str(
        value or ""
    ).strip()

    if not text:
        return False

    try:
        datetime.strptime(
            text,
            "%Y-%m-%d",
        )
        return True

    except ValueError:
        return False


def main():
    print()
    print(
        "FANDEX iTunes Chart validation v1"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "scoreUsage: "
        "preview_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    seed_rows = read_csv(
        SEED_FILE
    )

    identity_rows = read_csv(
        IDENTITY_FILE
    )

    identity_map = {}

    for row in identity_rows:
        artist = str(
            row.get("artist")
            or ""
        ).strip()

        identity_map[artist] = {
            "itunesArtistId": str(
                row.get("itunesArtistId")
                or ""
            ).strip(),
            "verified": str(
                row.get("itunesVerified")
                or ""
            ).strip().upper() == "TRUE",
        }

    results = []

    for row in seed_rows:
        artist = str(
            row.get("artist")
            or ""
        ).strip()

        artist_id = str(
            row.get("itunesArtistId")
            or ""
        ).strip()

        identity = identity_map.get(
            artist
        )

        identity_match = bool(
            identity
            and identity["verified"]
            and identity["itunesArtistId"]
            == artist_id
        )

        rank = parse_rank(
            row.get("chartRank")
        )

        chart_country = str(
            row.get("chartCountry")
            or ""
        ).strip()

        chart_name = str(
            row.get("chartName")
            or ""
        ).strip()

        track_title = str(
            row.get("trackTitle")
            or ""
        ).strip()

        track_id = str(
            row.get("trackId")
            or ""
        ).strip()

        chart_date = str(
            row.get("chartDate")
            or ""
        ).strip()

        source_type = str(
            row.get("sourceType")
            or ""
        ).strip()

        source_url = str(
            row.get("sourceUrl")
            or ""
        ).strip()

        identity_ready = (
            bool(artist)
            and bool(artist_id)
            and identity_match
        )

        warnings = []

        chart_fields_present = any([
            chart_country,
            chart_name,
            str(
                row.get("chartRank")
                or ""
            ).strip(),
            track_title,
            track_id,
            chart_date,
            source_type,
            source_url,
        ])

        if not identity_ready:
            warnings.append(
                "IDENTITY_NOT_READY"
            )

        if chart_fields_present:
            if not chart_country:
                warnings.append(
                    "CHART_COUNTRY_MISSING"
                )

            if not chart_name:
                warnings.append(
                    "CHART_NAME_MISSING"
                )

            if rank is None:
                warnings.append(
                    "CHART_RANK_INVALID"
                )

            if not track_title:
                warnings.append(
                    "TRACK_TITLE_MISSING"
                )

            if not valid_date(
                chart_date
            ):
                warnings.append(
                    "CHART_DATE_INVALID"
                )

            if not source_type:
                warnings.append(
                    "SOURCE_TYPE_MISSING"
                )

            if not source_url:
                warnings.append(
                    "SOURCE_URL_MISSING"
                )

        chart_ready = (
            identity_ready
            and chart_fields_present
            and bool(chart_country)
            and bool(chart_name)
            and rank is not None
            and bool(track_title)
            and valid_date(chart_date)
            and bool(source_type)
            and bool(source_url)
            and not warnings
        )

        if chart_ready:
            status = "ok_chart_ready"

        elif (
            identity_ready
            and not chart_fields_present
        ):
            status = "pending_chart_data"

        else:
            status = "needs_review"

        result = {
            "artist": artist,
            "itunesArtistId": artist_id,
            "identityMatch":
                truth(identity_match),
            "chartCountry":
                chart_country,
            "chartName":
                chart_name,
            "chartRank":
                rank if rank is not None else "",
            "trackTitle":
                track_title,
            "trackId":
                track_id,
            "chartDate":
                chart_date,
            "sourceType":
                source_type,
            "sourceUrl":
                source_url,
            "identityReady":
                truth(identity_ready),
            "chartReady":
                truth(chart_ready),
            "validationStatus":
                status,
            "validationWarnings":
                "|".join(warnings),
        }

        results.append(result)

        print(
            f"{artist} | "
            f"identity={result['identityReady']} | "
            f"chart={result['chartReady']} | "
            f"status={status}"
        )

    identity_ready_count = sum(
        row["identityReady"] == "TRUE"
        for row in results
    )

    chart_ready_count = sum(
        row["chartReady"] == "TRUE"
        for row in results
    )

    review_count = sum(
        row["validationStatus"]
        == "needs_review"
        for row in results
    )

    write_csv(
        OUTPUT_CSV,
        results,
    )

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "scoreUsage":
            "preview_only_not_master_score",
        "masterModified": False,
        "websiteModified": False,
        "seedRowCount": len(seed_rows),
        "identityReadyCount":
            identity_ready_count,
        "chartReadyCount":
            chart_ready_count,
        "needsReviewCount":
            review_count,
        "rows": results,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    report = [
        "FANDEX iTunes Chart Validation v1",
        "=" * 76,
        f"version: {VERSION}",
        (
            "scoreUsage: "
            "preview_only_not_master_score"
        ),
        "",
        f"seedRowCount: {len(seed_rows)}",
        (
            "identityReadyCount: "
            f"{identity_ready_count}"
        ),
        (
            "chartReadyCount: "
            f"{chart_ready_count}"
        ),
        (
            "needsReviewCount: "
            f"{review_count}"
        ),
        "",
    ]

    for row in results:
        report.append(
            f"{row['artist']} | "
            f"identity={row['identityReady']} | "
            f"chart={row['chartReady']} | "
            f"status={row['validationStatus']} | "
            f"warnings="
            f"{row['validationWarnings']}"
        )

    report.extend([
        "",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ])

    OUTPUT_REPORT.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 76)
    print(
        f"seedRowCount: {len(seed_rows)}"
    )
    print(
        f"identityReadyCount: "
        f"{identity_ready_count}"
    )
    print(
        f"chartReadyCount: "
        f"{chart_ready_count}"
    )
    print(
        f"needsReviewCount: "
        f"{review_count}"
    )
    print(f"CSV: {OUTPUT_CSV}")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"report: {OUTPUT_REPORT}")
    print(
        "scoreUsage: "
        "preview_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()