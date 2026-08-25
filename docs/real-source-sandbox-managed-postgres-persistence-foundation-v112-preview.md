# Managed PostgreSQL persistence foundation — v112 preview

v112 is a public, reusable, pure planning boundary for a managed PostgreSQL production-persistence foundation. It targets automation scalability and the `neon_vercel_marketplace` deployment profile while keeping schema, constraints, locking, idempotency, transaction, audit, outbox, and compensation semantics provider-neutral PostgreSQL. It imports no DB driver and performs no account, credential, network, database, migration, write, deployment, PR, or merge operation.

## Public API and data model

The public API is `validate_input`, `build_schema_manifest`, `build_migration_plan`, `derive_idempotency_key`, `build_atomic_transaction_plan`, `build_rollback_plan`, and `evaluate_readiness`. Every function accepts and returns JSON-compatible values. IDs and seals use SHA-256 over canonical UTF-8 JSON with sorted keys and compact separators.

The manifest defines six tables:

1. `normalized_sources`: primary key `internal_source_id`; unique provider/source-type/office/article tuple; v36-compatible title, summary, and publisher fields; independent displayed/provider timestamps; content digest and record version; DB-generated timestamps.
2. `historical_enrichment_requests`: primary key `request_id`, source foreign key, requested fields, `open|closed` state, persistent fulfillment/closure flags, closure reference, state digest, and record version. Closed rows require fulfillment and a closure reference.
3. `source_evidence_provenance`: source URL, exact U+2026 headline, publisher, journalist/byline, normalized journalist, separate semantic roles, independent timestamps, evidence digest/dimensions, and verification/acceptance lineage. It contains no full-body, email, screenshot-binary, or local-path column.
4. `persistence_transactions`: deterministic idempotency primary key, request/source binding, canonical payload digest, expected versions/digests, v108/v110 references, status, and before/after digests. Same-key/different-payload replay is a conflict.
5. `persistence_audit_events`: append-only monotonic transaction events with bounded JSON payload; normal runtime update/delete is denied.
6. `ingestion_outbox`: transactional automatic-processing events with `pending`, `processing`, `applied`, `retryable_failed`, and `dead_letter`; deterministic uniqueness, bounded eight-attempt retry, lease fields, bounded errors, and zero duplicate downstream effects.

## Exact binding and automatic transaction

The AESPA fixture binds the exact request/source, provider tuple `117/0004076125`, direct URL, U+2026 headline, 121-code-point summary, publisher `마이데일리`, byline `김하영 기자`, normalized journalist `김하영`, and both timestamps. Publisher is written only to `normalized_sources.author_or_publisher`; journalist values remain separate provenance. No author is inferred.

One serializable PostgreSQL transaction locks or CAS-protects both rows, validates expected versions/digests, creates or verifies the idempotency record, updates only `/title`, `/summary`, and `/author_or_publisher`, appends provenance, closes the fulfilled request, appends an audit event, and inserts a pending outbox event. It commits only after every postcondition passes. Identical replay returns `idempotent_existing_result`; a different payload under the same key returns `rejected`; partial success is forbidden.

After collection, the same transaction creates the outbox item. A separate least-privilege worker claims due rows with a lease/skip-locked model, applies bounded retries, records `applied`, sends exhausted work to `dead_letter`, and uses the deterministic key to prevent duplicate effects.

## Rollback and security

Any pre-commit error rolls back the entire transaction. A post-commit defect requires separate authorization and a compensating transaction guarded by stored before/after versions and digests. Compensation restores logical state but appends compensation audit/outbox records and never deletes evidence or audit history. Managed-provider backup/PITR remains an external, unconfigured, untested prerequisite.

Migration and runtime roles are separate; runtime and outbox workers receive only required operations. `DATABASE_URL` is documented only as a server-side placeholder, its value is never read, and any client-bundle exposure is rejected. TLS is mandatory. Role/account creation and grants remain deferred.

## Readiness separation

Structurally resolved v111 gaps include target architecture, normalized/request schemas, persistent write-boundary design, request vocabulary, cross-record atomicity, CAS/conflict handling, partial-failure behavior, append-only audit, transactional outbox, compensation design, and role/TLS policy.

Remaining blockers are: no provider account, binding, or credentials; no persistent pre-state read; no migration or DB connection; no configured/tested backup/PITR; no created roles; and no production persistence, normalized-write, request-closure, deployment, PR, or merge authorization. Thus foundation/schema/atomic/outbox design readiness is ready, rollback is conditionally ready, provider binding is blocked, production authorization is `not_authorized`, and overall production readiness remains `not_ready`.

Run `py -3 -B scripts/source-sandbox/preview_managed_postgres_persistence_foundation_v112.py --self-test`. It recomputes v108–v111 lineage, validates all seven pure APIs and six table manifests, executes 23 fail-closed negative cases, parses 40 first/replay JSON artifacts, and requires byte-identical replay with every external-effect counter at zero.
