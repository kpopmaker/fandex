# Circle Retail Adapter Contract v1

## Status

```text
provider = circle-chart
capability = retail-album
adapterContract = circle-retail-adapter-v1
adapterImplemented = true
liveCallsAllowed = false
featureBridgeEligible = false
productionAllowed = false
boundedResearchCollectorCandidate = true
```

The adapter converts only directly qualified Circle Retail `retail_list` responses into `DirectAlbumObservation` records. It does not execute network calls and does not bridge observations into production feature evidence.

## Qualified upstream scope

Supported now:

```text
POST /data/api/chart/retail_list
termGbn = day | week | month
yyyymmdd = provider-native period key
ResultStatus = OK
rows = $.List{values}
quantity = rowSum
```

Not adapter-qualified yet:

```text
hour
year
```

Hourly uses a different upstream endpoint and Yearly raw schema has not been directly validated in this branch.

## Field mapping

```text
Circle Album          -> source album label only
Circle Artist         -> source artist label only
Circle Barcode        -> providerSkuId
Circle rowSum         -> value
verified unit         -> physical-units
semantic              -> period-sale
request termGbn/date  -> providerPeriod
```

Explicit non-mappings:

```text
KSum / ESum            -> never summed by FANDEX adapter
RankInt / RankOrder    -> never treated as sales
sys_date               -> not providerPublishedAt until its semantic is verified
Barcode                -> not providerReleaseId
Artist text            -> not providerArtistId
Album text             -> not providerReleaseId
territory              -> null until directly qualified
format                 -> null until directly qualified
```

## Provider period preservation

The adapter preserves the provider-native period key without rewriting it to ISO week/month semantics.

```text
day   20260529 -> day:20260529
week  20250223 -> week:20250223
month 202206   -> month:202206
```

For Daily/Weekly rows, row `YYYYMMDD` must match the requested provider period. For Monthly rows, row `YYYYMM` must match. A mismatch is rejected.

## Identity gate

A Circle row is not converted into a `DirectAlbumObservation` unless both FANDEX identities are strongly resolved:

```text
fandexArtistId != null
artist resolutionState = resolved
artist reviewState = human-reviewed | provider-verified

fandexReleaseId != null
release resolutionState = resolved
release reviewState = human-reviewed | provider-verified

identity evidenceIds.length > 0
```

Unresolved, candidate, ambiguous, conflicting, or unreviewed mappings remain rejected rows.

`Barcode` is preserved as provider SKU identity, but is not by itself sufficient to establish the FANDEX release mapping.

## Quantity gate

The adapter accepts only a directly promoted Discovery capture where:

```text
capture is promotable
request.method = POST
request.url = /data/api/chart/retail_list
providerStatus = OK
verifiedQuantityField = rowSum
verifiedRowPath = $.List{values}
quantity evidence exists
```

The raw payload hash must exactly match the Discovery capture payload hash.

`rowSum` must be a non-negative safe integer string. Missing, malformed, or negative values are rejected. Missing is never converted to zero.

## Observation output

Accepted rows become:

```text
DirectAlbumObservation {
  providerId: circle-chart
  providerObservationId: null
  providerArtistId: null
  providerReleaseId: null
  providerEditionId: null
  providerSkuId: Barcode
  fandexArtistId: resolved FANDEX artist
  fandexReleaseId: resolved FANDEX release
  semantic: period-sale
  value: parsed rowSum
  unit: physical-units
  territory: null
  format: null
  providerPeriod: provider-native period string
  providerPublishedAt: null
  knowledgeMode: current-research
  scopeRole: standalone
}
```

No provider-native observation/release/artist ID is invented.

## Fail-closed rejection states

Row-level rejection reasons:

```text
source-row-invalid
sku-identity-missing
quantity-invalid
provider-period-mismatch
artist-identity-unresolved
release-identity-unresolved
identity-evidence-missing
```

Contract-level mismatches throw before normalization.

## Evidence-linked capability state

The conservative base `CIRCLE_PROVIDER_DESCRIPTOR` remains unknown/default-off.

`CIRCLE_EVIDENCE_DESCRIPTOR` now directly qualifies:

```text
supportsNativePeriodSales = true
supportsHistoricalQueries = true
supportsSkuIdentity = true
```

A real/non-synthetic Circle observation may therefore pass technical validation against the evidence-linked descriptor while still failing against the conservative base descriptor.

This does not authorize live calls or feature bridging.

## Operational semantics

Operational probe evidence is implemented separately in:

```text
circleRetailOperationalSemantics.ts
circle-retail-operational-evidence-v1.md
```

Observed behavior:

```text
published period:
  HTTP 200
  ResultStatus = OK
  official UI Top 50 ranks 1..50

invalid/future/prelaunch period:
  HTTP 200
  ResultStatus = Error
  List absent
  cause collapsed by provider

known period without Cookie/Referer:
  HTTP 200
  ResultStatus = OK
  same Top 50 response shape
```

The official UI makes one `retail_list` request and renders every returned row. No page/size/offset/limit/cursor parameter was observed in the public chart request/render path.

Therefore `published-ui-top50-complete` means complete reproduction of the official displayed Top 50, **not** total market-universe completeness.

## Current technical status

```text
adapterImplementationQualified = true
fixtureNormalizationQualified = true
realObservationTechnicalValidation = true
publishedUiTop50Completeness = qualified
providerPeriodErrorShape = qualified-coarse
strictCookieRequirementObserved = false
strictRefererRequirementObserved = false
boundedResearchCollectorCandidate = true
featureBridgeEligible = false
liveCollectorAuthorized = false
productionCollectorAuthorized = false
```

## Validation runs

```text
33413534263
  Circle Discovery + Adapter tests = PASS
  Typecheck = PASS

33414514375
  Provider Evidence + Circle Discovery + Adapter tests = PASS
  Typecheck = PASS

33415892686
  Circle operational + Discovery + Adapter + Provider tests = PASS
  Typecheck = PASS
```

Temporary workflows were removed after validation.

## Remaining technical gate

```text
hour raw qualification
year raw qualification
revision/supersession reconciliation
conservative rate-limit/throttling observation
```

Do not manufacture a rate-limit event by aggressive requests.
