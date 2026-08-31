# Circle Retail Direct Response Evidence Packet v1

## Status

- provider: `circle-chart`
- capability: `retail-album`
- branch: `integration/album-circle-retail-discovery`
- parent discovery PR: `#130`
- decision state: `circle-retail-quantity-contract-qualified-error-semantics-pending`
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

A branch-only one-shot GitHub Actions probe fetched the official Circle Retail page and inspected the inline JavaScript used by that page itself.

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

The earlier third-party wrapper evidence is no longer needed to establish the non-hourly method or chart endpoint, although it remains useful corroborating technical evidence.

## Direct `retail_list` response

The same branch-only probe then reproduced the official browser request shape against:

```text
POST https://circlechart.kr/data/api/chart/retail_list
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest
form fields:
  termGbn
  yyyymmdd
```

The probe first loaded the public Retail page and then reused ordinary browser context (`Referer` and the observed page cookie). No login credential, API key, CAPTCHA bypass, proxy rotation, or access-control circumvention was used.

Observed response:

```text
HTTP = 200
Content-Type = application/json
root type = object
root keys = FormToMap, List, ResultStatus
ResultStatus = OK
```

`List` is not a JSON array. It is a numeric-keyed object:

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

The tested Daily response contained 50 rows.

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
RankOrder = 1
YYYYMMDD = 20260529
```

Observed arithmetic:

```text
KSum + ESum = rowSum
255451 + 65704 = 321155
```

This arithmetic relationship is observed fact only. This packet does not assign an unverified territory/business meaning to `KSum` or `ESum`.

## Native quantity field verification

The official Circle Retail page rendering code directly performs:

```text
Row_RowSum = AddComma(res.List[i]["rowSum"])
```

and renders that value under both the desktop `Sales` column and the mobile Korean label:

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

This is stronger than inferring quantity from a field name: the official page itself maps `rowSum` to its displayed Sales/판매량 value.

## Native identity fields

Directly observed:

```text
artist text = Artist
album/product text = Album
barcode = Barcode
distributor text = De_company_name
```

`Barcode` is a strong provider-product/SKU identity candidate and should be preserved verbatim. It must not be converted directly into a FANDEX Release ID.

Still unobserved in the tested row:

```text
provider-native artist ID
provider-native album/release ID
provider-native edition ID separate from Barcode
```

Identity state:

```text
Barcode / SKU candidate = STRONG
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

Example first row:

```text
aespa / LEMONADE - The 2nd Album
rowSum = 321155
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

Example first row:

```text
ZEROBASEONE / BLUE PARADISE
Barcode = 8809704431361
rowSum = 392659
KSum = 362568
ESum = 30091
RankInt = 1
YYYYMMDD = 20250223
```

Weekly rows expose weekday component fields such as `K_Mon ... K_Sun` and `E_Mon ... E_Sun` instead of hourly/day-number components.

### Monthly

```text
termGbn = month
yyyymmdd = 202206
HTTP = 200
ResultStatus = OK
rows = 50
period field = YYYYMM
```

Example first row:

```text
방탄소년단 / Proof
Barcode = 8809848751103
rowSum = 1899573
KSum = 936247
ESum = 963326
RankInt = 1
```

Monthly rows expose day-of-month component fields such as `K_1 ... K_31` and `E_1 ... E_31`.

### Cross-period result

Core fields stable across the directly tested Daily/Weekly/Monthly responses:

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
```

Period-specific component fields differ by timeframe and must not be hard-coded as one universal row schema.

Historical state:

```text
historical Daily native request = PASS
historical Weekly native request = PASS
historical Monthly native request = PASS
```

## Authentication/session observation

The successful probe used the same ordinary sequence as a browser:

```text
GET public Retail page
then POST retail_list with Referer/X-Requested-With/form body
```

A public-page cookie was observed and forwarded.

Therefore:

```text
login/API credential required = not observed
browser-context acquisition = PASS
cookie strictly required = UNKNOWN
Referer strictly required = UNKNOWN
```

Do not remove browser context assumptions until a separate minimal request test proves they are unnecessary.

## Pagination/completeness

Each tested response returned 50 rows.

Still unresolved:

```text
whether 50 rows is the complete provider chart universe
whether pagination exists or is needed
whether additional rows can be requested
```

Do not infer `pagination = none` merely from one 50-row response.

## Remaining direct-response blockers

The primary request/schema/quantity contract is now directly observed. Remaining items before a live/production collector decision:

```text
1. invalid-period response semantics
2. future/not-published-period response semantics
3. empty valid response behavior
4. pagination/completeness behavior
5. rate-limit/throttling behavior (observe naturally; do not hammer)
6. direct hourly response schema
7. strict cookie/Referer requirement, if operationally relevant
```

## Promotion state

The Discovery layer may now verify a captured `rowSum` as `verified-retail-copies` when the evidence IDs point to the official semantic, official rendering, and direct response observations.

However this packet does not itself activate collection or bypass the existing provider safety gates.

```text
semanticQualified = true
historicalPublicPageQualified = true
directEndpointReachability = PASS
HTTPMethod = POST
directResponseStructured = PASS
rowLocator = $.List{values}
nativeQuantityField = rowSum
quantitySemanticVerified = true
artistField = Artist
albumField = Album
barcodeIdentityCandidate = Barcode
historicalDaily = PASS
historicalWeekly = PASS
historicalMonthly = PASS
errorSemanticsQualified = false
paginationQualified = false
hourlyRawQualified = false
productionCollectorAuthorizedByThisPacket = false
```

## Evidence execution record

Branch-only GitHub Actions probes used for this packet:

```text
run 33411016099
  official page AJAX contract inspection
  success

run 33411214392
  direct retail_list POST / root response inspection
  success

run 33411306685
  List object-of-rows / native row schema inspection
  success

run 33411551980
  rowSum Sales/판매량 rendering cross-check
  Daily/Weekly/Monthly direct historical response validation
  success
```

A separate run (`33411123806`) failed before any provider request because the probe script used invalid top-level `await`; it is an implementation syntax failure and is not provider failure evidence.

## Code validation record

After updating the Discovery implementation to match the directly observed Circle contract, a branch-only validation workflow executed:

```text
npm ci
npx tsx --test tests/circle-retail-discovery-v1.test.mts
npm run typecheck
```

The Circle discovery test step and TypeScript typecheck both completed successfully. The temporary validation/probe workflow was then removed from the branch so PR #130 does not retain a scheduled or persistent live-collection path.
