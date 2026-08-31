# Circle Retail Direct Response Evidence Packet v1

## Status

- provider: `circle-chart`
- capability: `retail-album`
- branch: `integration/album-circle-retail-discovery`
- parent discovery PR: `#130`
- decision state: `direct-response-partial-evidence`
- direct raw response observed: `false`

## Official evidence confirmed

Circle Retail Album Chart public pages expose Retail Album as a distinct capability and describe the ranking system as total sales of offline albums at retail stores. Public historical pages are confirmed for Daily, Weekly, and Monthly periods.

Confirmed public-page patterns:

```text
/page_chart/retail.circle?termGbn=day&yyyymmdd=YYYYMMDD
/page_chart/retail.circle?termGbn=week&yyyymmdd=...
/page_chart/retail.circle?termGbn=month&yyyymmdd=YYYYMM
```

The public Retail UI exposes:

```text
Hourly
Daily
Weekly
Monthly
Yearly
```

Semantic state:

```text
retail-sales-semantic = PASS
unit = copies-class / retail sales quantity
rank != sales
Circle Album Chart != Circle Retail Album Chart
```

## Reported public technical evidence

A removed third-party public wrapper (`hanteo-circle-chart-api` / `hanteo-circle-api`, v1.0.0) documents that it uses native JSON requests against public Hanteo/Circle web/XHR endpoints.

Reported Circle upstream base:

```text
https://circlechart.kr
```

Reported Retail issue helpers:

```text
/data/api/chart_func/retail/default_value
/data/api/chart_func/retail/hour_time
```

Reported wrapper behavior:

```text
Retail non-hourly -> default_value helper
Retail hourly     -> hour_time helper
Retail day/week/month/year historic override -> yyyymmdd
Retail hour historic override -> yyyymmdd + thisHour
```

The same wrapper exposes normalized routes:

```text
GET /v1/circle/retail/:timeframe
GET /v1/circle/retail/hour
```

with wrapper-side historic overrides:

```text
?yyyymmdd=
?thisHour=
```

This supports the existence of a structured upstream architecture, but does **not** prove the Circle-native row field names used for rank, quantity, artist, album, or provider IDs.

Evidence classification:

```text
helper paths = REPORTED-PUBLIC / MEDIUM-HIGH
native structured acquisition architecture = REPORTED-PUBLIC / HIGH
Circle-native HTTP method = UNKNOWN
Circle-native raw schema = UNKNOWN
Circle-native quantity field = UNKNOWN
Circle-native provider IDs = UNKNOWN
```

## Direct probe attempt

A direct HTTP probe was attempted from the current execution environment against:

```text
https://circlechart.kr/data/api/chart_func/retail/default_value
https://circlechart.kr/data/api/chart_func/retail/hour_time
https://circlechart.kr/page_chart/retail.circle?termGbn=day&yyyymmdd=20260529
```

The environment failed DNS resolution before any request reached Circle.

Observed failure class:

```text
execution-environment-network-unavailable
```

This is **not** evidence that Circle blocks the endpoint.

Therefore:

```text
directEndpointReachability = UNVERIFIED
httpMethod = UNKNOWN
contentType = UNKNOWN
responseRoot = UNKNOWN
rowPath = UNKNOWN
nativeQuantityField = UNKNOWN
providerItemIdField = UNKNOWN
pagination = UNKNOWN
```

## Promotion gate

Do not promote a discovery capture into `DirectAlbumObservation` until all mandatory items below are observed directly:

```text
1. working request method + URL
2. structured response
3. chart row path
4. native quantity candidate
5. official quantity cross-check
6. artist/title mapping
7. historical Daily query
8. missing/error behavior
```

Provider-native IDs, Weekly/Monthly native history, and Hourly may remain conditional during the first promotion decision.

## Current verdict

```text
semanticQualified = true
historicalPublicPageQualified = true
structuredUpstreamStronglyIndicated = true
directResponseContractQualified = false
quantitySemanticVerified = false
promotionToDirectAlbumObservation = false
```

Next action: run the discovery request from an environment with outbound DNS/network access and feed the raw response into `captureCircleRetailDiscovery`; verify the native quantity field only after matching it to an official Circle-visible retail copies value.
