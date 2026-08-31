import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "itunes_chart_source_contract_v1"

CONTRACT_JSON = Path(
    "itunes_chart_source_contract_v1.json"
)

RAW_TEMPLATE_CSV = Path(
    "itunes_chart_raw_input_template_v1.csv"
)

REPORT_FILE = Path(
    "FANDEX_ITUNES_CHART_SOURCE_CONTRACT_V1_REPORT.txt"
)


RAW_FIELDS = [
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


def write_template():
    if RAW_TEMPLATE_CSV.exists():
        return False

    with RAW_TEMPLATE_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=RAW_FIELDS,
        )

        writer.writeheader()

    return True


def main():
    print()
    print(
        "FANDEX iTunes Chart "
        "source contract v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "scope: actual iTunes chart "
        "raw-input contract"
    )
    print(
        "scoreUsage: "
        "contract_only_not_master_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    contract = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),

        "purpose": (
            "actual iTunes chart "
            "source contract"
        ),

        "scoreUsage":
            "contract_only_not_master_score",

        "masterModified": False,
        "websiteModified": False,

        "requiredFields": [
            "sourceName",
            "sourceType",
            "sourceUrl",
            "chartCountry",
            "chartName",
            "chartDate",
            "chartRank",
            "sourceArtistName",
            "trackTitle",
            "itunesArtistId",
        ],

        "optionalFields": [
            "trackId",
        ],

        "rules": {
            "actualChartOnly": True,

            "searchApiAllowed": False,
            "lookupApiAllowed": False,
            "metadataOnlyAllowed": False,

            "chartRankRequired": True,
            "chartRankMinimum": 1,

            "chartCountryRequired": True,
            "chartNameRequired": True,

            "chartDateFormat":
                "YYYY-MM-DD",

            "sourceUrlRequired": True,

            "identityMatchRequired": True,

            "itunesArtistIdRequired": True,

            "sourceArtistNameRequired": True,

            "trackTitleRequired": True,

            "trackIdRequired": False,
        },

        "forbiddenSourcePatterns": [
            "itunes.apple.com/search",
            "itunes.apple.com/lookup",
        ],

        "forbiddenSourceTypeKeywords": [
            "search",
            "lookup",
            "metadata",
        ],

        "rawFields": RAW_FIELDS,

        "flow": [
            "raw chart source",
            "itunes_chart_raw_input",
            "adapter",
            "strict validation",
            "preview scoring",
            "master decision",
        ],
    }

    CONTRACT_JSON.write_text(
        json.dumps(
            contract,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    template_created = write_template()

    report = [
        (
            "FANDEX iTunes Chart "
            "Source Contract v1"
        ),
        "=" * 80,
        f"version: {VERSION}",
        "",
        (
            "purpose: actual iTunes "
            "chart source contract"
        ),
        (
            "scoreUsage: "
            "contract_only_not_master_score"
        ),
        "",
        "필수 조건:",
        "- 실제 chart rank가 있어야 함",
        "- chart country가 있어야 함",
        "- chart name이 있어야 함",
        "- chart date가 있어야 함",
        "- source URL이 있어야 함",
        "- iTunes artistId가 있어야 함",
        "- source artist name이 있어야 함",
        "- track title이 있어야 함",
        "",
        "금지:",
        "- iTunes Search API",
        "- iTunes Lookup API",
        "- metadata-only source",
        "",
        "허용:",
        "- 실제 순위가 존재하는 chart source",
        "",
        (
            f"contractJson: "
            f"{CONTRACT_JSON}"
        ),
        (
            f"rawTemplate: "
            f"{RAW_TEMPLATE_CSV}"
        ),
        "",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]

    REPORT_FILE.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("source contract 생성")
    print("-" * 80)

    print(
        f"requiredFieldCount: "
        f"{len(contract['requiredFields'])}"
    )

    print(
        f"optionalFieldCount: "
        f"{len(contract['optionalFields'])}"
    )

    print(
        "actualChartOnly: TRUE"
    )

    print(
        "searchApiAllowed: FALSE"
    )

    print(
        "lookupApiAllowed: FALSE"
    )

    print(
        "metadataOnlyAllowed: FALSE"
    )

    print()

    if template_created:
        print(
            "raw input template: CREATED"
        )
    else:
        print(
            "raw input template: EXISTS"
        )

    print(
        f"contract: {CONTRACT_JSON}"
    )

    print(
        f"template: {RAW_TEMPLATE_CSV}"
    )

    print(
        f"report: {REPORT_FILE}"
    )

    print()
    print("=" * 80)
    print(
        "scoreUsage: "
        "contract_only_not_master_score"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()