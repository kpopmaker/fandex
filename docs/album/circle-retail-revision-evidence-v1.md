# Circle Retail Revision / Supersession Evidence v1

## Status

```text
provider = circle-chart
capability = retail-album
providerCorrectionBehavior = established in provider review evidence
revisionReconciler = qualified
researchPersistenceSupersession = qualified
supportsRevisions = true (evidence-linked descriptor only)
liveCallsAllowed = false
productionAllowed = false
```

## Provider behavior

The FANDEX Circle provider review already established that Circle can recalculate previously published Daily/Weekly/Monthly chart values after retailer upload, missing-data, or transmission corrections.

Therefore a previously observed provider value is not immutable.

FANDEX must preserve:

```text
old observation
new observation
revision relationship
current canonical head
```

and must never overwrite history in place.

## Logical series identity

`circle-retail-revision-v1` identifies one revision series by:

```text
provider = circle-chart
semantic = period-sale
unit = physical-units
providerPeriod
providerSkuId
fandexArtistId
fandexReleaseId
```

For non-Hour timeframes, `providerSkuId` is the observed Barcode.

For Hourly rows, Barcode was not exposed, so `providerSkuId=null`; strong reviewed FANDEX Artist + Release identity plus the provider hour period remains mandatory.

Different non-Hour Barcodes are separate series and are never treated as revisions of one another merely because they map to the same release.

## Reconciliation rules

```text
no previous observation
  -> append-original

same series + same quantity
  -> duplicate-noop

same series + changed quantity
  -> revision-append

series identity differs
  -> series-mismatch
```

A revision observation receives:

```text
revisionId
revisionObservedAt
supersedesObservationId = previous.observationId
knowledgeMode = current-research
```

The original observation remains unchanged.

## Persistence mapping

The reconciler does not create a new database model.

It maps into the existing Album persistence contract:

```text
observation.supersedesObservationId
        ↓
previous research record
        ↓
revision record.supersedesRecordId
        ↓
planPersistenceAppend(...)
        ↓
revision-append
```

`queryCurrentResearch()` then returns the unsuperseded head while the old record remains available for historical/as-known queries.

## Safety boundaries

The reconciler does not:

```text
perform network calls
write a database
activate recurring collection
change feature bridge provenance
change Production scoring
change commercial/storage authorization
```

Persistence plans remain zero-effect planning objects until an independently authorized store implementation exists.

## Capability impact

The evidence-linked Circle descriptor may now set:

```text
supportsRevisions = true
```

with evidence ID:

```text
circle-retail-revision-v1:official-corrections-and-supersession-reconciler
```

The conservative base `CIRCLE_PROVIDER_DESCRIPTOR` remains `unknown` and default-off.

## Remaining technical gate

```text
conservative rate-limit / throttling qualification
```

Do not intentionally hammer Circle to manufacture a 429 response.

Independent rights/authorization blocker remains:

```text
storage-and-publication-rights-review-required
```
