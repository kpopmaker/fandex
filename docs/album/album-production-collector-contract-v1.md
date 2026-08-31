# FANDEX Album — Production Collector Contract v1.0

## 0. Authority / dependency

This contract depends on the technical provider decision finalized in PR #132.

```text
Metric = Album
Construct = physical album completed-purchase-class sales/reaction
selectedPrimaryProvider = circle-retail
secondaryVerificationProvider = hanteo
selectionConfidence = HIGH
decisionState = primary-finalized-technical
```

Evidence lineage:

```text
Circle technical collector qualification = PR #130
Hanteo current secondary adapter qualification = PR #131
Provider final decision = PR #132
```

This contract defines how a future Album collector must operate. It does **not** enable live collection, Production scheduling, database writes, public publication, commercial use, or redistribution.

---

## 1. Authorization state

```text
collectorEngineeringAuthorized = true
implementationAuthorized = true

productionRuntimeCollectionAuthorized = false
productionPersistenceAuthorized = false
productionPublicationAuthorized = false
commercialRightsCleared = false
```

Public technical reachability is not treated as storage/publication/commercial authorization.

The current `album-persistence-contract-v1` hard-blocks `scope = production`; therefore no implementation may silently bypass that guard. Production persistence requires a separately reviewed persistence/authorization change.

---

## 2. Provider roles

### Primary

```text
provider = circle-retail
role = canonical Album provider evidence source
```

Qualified technical scope:

```text
hour
day
week
month
year
historical period queries
rowSum = retail copies
revision/supersession reconciliation
published UI Top 50 completeness
conservative throttling contract
```

### Secondary

```text
provider = hanteo
role = current exact-copy secondary verification source
```

Qualified technical scope:

```text
current day
current week
current month
detail.salesVolume = copies
value = Album Index, never copies
provider artist identity candidate
provider target/release identity candidate
```

Not qualified for Primary use:

```text
historical exact-copy public selector
adapter-level revision reconciliation
```

---

## 3. Non-negotiable semantic rules

```text
Circle rowSum = Circle Retail period sales copies
Hanteo detail.salesVolume = Hanteo physical album sales copies
Hanteo value = Album Index != copies
Rank != sales
Missing != zero
Certification != exact sales
```

Never perform:

```text
Circle copies + Hanteo copies
(Circle copies + Hanteo copies) / 2
provider ratio -> inferred total market
rank/index -> sales fallback
provider-native daily sum -> replacement for native weekly/monthly
```

Cross-provider quantities remain separate evidence universes.

---

## 4. Collector architecture

```text
Scheduler / Manual Invocation
        ↓
Run Planner
        ↓
Authorization + Kill-Switch Gate
        ↓
Provider Request Planner
        ↓
Bounded Fetch
        ↓
Raw Response Validation
        ↓
Provider Adapter
        ↓
Identity Reconciliation
        ↓
DirectAlbumObservation
        ↓
Revision / Duplicate Reconciliation
        ↓
Persistence Plan
        ↓
Shadow / Production Consumer Gate
```

Every layer fails closed.

---

## 5. Run modes

The collector must support explicit run modes.

```text
plan-only
bounded-research
shadow
production
```

### `plan-only`

Allowed effects:

```text
externalCalls = 0
databaseReads = 0
databaseWrites = 0
scheduleMutation = 0
environmentMutation = 0
```

Purpose:

- resolve requested providers/timeframes/periods
- compute request count
- validate authorization state
- expose planned throttling and persistence scope
- show blockers before any external request

### `bounded-research`

Purpose:

- small manual/CI evidence runs
- validate provider behavior
- no recurring schedule
- no Production feature bridge

Circle requests must obey its qualified conservative throttle contract.

Hanteo bounded-research must use a separate conservative throttle policy until a provider-specific operational policy is qualified.

### `shadow`

Purpose:

- recurring or repeated internal observation only after separate automation + storage authorization
- no public feature contribution
- no Production score effect
- provider disagreement monitoring allowed

### `production`

Default state:

```text
BLOCKED
```

Production requires all of:

```text
productionRuntimeCollectionAuthorized = true
productionPersistenceAuthorized = true
required storage authorization = allowed
production persistence contract permits scope=production
kill switch = enabled-for-run
provider contract versions match approved versions
```

