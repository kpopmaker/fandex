# Neon provider-binding readiness — v113 preview

v113 validates the user-confirmed Neon/Vercel binding metadata through a public pure boundary without receiving or inspecting any credential value. The available execution environment has neither the Vercel CLI nor a local `.vercel/project.json`, so no external CLI query was attempted. User-attested state and independent CLI verification are deliberately separate: the former is validated, while the latter remains `unverified_cli_unavailable`.

## Sanitized binding

- Provider: `neon`
- Resource display name: `fandex-managed-postgres`
- User-confirmed plan classification: `free`
- User-confirmed resource status: `available`
- Vercel project: `fandex`
- `DATABASE_URL`: key present, Production only, Sensitive, no Preview/Development exposure
- `DATABASE_URL_UNPOOLED`: key present, Production only, Sensitive, no Preview/Development exposure
- Region: `unverified`; Singapore is not inferred

The sanitized descriptor permits only provider/resource/plan/project display metadata, variable key names, scopes, Sensitive flags, region classification, metadata provenance, and v112 references. It excludes connection strings, secret values and hashes, host/user/password/database names, account/team/project IDs, tokens, local `.env` paths, and credential fragments. Variable creation timestamps and other changing metadata are excluded from canonical hashing.

## Public pure API

The reusable API is `validate_binding_input`, `build_sanitized_provider_descriptor`, `validate_environment_scope`, and `evaluate_provider_binding_readiness`. It consumes JSON-compatible values, returns sanitized JSON-compatible values, performs no I/O, and seals deterministic output with canonical JSON SHA-256.

The exact v112 schema, migration, atomic transaction, rollback, and idempotency values are recomputed rather than promoted to new authority. With the exact user attestation, provider account/resource/binding and production-only protected key configuration are represented as true, provider-binding readiness is `ready`, and migration execution eligibility is `eligible`.

These states do not authorize or imply execution. Database connection/schema inspection, persistent pre-state read, migration application, runtime/migration role creation, backup/PITR verification, production write authority, normalized persistence, persistent request closure, and overall production readiness all remain false, absent, or `not_ready`.

Run `py -3 -B scripts/source-sandbox/preview_neon_provider_binding_readiness_v113.py --self-test`. It recomputes v108–v112, validates four pure APIs, runs 17 fail-closed cases, parses 34 first/replay JSON artifacts, and requires byte-identical replay. All network, external-metadata, secret, environment, integration, database, migration, role, write, persistence, queue, deployment, PR, merge, and production-effect counters remain zero.
