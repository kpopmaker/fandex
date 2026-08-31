# Circle Retail Adapter Contract v1

## Status

```text
provider = circle-chart
capability = retail-album
adapterContract = circle-retail-adapter-v1
adapterImplemented = true
technicalCapabilityDescriptor = evidence-linked
liveCallsAllowed = false
featureBridgeEligible = false
productionAllowed = false
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

## Evidence-linked capability upgrade

Direct response evidence now supports three technical capability upgrades on `CIRCLE_EVIDENCE_DESCRIPTOR`:

```text
supportsNativePeriodSales = true
  evidence = circle-retail-direct-response-v1:rowSum-period-sales

supportsHistoricalQueries = true
  evidence = circle-retail-direct-response-v1:historical-day-week-month

supportsSkuIdentity = true
  evidence = circle-retail-direct-response-v1:barcode-sku-identity
```

The conservative base descriptor remains unchanged:

```text
CIRCLE_PROVIDER_DESCRIPTOR.supportsNativePeriodSales = unknown
CIRCLE_PROVIDER_DESCRIPTOR.supportsHistoricalQueries = unknown
CIRCLE_PROVIDER_DESCRIPTOR.supportsSkuIdentity = unknown
```

This separation prevents technical evidence from silently rewriting the generic provider baseline.

Still unresolved:

```text
supportsCumulativeSales
supportsFirstWeekSales
supportsRevisions
supportsArtistIdentity
supportsReleaseIdentity
supportsEditionIdentity
supportsFormatIdentity
supportsTerritorySegmentation
```

Certification remains threshold/milestone context and is not upgraded into exact cumulative sales.

## Authorization remains independent

The evidence-linked descriptor advances only technical readiness:

```text
onboarding.currentStage = live-adapter-default-off
onboarding.technicalReadiness = adapter-ready
```

It does not authorize live or commercial use:

```text
acquisitionState = review-required
automationState = review-required
rawStorageState = review-required
normalizedStorageState = review-required
commercialUseState = contract-required
derivedPublicationState = review-required
rawRedistributionState = blocked

enabled = false
liveCallsAllowed = false
productionAllowed = false
```

`bridgeDirectAlbumObservation` is unchanged, so technical validation alone cannot move Circle observations into feature evidence.

## Validation state

Real/non-synthetic `period-sale` observations can now pass `DirectAlbumObservation` technical validation when the evidence-linked Circle descriptor is used.

The same observation still fails against the conservative base descriptor with:

```text
capability-supportsNativePeriodSales-unknown
```

Therefore:

```text
adapterImplementationQualified = true
fixtureNormalizationQualified = true
realObservationTechnicalValidation = qualified-on-evidence-descriptor
featureBridgeEligible = false
liveCollectorAuthorized = false
productionCollectorAuthorized = false
```

## Validation runs

Adapter validation run `33413534263`:

```text
npm ci = PASS
Circle Discovery + Adapter tests = PASS
npm run typecheck = PASS
```

Capability validation run `33414514375`:

```text
npm ci = PASS
Provider Evidence + Circle Discovery + Adapter tests = PASS
npm run typecheck = PASS
```

Temporary validation workflows were removed after completion.

## Next decision

Remaining work is no longer the core period-sales capability contract. The next Circle qualification step should focus on operational edge behavior:

```text
invalid/future/not-published period semantics
empty valid response behavior
pagination / completeness beyond observed 50 rows
natural rate-limit behavior
direct hourly response schema
yearly raw schema
strict cookie / Referer requirement
```

These operational checks must remain separate from commercial-rights authorization.
