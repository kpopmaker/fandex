# FANDEX musicAlbumPoint — Luminate Sales / Licensing Request Packet

Status: external outreach preparation only
Public documentation checked: 2026-09-18
Product Production actual: 0/7

## 1. Request objective

FANDEX is evaluating Luminate Music Data Share for a narrowly scoped commercial product use:

- construct: physical completed-purchase-class album sales reaction
- provider: Luminate
- access surface requested: Snowflake Music Data Share
- initial artist: IU
- initial releases:
  - The Winning — 2024-02-20
  - Pieces — 2021-12-29
- initial territory: one of US or CA
- initial output: derived metric only
- raw Luminate data redistribution: not requested
- public ranking/benchmarking: not requested for the initial output

The immediate technical goal is to retrieve authorized daily physical Product Sales activity for the release-relative first-week windows of the two releases above, store normalized observations, and publish only a derived FANDEX metric if the agreement expressly permits that use.

## 2. Public product/access facts already verified

Public Luminate documentation currently indicates:

- CONNECT is subscription-only.
- Music API and Snowflake access both require subscriptions.
- New customers are directed to an account representative / Request a Demo flow.
- Music Data Share is delivered as permissioned read-only Snowflake views.
- Data Share includes metadata, consumption, reference, and mapping data.
- Most Data Share views are updated once per day.
- view timestamps such as MODIFIED_AT are UTC.

Public documentation does not establish a self-service price sufficient for this FANDEX use case. Commercial terms must therefore be confirmed with Luminate sales/account representatives.

## 3. Product requested

Preferred:
- Luminate Music Data Share via Snowflake

Required data family:
- Music consumption
- Musical Release Group / album-level data
- Product Sales
- physical distribution channel
- US and/or CA
- daily detail activity

Required views for FANDEX onboarding:
- VW_DAILY_FACT_MRELG_DETAIL_DS
- VW_MUSICAL_RELEASE_GROUP_DS
- VW_FACT_VALUES_DS

Required mapping capability:
- product/barcode -> musical release -> musical release group

FANDEX does not need provider-registration/reporting services and is not asking to become a Luminate sales-reporting provider.

## 4. Rights that must be expressly answered in the order form or separate writing

Please answer each item explicitly as Allowed / Allowed with conditions / Not allowed.

1. Access to physical Product Sales data for the authorized US and/or CA territory.
2. Snowflake Music Data Share access for recurring programmatic queries.
3. Storage of normalized FANDEX observation records derived from licensed data.
4. Retention of those normalized observations during the active license term.
5. Commercial use of the normalized observations inside the FANDEX product.
6. Public publication of a derived FANDEX metric calculated from the licensed observations, without republishing raw Luminate payloads or raw row-level data.
7. Whether attribution or specific disclosure language is required for that public derived metric.
8. Whether any approval/review is required before the first public derived metric is launched.
9. Post-termination treatment of:
   - source Luminate data;
   - normalized observation records;
   - already-published derived metrics.
10. Whether derived output may survive termination, and if so under what conditions.
11. Whether public comparative ranking/benchmarking would require an additional grant if FANDEX later changes its output mode.

Not requested for the initial FANDEX path:
- raw Luminate row redistribution
- public republication of Luminate Content
- training an AI model on Luminate Content
- public ranking/benchmarking rights for the current derived-metric-only output

## 5. Data availability questions

Please confirm whether the purchased share provides historical daily data sufficient to query:

### Current release
- artist: IU
- release: The Winning
- release date: 2024-02-20
- required REPORT_DATE window: 2024-02-20 through 2024-02-26

### First baseline candidate
- artist: IU
- release: Pieces
- release date: 2021-12-29
- required REPORT_DATE window: 2021-12-29 through 2022-01-04

For each release, FANDEX needs:
- provider-native MRELG_ID
- title
- display artist
- release date
- physical Product Sales activity
- REPORT_DATE
- REPORTED_QUANTITY
- TRANSACTION_TYPE
- PRODUCT_FORMAT
- COUNTRY_CODE
- MODIFIED_AT

Please confirm the earliest historical date available in the proposed Music Data Share product and whether the 2021 and 2024 windows above are included.

## 6. Consumption semantics questions

FANDEX will not assume undocumented semantics. Please confirm:

1. In VW_DAILY_FACT_MRELG_DETAIL_DS, is REPORTED_QUANTITY the provider-reported quantity before Luminate modeling?
2. Is QUANTITY a modeled quantity and therefore distinct from REPORTED_QUANTITY?
3. Is EQUIVALENT_QUANTITY an equivalent/model-derived measure distinct from raw reported physical units?
4. For physical Product Sales, do TRANSACTION_TYPE values S and R represent sale and return activity that should be aggregated together for a corrected net activity view?
5. Is CMA excluded from ordinary physical sales/returns and appropriate to exclude from a physical completed-purchase primary anchor?
6. When historical rows are corrected, should consumers re-aggregate all related activity for the affected REPORT_DATE/timeframe rather than overwrite a prior row?
7. Does MODIFIED_AT identify the modification timestamp needed to detect/restatement changes?
8. Is REPORT_DATE the appropriate date basis for the documented physical storefront/online Product Sales activity in this view?

## 7. Purchased-share object inventory questions

Before FANDEX treats onboarding as technically ready, please provide or permit verification of the exact purchased-share object inventory.

Required:
- VW_DAILY_FACT_MRELG_DETAIL_DS
- VW_MUSICAL_RELEASE_GROUP_DS
- VW_FACT_VALUES_DS

Also requested if included:
- VW_MR_MP_MAP_DS
- VW_MP_MREL_MAP_DS
- VW_MREL_MRELG_MAP_DS

Please identify any equivalent/replacement view names if the purchased product uses a different object set.

## 8. Breakout-value questions

FANDEX intentionally does not hardcode public-documentation labels as licensed query values.

After access is granted, FANDEX needs to resolve the exact values available in VW_FACT_VALUES_DS for:
- Product Sales metric category
- physical distribution channel
- online purchase method
- storefront purchase method
- physical product formats applicable to album release totals

Please confirm whether the proposed share contains these values for the requested US/CA scope.

## 9. Commercial / onboarding questions

Please provide:

- subscription/product name required for this Data Share scope
- minimum contract term
- pricing model and minimum annual commitment, if applicable
- whether Snowflake Data Share access has an additional fee
- whether historical data depth changes by package/tier
- expected onboarding sequence
- whether a sample/schema validation session can be completed before full production use
- whether Luminate supplies the Snowflake share directly to an existing customer Snowflake account
- any supported cloud/region requirements or cross-region considerations
- account/support contact for Data Share setup
- required attribution or branding terms
- renewal and termination notice requirements

No price assumption should be made inside FANDEX until a written commercial proposal is received.

## 10. Evidence FANDEX should retain internally

Do not place credentials in the FANDEX research manifest.

Retain stable evidence identifiers for:
- executed order form or separate writing
- active-license state
- authorized territories
- explicit Snowflake Data Share scope
- public derived-metric publication right
- commercial product-use right
- storage/retention rights
- post-termination policy
- purchased-share object inventory
- reviewed MRELG IDs
- observed VW_FACT_VALUES_DS breakouts

Credentials, tokens, keys, passwords, connection strings and private keys stay outside the research evidence packet.

## 11. Acceptance boundary

The sales/licensing packet is complete only when the written agreement and provisioned share allow the existing FANDEX bootstrap CLI to return:

ready-for-licensed-extraction-review

Until then:
- no live Luminate extraction
- no Luminate observation write
- no Product Production promotion
- no methodology LOCK
- Product Production actual remains 0/7