Any missing prerequisite blocks the run before external calls.

---

## 6. Collector interface

Conceptual contract:

```text
AlbumCollectorRunInput {
  mode
  requestedAt
  providers
  timeframes
  providerPeriods
  identityCatalogVersion
  authorizationSnapshot
  dryRun
}
```

```text
AlbumCollectorRunPlan {
  runId
  mode
  primaryProvider
  secondaryProviders
  requests[]
  estimatedExternalCalls
  persistenceScope
  throttleContracts
  blockers[]
  executable
  planDigest
}
```

```text
AlbumCollectorRunResult {
  runId
  status
  startedAt
  finishedAt
  requestResults[]
  rawEvidenceDigests[]
  normalizedObservationIds[]
  duplicateNoopCount
  revisionCount
  rejectionCount
  crossProviderVerification
  persistencePlanDigest
  effects
  blockers[]
}
```

No runtime implementation may add an undeclared provider or timeframe implicitly.

---

## 7. Circle request contract

Qualified contracts from PR #130:

```text
Day / Week / Month / Year
POST /data/api/chart/retail_list
  termGbn
  yyyymmdd
```

```text
Hour helper
POST /data/api/chart_func/retail/hour_time
  termGbn=hour
```

```text
Hour chart
POST /data/api/chart/retail_hour
  yyyymmdd
  HourRange
  ListType
  thisHour
```

Required adapter invariant:

```text
verified quantity field = rowSum
unit = physical-units
semantic = period-sale
```

Non-hour rows may preserve:

```text
Barcode -> providerSkuId
```

Hourly rows may legitimately have:

```text
providerSkuId = null
```

All observations require reviewed FANDEX Artist + Release reconciliation before downstream eligibility.

---

## 8. Hanteo request contract

Qualified current contracts from PR #131:

```text
GET /v4/ranking/list/ALBUM/DAILY/BASIC?limit=N
GET /v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=N
GET /v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=N
```

Required quantity invariant:

```text
detail.salesVolume -> physical-units
row.value -> Album Index only
```

Identity candidates:

```text
detail.artistIdx -> providerArtistId
targetIdx -> provider target/release candidate
```

No Hanteo historical exact-copy request may be generated until a direct historical contract is separately qualified.

---

## 9. Provider-period preservation

Circle:

```text
hour:YYYYMMDD-HH
day:YYYYMMDD
week:<Circle provider-native anchor>
month:YYYYMM
year:YYYY
```

Hanteo:

```text
day:<provider resultDatetime period>
week:<provider resultDatetime period>
month:<provider resultDatetime period>
```

Do not replace provider-native periods with FANDEX-derived calendar periods.

Derived periods, if later needed, must use a separate field/model.

---

## 10. Scheduling contract

This document defines scheduling behavior but does not activate a schedule.

### Initial preferred Production cadence

Once separately authorized:

```text
Primary Circle Daily = once per day after provider daily publication window
Primary Circle Weekly = once after native weekly publication
Primary Circle Monthly = once after native monthly publication
Primary Circle Yearly = once after native yearly publication
Circle Hourly = disabled by default in Production v1

Hanteo Daily verification = once per day
Hanteo Weekly verification = once per native week
Hanteo Monthly verification = once per native month
```

Do not invent exact clock times until provider publication-lag observations are collected in shadow mode.

The scheduler must initially be plan-only and must expose its next target periods before activation.

---

## 11. Backfill contract

Backfill is a separate explicit operation.

```text
backfillAllowedByDefault = false
```

Circle is technically eligible for bounded historical backfill because direct historical period acquisition is qualified.

Hanteo exact-copy historical backfill is blocked.

Backfill must require:

```text
explicit start period
explicit end period
explicit timeframe
calculated request count
throttle plan
authorization snapshot
maximum bounded request count
resume checkpoint
```

No unbounded `from beginning of history` mode is allowed.

---

## 12. Throttling

### Circle

Use `circle-retail-throttling-v1` from PR #130:

```text
maxConcurrency = 1
minimumIntervalMs = 3000
maxRequestsPerBoundedRun = 20
maxServerErrorRetries = 2
serverErrorBackoffMs = [10000, 30000]
```

