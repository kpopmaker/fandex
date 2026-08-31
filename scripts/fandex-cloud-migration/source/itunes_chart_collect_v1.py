import csv
import json
from pathlib import Path
from datetime import datetime


VERSION = "itunes_chart_collect_v1"

PROVIDER_FILE = Path(
    "itunes_chart_provider_v1.json"
)

OUTPUT_RAW = Path(
    "itunes_chart_raw_input_v1_latest.csv"
)

OUTPUT_REPORT = Path(
    "FANDEX_ITUNES_CHART_COLLECTOR_V1_REPORT.txt"
)


FIELDS = [
    "sourceName",
    "sourceType",
    "sourceUrl",
    "chartCountry",
    "chartName",
    "chartDate",
    "chartRank",
    "sourceArtistName",
    "trackTitle",
    "trackId",
    "itunesArtistId",
]


def write_empty_raw():
    with OUTPUT_RAW.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=FIELDS,
        )

        writer.writeheader()


def main():
    print()
    print("FANDEX iTunes Chart collector v1")
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "scoreUsage: "
        "collection_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    if not PROVIDER_FILE.exists():
        raise SystemExit(
            f"ERROR: provider 파일 없음: "
            f"{PROVIDER_FILE}"
        )

    provider = json.loads(
        PROVIDER_FILE.read_text(
            encoding="utf-8-sig"
        )
    )

    enabled = bool(
        provider.get("enabled")
    )

    endpoint = str(
        provider.get("endpointUrl")
        or ""
    ).strip()

    provider_name = str(
        provider.get("providerName")
        or ""
    ).strip()

    actual_chart_only = bool(
        provider.get(
            "actualChartOnly",
            False,
        )
    )

    search_allowed = bool(
        provider.get(
            "searchApiAllowed",
            True,
        )
    )

    lookup_allowed = bool(
        provider.get(
            "lookupApiAllowed",
            True,
        )
    )

    metadata_allowed = bool(
        provider.get(
            "metadataAllowed",
            True,
        )
    )

    contract_ok = (
        actual_chart_only
        and not search_allowed
        and not lookup_allowed
        and not metadata_allowed
    )

    if not contract_ok:
        raise SystemExit(
            "ERROR: provider contract가 "
            "actual-chart-only 정책과 다릅니다."
        )

    write_empty_raw()

    if not enabled:
        status = "provider_not_enabled"

    elif not endpoint:
        status = "endpoint_not_configured"

    elif not provider_name:
        status = "provider_name_missing"

    else:
        status = "provider_ready_fetch_not_implemented"

    print()
    print(f"providerEnabled: {enabled}")
    print(
        f"providerName: "
        f"{provider_name or 'NOT_CONFIGURED'}"
    )
    print(
        f"endpointUrl: "
        f"{endpoint or 'NOT_CONFIGURED'}"
    )
    print(
        f"collectorStatus: {status}"
    )

    print()
    print(
        f"rawOutput: {OUTPUT_RAW}"
    )

    report = [
        "FANDEX iTunes Chart Collector v1",
        "=" * 80,
        f"version: {VERSION}",
        (
            "createdAt: "
            + datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        "",
        f"providerEnabled: {enabled}",
        (
            "providerName: "
            + (
                provider_name
                or "NOT_CONFIGURED"
            )
        ),
        (
            "endpointUrl: "
            + (
                endpoint
                or "NOT_CONFIGURED"
            )
        ),
        f"collectorStatus: {status}",
        "",
        "actualChartOnly: TRUE",
        "searchApiAllowed: FALSE",
        "lookupApiAllowed: FALSE",
        "metadataAllowed: FALSE",
        "",
        "collectedRowCount: 0",
        "",
        "scoreUsage: collection_only_not_master_score",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]

    OUTPUT_REPORT.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 80)
    print("collectedRowCount: 0")
    print(
        "scoreUsage: "
        "collection_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()