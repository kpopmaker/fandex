# AESPA local end-to-end execution orchestrator preview (v70)

The reviewed chain begins with historical validation and the v61 intake, v62 staging, and v63 local authorization boundaries. v66 is the sole transition authority, v67 proved its copied-state execution, v68 defined the three-operation persistence interface, and v69 validated the disposable process-local adapter. v70 connects those boundaries without adding business or persistence semantics.

## Authority, stages, and inputs

The deterministic order is load local inputs; historical, intake, staging, and authorization validation; exact target resolution; v66 initial-state and transition resolution; v68 request construction; v69 initialization and atomic apply; persisted-evidence verification; and safe finalization. Each trace row contains only stage/status/provenance, digests, effect class, and a stable failure code.

Normal mode reads separate local submission and application-context JSON beneath ignored tmp storage. Both files are byte-hashed before and after and never copied into evidence. Historical validation and target resolution reuse the pinned v61/v62/v63 helpers and their 1,000-item deterministic local lineage. Exactly one target with pending queue and `not_decided` state is required.

The orchestrator indexes exactly one tracked v66 transition row. It contains no independent intent-to-outcome or intent-to-queue mapping. Actionable intents require explicit strict-UTC `application_context.applied_at`; no clock or metadata fallback exists. `not_decided` follows v66 no-action semantics: no atomic request, adapter mutation, application, audit, or applied time.

For actionable inputs, the exact 20-field application and 14-field audit records feed the nine-group v68 request. The expected fingerprint is recomputed from the initial `copied_state_v1`. Source/downstream writes are absent. v70 imports the hash-pinned v69 class, initializes it through its public constructor, and calls exactly one public atomic apply.

## Verification and safety

After apply, v70 independently calls public target read and application lookup, then inspects the public read-only snapshot for audit linkage. It verifies application/audit digests, decision and queue values, the advanced fingerprint, source equality, immutable identity, and single-application cardinality. Safe persisted evidence contains IDs, statuses, hashes, resolved state values, and provenance—never reviewer notes or raw source/submission data.

Self-test covers all six historical intents, exact no-action, validation/linkage/context failures, exact retry, conflicting duplicate, stale state, unknown-commit recovery, adapter rollback propagation, safe outputs, independent disposal, and first/reproduction determinism. An exact retry returns `idempotent_existing_result`; conflicts and stale state retain their exact v69 statuses. Unknown-commit recovery discards the immediate result conceptually and resolves the deterministic application ID without a duplicate.

All consumed modules/contracts are SHA-pinned. Historical and input bytes are unchanged. There is no SQLite, Supabase, database client, file registry, or semantic filesystem persistence; ignored tmp JSON is evidence only. Historical AESPA remains 1,000 templates, 1,000 pending reviews, and 1,000 `not_decided`, with zero actual decisions, applications, or audits. Every real/downstream/production counter remains zero.

`local_end_to_end_orchestrator_conformance` is `passed`; `future_real_source_shadow_execution_readiness` is `ready_for_separate_shadow_execution`. Production persistence and execution readiness both remain `not_ready`.

v70 does not execute production persistence, use Supabase or a real database, or persist semantic state to filesystem. It uses only the validated process-local v69 disposable adapter. It performs no real AESPA application, historical mutation, real application/audit write, or FANDEX score, ranking, chart, public-data, or production change. v70 conformance is not production readiness.

If these guarantees hold, v71 may separately execute exactly one explicit real-source shadow input against a fresh in-memory adapter while keeping historical artifacts and every real effect unchanged.