Response handling:

```text
2xx -> respect minimum interval
429 -> halt current run; honor Retry-After if present
403 -> immediate halt; no retry/bypass
5xx -> max two bounded retries, then halt
other 4xx -> halt
```

Provider hard limit remains unknown.

### Hanteo

Until separately qualified:

```text
maxConcurrency = 1
minimumIntervalMs >= 3000
no aggressive retry
429 -> halt
403 -> halt
5xx -> bounded retry only
```

These are FANDEX safety limits, not claims about Hanteo's official rate limit.

---

## 13. Kill switch

The collector must have a single global kill switch plus provider-specific switches.

Conceptual state:

```text
ALBUM_COLLECTOR_ENABLED = false
ALBUM_CIRCLE_ENABLED = false
ALBUM_HANTEO_ENABLED = false
```

Default for all new environments:

```text
false
```

A disabled switch must block before any network request.

Automatic kill conditions:

```text
403 / access-control response
429 / rate-limit response
unexpected login requirement
CAPTCHA / bot challenge
schema drift that breaks quantity/identity semantics
quantity field missing
provider semantic conflict
repeated 5xx after bounded retry
authorization snapshot downgrade
persistence scope mismatch
```

The collector must never attempt circumvention after a kill condition.

---

## 14. Raw evidence capture

For every attempted request, capture at minimum:

```text
provider
endpoint
method
provider period
requestedAt
response status
content type
provider status/code
raw payload digest
schema version / adapter contract version
collectedAt
```

Raw bytes/payload persistence is **not authorized by this contract**.

Until raw-storage authorization is separately granted, the implementation may retain only ephemeral in-run payloads plus allowed digests/metadata according to the active authorization snapshot.

---

## 15. Normalized observation contract

Provider adapters emit existing `DirectAlbumObservation` only.

Do not create a competing Production-only observation model.

Required downstream fields include:

```text
providerId
providerObservationId/provider native IDs where available
fandexArtistId
fandexReleaseId
semantic
value
unit
providerPeriod
observedAt
collectedAt
revision metadata
knowledgeMode
```

Identity resolution must be reviewed/verified according to the existing Album identity foundation.

---

## 16. Revision / duplicate handling

### Circle

Qualified behavior:

```text
no previous observation      -> append-original
same series + same quantity  -> duplicate-noop
same series + changed value  -> revision-append
different logical series     -> series-mismatch
```

A revision must preserve the previous observation and link:

```text
revisionId
revisionObservedAt
supersedesObservationId
```

### Hanteo

Current adapter may provide current verification observations, but adapter-level revision/supersession behavior remains unqualified.

Therefore Hanteo cannot become canonical revision authority in Production v1.

---

## 17. Persistence contract

Current repository state:

```text
album-persistence-contract-v1
scope = production -> blocked
```

Initial implementation must not change this silently.

Allowed design targets:

```text
research persistence
shadow persistence
```

Only after separate authorization may a future PR introduce a reviewed path for:

```text
production normalized storage
production current canonical records
production revision history
```

Persistence must remain append-oriented, preserve revisions, and never mutate historical values in place.

---

## 18. Cross-provider verification

Hanteo is not summed or averaged with Circle.

Allowed derived verification states:

```text
matched-direction
material-divergence
secondary-missing
secondary-unavailable
identity-mismatch
period-not-comparable
```

Example conceptual output:

```text
CrossProviderVerification {
  primaryProvider: circle-retail
  secondaryProvider: hanteo
  comparable: boolean
  comparisonBasis
  directionAgreement
  divergenceDetected
  notes
}
```

Absolute quantity divergence may be recorded as evidence, but must not be converted into a blended sales number.

---

## 19. Failure taxonomy

Collector run status:

```text
SUCCESS
PARTIAL_SUCCESS
BLOCKED
FAILED
```

Request/result failure classes:

```text
authorization-blocked
kill-switch-disabled
invalid-plan
provider-http-error
provider-period-error
rate-limited
access-blocked
provider-5xx
schema-changed
quantity-semantic-invalid
identity-unresolved
period-mismatch
duplicate-noop
revision-detected
persistence-blocked
secondary-verification-unavailable
```

