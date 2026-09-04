# FANDEX Album Bounded Production Research Write Gate v1

## Status

```text
contractVersion = album-bounded-production-research-write-gate-v1
eligibleForExplicitApproval = true
executionAuthorized = false
productionResearchWriteAuthorized = false
productionPublicationAuthorized = false
commercialRightsCleared = false
```

Gate digest for the clean Production preflight snapshot:

```text
5c7a6f30da529322eaaf667309e03a3ccdfef8909c699c8ef6e29d8e52d5b4ad
```

This gate does not insert Album rows. It defines the first bounded Production research write cohort and the exact conditions required before a separate explicit write approval.

## Exact target

```text
project    = fandex-managed-postgres
projectId  = wild-tree-38937656
branch     = main
branchId   = br-old-term-azv3tpra
database   = neondb
schema     = fandex
table      = album_research_observation_records
```

Required migration:

```text
schema_migrations.version = 3
sha256 = 637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97
```

## First bounded write cohort

Only the three previously reviewed Circle Daily observations from the live validation run are in scope.

```text
source workflow run = 33458837843
acquisition provider = circle-retail
normalized provider = circle-chart
timeframe = day
provider period = day:20260831
request mode = historical-backfill
max provider requests = 1
max database writes = 3
```

Source payload digest:

```text
d21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236
```

Reviewed subset result digest:

```text
f0258a5a4a7990877d4c613d8c1e6301a521eb3f0e0acf706ef0f78fa2ba957b
```

Exact observation cohort:

```text
3f94e51454edbdff932cb9cbeba2697e141864dc7f99f46ce96e1a60b5de22dd
  Circle Barcode 8809954226502
  straykids / straykids-this-and-that

5e907dc8f731b1d9895cf5f90ffb43acdc2282e0437aa4a8b55c60696eaebb95
  Circle Barcode 8809704435567
  enhypen / enhypen-the-sin-bliss

f18a8b5d1267b63bb7d4f020e18346d674365fe16f90ceb811448341abb771c9
  Circle Barcode 8800370675042
  katseye / katseye-wild
```

## Why Hanteo is excluded from the first Production write

The prior live validation intentionally did not persist sales values or raw response bodies. Circle Daily `2026-08-31` can be reacquired through the already-qualified historical exact-copy path. Hanteo historical exact-copy reacquisition remains unverified.

Therefore the first bounded Production research write must not invent, infer, or reconstruct a Hanteo value from Album Index, rank, current results, or title metadata.

```text
Hanteo first-write inclusion = blocked
reason = historical-exact-copy-reacquisition-unverified
```

## Reacquisition gate

Before any write grant can be created, one Circle Daily request for `2026-08-31` must reproduce all of the following exactly:

```text
sourcePayloadDigest = d21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236
observationIds = exact three-ID cohort above
nonIdentityRejectedRowCount = 0
provider = circle-chart
providerPeriod = day:20260831
```

Any Provider revision or payload drift blocks the original write cohort and requires a new reviewed revision packet. The gate never silently updates the first-write cohort.

## Production preflight observed after migration 003 application

Read-only Production verification:

```text
migration 3 exact digest = present
Album research table = present
owner = fandex_migrator
append-only trigger = enabled
fandex_runtime SELECT = true
fandex_runtime INSERT = true
fandex_runtime UPDATE = false
fandex_runtime DELETE = false
research table row count = 0
selected cohort observations already present = 0
```

## Write boundary

Even with every precondition satisfied:

```text
eligibleForExplicitApproval = true
executionAuthorized = false
productionResearchWriteAuthorized = false
```

A separate explicit approval is required before the one-shot reacquisition and Production INSERT transaction.

That future approval may authorize at most:

```text
Circle Provider requests = 1
Production research INSERTs = 3
raw Provider body storage = 0
scheduler mutations = 0
publication = 0
commercial-use authorization = 0
```

The existing research persistence writer must still create an exact intake result and exact write grant before any INSERT is attempted.

## Validation

GitHub Actions run:

```text
33823814765
```

Result:

```text
bounded production research write gate tests  PASS
research intake/writer regressions             PASS
TypeScript typecheck                           PASS
workflow conclusion                            SUCCESS
```

No Provider request and no database write was performed by this validation.
