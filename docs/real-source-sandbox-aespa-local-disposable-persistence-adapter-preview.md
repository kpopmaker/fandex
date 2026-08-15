# AESPA local disposable in-memory persistence adapter preview (v69)

v65 proposed application-state semantics, v66 froze executable semantics, v67 validated them on copied state, and v68 defined a provider-neutral persistence interface with three operations and declared a separate local disposable adapter implementable. v69 validates that interface using one explicit, process-local adapter instance.

## Authority and implementation boundary

v66 remains the application-semantics authority; v68 alone defines persistence behavior; v67 supplies controlled fixture/proof evidence. v69 is `validated_v69_local_adapter`, not historical or production authority. The adapter receives resolved decision and queue values. It contains no intent-to-outcome or intent-to-queue business mapping.

The exact operations are `read_application_target`, `lookup_application_by_id`, and `apply_application_atomically`. The instance owns three dictionaries: targets, immutable application records, and immutable linked audits. There is no module-global store and no state crosses adapter instances or process exit.

Target reads return only canonical `copied_state_v1` state plus the exact v66 fingerprint and do not mutate state. Lookup returns not-found or the canonical application and digest. Atomic apply validates the v68 request, target linkage, deterministic identity, current fingerprint, and complete tentative result.

Atomicity uses deep-copy transaction state followed by one live-store swap after all checks pass. The atomic set is application record, supplied decision outcome, supplied five-field queue state, and audit event. Five controlled self-test failpoints cover every staging boundary; all discard the working copy. Source state is read-only and source-write or extra-path requests are rejected.

CAS recomputes the v66 fingerprint immediately before tentative mutation. A mismatch returns `stale_state_conflict` with no writes. An exact retry returns `idempotent_existing_result` without another application, audit, decision, or queue write. Another deterministic identity for an already-applied target returns `conflicting_duplicate`. Unknown-commit recovery is tested by committing once, discarding the caller result conceptually, then finding the identical application ID and payload without a second write.

Read-after-write verification independently reads the target and application, recomputes the post-state fingerprint, checks exact decision/queue state, confirms application/audit linkage, and confirms source equality. The stored application has exactly the v66 20 fields and the audit has exactly 14. Reviewer notes remain absent from safe summaries.

## Disposal, persistence, and safety

Adapter A receives one application; independently created adapter B contains only its explicit initial target and no application from A. Semantic state is never written to files, databases, SQLite, Supabase, or external storage. Ignored tmp JSON files are deterministic evidence reports only and are counted separately from semantic persistence.

Historical AESPA state remains 1,000 templates, 1,000 pending reviews, and 1,000 `not_decided`, with zero actual submissions, decisions, application records, and audits. All real, database, semantic-filesystem, source, score, ranking, chart, public-data, production, and external-write counters remain zero. First and reproduction runs create matching canonical SHA-256 evidence.

`local_disposable_adapter_conformance` is `passed`, and `future_local_end_to_end_execution_orchestrator_readiness` is `ready_for_separate_orchestrator_implementation`. Production persistence remains `not_ready`; local adapter conformance is not production readiness.

**v69 does not implement production persistence.**

**v69 does not use Supabase, a database, or filesystem semantic persistence.**

**v69 stores test application state only in process-local memory.**

**v69 does not perform a real AESPA application or mutate historical AESPA source, queue, or decision state.**

**v69 does not write real application or audit records or change FANDEX scoring, rankings, charts, public data, or production state.**

If these guarantees remain valid, v70 may separately orchestrate controlled input validation, v66 transition resolution, v68 request construction, and v69 in-memory execution while every real effect remains zero.