A secondary-provider failure must not rewrite a successful Circle Primary observation as zero or failed sales.

---

## 20. Atomicity

Run-level policy:

```text
provider requests = independent bounded results
observation normalization = per-row results
persistence planning = per-record results
```

Do not require all providers to succeed before preserving valid Primary evidence.

However, a schema/semantic failure affecting the Circle quantity contract blocks Circle normalization for that affected response.

---

## 21. Monitoring / run report

Every executed non-plan run must produce an internal report containing:

```text
runId
mode
provider request counts
successful requests
failed requests
normalized observations
rejections
duplicate noops
revisions
cross-provider verification state
kill-switch state
throttle state
persistence scope
persistence plan result
authorization snapshot
runtime effects
```

A run report is operational metadata, not public sales data.

---

## 22. Idempotency

Same provider + same provider period + same payload must not create duplicate canonical records.

Expected behavior:

```text
same payload digest
→ duplicate-noop
```

Changed Circle payload for the same logical series:

```text
→ revision reconciliation
→ revision-append
```

---

## 23. Schema drift

Adapters must fail closed if any of the following breaks:

Circle:

```text
ResultStatus contract
List row location
rowSum semantics
period fields
identity fields required for the timeframe
```

Hanteo:

```text
code/resultData/list contract
detail.salesVolume
value vs salesVolume separation
provider period label
native identity fields used by the adapter
```

No fallback heuristic may silently reinterpret a new field as sales.

---

## 24. Runtime implementation sequence

Implementation must proceed in this order:

```text
1. Album Collector Plan Contract
2. plan-only CLI / runner
3. fixture-based provider orchestration
4. bounded-research manual execution gate
5. run-report contract
6. research/shadow persistence integration
7. shadow scheduler plan
8. explicit automation/storage authorization review
9. Production persistence contract change
10. Production runtime authorization
11. schedule activation
12. public feature/publication authorization separately
```

Do not jump directly from provider qualification to scheduled Production collection.

---

## 25. Recommended file boundaries for implementation

Conceptual target structure:

```text
lib/album-collector/
  contracts.ts
  planner.ts
  orchestration.ts
  authorizationGate.ts
  killSwitch.ts
  crossProviderVerification.ts
  runReport.ts

scripts/ingestion/
  plan-album-collector-v1.mts
  run-album-collector-research-v1.mts
  plan-album-scheduler-v1.mts
```

Provider-specific request/adapter logic should continue to live in provider modules rather than being duplicated inside the orchestrator.

---

## 26. Production activation hard gates

Production runtime may not be enabled until all are true:

```text
G1 Provider final decision merged/approved
G2 Circle technical collector implementation merged/approved
G3 Hanteo secondary adapter merged/approved
G4 plan-only runner PASS
G5 bounded-research orchestration PASS
G6 identity reconciliation operational PASS
G7 revision persistence PASS
G8 shadow run stability PASS
G9 automation authorization allowed
G10 normalized/raw storage authorization explicitly resolved
G11 production persistence no longer hard-blocked
G12 kill-switch and monitoring PASS
G13 explicit productionRuntimeCollectionAuthorized = true
```

Public/commercial publication is a separate gate and is not implied by G1-G13.

---

## 27. Current contract verdict

```text
primaryProvider = circle-retail
secondaryVerificationProvider = hanteo

collectorContractDefined = true
collectorEngineeringAuthorized = true

planOnlyImplementationAuthorized = true
fixtureOrchestrationAuthorized = true
boundedResearchImplementationAuthorized = true

liveRecurringCollectionAuthorized = false
shadowPersistenceAuthorized = false
productionPersistenceAuthorized = false
productionRuntimeCollectionAuthorized = false
productionPublicationAuthorized = false
commercialRightsCleared = false
```

## 28. Next implementation step

The next code change should be:

```text
FANDEX Album Collector Plan Foundation v1
```

Scope:

```text
contracts + deterministic planner + plan-only CLI + tests
```

Required effects:

```text
externalCalls = 0
databaseReads = 0
databaseWrites = 0
scheduleMutation = 0
environmentMutation = 0
```

No provider network execution should be added in that first implementation PR.
