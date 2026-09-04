# FANDEX Album First Bounded Production Research Write Attempt v1

## Status

```text
attemptState = blocked-before-database-write
providerRequestConsumed = true
productionResearchRowsInserted = 0
productionResearchTableRowCount = 0
```

The user explicitly approved one bounded Production research write attempt for the three reviewed Circle observations. The approved scope allowed at most one Circle historical request and at most three append-only Production research INSERTs. The request was executed, but the database write was intentionally blocked after an observation-identity determinism defect was discovered.

## Approved scope

```text
Provider acquisition:
  circle-retail historical daily
  period = 20260831
  maximum requests = 1

Production research write:
  table = fandex.album_research_observation_records
  maximum INSERTs = 3

Excluded:
  Hanteo write
  raw Provider body storage
  scheduler activation
  publication
  redistribution
  commercial use
  rights clearance
```

## Authorized Circle reacquisition

GitHub Actions run:

```text
33824680792
```

The Circle request completed with HTTP 200. Safe metadata from the run:

```text
provider requests = 1
source rows = 50
accepted reviewed observations = 3
identity pending rows = 47
provider-data rejected rows = 0
raw body persisted = false
sales values emitted = false
```

The reacquired raw payload digest was exactly equal to the prior live-validation payload:

```text
d21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236
```

Therefore the source Circle data had not drifted for the qualified period.

## Fail-closed observation-ID mismatch

Despite the identical source payload, the reacquisition produced a different set of observation IDs from live validation run `33458837843`.

Prior IDs:

```text
3f94e51454edbdff932cb9cbeba2697e141864dc7f99f46ce96e1a60b5de22dd
5e907dc8f731b1d9895cf5f90ffb43acdc2282e0437aa4a8b55c60696eaebb95
f18a8b5d1267b63bb7d4f020e18346d674365fe16f90ceb811448341abb771c9
```

Reacquisition IDs before the fix:

```text
13d4993593d28dbba68965ac03b68958612aa30f4f4e5023b354990d4fcd63dc
3b9be547af4d9f15333f72e184a556274ffb38e281b3731b28098cde70f9007a
95b8be1c3289401d4144d8c28d34e4ae0442595b4422c3f2984b44567e7ff69d
```

The write gate therefore failed closed. No intake/write grant was used for Production persistence and no row was inserted.

## Root cause

`buildDirectAlbumObservationId()` had a narrow TypeScript input type, but its implementation hashed:

```ts
{
  contractVersion,
  ...input
}
```

At runtime `buildDirectAlbumObservation()` passed the complete observation draft object. Object spread therefore included fields outside the declared identity input, including collection-time and reconciliation metadata such as `observedAt` and `collectedAt`.

As a result, identical provider observations reacquired at different times could receive different observation IDs. This violated persistence idempotency requirements.

The source payload, adapter implementation, canonical digest implementation, Node major/minor version, and original Actions output were checked. The prior IDs were genuinely emitted by run `33458837843`; this was not an evidence transcription error or Circle revision.

## Determinism fix

`lib/alternative-evidence/directAlbumProvider.ts` was changed so `buildDirectAlbumObservationId()` hashes an explicit stable projection only:

```text
contractVersion
providerId
providerObservationId
providerArtistId
providerReleaseId
providerEditionId
providerSkuId
semantic
value
unit
territory
format
providerPeriod
revisionId
```

Collection timestamps, FANDEX reconciliation metadata, knowledge mode, scope role, and other non-provider identity metadata are no longer able to enter the observation-ID digest accidentally.

Regression test:

```text
tests/album-direct-observation-id-determinism-v1.test.mts
```

The test proves:

```text
collection timestamp changes -> same observation ID
FANDEX reconciliation metadata changes -> same observation ID
provider quantity change -> different observation ID
revision ID change -> different observation ID
```

Validation run:

```text
33825044361
```

Result:

```text
Direct observation ID determinism  PASS
Album persistence regressions      PASS
TypeScript typecheck               PASS
workflow conclusion                SUCCESS
```

## Recovery gate

Because the three IDs fixed in `album-bounded-production-research-write-gate-v1` were produced by the defective time-dependent identity implementation, they must not be used as durable Production record identity.

A recovery gate was added:

```text
album-bounded-production-research-write-recovery-gate-v1
```

It retains the stable source evidence and reviewed provider tuples:

```text
source payload digest =
d21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236

Circle reviewed tuples:
8809954226502 | straykids | straykids-this-and-that
8809704435567 | enhypen   | enhypen-the-sin-bliss
8800370675042 | katseye   | katseye-wild
```

A future reacquisition must produce exactly these reviewed tuples, with three unique SHA-256 observation IDs under the corrected stable-ID contract. It must also retain `period-sale`, `physical-units`, non-synthetic status, valid quantities, and zero provider-data rejections.

Recovery validation run:

```text
33825262112
```

Result:

```text
Observation ID determinism  PASS
Recovery gate               PASS
Persistence regressions     PASS
TypeScript typecheck        PASS
workflow conclusion         SUCCESS
```

Temporary acquisition, patch, and validation workflows were removed after use.

## Runtime database role boundary

Production grants intentionally permit only `fandex_runtime` to perform the bounded research INSERT. The available Neon connector session is `neondb_owner`; although it is a member of `fandex_runtime`, its role membership has `set_option=false`, so it cannot safely lower the session to `fandex_runtime`.

`fandex_migrator` also does not have a permitted `SET ROLE fandex_runtime` path.

Therefore the write must not be executed with either owner or migrator credentials. A dedicated direct/unpooled Production runtime credential is required through:

```text
FANDEX_RUNTIME_DATABASE_URL
```

with:

```text
role = fandex_runtime
branch = Production main
database = neondb
connection mode = Direct / Unpooled
```

## Production post-attempt state

A read-only Production verification after all work confirmed:

```text
fandex.album_research_observation_records row_count = 0
```

No partial write exists.

## Authorization state after the attempt

The user's prior authorization allowed only one Circle reacquisition. Run `33824680792` consumed that request.

```text
priorAuthorizedCircleRequests = 1
circleRequestsConsumed = 1
additionalCircleRequestAuthorized = false
productionResearchRowsInserted = 0
```

A new explicit authorization is therefore required before another Circle request can be made. The subsequent write also requires `FANDEX_RUNTIME_DATABASE_URL` to be configured first, so credential failure can occur before consuming another Provider request.

Publication, redistribution, scheduler activation, commercial use, and rights clearance remain unauthorized and unchanged.
