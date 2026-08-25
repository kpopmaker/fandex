# Managed Postgres Production role credential recovery v118

## Outcome

- Production role/schema bootstrap: `ready`
- Production credential recovery: `completed`
- Production persistence infrastructure: `ready`
- Production deployment readiness: `deployment_not_performed`
- Business data persistence: `not_performed`

No deployment, PR, merge, snapshot operation, business write, migration replay, grant replay, schema change, additional password rotation, or additional Vercel environment update was performed during finalization.

## Corrected verifier boundary

The original runtime verifier incorrectly used role-filtered `information_schema.tables` visibility as proof of the complete schema object set. The corrected policy separates these concerns:

- Owner `pg_catalog` inspection proves the exact seven-table schema, ownership, migration record, constraints, trigger, PUBLIC revokes, role security, and ACL state.
- Migrator self-verification expects visibility of all seven tables.
- Runtime self-verification expects exactly the six permitted business tables.
- Runtime invisibility and lack of privileges for `schema_migrations` is a required least-privilege postcondition.

The exact catalog table set is:

- `historical_enrichment_requests`
- `ingestion_outbox`
- `normalized_sources`
- `persistence_audit_events`
- `persistence_transactions`
- `schema_migrations`
- `source_evidence_provenance`

## Recorded credential verification evidence

The completed recovery execution recorded:

- Migrator unpooled verification succeeded on attempt 1.
- Runtime pooled connection, authentication, identity query, and privilege query succeeded on attempt 1.
- Runtime reached only the non-retryable `postcondition` failure caused by the invalid visibility predicate.
- The same one-shot in-memory credential pair was used for the two role password changes, connection descriptors, and Vercel stdin updates.
- Vercel stdin exact-byte/no-newline behavior passed synthetic testing.

Finalization therefore records:

- `credential_authentication_verified: true`
- `connection_verified: true`
- `identity_query_verified: true`
- `privilege_query_verified: true`
- `original_postcondition_valid: false`
- `verifier_defect_confirmed: true`
- `fresh_role_reconnect_performed: false`
- `additional_rotation_performed: false`
- `evidence_basis: recorded_successful_connection_and_queries_before_invalid_postcondition`

This is a predicate correction, not a relaxation: unexpected runtime-visible tables, missing catalog objects, and missing or excessive ACL entries remain fail-closed.

## Role security and runtime ACL

Both `fandex_migrator` and `fandex_runtime` have `LOGIN` enabled, all dangerous role attributes disabled, and no `neon_superuser` membership.

| Table | Runtime privileges |
| --- | --- |
| `normalized_sources` | `SELECT`, `INSERT`, `UPDATE` |
| `historical_enrichment_requests` | `SELECT`, `INSERT`, `UPDATE` |
| `source_evidence_provenance` | `SELECT`, `INSERT` |
| `persistence_transactions` | `SELECT`, `INSERT`, `UPDATE` |
| `persistence_audit_events` | `SELECT`, `INSERT` |
| `ingestion_outbox` | `SELECT`, `INSERT`, `UPDATE` |
| `schema_migrations` | none |

Runtime has no schema `CREATE`, sequence grants, function grants, or unnecessary `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER` privilege. PUBLIC schema and object grants remain absent. All six business tables contain zero rows.

## External effects

- Password rotations during recovery: exactly 2 previously completed; finalization added 0
- Vercel Sensitive Production updates during recovery: exactly 2 previously completed; finalization added 0
- Fresh role reconnects during finalization: 0
- Migration/grant reapplications: 0
- Schema writes: 0
- Business writes: 0
- Existing owner environment changes: 0
- Secret outputs, hashes, or committed credential material: 0
- Deployment, PR, merge, and snapshot operations: 0

## Sanitized digests

- Corrected verifier policy: `e1012c0738bddda1c319a9f814589b66cfa48de6f79e753f7dbf6d9111f43048`
- Migrator recorded verification: `f6eeb2b4b9343aa4baeb4b3753f67bb2fd4cc9837c59bc3d4a07535af78d4529`
- Runtime recorded verification: `4b77a9e0a71a465e6f3ff60d8961449ffcd49fc87cee510a19c9b2f74ede9c7a`
- Owner catalog inspection: `d523a7fde57b6b76fd8c6a7661707a57d61cebc19e07888f275adb493d2f2725`
- ACL inspection: `53415aa48c6c5cbad29c49b267e72fba1408235d54395e56fc108248b845ce17`
- Vercel environment metadata: `43e0a21bf3c7f215491edd2be692cfdd3fd434bda3f8f21a0667e31856622d37`
- Aggregate bootstrap readiness: `e1bd710f0000652f05e1b8584bf246290232c4ac99fdca515307d1234bf46289`

These digests contain no password, connection URL, host, URL component, credential length, secret hash, or password-derived material.

## Immutable inputs

- Migration 001 SHA-256: `8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a`
- v117 grant plan SHA-256: `05e8eba83f4b88d7d4897b42f4cc62c3cc337dc35f88b8efa618aee8302ba546`
