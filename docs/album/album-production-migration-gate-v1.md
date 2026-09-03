# FANDEX Album Production Migration 003 + Grant 002 Application Gate v1

## Status

This document records the fail-closed application gate immediately before any Production `main` schema mutation for Album research persistence.

The gate qualifies the target and exact SQL artifacts for **explicit approval only**. It does not itself authorize or execute the migration.

```text
contractVersion = album-production-migration-gate-v1
eligibleForExplicitApproval = true
executionAuthorized = false
```

## Exact Production target

```text
provider    = neon
project     = fandex-managed-postgres
projectId   = wild-tree-38937656
branch      = main
branchId    = br-old-term-azv3tpra
database    = neondb
schema      = fandex
```

Any target mismatch blocks application.

## Exact SQL artifacts

Migration:

```text
database/migrations/003_album_research_observation_persistence.sql
sha256 = 637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97
```

Grant:

```text
database/grants/002_album_research_observation_writer.sql
sha256 = a0fc93c537148794dc36182e3a8feb2ce0218c872237a989fa3a0e70fa793244
```

The migration digest follows the repository migration runner's UTF-8 / LF-normalized SHA-256 semantics.

## Production read-only preflight

Observed on `main` before application:

```text
schema_migrations:
  version 1
  sha256 8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a

  version 2
  sha256 8951cd9ace8f30a586a23b5b813794560ea916798ae7c64e9542440ff1881aef

migration version 3 present = false
album research table present = false
fandex schema owner = fandex_migrator
```

The migration role was also verified as:

```text
roleName       = fandex_migrator
LOGIN          = true
SUPERUSER      = false
CREATEDB       = false
CREATEROLE     = false
REPLICATION    = false
BYPASSRLS      = false
```

Production `main` was not mutated during this preflight.

## Connection identity requirement

The existing repository migration runner already requires:

```text
FANDEX_MIGRATION_DATABASE_URL
username = fandex_migrator
connection = unpooled
```

The application gate therefore refuses:

```text
neondb_owner migration connection
fandex_runtime migration connection
pooled migration connection
```

A notable Neon role-membership detail was observed:

```text
neondb_owner -> fandex_migrator
membership exists
set_option = false
```

Therefore Production application must use the direct `fandex_migrator` credential rather than relying on `SET ROLE` from the owner session.

## Gate result

Current exact preflight:

```text
blockers = []
eligibleForExplicitApproval = true
executionAuthorized = false
productionDataWriteAuthorized = false
productionPublicationAuthorized = false
commercialRightsCleared = false
```

Gate fingerprint:

```text
22c4568d0ee1adfe5d346b3ca1c181f4d3de51941dd8512a9115dd3e73a4329c
```

This digest identifies the exact current gate payload. It is not an authorization token.

## Required apply sequence after explicit approval

The approved operation must remain narrowly scoped:

```text
1. Re-run read-only preflight on exact Production target.
2. Re-confirm migration 003 and grant 002 file digests.
3. Re-confirm schema_migrations is still exactly baseline versions 1 and 2.
4. Re-confirm Album research table does not exist.
5. Connect directly as fandex_migrator using unpooled migration URL.
6. Apply migration 003 transactionally and record version 3 with exact migration digest.
7. Apply grant 002.
8. Run read-only postconditions.
9. Do not insert any Album research observation rows in this migration gate.
```

If any precondition changes between approval and application, stop before mutation.

## Mandatory postconditions

After an approved migration application, all must hold:

```text
schema_migrations version 3 sha256
= 637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97

fandex.album_research_observation_records exists
owner = fandex_migrator
append-only mutation trigger enabled

fandex_runtime:
  SELECT = allowed
  INSERT = allowed
  UPDATE = denied
  DELETE = denied

row count = 0
```

The `row count = 0` condition is deliberate: schema/grant application does not authorize a research observation write.

## Fail-closed conditions

Application must halt before mutation on any of:

```text
target mismatch
migration digest mismatch
grant digest mismatch
migration history mismatch
migration 3 already present
Album research table already present
schema owner mismatch
unsafe migration role state
migration connection role mismatch
pooled migration connection
```

Postcondition failure also blocks any subsequent research write authorization.

## Scope exclusions

This gate does not authorize:

```text
Production data writes
Album research observation INSERTs on main
recurring acquisition
scheduler activation
raw Provider body storage
feature publication
redistribution
commercial use
rights clearance
Circle/Hanteo quantity blending
```

The next state transition requires explicit approval for the Production schema/grant application itself.
