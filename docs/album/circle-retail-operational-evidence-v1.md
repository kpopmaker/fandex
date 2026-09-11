# Circle Retail Operational Edge Evidence v1

## Status

```text
provider = circle-chart
capability = retail-album
operationalContract = circle-retail-operational-v1
request/schema/quantity = qualified
operationalEdge1to5 = qualified-with-provider-error-collapse
boundedResearchCollectorCandidate = true
liveCallsAllowed = false
productionAllowed = false
```

This packet records bounded, low-frequency observations from the official public Circle Retail request flow. It does not authorize recurring collection, persistence, feature bridging, or Production use.

## Probe runs

```text
33415501169
  bounded response/error/context probe

33415588079
  public UI render/completeness inspection
```

Temporary workflow execution is removed after code validation.

## Published-period baseline

Tested request:

```text
POST /data/api/chart/retail_list
termGbn=day
yyyymmdd=20260529
```

Observed:

```text
HTTP = 200
Content-Type = application/json
ResultStatus = OK
List = numeric-keyed object
rowCount = 50
first rank = 1
last rank = 50
```

## Invalid / future / unavailable-period behavior

Three bounded probes were used:

```text
invalid calendar date = 20260230
future date = 20991231
prelaunch candidate = 20000101
```

All three returned the same provider shape:

```text
HTTP = 200
Content-Type = application/json
root = FormToMap, ResultStatus
ResultStatus = Error
List = absent
rowCount = 0
```

Therefore FANDEX must not pretend the provider itself distinguishes these causes.

Normalized operational result:

```text
provider-period-error
causeSpecificity = collapsed-provider-error
```

The caller may know that its own input was syntactically invalid, but the upstream payload does not separately encode `invalid`, `future`, and `not published` in the tested cases.

## Empty valid response

No naturally occurring `ResultStatus=OK` plus empty `List` was observed in these probes.

The operational contract nevertheless keeps it distinct as:

```text
empty-ok-response
```

so a future empty-but-valid response will not be coerced to Zero and will not be confused with `ResultStatus=Error`.

## Cookie / Referer requirement

A known published request was repeated without the public-page cookie and without a Referer header.

Observed:

```text
HTTP = 200
ResultStatus = OK
rowCount = 50
rank 1 ... 50
```

Therefore:

```text
strict cookie requirement observed = false
strict Referer requirement observed = false
```

This is an observed property of the tested public request, not a promise that the provider can never change its requirements.

`X-Requested-With` and the form Content-Type remained in the tested minimal request and are retained as the conservative request contract.

## Published chart completeness / pagination

The official page source was inspected around both the AJAX call and `ChartTable_HTML_List` renderer.

Observed AJAX contract:

```text
POST /data/api/chart/retail_list
payload = { termGbn, yyyymmdd }
```

No request parameters matching the following were present in that contract:

```text
page
pageNo
pageNum
pageSize
offset
limit
cursor
paging
more
```

The official renderer uses:

```text
for (var i in res.List)
```

and renders every returned row. It contains no pagination branch or second-page fetch.

The tested published response contained exactly ranks 1 through 50.

Therefore FANDEX may classify that shape as:

```text
published-ui-top50-complete
```

Meaning:

> complete reproduction of the official public Retail chart rows rendered for that period.

It does **not** mean:

```text
all retailer transactions in the market
all albums sold in the provider universe
market-universe completeness
```

`marketUniverseCompletenessClaimed = false` remains mandatory.

## Operational classifier

New module:

```text
lib/alternative-evidence/circleRetailOperationalSemantics.ts
```

Result classes:

```text
published-chart
provider-period-error
empty-ok-response
http-error
schema-invalid
```

Published-chart completeness:

```text
published-ui-top50-complete
unknown
```

The Top 50 completeness state requires:

```text
ResultStatus = OK
50 rows
contiguous RankInt/RankOrder 1..50
official UI renders every returned row
no UI pagination parameters observed
```

A 49-row result or broken rank sequence remains `unknown` rather than being silently accepted as a complete Top 50.

## Provider Evidence impact

The generic blocker:

```text
operational-edge-qualification-required
```

is removed from the Circle evidence packet.

Remaining technical blockers are narrowed to:

```text
hour-year-revision-and-rate-limit-qualification-required
```

Authorization/rights blocker remains independently:

```text
storage-and-publication-rights-review-required
```

No additional provider capability flag is promoted by this operational packet.

## Current decision

```text
direct request contract = PASS
quantity semantic = PASS
historical day/week/month = PASS
SKU identity = PASS
provider-period error shape = PASS, coarse/collapsed
published UI Top 50 completeness = PASS
strict Cookie requirement = not observed
strict Referer requirement = not observed
empty OK behavior = modeled, not naturally observed

bounded research collector candidate = YES
recurring live collector = NO
Production collector = NO
feature bridge = CLOSED
```

## Next technical gate

```text
1. hourly raw request/response
2. yearly raw request/response
3. revision/supersession reconciliation
4. rate-limit/throttling policy by conservative observation only
```

Do not hammer the provider to manufacture a rate-limit event.
