# FANDEX Album — Research Persistence Writer / Executor v1

## Status

Technical qualification: **PASS on temporary Neon branch**.

This gate adds the first code path capable of writing reviewed, non-synthetic Album research observations to PostgreSQL, but it does not authorize or apply the schema to Production/main.

## Contracts

```text
album-research-persistence-writer-v1
album-research-persistence-write-grant-v1
album-direct-observation-research-v1
```

## Authorization boundary

Research intake authorization and database write authorization are separate.

A write grant is bound to the exact:

```text
intakeResultDigest
persistencePlanDigest
recordIds
authorizationEvidenceIds
```

The writer rejects a mismatched intake result, persistence plan, record set, grant digest, Production scope, synthetic observation, or record outside the Album research contract.

## Database contract

Migration:

```text
database/migrations/003_album_research_observation_persistence.sql
```

Grant:

```text
database/grants/002_album_research_observation_writer.sql
```

Table:

```text
fandex.album_research_observation_records
```

Properties:

```text
append-only
provider-separated
revision-aware
raw Provider body not stored
normalized DirectAlbumObservation payload only
Circle/Hanteo raw sum not defined
```

The runtime role is deliberately limited to:

```text
SELECT = allowed
INSERT = allowed
UPDATE = denied
DELETE = denied
```

An append-only trigger rejects UPDATE or DELETE even if privileges are later broadened accidentally.

## Writer behavior

Every execution is transactional.

```text
new record
-> INSERT
-> inserted

same record id + same digest + same payload
-> no new row
-> idempotent

same record id + different digest/payload
-> conflict
-> rollback

revision
-> separate INSERT
-> supersedes_record_id points to existing record
-> prior row remains immutable
```

No UPDATE/DELETE SQL is part of the writer.

## Production Neon preflight

Project:

```text
fandex-managed-postgres
```

Default branch:

```text
main
br-old-term-azv3tpra
```

Observed schema migrations before this gate:

```text
1
2
```

No Album research table existed on main.

The default migration helper could not create the table because `fandex` schema is owned by `fandex_migrator` and the helper session does not have `SET ROLE` enabled despite membership. This was not worked around on main.

## Temporary Neon validation

Temporary branch:

```text
album-research-writer-v1-validation
br-crimson-snow-azm8lvze
```

Only on this temporary branch, role `SET` capability was enabled for validation and the migration/grant contract was applied using `fandex_migrator` ownership semantics.

Observed write validation:

```text
original INSERT        = 1 row
duplicate INSERT       = 0 rows
revision INSERT        = 1 row
```

Resulting records:

```text
original record exists
revision record exists
revision supersedes original
```

Observed runtime privileges:

```text
SELECT  = true
INSERT  = true
UPDATE  = false
DELETE  = false
```

Observed trigger:

```text
album_research_observation_records_append_only = enabled
```

No Production/main schema change or data write was performed.

## Safety state

```text
productionSchemaApplied = false
productionDatabaseWrites = 0
providerNetworkCallsForThisGate = 0
rawProviderBodiesPersisted = false
publicationAuthorized = false
commercialUseAuthorized = false
rightsCleared = false
schedulerEnabled = false
```

## Next gate

Production migration/application must remain separate and explicitly approved. Before any main-branch database write, the migration and grant SQL should be applied through the established migrator-role process and verified with exact digest, schema, privilege, and postcondition checks.
