# FANDEX Album Research Observation Intake / Persistence Boundary v1

## Status

```text
contract = album-research-observation-intake-v1
record = album-direct-observation-research-v1
current view = album-research-observation-current-view-v1
technical research storage planning = qualified
database write execution = NOT authorized
raw body storage = NOT authorized
publication = NOT authorized
commercial use = NOT authorized
rights clearance = false
```

This boundary sits after reviewed, non-synthetic `DirectAlbumObservation` creation and before any database writer.

It does not create a database client, perform a database read, execute an insert, alter a scheduler, mutate environment configuration, or publish Album data.

## Purpose

The previous reviewed identity mapping packet proved this live path for a deliberately small cohort:

```text
public Provider HTTP response
-> qualified quantity field
-> reviewed Provider identity tuple
-> FANDEX Artist ID
-> explicit FANDEX Release ID
-> non-synthetic DirectAlbumObservation
```

This contract defines how such observations may become *candidate research persistence records* without turning technical qualification into ambient storage or publication permission.

## Hard separation

The contract preserves these distinctions:

```text
technical research intake authorization
!= database write execution authorization
!= legal/storage-rights clearance
!= publication authorization
!= commercial-use authorization
```

The technical grant has the following fixed safety posture:

```text
scope = research
technicalResearchStorageAuthorized = true
rawBodyStorageAuthorized = false
databaseWriteExecutionAuthorized = false
publicationAuthorized = false
commercialUseAuthorized = false
rightsCleared = false
```

The grant is also exact-set scoped. Its digest binds both:

```text
observationIds
providerIds
```

A grant created for one observation/provider set cannot silently authorize another set.

## Eligible observation shape

The Album research intake boundary accepts only observations that satisfy all of the following:

```text
providerId = circle-chart | hanteo-chart
syntheticFixture = false
semantic = period-sale
unit = physical-units
value = non-negative safe integer
fandexArtistId = present
fandexReleaseId = present
providerPeriod = present
observedAt = valid instant
collectedAt = valid instant
observationId = 64-char canonical digest
evidenceDigest = 64-char canonical digest
```

Synthetic fixtures, unresolved FANDEX identity, missing period, invalid quantity, unsupported Provider, and malformed revision metadata fail closed.

## Record envelope

Qualified observations are wrapped with the existing `album-persistence-contract-v1` foundation as:

```text
recordType = AlbumDirectObservationResearchRecord
recordVersion = album-direct-observation-research-v1
persistenceScope = research
syntheticOnly = false
payload = DirectAlbumObservation
contributionIdentityId = fandexReleaseId
effectivePeriod = providerPeriod
knowledgeMode = observation.knowledgeMode
```

The authorization snapshot is deliberately restrictive:

```text
acquisition = bounded-public-direct-research
automation = disabled
rawStorage = blocked
normalizedStorage = technical-research-only
retention = review-required
commercialUse = blocked
derivedPublication = blocked
rawRedistribution = blocked
```

## Provider-separated series identity

Each logical research series uses a deterministic series key that includes Provider identity and Provider/FANDEX release identity dimensions:

```text
providerId
providerObservationId
providerArtistId
providerReleaseId
providerEditionId
providerSkuId
fandexArtistId
fandexReleaseId
semantic
unit
territory
format
providerPeriod
```

The quantity value is intentionally excluded from the series key.

Therefore a corrected quantity remains in the same logical series while Circle and Hanteo can never collapse into the same persistence series.

## No raw Provider blending

The Album-specific current view explicitly returns:

```text
crossProviderAggregationAllowed = false
rawProviderSumAllowed = false
```

Circle and Hanteo heads may coexist for the same FANDEX release without being classified as a conflict merely because they are two separate Provider observations.

This is not permission to sum, average, blend, or otherwise convert the two Provider quantities into a synthetic market total.

## Duplicate behavior

If the exact persistence record already exists:

```text
same observation
-> duplicate-noop
```

No replacement or mutation is planned.

## Changed-value behavior

A changed quantity in the same logical Provider series is not accepted as a generic conflict record.

```text
same series
+ changed payload
+ no explicit supersession
-> changed-observation-requires-explicit-revision
-> invalid
```

This is stricter than the generic persistence foundation's `conflict-preserve` capability and is intentional for qualified direct Album sales observations.

## Revision behavior

A revision observation must provide:

```text
supersedesObservationId
revisionId
revisionObservedAt
```

The intake boundary then requires the superseded observation to exist as an Album research persistence record.

```text
revision target missing
-> invalid

revision target exists but logical series differs
-> invalid

revision target exists + same logical series
-> supersedesRecordId = prior persistence record ID
-> recordState = revised
-> revision-append
```

The original record remains immutable.

## Current research view

`album-research-observation-current-view-v1` resolves heads using supersession links.

Multiple different legitimate Provider/period series are allowed to coexist.

A conflict is reported only when multiple current heads remain for the same `sourceRecordId` with different payload digests.

## Effects

Every intake plan in v1 is zero-effect:

```text
databaseReads = 0
databaseWrites = 0
externalCalls = 0
scheduleMutations = 0
environmentMutations = 0
executionAuthorized = false
```

No persistence executor is implemented by this contract.

## Validation

GitHub Actions run:

```text
33768087992
```

Result:

```text
research observation intake tests       PASS
provider-separated current-view tests    PASS
persistence regression tests             PASS
reviewed subset regression tests         PASS
TypeScript typecheck                     PASS
workflow conclusion                      SUCCESS
```

The test matrix covers:

```text
missing grant -> blocked
exact observation/provider grant scoping
two-provider separation
duplicate-noop
changed value without revision -> invalid
missing revision target -> invalid
valid revision -> revision-append
cross-series revision -> invalid
synthetic observation -> invalid
provider-separated current heads -> resolved
revision replaces only its own Provider-series head
```

## Relationship to the reviewed live cohort

The immediately preceding live qualification produced reviewed, non-synthetic observations for:

```text
Stray Kids — THIS & THAT
ENHYPEN — THE SIN : BLISS
KATSEYE — WILD
```

from both Circle Retail and Hanteo.

The committed live evidence intentionally omitted sales values. This v1 intake boundary is therefore qualified through deterministic contract tests rather than replaying or inventing those omitted quantities.

No additional Provider network requests were needed for this persistence-boundary qualification.

## Non-authorization

This contract does not authorize:

```text
Neon/database writes
Production persistence
recurring acquisition
scheduler activation
raw Provider response storage
feature publication
Circle/Hanteo quantity blending
redistribution
commercial use
rights clearance
```

## Next gate

The next separate technical gate, if pursued, is an explicitly authorized **research persistence writer/executor** with a real storage backend and idempotent transaction semantics.

That writer must remain distinct from this zero-effect planning boundary and must not imply publication or commercial rights.
