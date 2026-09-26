# Luminate sales call / email checklist — FANDEX

Use this as the shortest live checklist during a Luminate sales conversation.

## Commercial product
- Which subscription/package includes Snowflake Music Data Share with album-level Product Sales?
- Is pricing quoted per organization, seat, dataset, territory, usage, or another model?
- What is the minimum contract term / annual commitment?
- Is historical depth package-dependent?

## Rights
- Is commercial FANDEX product use expressly permitted?
- May FANDEX store normalized observations derived from the licensed rows?
- May FANDEX publicly publish a derived metric without exposing raw Luminate rows?
- Is attribution required?
- Does public derived-metric publication require pre-approval?
- What happens to stored normalized observations and already-published derived outputs after termination?

## Data
- Does the purchased share include VW_DAILY_FACT_MRELG_DETAIL_DS?
- Does it include VW_MUSICAL_RELEASE_GROUP_DS and VW_FACT_VALUES_DS?
- Are US and/or CA physical Product Sales included?
- Is history available for IU / Pieces (2021-12-29) and The Winning (2024-02-20)?
- Can Luminate confirm provider-native MRELG_IDs for both releases?
- Are REPORTED_QUANTITY, TRANSACTION_TYPE, REPORT_DATE, PRODUCT_FORMAT, COUNTRY_CODE and MODIFIED_AT available?

## Semantics
- Confirm REPORTED_QUANTITY vs QUANTITY vs EQUIVALENT_QUANTITY.
- Confirm S / R / CMA meanings for physical Product Sales.
- Confirm correction/restatement handling and MODIFIED_AT.
- Confirm REPORT_DATE semantics for physical storefront vs online sales.

## Onboarding
- What Snowflake account/cloud/region information is needed?
- Can we validate schema/sample access before production use?
- Who is the technical contact after contract signature?
- Can Luminate provide the purchased-share object inventory in writing?
