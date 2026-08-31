# Hanteo Album Direct Response Evidence v1

## Scope

This packet records directly observed Hanteo Album Chart public endpoint behavior for FANDEX Album provider evaluation.

It qualifies only the contracts directly observed in bounded probes. Historical exact-copy API selection remains pending and is not inferred from route patterns.

## Current state

```text
provider = hanteo-chart
role = secondary-verification-provider + primary-fallback-candidate
currentContract = qualified for Daily / Weekly / Monthly
historicalExactCopiesApi = PENDING
liveCollection = false
production = false
commercialRightsCleared = false
```

## Direct endpoint base

```text
https://api.hanteochart.io
```

## Request contract

Direct probes confirmed GET and a required positive integer `limit` query parameter.

```text
GET /v4/ranking/list/ALBUM/DAILY/BASIC?limit=20
GET /v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=20
GET /v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=20
```

Initial Weekly request without `limit` returned HTTP 200 JSON with provider code 602 and message indicating that required int parameter `limit` was missing.

Successful current requests return provider code 100.

## Response contract

```text
root:
  code
  message
  resultData

resultData:
  resultDatetime
  list[]
```

Observed row fields include:

```text
genre
rank
rankDiff
targetIdx
targetImg
targetName
value
isDeadLine
detail
regDate
status
```

Observed detail fields include:

```text
artistGlobalName
badge
supplyPrice
salesVolume
entertainment
artistIdx
artistName
saleDate
```

## Quantity semantic qualification

Critical rule:

```text
value != sales copies
```

A directly observed Weekly first row for ALPHA DRIVE ONE `UNBREAKABLE : 少年BEAST` returned:

```text
value = 1,206,155.8
detail.salesVolume = 1,139,747
```

Hanteo's official weekly article for the same chart period reports:

```text
Album Index = 1,206,155.80
sales = 1,139,747 copies
```

Therefore the qualified mapping is:

```text
value
→ Album Index
→ provider index only
→ never physical-units

detail.salesVolume
→ physical album sales copies
→ quantity candidate for FANDEX Album Core
```

No rank/index fallback to copies is allowed.

## Current timeframe probes

### Weekly

Probe run: `33423664416`

```text
GET /v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=20
HTTP 200
code = 100
resultDatetime = 집계 기준 (KST) : 2026.08.24 ~ 2026.08.30
rows = 20
```

Example first row:

```text
targetIdx = 900562834
targetName = UNBREAKABLE : 少年BEAST
value = 1206155.8
artistIdx = 76154
artistGlobalName = ALPHA DRIVE ONE
salesVolume = 1139747
```

### Daily

Probe run: `33423845891`

```text
GET /v4/ranking/list/ALBUM/DAILY/BASIC?limit=20
HTTP 200
code = 100
resultDatetime = 집계 기준 (KST) : 2026.08.30
rows = 20
```

Example:

```text
targetIdx = 900558211
targetName = GREENGREEN
value = 48670.26
artistIdx = 75070
artistGlobalName = CORTIS
salesVolume = 57841
```

### Monthly

Probe run: `33423845891`

```text
GET /v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=20
HTTP 200
code = 100
resultDatetime = 집계 기준 (KST) : 2026.07.01 ~ 2026.07.31
rows = 20
```

Example:

```text
targetIdx = 900561366
targetName = NO LABELS: PART 02
value = 921702.6
artistIdx = 48768
artistGlobalName = YEONJUN
salesVolume = 751769
```

## Native identity candidates

Direct rows expose:

```text
targetIdx
artistIdx
```

Current interpretation:

```text
targetIdx = provider target/item/release identity candidate
artistIdx = provider artist identity candidate
```

These are provider-native candidates, not FANDEX IDs.

No Barcode/SKU field was directly observed in the current Hanteo rows.

A separate stable provider edition/SKU identity contract remains unqualified.

## Historical status

Official Hanteo historical chart pages are publicly accessible and preserve historical rank/identity context, for example Weekly `2026-W30`.

The historical page SSR payload observed in bounded research contained historical chart identity/rank data but did not expose the API `value` / `salesVolume` fields needed for exact-copy ingestion.

Attempts to inspect the current page JS chunk did not reveal a directly usable historical selector contract.

Therefore:

```text
historicalPublicPage = PASS
historicalExactCopiesApiSelector = UNKNOWN / PENDING
```

Do not invent a `date`, `period`, `issueId`, timestamp, or other historical parameter.

## Discovery implementation boundary

`hanteoAlbumDiscovery.ts` supports only directly verified current request planning:

```text
day
week
month
```

Historical mode throws `hanteo-historical-selector-pending`.

All request plans remain:

```text
networkAllowed = false
```

The module decodes and qualifies raw evidence but does not automatically create a `DirectAlbumObservation`, enable live collection, or bridge data into Production features.

## Rights / authorization

Public technical reachability does not establish storage, automation, commercial-use, derived-publication, or redistribution rights.

Existing Hanteo public material also contains explicit copyright restrictions around sales data.

```text
commercialRightsCleared = false
rightsRisk = HIGH
```

## Evidence runs

```text
33423596518  initial Weekly request; required `limit` discovered
33423664416  successful Weekly direct response
33423845891  successful Daily + Monthly direct responses and historical page inspection
33424005211  current historical page chunk inspection; selector remained unresolved
```

## Current technical verdict

```text
native current exact copies = PASS
Album Index / copies separation = PASS
Daily current = PASS
Weekly current = PASS
Monthly current = PASS
provider target identity candidate = PASS
provider artist identity candidate = PASS
historical exact copies API = PENDING
```

Hanteo remains a challenger/secondary provider until the historical gate is qualified and the same final comparison rules are applied against Circle Retail.
