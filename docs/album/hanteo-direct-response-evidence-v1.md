# Hanteo Album Direct Response Evidence v1

## Scope

This packet records directly observed Hanteo Album Chart public endpoint behavior for FANDEX Album provider evaluation. Current exact-copy acquisition is qualified for Daily / Weekly / Monthly. Historical exact-copy public selection remains unverified and is not inferred from route patterns or hidden-provider assumptions.

## Current state

```text
provider = hanteo-chart
role = secondary-verification-provider + primary-fallback-candidate
currentExactCopies = PASS
currentAdapter = QUALIFIED
historicalRankHistory = PASS
historicalExactCopiesPublicSelector = UNVERIFIED
liveCollection = false
featureBridge = closed
production = false
commercialRightsCleared = false
```

## Direct current request contract

```text
https://api.hanteochart.io

GET /v4/ranking/list/ALBUM/DAILY/BASIC?limit=N
GET /v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=N
GET /v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=N
```

`limit` is required. An initial Weekly request without it returned HTTP 200 JSON with provider code `602` and a missing-required-limit message. Successful requests return provider code `100`.

Observed response shape:

```text
code
message
resultData.resultDatetime
resultData.list[]
```

Observed row/detail fields include:

```text
rank
targetIdx
targetName
value
detail.artistIdx
detail.artistGlobalName
detail.salesVolume
detail.supplyPrice
detail.saleDate
regDate
```

## Quantity semantic qualification

Critical rule:

```text
row.value != sales copies
```

A directly observed Weekly first row for ALPHA DRIVE ONE `UNBREAKABLE : 少年BEAST` returned:

```text
value = 1,206,155.8
detail.salesVolume = 1,139,747
```

Hanteo official reporting for the same chart item/period reports the same values separately as Album Index and sales copies. Therefore:

```text
row.value
→ Album Index
→ provider index only
→ never physical-units

detail.salesVolume
→ physical album sales copies
→ qualified current FANDEX period-sale quantity
```

No rank/index fallback to copies is allowed.

## Current timeframe qualification

```text
Daily   = PASS
Weekly  = PASS
Monthly = PASS
```

Direct runs:

```text
33423596518  initial Weekly request; required limit discovered
33423664416  Weekly direct response / schema / quantity fields PASS
33423845891  Daily + Monthly direct responses PASS
```

Native KST period labels are preserved from `resultData.resultDatetime` rather than reconstructed from local calendar assumptions.

## Native identity evidence

Direct rows expose:

```text
targetIdx
artistIdx
```

Current interpretation:

```text
artistIdx = qualified provider artist identity

targetIdx = stable provider chart-target/item/release candidate
            retained in observation
            exact release-vs-edition level still unresolved
```

These are not FANDEX IDs. No Barcode/SKU or edition ID is invented.

Evidence-linked capability state after the current-only adapter:

```text
supportsNativePeriodSales = true
supportsArtistIdentity = true
supportsHistoricalQueries = unknown
supportsReleaseIdentity = unknown
supportsEditionIdentity = unknown
supportsSkuIdentity = unknown
```

The conservative base `HANTEO_PROVIDER_DESCRIPTOR` remains unchanged/default-off.

## Historical exact-copy investigation

### Public historical rank pages

Historical pages such as Weekly `2026-W30` are public and preserve historical rank/title/provider identity context.

Direct page inspection found the historical page props explicitly configured as:

```text
showSales = false
rankOnly = true
apiType = album
term = weekly
genre = basic
currentPeriod = 2026-W30
```

Therefore the public historical page is intentionally a rank-history surface in the observed implementation; it does not expose the exact-copy fields needed for ingestion.

### Same-site chart-sales route

Static asset inspection found the web UI fetch pattern:

```text
GET /api/chart-sales?type=<apiType>&term=<term>&genre=<genre>
```

and client-side joining:

```text
sales[].targetIdx -> salesVolume
```

A bounded probe confirmed the route returns `sales` rows, but changing Referer from historical Week 30 to Week 29 returned the same latest sales list. Thus:

```text
/api/chart-sales = current sales helper in observed behavior
/api/chart-sales != qualified historical selector
```

No period selector is inferred from Referer.

### Public API docs check

Bounded 5-second probes were made against common public documentation paths:

```text
/v3/api-docs
/swagger-ui/index.html
/openapi.json
/api-docs
```

No usable API documentation response was obtained in those bounded probes. This does **not** establish that a private, undocumented, credentialed, or otherwise hidden historical contract does not exist; it only means no public historical exact-copy contract was directly qualified.

Relevant runs:

```text
33425415089  historical page asset scan; /api/chart-sales client logic found
33425610457  historical page rankOnly/showSales=false + Week30/Week29 sales-helper comparison
33425787804  bounded common public API-doc path probe; no usable docs contract recovered
```

Current historical verdict:

```text
historicalPublicPage = PASS
historicalRankHistory = PASS
historicalExactCopiesPublicWeb = NOT_EXPOSED_BY_OBSERVED_HISTORICAL_PAGE
historicalExactCopiesApiSelector = UNVERIFIED
```

Do not invent `date`, `period`, `issueId`, timestamp, Referer selection, or any other historical parameter.

## Current-only secondary adapter

`hanteoAlbumAdapter.ts` converts only directly qualified current responses into `DirectAlbumObservation` after strong reviewed FANDEX identity reconciliation.

Mapping:

```text
detail.salesVolume -> value
semantic           -> period-sale
unit               -> physical-units
artistIdx           -> providerArtistId
targetIdx           -> providerReleaseId candidate
providerSkuId       -> null
providerEditionId   -> null
```

Important: `targetIdx` is retained so Hanteo observations can be reconciled consistently, but the provider capability `supportsReleaseIdentity` remains `unknown` until the exact provider entity level is proven.

Adapter gates:

```text
FANDEX Artist = resolved + human-reviewed/provider-verified
FANDEX Release = resolved + human-reviewed/provider-verified
identity evidenceIds >= 1
historical exact copies = not eligible
live calls = false
feature bridge = false
```

Validation run:

```text
33426524892
npm ci = PASS
Hanteo Discovery + Adapter + Provider Evidence tests = PASS
TypeScript typecheck = PASS
```

Temporary probe/validation workflow was removed after validation.

## Primary-provider implication

Under the current Circle-vs-Hanteo hard gates:

```text
Hanteo current exact copies = PASS
Hanteo current Daily/Weekly/Monthly = PASS
Hanteo historical exact copies = NOT PASS / UNVERIFIED
```

Therefore Hanteo is qualified for **current secondary verification**, but has not passed the historical exact-copy hard gate required to replace Circle Retail as Album Primary.

```text
selectedPrimaryProvider = circle-retail   // unchanged
Hanteo role = secondary-verification-provider
Hanteo primaryEligibility = NOT_QUALIFIED_CURRENT_EVIDENCE
```

This is not a claim that Hanteo lacks all historical sales data internally; it is a claim that FANDEX has not directly qualified a public exact-copy historical acquisition contract.

## Rights / authorization

Public technical reachability does not establish storage, automation, commercial-use, publication, or redistribution rights.

```text
commercialRightsCleared = false
liveCollection = false
persistentStorage = false
production = false
```
