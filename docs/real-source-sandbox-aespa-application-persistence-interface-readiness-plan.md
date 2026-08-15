# AESPA application persistence interface readiness plan (v68)

v64 stopped because historical application semantics were insufficient. v65 proposed logical application semantics, v66 made those semantics executable, and v67 validated all six intent rows on isolated copied state: five deterministic applications, exact `not_decided` no-action behavior, 20-field application and 14-field audit records, fingerprint conflict protection, idempotency, atomicity, path restrictions, and zero historical or real effects.

v68 defines only the provider-neutral logical boundary needed to materialize an already-validated v66/v67 result. Its authority is `proposed_v68`; it does not upgrade v65/v66 proposals or v67 simulation evidence into historical behavior.

## Interface boundary

The adapter owns state reads, precondition checking, deterministic-id lookup, atomic persistence, and canonical result reporting. It never maps intent to outcome, derives queue behavior, changes source eligibility, or invokes scoring, ranking, charts, public data, or production publication. No physical provider is selected.

The smallest interface has three operations:

1. `read_application_target` returns a complete `copied_state_v1` logical snapshot and v66 fingerprint.
2. `lookup_application_by_id` returns not-found or the canonical application payload and digest. It supports ordinary idempotency and unknown-commit recovery.
3. `apply_application_atomically` owns the compare-and-set, idempotency recheck, four logical writes, commit/abort, and canonical result in one provider transaction boundary. A multi-step public write API was rejected because it exposes partial-write and TOCTOU opportunities.

The target read contains identity, decision, review queue, source, and application sections, including all ten v66 fingerprint inputs. Source eligibility is read-only; hidden fingerprint inputs are forbidden.

## Preconditions and transaction

The atomic request contains interface/semantic versions, target identity, expected fingerprint, deterministic idempotency identity and canonical payload digest, the exact v66 application record, the already-resolved decision outcome, the already-resolved five-field queue transition, and exact v66 audit event. Raw source payloads are excluded. The adapter stores these values and cannot rederive business rules.

Immediately before mutation, the adapter canonicalizes persisted logical state to `copied_state_v1` and compares the exact v66 fingerprint. Mismatch returns `stale_state_conflict` and commits nothing. It then resolves the deterministic application ID: not found permits one atomic application; an identical canonical payload returns `idempotent_existing_result`; conflicting identity or payload returns `conflicting_duplicate`.

The all-or-nothing set is application record, decision outcome, review queue state, and audit event. Any component or commit failure aborts the complete set. Success returns the canonical committed snapshot, advanced v66 state fingerprint, application digest, and audit digest. A separate read-after-write operation is unnecessary because the atomic result supplies equivalent canonical evidence.

## Errors and retry

The stable vocabulary distinguishes invalid request, stale state, conflicting identity, unavailable persistence, atomic commit failure, unknown commit outcome, and unexpected provider failure. Provider exception strings never become semantic results. There is no retry loop. Availability failures may be retried after recovery; stale or conflicting decisions require intervention. Unknown commit outcome requires lookup by deterministic application ID before retry: identical payload returns the existing result, mismatch conflicts, and not-found permits one fresh atomic attempt. A retry must never create a second application.

Reviewer notes remain restricted, absent from safe summaries and logs. Future provider metadata remains outside the semantic contract and canonical application identity unless separately reviewed.

## Readiness and safety

All twelve interface-completeness rows are defined: target read, expected-state compare, idempotency lookup, atomic request, four persistence components, commit, abort, canonical result, and unknown-commit recovery. The logical semantics, interface, atomicity, idempotency, stale-state, and audit dimensions are ready. Therefore `future_local_disposable_persistence_adapter_readiness` is `ready_for_separate_adapter_implementation`.

Production persistence remains `not_ready`. Open production concerns include provider selection, authentication and authorization, secrets, migrations, durability, backup/recovery, observability and alerts, retention, privacy/access policy, deployment, rollback, transaction guarantees, and production authorization. Local adapter readiness is not production readiness.

Historical AESPA state remains 1,000 templates, 1,000 pending reviews, and 1,000 `not_decided`, with zero submissions, decisions, applications, or audits. Every application, simulation, adapter-execution, write, mutation, downstream, production, and external-write counter is zero. First/reproduction plan artifacts use canonical JSON and matching SHA-256 hashes.

v68 does not implement persistence. v68 does not execute an application. v68 does not write an application record or audit record. It does not mutate AESPA decision, queue, source, score, ranking, chart, public, or production state. The persistence interface is provider-neutral and proposal-only.

If this contract remains valid, v69 may implement a strictly local in-memory disposable adapter using v68 as the sole persistence authority and v66 as the sole transition authority, with controlled fixtures and zero real effects.
