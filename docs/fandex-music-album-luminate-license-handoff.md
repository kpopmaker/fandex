# FANDEX musicAlbumPoint — Luminate License/Data Share Handoff

Status: research handoff packet
Checked against public Luminate documentation: 2026-09-18
Product Production actual: 0/7

## Purpose

This packet is the operational boundary between the internally completed FANDEX `musicAlbumPoint` Luminate path and the external licensing/data-access work that has not yet occurred.

It does not authorize use of Luminate data. It does not replace legal review, an executed order form/separate writing, or licensed Data Share access.

## Current external entrypoints

- Terms of Use: https://luminatedata.com/terms-of-use/
- Music Data Share onboarding: https://docs.luminatedata.com/docs/onboarding-documentation
- Developer Hub: https://docs.luminatedata.com/
- Sales/demo entrypoint: https://luminatedata.com/demo-request/
- Support overview for API/Data Share: https://support.luminatedata.com/portal/en/kb/articles/developer-hub

Public Luminate documentation states that Music Data Share is delivered through permissioned read-only Snowflake views. API and Snowflake access require subscriptions. The public Terms of Use were last updated in March 2026 and make confidential internal business use the default permitted use unless another use is expressly permitted in an order form or separate writing.

## Do not proceed to licensed extraction until all items below are resolved

### 1. Executed agreement evidence

Record a stable internal evidence ID for the executed order form or separate writing.

The agreement must expressly cover the FANDEX use actually planned. The bootstrap manifest must not use `subscription-only` as proof of FANDEX public-product rights.

Required grant decisions:

- physical Product Sales included
- explicit authorized territory: US and/or CA
- Snowflake Music Data Share access in scope
- recurring programmatic read/query use
- normalized observation storage
- retention during the license term
- commercial use in the FANDEX product
- public publication of the derived FANDEX metric
- post-termination handling of source data and provider-derived output

For the current derived-metric-only path, FANDEX does not request raw Luminate payload redistribution. Public ranking/benchmarking rights are not required unless the public output mode changes to comparative ranking/benchmarking.

### 2. Post-termination policy

Choose exactly one resolved policy and retain evidence:

- `retain-specified-derived-output-under-survival-right`
- `delete-source-and-retract-provider-derived-output`

Do not leave this as `unresolved`.

### 3. Data Share scope evidence

After access is granted, retain evidence that the purchased share actually includes the required views:

- `VW_DAILY_FACT_MRELG_DETAIL_DS`
- `VW_MUSICAL_RELEASE_GROUP_DS`
- `VW_FACT_VALUES_DS`

The generic statement that API or Data Share access is available is not enough. FANDEX requires surface-specific Snowflake Data Share evidence plus the purchased-share object inventory.

### 4. Provider-native release identity review

Resolve and review distinct Luminate `MRELG_ID` values for:

- current: IU — `The Winning` — 2024-02-20
- first baseline candidate: IU — `Pieces` — 2021-12-29

Review requires title + artist + release date + provider-native MRELG ID. Barcodes are edition cross-check evidence only and cannot independently resolve the release group.

Known cross-check barcodes:

- The Winning standard/U win/I win family: `8804775368752`
- The Winning Special ver.: `8804775368769`
- Pieces: `8804775236938`

The two releases must not resolve to the same MRELG ID.

### 5. Breakout values from the licensed share

Read the actual values from `VW_FACT_VALUES_DS`; do not guess strings from public documentation.

Capture the exact purchased-share values for:

- metric category = Product Sales
- distribution channel = physical
- purchase method = online
- purchase method = storefront
- all physical product formats permitted for the release-total lane

These raw values are entered into the bootstrap manifest. The review CLI recomputes the breakout evidence digest itself.

## Bootstrap manifest workflow

Copy:

`docs/examples/iu-luminate-licensed-bootstrap.template.json`

Fill only evidence/configuration values. Do not put credentials, passwords, API keys, tokens, private keys, connection strings, or database URLs in this file.

Run:

`npm run ingestion:luminate:review-licensed-bootstrap -- --input <manifest.json>`

A valid result must be:

`ready-for-licensed-extraction-review`

The command rebuilds provider-identity decisions and breakout digests rather than trusting caller-supplied resolved state.

When ready, it emits exactly two same-territory extraction plans:

1. The Winning: 2024-02-20 through 2024-02-26
2. Pieces: 2021-12-29 through 2022-01-04

## Data extraction boundary

Use the album-level detail view:

`VW_DAILY_FACT_MRELG_DETAIL_DS`

The FANDEX primary anchor uses:

- `REPORTED_QUANTITY`
- transaction types `S` and `R`
- requested US or CA lane
- release-relative first-week `REPORT_DATE` window
- physical formats only

Do not substitute:

- modeled `QUANTITY`
- `EQUIVALENT_QUANTITY`
- calendar-week chart totals
- shipment units
- rank/index values

`CMA` is excluded from the physical primary anchor.

Changed source rowsets create a new revision snapshot. An unchanged source rowset is a no-op.

## Storage and review sequence

After licensed extraction:

1. build the canonical direct observation
2. run the existing Luminate intake gate
3. store through the append-only research writer
4. read back through the one-read Neon stored-observation reader
5. resolve revision head
6. normalize The Winning against the newest comparable eligible baseline
7. run the research-only production-review gate

For the initial Golden path, stored observations must trace to the same current grant snapshot. The stored `write_grant_digest` must exactly match the digest recomputed from the current bootstrap grant.

## Hard stop conditions

Do not promote if any of these remain true:

- no executed order form/separate writing
- public derived-metric publication right unresolved
- commercial FANDEX use unresolved
- Data Share surface not explicitly in scope
- required share views missing
- MRELG IDs unresolved or reused across releases
- breakout values guessed rather than observed from the licensed share
- current or baseline observation missing
- territory/provider/format/scope mismatch
- stored authorization lineage differs from the current grant
- multiple write-grant snapshots require explicit review
- final review gate is blocked

## Current state

As of 2026-09-18:

- internal implementation path is complete through the research-only production-review gate
- no Luminate credential has been used
- no live Luminate API/Data Share query has been executed
- no Luminate observation is stored in main Neon
- Product Production actual remains 0/7
