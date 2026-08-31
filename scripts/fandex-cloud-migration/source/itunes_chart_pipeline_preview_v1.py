import csv
import json
from collections import Counter
from datetime import datetime, date
from pathlib import Path


VERSION = "itunes_chart_pipeline_preview_v1"

RAW_FILE = Path(
    "itunes_chart_raw_input_v1_latest.csv"
)

IDENTITY_FILE = Path(
    "fandex_artist_identity_map_v1.csv"
)

OUTPUT_CSV = Path(
    "itunes_chart_pipeline_preview_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_itunes_chart_pipeline_preview_v1_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_ITUNES_CHART_PIPELINE_PREVIEW_V1_REPORT.txt"
)


FIELDS = [
    "artist",
    "itunesArtistId",
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
        return list(csv.DictReader(f))


def clean(value):
    return str(value or "").strip()


def normalize(value):
    return "".join(
        clean(value).lower().split()
    )


def truth(value):
    return "TRUE" if value else "FALSE"


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


def parse_date(value):
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


def valid_url(value):
    text = clean(value).lower()

    return (
        text.startswith("http://")
        or text.startswith("https://")
    )


def forbidden_source(
    source_type,
    source_url,
):
    source_type = clean(
        source_type
    ).lower()

    source_url = clean(
        source_url
    ).lower()

    forbidden_type_words = [
        "search",
        "lookup",
        "metadata",
    ]

    forbidden_urls = [
        "itunes.apple.com/search",
        "itunes.apple.com/lookup",
    ]

    return (
        any(
            word in source_type
            for word in forbidden_type_words
        )
        or any(
            value in source_url
            for value in forbidden_urls
        )
    )


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    print()
    print(
        "FANDEX iTunes Chart "
        "pipeline preview v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "flow: collector raw -> "
        "identity -> strict validation"
    )
    print(
        "scoreUsage: "
        "pipeline_preview_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    raw_rows = read_csv(
        RAW_FILE
    )

    identity_rows = read_csv(
        IDENTITY_FILE
    )

    identity_by_id = {}
    identity_by_name = {}

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

        if not verified:
            continue

        if artist_id:
            identity_by_id[
                artist_id
            ] = artist

        if artist:
            identity_by_name[
                normalize(artist)
            ] = (
                artist,
                artist_id,
            )

    prepared = []

    rank_keys = []

    for raw in raw_rows:
        artist_id = clean(
            raw.get("itunesArtistId")
        )

        source_artist = clean(
            raw.get("sourceArtistName")
        )

        artist = ""

        if artist_id:
            artist = (
                identity_by_id.get(
                    artist_id
                )
                or ""
            )

        if (
            not artist
            and source_artist
        ):
            matched = (
                identity_by_name.get(
                    normalize(
                        source_artist
                    )
                )
            )

            if matched:
                artist = matched[0]

                if not artist_id:
                    artist_id = matched[1]

        country = clean(
            raw.get("chartCountry")
        )

        chart_name = clean(
            raw.get("chartName")
        )

        chart_date = clean(
            raw.get("chartDate")
        )

        rank = parse_rank(
            raw.get("chartRank")
        )

        if (
            country
            and chart_name
            and chart_date
            and rank is not None
        ):
            rank_keys.append(
                (
                    normalize(country),
                    normalize(chart_name),
                    chart_date,
                    rank,
                )
            )

        prepared.append({
            "raw": raw,
            "artist": artist,
            "artistId": artist_id,
            "country": country,
            "chartName": chart_name,
            "chartDate": chart_date,
            "rank": rank,
        })

    rank_counts = Counter(
        rank_keys
    )

    results = []

    today = date.today()

    for item in prepared:
        raw = item["raw"]

        artist = item["artist"]
        artist_id = item["artistId"]

        track_title = clean(
            raw.get("trackTitle")
        )

        track_id = clean(
            raw.get("trackId")
        )

        source_type = clean(
            raw.get("sourceType")
        )

        source_url = clean(
            raw.get("sourceUrl")
        )

        parsed_date = parse_date(
            item["chartDate"]
        )

        identity_ready = bool(
            artist
            and artist_id
            and identity_by_id.get(
                artist_id
            )
            == artist
        )

        warnings = []

        if not identity_ready:
            warnings.append(
                "IDENTITY_NOT_READY"
            )

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

        if not track_title:
            warnings.append(
                "TRACK_TITLE_MISSING"
            )

        if parsed_date is None:
            warnings.append(
                "CHART_DATE_INVALID"
            )

        elif parsed_date > today:
            warnings.append(
                "CHART_DATE_FUTURE"
            )

        if not source_type:
            warnings.append(
                "SOURCE_TYPE_MISSING"
            )

        if not source_url:
            warnings.append(
                "SOURCE_URL_MISSING"
            )

        elif not valid_url(
            source_url
        ):
            warnings.append(
                "SOURCE_URL_INVALID"
            )

        if forbidden_source(
            source_type,
            source_url,
        ):
            warnings.append(
                "METADATA_SOURCE_NOT_CHART"
            )

        if (
            track_id
            and not track_id.isdigit()
        ):
            warnings.append(
                "TRACK_ID_INVALID"
            )

        if (
            item["country"]
            and item["chartName"]
            and item["chartDate"]
            and item["rank"] is not None
        ):
            key = (
                normalize(
                    item["country"]
                ),
                normalize(
                    item["chartName"]
                ),
                item["chartDate"],
                item["rank"],
            )

            if rank_counts[key] > 1:
                warnings.append(
                    "DUPLICATE_CHART_RANK"
                )

        chart_ready = (
            identity_ready
            and not warnings
        )

        status = (
            "ok_chart_ready"
            if chart_ready
            else "needs_review"
        )

        result = {
            "artist": artist,
            "itunesArtistId":
                artist_id,
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
                track_title,
            "trackId":
                track_id,
            "chartDate":
                item["chartDate"],
            "sourceType":
                source_type,
            "sourceUrl":
                source_url,
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
                "|".join(warnings),
        }

        results.append(result)

        print(
            f"{artist or '(미매칭)'} | "
            f"rank="
            f"{item['rank'] or '-'} | "
            f"identity="
            f"{result['identityReady']} | "
            f"chart="
            f"{result['chartReady']} | "
            f"status={status}"
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
        "createdAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),

        "rawRowCount":
            len(raw_rows),

        "validatedRowCount":
            len(results),

        "chartReadyCount":
            chart_ready_count,

        "needsReviewCount":
            review_count,

        "scoreUsage":
            (
                "pipeline_preview_only_"
                "not_master_score"
            ),

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
            "Pipeline Preview v1"
        ),
        "=" * 80,
        f"version: {VERSION}",
        "",
        (
            f"rawRowCount: "
            f"{len(raw_rows)}"
        ),
        (
            f"validatedRowCount: "
            f"{len(results)}"
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
        (
            "scoreUsage: "
            "pipeline_preview_only_"
            "not_master_score"
        ),
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]

    OUTPUT_REPORT.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 80)
    print(
        f"rawRowCount: "
        f"{len(raw_rows)}"
    )
    print(
        f"validatedRowCount: "
        f"{len(results)}"
    )
    print(
        "chartReadyCount: "
        f"{chart_ready_count}"
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
        "scoreUsage: "
        "pipeline_preview_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()