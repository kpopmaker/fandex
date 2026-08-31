import csv
import json
from collections import Counter
from datetime import datetime, date
from pathlib import Path


VERSION = "itunes_chart_validate_v2_strict_contract"

SEED_FILE = Path(
    "itunes_chart_seed_v1.csv"
)

IDENTITY_FILE = Path(
    "fandex_artist_identity_map_v1.csv"
)

OUTPUT_CSV = Path(
    "itunes_chart_validation_v2_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_itunes_chart_validation_v2_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_ITUNES_CHART_VALIDATION_V2_REPORT.txt"
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
    "ageDays",
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


def clean(value):
    return str(
        value or ""
    ).strip()


def truth(value):
    return (
        "TRUE"
        if value
        else "FALSE"
    )


def normalize(value):
    return "".join(
        clean(value)
        .lower()
        .split()
    )


def parse_rank(value):
    text = clean(value)

    if not text:
        return None

    try:
        rank = int(text)

        if rank <= 0:
            return None

        return rank

    except ValueError:
        return None


def parse_chart_date(value):
    text = clean(value)

    if not text:
        return None

    try:
        return datetime.strptime(
            text,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        return None


def valid_http_url(value):
    text = clean(value).lower()

    return (
        text.startswith("http://")
        or text.startswith("https://")
    )


def forbidden_metadata_source(
    source_type,
    source_url,
):
    source_type_lower = (
        clean(source_type).lower()
    )

    source_url_lower = (
        clean(source_url).lower()
    )

    forbidden_type_words = [
        "search",
        "lookup",
        "metadata",
    ]

    if any(
        word in source_type_lower
        for word in forbidden_type_words
    ):
        return True

    forbidden_urls = [
        "itunes.apple.com/search",
        "itunes.apple.com/lookup",
    ]

    if any(
        value in source_url_lower
        for value in forbidden_urls
    ):
        return True

    return False


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


def main():
    print()
    print(
        "FANDEX iTunes Chart validation v2"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "contract: actual_chart_only_"
        "no_search_lookup_metadata"
    )
    print(
        "scoreUsage: "
        "validation_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    seed_rows = read_csv(
        SEED_FILE
    )

    identity_rows = read_csv(
        IDENTITY_FILE
    )

    identity_map = {}

    for row in identity_rows:
        artist = clean(
            row.get("artist")
        )

        artist_id = clean(
            row.get("itunesArtistId")
        )

        verified = (
            clean(
                row.get("itunesVerified")
            ).upper()
            == "TRUE"
        )

        identity_map[artist] = {
            "artistId": artist_id,
            "verified": verified,
        }

    prepared = []

    rank_keys = []
    entry_keys = []

    for source_row in seed_rows:
        artist = clean(
            source_row.get("artist")
        )

        artist_id = clean(
            source_row.get(
                "itunesArtistId"
            )
        )

        country = clean(
            source_row.get(
                "chartCountry"
            )
        )

        chart_name = clean(
            source_row.get(
                "chartName"
            )
        )

        rank_raw = clean(
            source_row.get(
                "chartRank"
            )
        )

        rank = parse_rank(
            rank_raw
        )

        track_title = clean(
            source_row.get(
                "trackTitle"
            )
        )

        track_id = clean(
            source_row.get(
                "trackId"
            )
        )

        chart_date_text = clean(
            source_row.get(
                "chartDate"
            )
        )

        parsed_date = parse_chart_date(
            chart_date_text
        )

        source_type = clean(
            source_row.get(
                "sourceType"
            )
        )

        source_url = clean(
            source_row.get(
                "sourceUrl"
            )
        )

        chart_fields_present = any([
            country,
            chart_name,
            rank_raw,
            track_title,
            track_id,
            chart_date_text,
            source_type,
            source_url,
        ])

        if (
            chart_fields_present
            and country
            and chart_name
            and rank is not None
            and chart_date_text
        ):
            rank_keys.append(
                (
                    normalize(country),
                    normalize(chart_name),
                    chart_date_text,
                    rank,
                )
            )

        if (
            chart_fields_present
            and country
            and chart_name
            and chart_date_text
            and artist
            and (
                track_id
                or track_title
            )
        ):
            entry_identity = (
                track_id
                if track_id
                else normalize(track_title)
            )

            entry_keys.append(
                (
                    normalize(country),
                    normalize(chart_name),
                    chart_date_text,
                    normalize(artist),
                    entry_identity,
                )
            )

        prepared.append({
            "sourceRow": source_row,
            "artist": artist,
            "artistId": artist_id,
            "country": country,
            "chartName": chart_name,
            "rankRaw": rank_raw,
            "rank": rank,
            "trackTitle": track_title,
            "trackId": track_id,
            "chartDateText":
                chart_date_text,
            "parsedDate": parsed_date,
            "sourceType": source_type,
            "sourceUrl": source_url,
            "chartFieldsPresent":
                chart_fields_present,
        })

    rank_counts = Counter(
        rank_keys
    )

    entry_counts = Counter(
        entry_keys
    )

    results = []

    today = date.today()

    for item in prepared:
        artist = item["artist"]
        artist_id = item["artistId"]

        identity = identity_map.get(
            artist
        )

        identity_match = bool(
            identity
            and identity["verified"]
            and identity["artistId"]
            == artist_id
        )

        identity_ready = bool(
            artist
            and artist_id
            and identity_match
        )

        warnings = []

        chart_fields_present = (
            item["chartFieldsPresent"]
        )

        age_days = ""

        if item["parsedDate"]:
            age_days = (
                today
                - item["parsedDate"]
            ).days

        if not identity_ready:
            warnings.append(
                "IDENTITY_NOT_READY"
            )

        if chart_fields_present:
            if not item["country"]:
                warnings.append(
                    "CHART_COUNTRY_MISSING"
                )

            if not item["chartName"]:
                warnings.append(
                    "CHART_NAME_MISSING"
                )

            if item["rank"] is None:
                warnings.append(
                    "CHART_RANK_INVALID"
                )

            if not item["trackTitle"]:
                warnings.append(
                    "TRACK_TITLE_MISSING"
                )

            if not item["parsedDate"]:
                warnings.append(
                    "CHART_DATE_INVALID"
                )

            elif item["parsedDate"] > today:
                warnings.append(
                    "CHART_DATE_FUTURE"
                )

            if not item["sourceType"]:
                warnings.append(
                    "SOURCE_TYPE_MISSING"
                )

            if not item["sourceUrl"]:
                warnings.append(
                    "SOURCE_URL_MISSING"
                )

            elif not valid_http_url(
                item["sourceUrl"]
            ):
                warnings.append(
                    "SOURCE_URL_INVALID"
                )

            if forbidden_metadata_source(
                item["sourceType"],
                item["sourceUrl"],
            ):
                warnings.append(
                    "METADATA_SOURCE_NOT_CHART"
                )

            if (
                item["trackId"]
                and not item[
                    "trackId"
                ].isdigit()
            ):
                warnings.append(
                    "TRACK_ID_INVALID"
                )

            if (
                item["country"]
                and item["chartName"]
                and item["rank"]
                is not None
                and item[
                    "chartDateText"
                ]
            ):
                rank_key = (
                    normalize(
                        item["country"]
                    ),
                    normalize(
                        item["chartName"]
                    ),
                    item[
                        "chartDateText"
                    ],
                    item["rank"],
                )

                if (
                    rank_counts[
                        rank_key
                    ] > 1
                ):
                    warnings.append(
                        "DUPLICATE_CHART_RANK"
                    )

            if (
                item["country"]
                and item["chartName"]
                and item[
                    "chartDateText"
                ]
                and artist
                and (
                    item["trackId"]
                    or item[
                        "trackTitle"
                    ]
                )
            ):
                entry_identity = (
                    item["trackId"]
                    if item["trackId"]
                    else normalize(
                        item[
                            "trackTitle"
                        ]
                    )
                )

                entry_key = (
                    normalize(
                        item["country"]
                    ),
                    normalize(
                        item["chartName"]
                    ),
                    item[
                        "chartDateText"
                    ],
                    normalize(artist),
                    entry_identity,
                )

                if (
                    entry_counts[
                        entry_key
                    ] > 1
                ):
                    warnings.append(
                        "DUPLICATE_CHART_ENTRY"
                    )

        chart_ready = (
            identity_ready
            and chart_fields_present
            and bool(
                item["country"]
            )
            and bool(
                item["chartName"]
            )
            and item["rank"]
            is not None
            and bool(
                item["trackTitle"]
            )
            and item["parsedDate"]
            is not None
            and item[
                "parsedDate"
            ] <= today
            and bool(
                item["sourceType"]
            )
            and bool(
                item["sourceUrl"]
            )
            and valid_http_url(
                item["sourceUrl"]
            )
            and not warnings
        )

        if chart_ready:
            status = (
                "ok_chart_ready"
            )

        elif (
            identity_ready
            and not chart_fields_present
        ):
            status = (
                "pending_chart_data"
            )

        else:
            status = (
                "needs_review"
            )

        result = {
            "artist": artist,
            "itunesArtistId":
                artist_id,
            "identityMatch":
                truth(
                    identity_match
                ),
            "chartCountry":
                item["country"],
            "chartName":
                item["chartName"],
            "chartRank":
                (
                    item["rank"]
                    if item["rank"]
                    is not None
                    else ""
                ),
            "trackTitle":
                item[
                    "trackTitle"
                ],
            "trackId":
                item["trackId"],
            "chartDate":
                item[
                    "chartDateText"
                ],
            "ageDays":
                age_days,
            "sourceType":
                item[
                    "sourceType"
                ],
            "sourceUrl":
                item[
                    "sourceUrl"
                ],
            "identityReady":
                truth(
                    identity_ready
                ),
            "chartReady":
                truth(
                    chart_ready
                ),
            "validationStatus":
                status,
            "validationWarnings":
                "|".join(
                    warnings
                ),
        }

        results.append(
            result
        )

        print(
            f"{artist} | "
            f"identity="
            f"{result['identityReady']} | "
            f"chart="
            f"{result['chartReady']} | "
            f"status={status}"
        )

        if warnings:
            print(
                "  warnings: "
                + "|".join(
                    warnings
                )
            )

    identity_ready_count = sum(
        row["identityReady"]
        == "TRUE"
        for row in results
    )

    chart_ready_count = sum(
        row["chartReady"]
        == "TRUE"
        for row in results
    )

    pending_count = sum(
        row["validationStatus"]
        == "pending_chart_data"
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
        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),
        "sourceContract":
            (
                "actual_chart_only_"
                "no_search_lookup_metadata"
            ),
        "scoreUsage":
            (
                "validation_only_"
                "not_master_score"
            ),
        "seedRowCount":
            len(seed_rows),
        "identityReadyCount":
            identity_ready_count,
        "chartReadyCount":
            chart_ready_count,
        "pendingCount":
            pending_count,
        "needsReviewCount":
            review_count,
        "masterModified": False,
        "websiteModified": False,
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
        (
            "FANDEX iTunes Chart "
            "Validation v2"
        ),
        "=" * 80,
        f"version: {VERSION}",
        (
            "sourceContract: "
            "actual_chart_only_"
            "no_search_lookup_metadata"
        ),
        (
            "scoreUsage: "
            "validation_only_"
            "not_master_score"
        ),
        "",
        (
            f"seedRowCount: "
            f"{len(seed_rows)}"
        ),
        (
            "identityReadyCount: "
            f"{identity_ready_count}"
        ),
        (
            "chartReadyCount: "
            f"{chart_ready_count}"
        ),
        (
            "pendingCount: "
            f"{pending_count}"
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
            f"identity="
            f"{row['identityReady']} | "
            f"chart="
            f"{row['chartReady']} | "
            f"status="
            f"{row['validationStatus']} | "
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
    print("=" * 80)
    print(
        f"seedRowCount: "
        f"{len(seed_rows)}"
    )
    print(
        "identityReadyCount: "
        f"{identity_ready_count}"
    )
    print(
        "chartReadyCount: "
        f"{chart_ready_count}"
    )
    print(
        "pendingCount: "
        f"{pending_count}"
    )
    print(
        "needsReviewCount: "
        f"{review_count}"
    )
    print(
        f"CSV: {OUTPUT_CSV}"
    )
    print(
        f"JSON: {OUTPUT_JSON}"
    )
    print(
        f"report: {OUTPUT_REPORT}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()