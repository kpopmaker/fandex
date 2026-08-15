# AESPA real-source shadow execution preview (v71)

v66 froze executable application semantics, v68 defined persistence, v69 validated process-local storage, and v70 composed historical validation through verified in-memory evidence. v71 applies that reviewed path to exactly one real existing AESPA historical review target while the decision remains controlled and shadow-only.

“Real source” means real immutable source identity, queue/gate/input lineage, source metadata, and current pending/`not_decided` state. It does not mean a real human decision, application, audit, mutation, or production execution.

## Selection and controlled decision

The local historical builders produce 1,000 targets; all 1,000 satisfy pending, `not_decided`, blank-template, and v63 compatibility requirements. Candidates are explicitly sorted by the seven immutable lineage fields—decision input, decision preview, queue, gate, internal source, artist, and source type—and index zero is selected. The safe identity is emitted at runtime without raw source text or URLs.

The selected target’s gate rule is intersected with the v66 vocabulary, `not_decided` is excluded, the actionable set is lexicographically sorted, and index zero is chosen. With the current `exception_review_required` target this deterministically selects `accept_exception`. Reviewer ID and timestamp are visibly synthetic; the rationale is the first historical allowed rationale for that intent. The fixed application time is `2026-02-03T04:05:06Z`. The controlled submission is labeled `controlled_fixture_only`, `shadow_decision_only`, `not_real_human_decision`, `not_historical_decision`, and `not_production`.

## Execution and evidence

v71 imports the SHA-pinned public v70 orchestration surface. It does not implement validation, transitions, request construction, CAS, persistence, application records, or audits. v70 continues to use the validated v69 adapter. The real historical target supplies all lineage values; semantic after-state exists only in that fresh adapter.

The safe historical-before snapshot records identity and pending/`not_decided` state. After the shadow apply, public v69 reads prove the in-memory application, audit, decision transition, queue transition, state fingerprint, source equality, and immutable identity. This is labeled `shadow_after`, never historical after-state. Historical artifacts are rebuilt and byte-hashed afterward; the real target and all 1,000 historical counts remain identical.

Runtime evidence contains only safe IDs, statuses, counts, contract metadata, hashes, and digests. Reviewer notes, raw submissions, source bodies, and unnecessary URLs are excluded. No SQLite, Supabase, database, network, or semantic filesystem persistence exists; ignored tmp JSON is evidence only.

v71 uses one real existing AESPA historical review target. It does not make a real human decision and uses a controlled shadow-only decision for self-test. It does not write the result back, mutate source/queue/decision state, write real application/audit records, or alter scores, rankings, charts, public data, or production. The real historical target remains unchanged.

`real_source_shadow_execution_conformance` is `passed`; `future_explicit_human_shadow_decision_readiness` is `ready_for_separate_explicit_human_shadow_run`. Production persistence and execution remain `not_ready`. Real-source shadow conformance is not production readiness.

If these guarantees hold, v72 may require an explicitly supplied human-authored local shadow submission for the same deterministic real target; it must not generate that decision and must retain in-memory-only, zero-real-effect execution.
