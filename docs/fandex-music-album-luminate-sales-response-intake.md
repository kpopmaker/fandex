# FANDEX — Luminate Sales Response Intake Checklist

Status: research/operator checklist

When Luminate replies to the Request a Demo / sales inquiry, classify the response before changing any FANDEX readiness state.

## 1. Commercial-only response

Examples:
- invitation to book a demo
- generic product brochure
- package overview
- preliminary price range
- request for company details

Action:
- retain as sales correspondence
- do not populate agreementEvidenceId
- do not set licenseActive=true
- do not authorize extraction
- Product Production remains 0/7

## 2. Technical scope response

Capture whether Luminate confirms:
- Snowflake Music Data Share
- VW_DAILY_FACT_MRELG_DETAIL_DS
- VW_MUSICAL_RELEASE_GROUP_DS
- VW_FACT_VALUES_DS
- historical coverage for 2021-12-29 through 2022-01-04
- historical coverage for 2024-02-20 through 2024-02-26
- US and/or CA scope
- MRELG IDs for The Winning and Pieces
- REPORTED_QUANTITY / TRANSACTION_TYPE / REPORT_DATE / PRODUCT_FORMAT / COUNTRY_CODE / MODIFIED_AT availability

Technical confirmation alone does not create usage/publication rights.

## 3. Rights / legal response

Map each written answer to the existing authorization grant:
- physicalProductSalesIncluded
- authorizedTerritories
- apiOrDataShareAccess
- recurringProgrammaticCollection
- normalizedStorage
- retentionDuringLicense
- commercialProductUse
- publicDerivedMetricPublication
- publicRankingOrBenchmarking
- rawRedistribution
- postTerminationPolicy

If a right is ambiguous, use not-addressed / unresolved rather than inferring permission.

## 4. Executed agreement

Only an executed order form or separate writing may populate:
- agreementKind
- agreementEvidenceId
- licenseActive
- resolved grant answers
- postTerminationPolicyEvidenceId

Then fill the blocked-by-default bootstrap template and run:

npm run ingestion:luminate:review-licensed-bootstrap -- --input <manifest.json>

Do not put credentials in the manifest.

## 5. Provisioned Data Share

Once licensed Snowflake access actually exists:
- record surface-specific access evidence
- record purchased-share object inventory evidence
- inspect VW_FACT_VALUES_DS for exact breakout values
- resolve/review distinct MRELG IDs for The Winning and Pieces
- rerun bootstrap CLI
- require ready-for-licensed-extraction-review before any live extraction

## 6. Hard rule

A demo, quote, email promise, technical sample, or account creation is not equivalent to an executed rights grant unless the existing FANDEX authorization contract expressly accepts that document type and its terms resolve every required right.
