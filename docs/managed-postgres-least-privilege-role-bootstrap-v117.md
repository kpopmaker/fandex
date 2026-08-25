# Managed PostgreSQL least-privilege role bootstrap readiness v117

v117 is code, plan, and unit-test readiness only. It does not authorize a Production connection, catalog query, SQL execution, role mutation, grant application, migration, persistence write, secret read, Vercel environment change, or deployment.

## Public boundary

`bootstrap-postgres-roles.mts` exports `validateRoleBootstrapInput`, `buildRoleBootstrapPlan`, `inspectRoleSecurityState`, `applyRoleBootstrap`, `buildRoleConnectionDescriptors`, and `evaluateRoleBootstrapReadiness`. The command defaults to a deterministic plan. Apply requires both `--apply` and `--authorize-production-role-bootstrap`; a single flag fails before any credential read or pool construction. The CLI intentionally has no secure credential handoff in v117, so even both flags fail closed before reading an owner credential. A later explicitly authorized caller may invoke `applyRoleBootstrap` and consume its one-shot, JSON-redacted descriptors only in process memory after COMMIT succeeds.

The target provider, resource, branch, database, region, and baseline are compared with code-pinned metadata. The safe plan output does not repeat connection components. Console, API, and CLI role descriptors are rejected: PostgreSQL SQL is the only accepted bootstrap mechanism. The only accepted identifiers are `fandex_migrator` and `fandex_runtime`; both are safely quoted from that fixed allowlist.

Runtime reads only `FANDEX_RUNTIME_DATABASE_URL`, requires the runtime role and a pooled host, and remains protected by `server-only`. Migration reads only `FANDEX_MIGRATION_DATABASE_URL`, requires the migration role, and rejects pooled hosts. Neither path falls back to legacy variables. Legacy `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are isolated as one-time owner-bootstrap candidates; apply requires exactly one unpooled owner candidate and reads it only after every authorization and metadata check.

## Exact role and grant boundary

| Role | Object | Allowed privileges | Explicitly absent |
| --- | --- | --- | --- |
| `fandex_migrator` | `fandex` schema and all seven v114 tables; audit trigger function | ownership, schema DDL, migration-object DDL; `schema_migrations` read/write through ownership | superuser, database creation, role creation, replication, row-security bypass, `neon_superuser` membership; runtime URL acceptance |
| `fandex_runtime` | `fandex` schema | `USAGE` | `CREATE` |
| `fandex_runtime` | `normalized_sources` | `SELECT`, `INSERT`, `UPDATE` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `historical_enrichment_requests` | `SELECT`, `INSERT`, `UPDATE` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `source_evidence_provenance` | `SELECT`, `INSERT` | `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `persistence_transactions` | `SELECT`, `INSERT`, `UPDATE` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `persistence_audit_events` | `SELECT`, `INSERT` | `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `ingestion_outbox` | `SELECT`, `INSERT`, `UPDATE` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` |
| `fandex_runtime` | `schema_migrations`, sequences, functions | none | all table/sequence/function privileges |

The grants follow the actual adapter statements: state/replay and postcondition reads; source/request inserts and updates; provenance and audit inserts; transaction insert/update; and outbox insert, claim, completion, and failure updates. No adapter statement deletes application rows. PUBLIC table, sequence, function, and schema revokes remain in force, and the existing append-only audit trigger remains owned by the migrator and unchanged.

## Apply safety and recovery

Role creation uses cryptographically secure random passwords and explicit `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`. Password literals are escaped; identifiers cannot come from input. Preflight rejects either existing target role instead of altering it or replacing its password. Postflight requires exactly both fixed roles, all forbidden attributes false, and no `neon_superuser` membership.

Role creation, ownership transfer, grants, and inspection occur inside one transaction. Descriptors are built in memory before COMMIT but returned only after COMMIT succeeds; external credential persistence is outside the transaction and outside v117. Any pre-commit failure triggers rollback, providing the cleanup/compensation path. There is no automatic retry. A connection loss during commit is an indeterminate outcome: stop, inspect through a separately authorized process, and never rerun until absence or exact state is established. If a later credential handoff fails after a confirmed commit, preserve the roles, treat the generated credentials as lost, and require a separately authorized manual recovery rather than an automatic password overwrite. Application schema/data migration and application data writes are outside this API.

The v116 stable component and aggregate digests remain the recorded baseline, and migration 001 remains byte-identical. The v117 grant plan is independent and is never discovered or applied by `db:migrate`.
