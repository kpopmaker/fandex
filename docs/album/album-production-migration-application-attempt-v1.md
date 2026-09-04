# FANDEX Album Production Migration Application Attempt v1

## Final status

```text
applicationState = applied-verified
productionMainMutated = true
schemaMutationOnly = true
albumObservationInsertPerformed = false
```

The user explicitly approved applying Production `main` migration 003 + grant 002. The first one-shot attempt failed closed because the migration credential was not configured. After the direct unpooled `fandex_migrator` credential was configured, the exact same approved runner was re-enabled and completed successfully.

## Approved scope

```text
Production target:
  project  = fandex-managed-postgres
  branch   = main
  database = neondb
  schema   = fandex

Apply only:
  database/migrations/003_album_research_observation_persistence.sql
  database/grants/002_album_research_observation_writer.sql

Excluded:
  Album observation INSERTs
  scheduler activation
  Provider acquisition
  raw Provider body storage
  publication
```

## Exact artifacts

```text
migration 003 sha256
637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97

grant 002 sha256
a0fc93c537148794dc36182e3a8feb2ce0218c872237a989fa3a0e70fa793244
```

## Exact runner

```text
scripts/database/apply-album-production-migration-v1.mts
```

The runner requires:

```text
--apply
--authorize-production-main-album-migration
FANDEX_MIGRATION_DATABASE_URL
```

The connection must be direct/unpooled and authenticated as `fandex_migrator`. The runner rechecks the qualified baseline in the same transaction, applies migration 003, records version 3 with the exact migration digest, applies grant 002, validates postconditions, and commits only if all checks pass.

## Pre-apply CI qualification

Run:

```text
33773343998
```

Result:

```text
exact migration gate regression  PASS
runner plan mode                  PASS
TypeScript typecheck              PASS
workflow conclusion               SUCCESS
```

No Production credential was used by that qualification run.

## First application attempt — failed closed

Run:

```text
33773521205
```

Result:

```text
npm ci                         PASS
Require migration credential  FAIL
Apply exact migration         SKIPPED
```

No Production DB connection was opened and no mutation occurred. The temporary workflow was removed.

## Credential configured and approved re-run

Before re-running, Production `main` was read-only verified again:

```text
migration 3 present = false
album research table = absent
```

The one-shot workflow was then re-created and executed.

Run:

```text
33823297096
```

Result:

```text
npm ci                         PASS
Require migration credential  PASS
Apply exact migration         PASS
workflow conclusion            SUCCESS
```

The approved mutation completed successfully between `2026-09-04T00:49:15Z` and `2026-09-04T00:49:20Z`.

## Independent Production postcondition verification

After the workflow succeeded, Production `main` was queried independently through Neon.

Observed:

```text
schema_migrations.version = 3
migration_sha256 = 637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97
applied_at = 2026-09-04T00:49:17.703748+00:00

fandex.album_research_observation_records = present
owner = fandex_migrator
append-only trigger enabled = true

fandex_runtime SELECT = true
fandex_runtime INSERT = true
fandex_runtime UPDATE = false
fandex_runtime DELETE = false

row count = 0
```

This confirms the Production schema and least-privilege grant were applied, while no Album research observation row was inserted.

## Re-run prevention

The one-shot workflow was deleted immediately after successful verification. No recurring migration workflow remains on the application branch.

## Authorization boundary after application

The successful schema/grant application does **not** authorize:

```text
Album research observation INSERTs
recurring Provider collection
scheduler activation
raw Provider body persistence
public feature contribution
publication
redistribution
commercial use
rights clearance
```

A separate explicit write authorization remains required before any Production research observation is inserted.
