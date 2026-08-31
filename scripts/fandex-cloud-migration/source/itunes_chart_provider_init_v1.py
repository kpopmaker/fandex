import json
from pathlib import Path
from datetime import datetime


VERSION = "itunes_chart_provider_init_v1"

OUTPUT_FILE = Path(
    "itunes_chart_provider_v1.json"
)

REPORT_FILE = Path(
    "FANDEX_ITUNES_CHART_PROVIDER_V1_REPORT.txt"
)


def main():
    print()
    print("FANDEX iTunes Chart provider init v1")
    print("=" * 80)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    provider = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),

        "enabled": False,

        "providerName": "",

        "endpointUrl": "",

        "allowedHost": "",

        "country": "KR",

        "chartName": "Top Songs",

        "sourceType": "actual_chart",

        "parserType": "",

        "maxRank": 200,

        "actualChartOnly": True,

        "searchApiAllowed": False,
        "lookupApiAllowed": False,
        "metadataAllowed": False,

        "notes": (
            "실제 iTunes Chart source가 "
            "확정되기 전까지 enabled=false 유지"
        ),

        "scoreUsage": (
            "collector_config_only_"
            "not_master_score"
        ),

        "masterModified": False,
        "websiteModified": False,
    }

    if OUTPUT_FILE.exists():
        print(
            f"INFO: 기존 provider 파일 유지: "
            f"{OUTPUT_FILE}"
        )

        created = False

    else:
        OUTPUT_FILE.write_text(
            json.dumps(
                provider,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        created = True

    report = [
        "FANDEX iTunes Chart Provider v1",
        "=" * 80,
        f"version: {VERSION}",
        "",
        f"providerFile: {OUTPUT_FILE}",
        f"created: {'TRUE' if created else 'FALSE'}",
        "",
        "enabled: FALSE",
        "endpointUrl: NOT_CONFIGURED",
        "actualChartOnly: TRUE",
        "searchApiAllowed: FALSE",
        "lookupApiAllowed: FALSE",
        "metadataAllowed: FALSE",
        "",
        "scoreUsage: collector_config_only_not_master_score",
        "masterModified: FALSE",
        "websiteModified: FALSE",
    ]

    REPORT_FILE.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print(
        f"providerFile: {OUTPUT_FILE}"
    )

    print(
        "enabled: FALSE"
    )

    print(
        "endpointUrl: NOT_CONFIGURED"
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
        "metadataAllowed: FALSE"
    )

    print()
    print(
        "scoreUsage: "
        "collector_config_only_not_master_score"
    )

    print(
        "masterModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()