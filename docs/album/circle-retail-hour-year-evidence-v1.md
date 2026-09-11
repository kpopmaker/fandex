# Circle Retail Hourly + Yearly Direct Evidence v1

## Status

```text
provider = circle-chart
capability = retail-album
hourlyRawQualified = true
yearlyRawQualified = true
adapterHourQualified = true
adapterYearQualified = true
liveCallsAllowed = false
productionAllowed = false
```

This packet records two bounded public-direct probes. It does not authorize recurring collection, persistence, feature bridging, or Production use.

## Probe runs

```text
33419496120
  official Hourly JavaScript/helper inspection
  Yearly direct retail_list request

33419576107
  direct retail_hour request using values returned by hour_time
```

## Yearly contract

Direct request:

```text
POST /data/api/chart/retail_list
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest

termGbn = year
yyyymmdd = 2025
```

Observed response:

```text
HTTP = 200
Content-Type = application/json
root keys = FormToMap, List, ResultStatus
ResultStatus = OK
List = numeric-keyed object
rows = 50
```

Observed first-row fields included:

```text
Album
Artist
Barcode
De_company_name
rowSum
KSum
ESum
RankInt
RankOrder
RankStatus
YYYY
K_m1 ... K_m12
E_m1 ... E_m12
```

Direct sample:

```text
Album = KARMA
Artist = Stray Kids (스트레이 키즈)
Barcode = 8809954227851
rowSum = 1095914
RankInt = 1
YYYY = 2025
```

Therefore the Yearly adapter contract is:

```text
endpoint = retail_list
timeframe = year
providerPeriod = year:YYYY
quantity = rowSum
SKU identity = Barcode
```

Yearly does not require a new quantity semantic: `rowSum` remains the official Retail `Sales / 판매량` field already qualified by the public renderer evidence.

## Hourly request discovery

The official Retail page JavaScript uses:

```text
POST /data/api/chart_func/retail/hour_time
  termGbn = hour
```

The successful helper response directly returned:

```text
ResultStatus = OK
YYYYMMDD = 20260831
Hour_Start = 0
Hour_End = 23
Hour_Now = 2
Hour_Range = 0 ... 23
ListType = 전일22시
```

The same official page then calls:

```text
POST /data/api/chart/retail_hour

yyyymmdd
HourRange
ListType
thisHour
```

The FANDEX bounded probe copied those provider-returned helper values rather than inventing them.

## Direct Hourly response

Request used:

```text
yyyymmdd = 20260831
HourRange = 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23
ListType = 전일22시
thisHour = 23
```

Observed:

```text
HTTP = 200
Content-Type = application/json
root keys = FormToMap, List, ResultStatus
ResultStatus = OK
List = numeric-keyed object
rows = 50
```

Observed row fields included:

```text
Album
Artist
CalIcon
CalPer
CalRank
De_company_name
rowSum
KSum
ESum
RankInt
RankStatus
YYYYMMDD
K_0 ... K_23
E_0 ... E_23
```

Direct sample:

```text
Album = GREENGREEN
Artist = CORTIS (코르티스)
rowSum = 21261
KSum = 18842
ESum = 2419
RankInt = 1
YYYYMMDD = 20260831
Barcode = not exposed in the observed Hourly row
```

## Hourly identity distinction

The directly observed Hourly response does **not** expose `Barcode`.

Therefore:

```text
Day/Week/Month/Year
  Barcode required by the current Circle adapter

Hour
  Barcode = null is accepted
  providerSkuId = null
```

Hourly rows still require strong reviewed FANDEX Artist + Release reconciliation before a `DirectAlbumObservation` is emitted.

This prevents FANDEX from inventing a provider SKU from Artist/Album text while still allowing the native Hourly period-sales signal to be normalized.

## Hourly provider period

The selected hour is part of the request rather than a dedicated observed row field.

FANDEX preserves the request identity as:

```text
hour:YYYYMMDD-HH
```

For the directly tested example:

```text
hour:20260831-23
```

The row must still match the request `YYYYMMDD`. FANDEX does not derive an hour from `K_*`, `E_*`, `CalPer`, or another unqualified field.

## Adapter impact

`CircleRetailAdapter v1` now supports:

```text
hour
day
week
month
year
```

Request routing:

```text
hour
  -> /data/api/chart/retail_hour

day/week/month/year
  -> /data/api/chart/retail_list
```

Quantity remains:

```text
rowSum -> period-sale physical-units
```

Explicit non-mappings remain unchanged:

```text
KSum / ESum are not reconstructed into FANDEX sales
RankInt / RankOrder are not sales
raw Artist / Album text are not provider-native IDs
Barcode is not a FANDEX Release ID
```

## Provider evidence impact

The historical/native-period capability evidence now covers all five public Retail timeframes:

```text
hour
day
week
month
year
```

The SKU capability remains qualified with an explicit timeframe limitation: Barcode was observed in non-Hour `retail_list` rows and was not observed in the tested Hourly `retail_hour` row.

The remaining technical blocker narrows to:

```text
revision-and-rate-limit-qualification-required
```

Independent rights/authorization blocker remains:

```text
storage-and-publication-rights-review-required
```

## Decision boundary

```text
Hourly request/response = PASS
Yearly request/response = PASS
Hourly adapter path = PASS
Yearly adapter path = PASS
Recurring live collection = NO
Production = NO
Feature bridge = CLOSED
```

Next technical gate:

```text
1. revision / supersession reconciliation
2. conservative rate-limit / throttling observation
```

Do not intentionally hammer Circle to force a 429 response.
