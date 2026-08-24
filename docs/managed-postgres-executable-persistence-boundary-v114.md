# Managed PostgreSQL executable persistence boundary — v114

v114 turns the v112 provider-neutral design into executable PostgreSQL DDL and a Next.js 16.2.9 Node-runtime, server-only data-access boundary. It does not connect to a database, inspect credentials, apply migrations, read persistent state, or write data during implementation or validation.

## Repository integration

The project uses npm with `package-lock.json`, TypeScript strict/no-emit, App Router, ESLint, and Next build checks. No DB driver, ORM, migration tool, or test runner existed. v114 adds `pg`, `@vercel/functions`, `server-only`, `@types/pg`, and `tsx`; tests use `node:test` through `tsx`. The implementation follows the installed Next 16 guidance: isolate database access in a `server-only` DAL, retain non-public environment variables on Node.js, and never trigger mutations during rendering/build/start.

## Migration and runner

`database/migrations/001_v114_managed_postgres_persistence.sql` creates the private `fandex` schema, migration ledger, all six v112 persistence tables, composite uniqueness, SHA/version/state checks, separate publisher/byline and timestamps, bounded outbox retry/lease state, and an append-only audit trigger. PUBLIC schema, table, sequence, and function privileges are revoked. No fixture data or roles are inserted.

The runner defaults to deterministic plan output. Applying requires both `--apply` and `FANDEX_APPROVE_V114_MIGRATION=approved-v114-managed-postgres`; only then does it read `DATABASE_URL_UNPOOLED`. It uses a transaction-scoped advisory lock, records version/digest, returns identical applied migrations idempotently, rejects a same-version digest conflict, and rolls back the complete migration on failure. v114 validation never invokes `--apply`.

## Runtime and adapter

The runtime pool reads only `DATABASE_URL`, initializes lazily, requires TLS, bounds pool/timeouts, and immediately registers the pool with `attachDatabasePool`. It never ends the shared pool per request and never logs connection strings or raw DB errors.

The public server-only API is `inspectPersistentPreState`, `applyPersistenceBundle`, `getPersistenceTransactionResult`, `claimOutboxBatch`, `completeOutboxEvent`, and `failOutboxEvent`. Bundle application validates the exact v112 schema/migration/transaction/rollback/idempotency lineage and v113 provider descriptor, then validates the v112 deterministic key/payload. It runs serializably with at most three serialization retries, creates or classifies the transaction identity, locks source/request rows, checks expected versions/digests, performs the normalized/provenance/request/audit/outbox writes, verifies CAS row counts, and commits all-or-nothing. Results are `applied`, `idempotent_existing_result`, `rejected_conflict`, `rejected_stale_state`, or `failed_rolled_back`.

Outbox claims use `FOR UPDATE SKIP LOCKED`, bounded batch/lease values, and an atomic `processing` transition. Completion requires the same lease owner. Failure clears the lease and becomes `dead_letter` at the eighth attempt; deterministic `(idempotency_key,event_type)` uniqueness prevents duplicate queued effects.

## State

Executable migration, server-only client, atomic persistence adapter, and outbox adapter are created; staging migration readiness is eligible. Credential inspection, DB connection, migration application, persistent reads/writes, role creation, normalized persistence, request closure, production write authorization, and production readiness remain false.
