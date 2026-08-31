import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "itunes_chart_adapter_v1"

RAW_FILE = Path(
    "itunes_chart_raw_input_template_v1.csv"
)

IDENTITY_FILE = Path(
    "fandex_artist_identity_map_v1.csv"
)

OUTPUT_CSV = Path(
    "itunes_chart_seed_candidate_v1_latest.csv"
)

OUTPUT_JSON = Path(
    "fandex_itunes_chart_seed_candidate_v1_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_ITUNES_CHART_ADAPTER_V1_REPORT.txt"
)


OUTPUT_FIELDS = [
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
    "adapterStatus",
    "adapterWarnings",
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


def forbidden_source(
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

    forbidden_urls = [
        "itunes.apple.com/search",
        "itunes.apple.com/lookup",
    ]

    return (
        any(
            word in source_type_lower
            for word in forbidden_type_words
        )
        or any(
            value in source_url_lower
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
            fieldnames=OUTPUT_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    print()
    print(
        "FANDEX iTunes Chart adapter v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "scope: raw chart input -> "
        "validated seed candidate"
    )
    print(
        "scoreUsage: "
        "adapter_only_not_master_score"
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

    identity_by_artist_id = {}
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
            identity_by_artist_id[
                artist_id
            ] = artist

        if artist:
            identity_by_name[
                normalize(artist)
            ] = {
                "artist": artist,
                "artistId": artist_id,
            }

    results = []

    skipped_count = 0
    ready_count = 0

    for index, row in enumerate(
        raw_rows,
        start=1,
    ):
        source_name = clean(
            row.get("sourceName")
        )

        source_type = clean(
            row.get("sourceType")
        )

        source_url = clean(
            row.get("sourceUrl")
        )

        country = clean(
            row.get("chartCountry")
        )

        chart_name = clean(
            row.get("chartName")
        )

        chart_date = clean(
            row.get("chartDate")
        )

        rank_raw = clean(
            row.get("chartRank")
        )

        rank = parse_rank(
            rank_raw
        )

        source_artist_name = clean(
            row.get("sourceArtistName")
        )

        track_title = clean(
            row.get("trackTitle")
        )

        track_id = clean(
            row.get("trackId")
        )

        artist_id = clean(
            row.get("itunesArtistId")
        )

        warnings = []

        if not any([
            source_name,
            source_type,
            source_url,
            country,
            chart_name,
            chart_date,
            rank_raw,
            source_artist_name,
            track_title,
            track_id,
            artist_id,
        ]):
            skipped_count += 1
            continue

        artist = ""

        if artist_id:
            artist = (
                identity_by_artist_id.get(
                    artist_id
                )
                or ""
            )

        if (
            not artist
            and source_artist_name
        ):
            matched = (
                identity_by_name.get(
                    normalize(
                        source_artist_name
                    )
                )
            )

            if matched:
                artist = matched["artist"]

                if not artist_id:
                    artist_id = (
                        matched["artistId"]
                    )

        if not artist:
            warnings.append(
                "IDENTITY_MATCH_FAILED"
            )

        if not artist_id:
            warnings.append(
                "ITUNES_ARTIST_ID_MISSING"
            )

        elif (
            artist_id
            not in identity_by_artist_id
        ):
            warnings.append(
                "ITUNES_ARTIST_ID_UNKNOWN"
            )

        if not source_name:
            warnings.append(
                "SOURCE_NAME_MISSING"
            )

        if not source_type:
            warnings.append(
                "SOURCE_TYPE_MISSING"
            )

        if not source_url:
            warnings.append(
                "SOURCE_URL_MISSING"
            )

        if forbidden_source(
            source_type,
            source_url,
        ):
            warnings.append(
                "METADATA_SOURCE_NOT_CHART"
            )

        if not country:
            warnings.append(
                "CHART_COUNTRY_MISSING"
            )

        if not chart_name:
            warnings.append(
                "CHART_NAME_MISSING"
            )

        if not chart_date:
            warnings.append(
                "CHART_DATE_MISSING"
            )

        if rank is None:
            warnings.append(
                "CHART_RANK_INVALID"
            )

        if not source_artist_name:
            warnings.append(
                "SOURCE_ARTIST_NAME_MISSING"
            )

        if not track_title:
            warnings.append(
                "TRACK_TITLE_MISSING"
            )

        status = (
            "candidate_ready"
            if not warnings
            else "needs_review"
        )

        if status == "candidate_ready":
            ready_count += 1

        result = {
            "artist": artist,
            "itunesArtistId":
                artist_id,
            "chartCountry":
                country,
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
            "adapterStatus":
                status,
            "adapterWarnings":
                "|".join(warnings),
        }

        results.append(
            result
        )

        print(
            f"row={index} | "
            f"artist={artist or '(미매칭)'} | "
            f"rank="
            f"{rank if rank is not None else '-'} | "
            f"status={status}"
        )

        if warnings:
            print(
                "  warnings: "
                + "|".join(warnings)
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
        "candidateRowCount":
            len(results),
        "candidateReadyCount":
            ready_count,
        "skippedBlankRowCount":
            skipped_count,
        "scoreUsage":
            "adapter_only_not_master_score",
        "masterModified":
            False,
        "websiteModified":
            False,
        "rows":
            results,
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
        "FANDEX iTunes Chart Adapter v1",
        "=" * 80,
        f"version: {VERSION}",
        "",
        (
            f"rawRowCount: "
            f"{len(raw_rows)}"
        ),
        (
            f"candidateRowCount: "
            f"{len(results)}"
        ),
        (
            f"candidateReadyCount: "
            f"{ready_count}"
        ),
        (
            f"skippedBlankRowCount: "
            f"{skipped_count}"
        ),
        "",
    ]

    for row in results:
        report.append(
            f"{row['artist']} | "
            f"rank={row['chartRank']} | "
            f"status="
            f"{row['adapterStatus']} | "
            f"warnings="
            f"{row['adapterWarnings']}"
        )

    report.extend([
        "",
        (
            "scoreUsage: "
            "adapter_only_not_master_score"
        ),
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
        f"rawRowCount: "
        f"{len(raw_rows)}"
    )
    print(
        f"candidateRowCount: "
        f"{len(results)}"
    )
    print(
        f"candidateReadyCount: "
        f"{ready_count}"
    )
    print(
        f"skippedBlankRowCount: "
        f"{skipped_count}"
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
        "adapter_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()