# Circle Retail Direct Response Evidence Packet v1

## Status

- provider: `circle-chart`
- capability: `retail-album`
- branch: `integration/album-circle-retail-discovery`
- parent discovery PR: `#130`
- decision state: `circle-retail-request-quantity-history-and-operational-core-qualified`
- direct raw response observed: `true`
- production/live collector authorized by this packet: `false`

## Official semantic evidence

Circle Retail Album Chart is a distinct Circle capability. The official public page describes its ranking system as retail-store sales of offline album products and exposes Hourly, Daily, Weekly, Monthly, and Yearly views.

Confirmed historical public-page patterns include:

```text
/page_chart/retail.circle?termGbn=day&yyyymmdd=YYYYMMDD
/page_chart/retail.circle?termGbn=week&yyyymmdd=...
/page_chart/retail.circle?termGbn=month&yyyymmdd=YYYYMM
```

Semantic state:

```text
retail-sales-semantic = PASS
unit = physical retail copies / sales quantity
rank != sales
Circle Album Chart != Circle Retail Album Chart
```

## Direct official-page request contract

Branch-only one-shot GitHub Actions probes fetched the official Circle Retail page and inspected the inline JavaScript used by that page itself.

The official page directly declares these AJAX calls:

```text
POST /data/api/chart_func/retail/default_value
  form: termGbn

POST /data/api/chart_func/retail/hour_time
  form: termGbn=hour

POST /data/api/chart/retail_list
  form: termGbn, yyyymmdd

POST /data/api/chart/retail_hour
  form: yyyymmdd, HourRange, ListType, thisHour
```

Evidence class:

```text
source = Circle official public page inline JavaScript
evidence = DIRECT / PUBLIC / STRONG
HTTP method = POST
```

## Direct `retail_list` response

The browser request shape was reproduced against:

```text
POST https://circlechart.kr/data/api/chart/retail_list
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest
form fields:
  termGbn
  yyyymmdd
```

Observed response:

```text
HTTP = 200
Content-Type = application/json
root type = object
root keys = FormToMap, List, ResultStatus
ResultStatus = OK
```

`List` is a numeric-keyed object:

```text
List = {
  "0": { ...row... },
  "1": { ...row... },
  ...
}
```

FANDEX discovery row locator:

```text
$.List{values}
```

The tested published Daily response contained 50 rows, ranks 1 through 50.

## Direct row schema

Observed Daily row fields included:

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
RankHigh
RankContinue
RankStatus
YYYYMMDD
save_name
sys_date
K_0 ... K_23
E_0 ... E_23
```

The upstream returned these values as strings, including quantity/rank fields.

Example directly observed row:

```text
Album = LEMONADE - The 2nd Album
Artist = aespa
Barcode = 8804775469824
rowSum = 321155
KSum = 255451
ESum = 65704
RankInt = 1
YYYYMMDD = 20260529
```

Observed arithmetic:

```text
KSum + ESum = rowSum
255451 + 65704 = 321155
```

This arithmetic relationship is observed fact only. FANDEX does not assign an unverified territory/business meaning to `KSum` or `ESum`, and the adapter never reconstructs sales by summing them.

## Native quantity field verification

The official Circle Retail page rendering code directly performs:

```text
Row_RowSum = AddComma(res.List[i]["rowSum"])
```

and renders that value under the desktop `Sales` column and mobile label:

```text
판매량 : ${Row_RowSum}
```

Therefore:

```text
native quantity field = rowSum
quantity semantic = Circle Retail sales quantity
unit = copies
quantitySemanticState = verified-retail-copies
```

Evidence class:

```text
DIRECT / PUBLIC / STRONG
```

## Native identity fields

Directly observed:

```text
artist text = Artist
album/product text = Album
barcode = Barcode
distributor text = De_company_name
```

`Barcode` is preserved as provider SKU/product identity. It is not converted directly into a FANDEX Release ID.

Still unobserved in the tested row:

```text
provider-native artist ID
provider-native album/release ID
provider-native edition ID separate from Barcode
```

Identity state:

```text
Barcode / SKU identity = PASS for provider SKU preservation
Artist text = DIRECT
Album text = DIRECT
stable artist ID = UNKNOWN
stable album/release ID = UNKNOWN
```

## Historical period response validation

The same official endpoint was directly tested for Daily, Weekly, and Monthly historical periods.

### Daily

```text
termGbn = day
yyyymmdd = 20260529
HTTP = 200
ResultStatus = OK
rows = 50
period field = YYYYMMDD
```

### Weekly

```text
termGbn = week
yyyymmdd = 20250223
HTTP = 200
ResultStatus = OK
rows = 50
period field = YYYYMMDD
```

### Monthly

```text
termGbn = month
yyyymmdd = 202206
HTTP = 200
ResultStatus = OK
rows = 50
period field = YYYYMM
```

Core fields were stable across directly tested Daily/Weekly/Monthly responses, while component fields differed by timeframe.

Historical state:

```text
historical Daily native request = PASS
historical Weekly native request = PASS
historical Monthly native request = PASS
```

## Operational edge qualification

Operational details are recorded in:

```text
docs/album/circle-retail-operational-evidence-v1.md
lib/alternative-evidence/circleRetailOperationalSemantics.ts
```

Directly observed bounded behavior:

```text
invalid calendar date 20260230
future date 20991231
prelaunch candidate 20000101

