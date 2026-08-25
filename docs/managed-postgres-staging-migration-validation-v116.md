# Managed PostgreSQL staging migration validation v116

This document seals the authorized validation performed against the Preview-only Neon branch `staging-v116`. It does not authorize or describe a Production connection or write.

## Bound staging identity

- Provider/resource: Neon / `fandex-managed-postgres`
- Branch/parent: `staging-v116` / `main`
- Region: AWS Asia Pacific 1 (Singapore)
- PostgreSQL major version: 18
- Vercel environment: Preview; variables were Sensitive and separate from Production
- Auto-delete policy: 7 days

The ignored Preview environment file was consumed only by the migration/runtime processes. Credential values, hashes, parsed URL components, Neon/Vercel identifiers, and Production variables were never read or emitted.

## Migration and schema

Migration `001_v114_managed_postgres_persistence.sql` was applied once with SHA-256 `8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a`. The validation resumed from that exact authorized application after matching its migration and complete target state. Both validation applications were idempotent no-ops.

The inspected `fandex` schema contains exactly these seven tables:

- `schema_migrations`
- `normalized_sources`
- `historical_enrichment_requests`
- `source_evidence_provenance`
- `persistence_transactions`
- `persistence_audit_events`
- `ingestion_outbox`

Primary-key, foreign-key, unique, and check constraints were present. The audit UPDATE/DELETE trigger rejected both mutation probes. PUBLIC had neither table grants nor schema usage.

## Persistence validation

The adapter now supports a bounded `expectedState: "absent"` bootstrap. It validates the complete public v36 projection, creates the source and open historical request inside the same serializable transaction, and immediately applies the authorized normalized state, provenance, closure, audit, and outbox records. Existing rows reject `expectedState: "absent"`.

- First authorized application: `applied`
- Exact replay and validation replay: `idempotent_existing_result`
- Same idempotency key/different payload: `rejected_conflict`
- Stale state: `rejected_stale_state`
- Unauthorized field, altered U+2026 title, and publisher/byline conflation: rejected
- Forced intermediate failure: fully rolled back
- Serialization retry maximum: 3
- Concurrent outbox claims: one claim, zero duplicate effects
- Final staging validation outbox state: `applied`
- Downstream external calls: 0

The runtime transaction sets bounded lock and statement timeouts. Outbox claim also recovers an expired `processing` lease while preserving `SKIP LOCKED`, bounded attempts, and no concurrent duplicate claim.

## Stable canonical digests

- Migration application: `baa2c06e72bb71b5bb4ce273bdbd2c9c2fe075b6a08db363cbe1e0278eaed587`
- Schema inspection: `bbdda3a60c905a9b1857753dd5d8bd2f7a58fa08681f2c03d5987fdb6e6d58b3`
- Normalized row: `76b47b25c4fa565f9f18ab2f83f1354e40ad050550ad891ff943dd2ce45f02b5`
- Historical request row: `0782b703fa8afead0d8e4dd5a3ff11d9611fa1a25fcaba228d239314726c322f`
- Provenance row: `b74df457f27c1d18053e83715f9c902e8ad29a576ded9d636679789a51fb29e0`
- Transaction/audit collection: `8c9ac21be21cc461ecd4b9eec0d0ef49bc2dca62002be876f0f8e767a60513c7`
- Outbox result: `afc06c7d53bcc4a93156e5046102a54861b79f2c1f0f2218a294896c848625e8`
- Aggregate staging validation: `e9d526e3b26133cb18d891425b9938d6826790660e5536383e0f35af2d0680ef`

Database-generated timestamps and all secret/connection identifiers are excluded from these projections.
An independent final replay reproduced all seven component digests and the aggregate digest byte-for-byte.

## Effects and remaining blockers

The successful comprehensive validation run counted 68 staging statements: 25 reads, 25 write-class statements, and 18 transaction/control statements. Production queries, reads, and writes were all 0. Credential output/hash and downstream external-call counters were also 0.

Production remains blocked on separately provisioned least-privilege migration/runtime roles, verified backup/PITR and rollback operations, an approved Production pre-state read, and explicit Production write authorization. No deployment, PR, merge, Production migration, or Production persistence occurred.
