# FANDEX Album Production Migration Application Attempt v1

## Status

```text
applicationState = blocked-credential-consumer-missing
productionMainMutated = false
migration3Present = false
albumResearchTablePresent = false
```

The user explicitly approved applying Production `main` migration 003 + grant 002. The exact application runner was validated, but the approved mutation was **not executed** because the required direct `fandex_migrator` credential was not available to the GitHub Actions execution environment.

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

## Exact runner

A one-shot runner was added:

```text
scripts/database/apply-album-production-migration-v1.mts
```

It requires:

```text
--apply
--authorize-production-main-album-migration
FANDEX_MIGRATION_DATABASE_URL
```

The URL is validated by the repository persistence contract and must resolve to:

```text
role = fandex_migrator
connection = unpooled
```

The runner rechecks the baseline in the same transaction before mutation, applies migration 003, records schema migration version 3 with the exact digest, applies grant 002, checks postconditions, then commits.

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

No Production credential was used by this run.

## One-shot application attempt

Run:

```text
33773521205
```

Observed workflow state:

```text
npm ci                         PASS
Require migration credential  FAIL
Apply exact migration         SKIPPED
```

The repository GitHub Secret:

```text
FANDEX_MIGRATION_DATABASE_URL
```

was not configured. The workflow therefore failed closed before opening a Production DB connection.

The temporary one-shot workflow was removed after the failed-closed attempt so it cannot retry on later pushes.

## Neon session fallback check

The Neon SQL connector does not expose an execution-role selector. A session-local fallback was tested without persistent mutation:

```text
SET SESSION AUTHORIZATION fandex_migrator
```

Result:

```text
permission denied to set session authorization "fandex_migrator"
```

No role grants, role membership options, schema objects, or data were changed by this check.

The gate therefore continues to reject an owner-session workaround. No `neondb_owner` migration apply was attempted.

## Production post-attempt verification

Read-only verification after the blocked workflow confirmed:

```text
migration 3 present = false
fandex.album_research_observation_records = absent
```

Production `main` remains at the same schema state as before approval.

## Required next condition

To execute the already-approved migration without weakening the gate, configure this GitHub repository secret:

```text
FANDEX_MIGRATION_DATABASE_URL
```

with the direct unpooled `fandex_migrator` connection string for Production `main` / `neondb`.

Do not store the connection URI in repository files, workflow YAML, PR text, logs, or evidence documents.

Once that credential consumer exists, the exact one-shot application runner can be re-enabled and must re-run all baseline checks before applying anything.