all ->
HTTP 200
ResultStatus = Error
List absent
```

The provider therefore collapses those causes into one coarse period-error shape. FANDEX records:

```text
provider-period-error
causeSpecificity = collapsed-provider-error
```

A known published request also succeeded without Cookie and without Referer:

```text
HTTP 200
ResultStatus = OK
rows = 50
ranks = 1..50
```

Thus no strict Cookie/Referer requirement was observed for the tested request. This remains an observation, not a permanent provider guarantee.

## Published UI Top 50 completeness

Official page source shows one non-hourly AJAX request:

```text
POST /data/api/chart/retail_list
payload = { termGbn, yyyymmdd }
```

The official renderer uses:

```text
for (var i in res.List)
```

and renders every returned row. No page/pageSize/offset/limit/cursor/paging/more parameter or renderer branch was observed in that request/render path.

Since the directly tested published response contains contiguous ranks 1 through 50, FANDEX may classify that shape as:

```text
published-ui-top50-complete
```

This only means complete reproduction of the official displayed Top 50 chart. It does not establish total market or provider-universe transaction completeness.

## Pagination state

For the official public Retail UI contract:

```text
request pagination parameters observed = false
renderer pagination branch observed = false
published response = ranks 1..50
```

Therefore FANDEX does not need a page loop to reproduce the tested official public Top 50 chart.

It must not extrapolate this into a claim that only 50 album products existed or sold in the provider universe.

## Authentication/session observation

Earlier successful probes reused ordinary page context. A later bounded probe repeated a known-period request without Cookie or Referer and received the same OK/50-row shape.

Therefore:

```text
login/API credential required = not observed
strict Cookie required = not observed
strict Referer required = not observed
```

The conservative request contract continues to use standard form POST semantics and `X-Requested-With`.

## Remaining direct-response blockers

The primary request/schema/quantity/history and operational core are qualified. Remaining technical items before any recurring/live collector decision:

```text
1. direct hourly response schema
2. Yearly raw response schema
3. revision/supersession implementation qualification
4. rate-limit/throttling policy by conservative observation only
```

Do not hammer the provider to manufacture a rate-limit event.

## Promotion state

```text
semanticQualified = true
directEndpointReachability = PASS
HTTPMethod = POST
directResponseStructured = PASS
rowLocator = $.List{values}
nativeQuantityField = rowSum
quantitySemanticVerified = true
artistField = Artist
albumField = Album
skuIdentityField = Barcode
historicalDaily = PASS
historicalWeekly = PASS
historicalMonthly = PASS
providerPeriodErrorShape = PASS_COARSE
publishedUiTop50Completeness = PASS
strictCookieRequirementObserved = false
strictRefererRequirementObserved = false
boundedResearchCollectorCandidate = true
productionCollectorAuthorizedByThisPacket = false
```

## Evidence execution record

```text
33411016099
  official page AJAX contract inspection

33411214392
  direct retail_list POST / root response inspection

33411306685
  List object-of-rows / row schema inspection

33411551980
  rowSum rendering cross-check + Daily/Weekly/Monthly history

33415501169
  invalid/future/prelaunch + Cookie/Referer bounded probe

33415588079
  official UI render/completeness inspection
```

A separate earlier run failed before any provider request due to probe-script syntax and is not provider failure evidence.

## Code validation record

```text
33411943963
  Discovery tests + typecheck = PASS

33413534263
  Discovery + Adapter tests + typecheck = PASS

33414514375
  Provider Evidence + Discovery + Adapter tests + typecheck = PASS

33415892686
  Operational + Provider Evidence + Discovery + Adapter tests + typecheck = PASS
```

Temporary workflows were removed after validation.

## Decision boundary

The current evidence is sufficient for:

```text
Discovery qualified
Adapter qualified
native period-sales capability qualified
historical query capability qualified
SKU identity capability qualified
operational core qualified
bounded research collector candidate
```

It is not sufficient to activate recurring/live collection, persistence, feature bridging, or Production use.
