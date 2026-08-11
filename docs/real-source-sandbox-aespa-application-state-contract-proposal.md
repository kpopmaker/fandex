# AESPA application state contract proposal

## Purpose, authority, and provenance

v64 returned `not_ready` because history defines validation, lineage, classifications, and abstract `would_record_*` effects, but not persisted transitions, write targets, audit records, concurrency, or recovery. v65 supplies the smallest coherent proposal needed for a future separately reviewed local copied-state simulation.

v65 is a proposal, not historical authority. v65 does not apply decisions. v65 does not mutate AESPA state. v65 does not write audit/application records. v65 does not authorize production. Any v65 transition semantics are newly proposed FANDEX semantics unless explicitly marked `historical_existing`.

Every semantic value uses one of four machine-readable provenance labels: `historical_existing`, `proposed_v65`, `unresolved`, or `not_applicable`. Historical vocabulary, validation, classification, and abstract effects retain historical provenance. State outcomes, lifecycle, persistence rules, logical writes, concurrency, and recovery are proposals. Physical storage and production authorization remain unresolved.

## Historical evidence

| Evidence | SHA-256 |
|---|---|
| v64 plan implementation | `4163751ee4510d573985b895a55b4c4b23f67d060a76e579bfee714cc70602c6` |
| v64 plan contract | `e0badb8515cb00ca78d4201666f2b1f73e9f1ab89302b63da24a81a1397be4d0` |
| Historical validator | `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31` |
| Decision template builder | `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819` |
| v58 application dry-run | `fa4e59b18d1a8bddf50c1244175e358b736569b11aeb5ff2a7434a045a3f4d81` |
| v61 intake | `ad1ba38a4ac37d71445626978e92aae1271383cc10dfd3d90e7ccf40c7bf90aa` |
| v62 staging | `720f13ceb4c75e799e5a41554c6454f0b8b800ab722361b58f7626610eb758ee` |
| v63 authorization gate | `7e695faed8673af25e96e80842cabee68d70129b996903c3dc28fdebdec2702f` |
| Historical input contract | `0a3706684c19f4c86589a1ad99039256f9c7d1aa6bc62f8d2d054cdac147a07c` |
| Historical dry-run contract | `d76a820d160916e6b90a8648ced00aee6c879c3c0222c3d2b4f785978e8c4120` |

The historical vocabulary remains `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. `not_decided` remains `no_action`; every explicit valid intent remains `would_require_explicit_application`. Corresponding historical effects are `no_change`, `would_record_approval_decision`, `would_record_exception_acceptance`, `would_record_rejection`, `would_record_deferral`, and `would_record_enrichment_request`. These labels are not treated as persisted transitions.

## Proposed state and transition model

Human `decision_intent` remains separate from application execution `application_status`. The proposed application lifecycle is:

- `prepared`: upstream validation/gate and expected-state checks passed; may become `applied`, `failed`, or `conflict`.
- `applied`: all logical writes succeeded atomically; terminal.
- `failed`: a non-conflict failure caused no application writes; re-entry to `prepared` requires fresh validation, gating, and state fingerprint.
- `conflict`: duplicate, stale, or already-applied checks failed with no application writes; re-entry has the same fresh-validation requirement.

The proposal matrix is:

| Historical intent | Historical effect | Proposed outcome | Proposed queue behavior | Source/downstream |
|---|---|---|---|---|
| `not_decided` | `no_change` | no application | preserve `pending_review` | unchanged/disconnected |
| `approve_candidate` | `would_record_approval_decision` | `candidate_approved` | `resolved` | unchanged/disconnected |
| `accept_exception` | `would_record_exception_acceptance` | `exception_accepted` | `resolved` | unchanged/disconnected |
| `reject` | `would_record_rejection` | `rejected` | `resolved` | unchanged/disconnected |
| `defer` | `would_record_deferral` | `deferred` | active `deferred` state | unchanged/disconnected |
| `request_enrichment` | `would_record_enrichment_request` | `enrichment_requested` | active `enrichment_requested` state | unchanged/disconnected |

Resolved items are not reopened in place. A future reopen requires a separately defined operation and a new validated decision input. Defer keeps the review active without requiring enrichment fields; enrichment-request keeps it active with historically validated requested-enrichment fields. Duplicate re-application is governed by idempotency and conflict rules.

Application decision state and source eligibility are separate concerns. The proposal keeps source eligibility unchanged for every intent. It also disconnects scoring, ranking, charts, public data, and app data. Any future connection needs another reviewed contract and explicit authorization.

## Proposed application record and metadata

The logical application record requires `application_id`, the seven lineage identifiers, `decision_intent`, `decision_outcome`, `application_status`, reviewer identity and review time, rationale codes, input hash, expected historical-state hash, and proposal-contract version. `requested_enrichment_fields` is conditional on `request_enrichment`; `applied_at` is conditional on `applied`; failure reason is conditional on `failed` or `conflict`. v65 generates no timestamps or records—future timestamps must be validated ISO-8601 values supplied by the future executor.

For explicit intents, `reviewer_id`, `reviewed_at`, and rationale codes are proposed as required persisted metadata. `reviewer_note` remains optional, may exist only in a restricted canonical record, and must be omitted from safe summaries. `not_decided` preserves historical null/empty metadata and creates no application record.

## Idempotency, stale state, transaction, and audit

The proposed deterministic application ID is SHA-256 over the ordered canonical combination of contract version, decision input/preview IDs, queue/gate/source IDs, decision intent, input hash, and expected historical-state hash. An identical retry of an applied application returns the existing result without writes. A same-key/different-payload attempt fails as conflict. A different decision against an already resolved target also conflicts until a separate reopen and new validated input exist.

Optimistic concurrency uses a SHA-256 fingerprint of minimal canonical target state: linkage, queue status, current decision status, and existing application identity. It is compared immediately before the logical atomic application. Mismatch produces `conflict` and no logical writes.

Successful application atomically covers the logical application record, decision-outcome state, review-queue state, and audit event. Partial success is forbidden. This is a logical boundary only; no physical database, file, service, or provider is selected.

The proposed audit event carries application and target identity, reviewer identity, intent, before/after fingerprints, contract version, result, and conditional failure reason. Successful audit and application state share one atomic logical boundary. Failure/conflict attempt evidence requires an independently atomic audit-only record in a future implementation; v65 writes none.

Atomic success avoids application-state rollback machinery. Validation/state conflict fails closed. Failed/conflicting retries require fresh upstream validation and fingerprinting. Identical applied retries are idempotent. The physical transaction mechanism, deployment, operations, and production authorization remain unresolved production concerns.

## v64 blocker resolution and readiness

All seven blockers are `proposed_resolved` for contract-level local simulation:

| v64 blocker | v65 proposal section | Blocks future local simulation |
|---|---|---|
| `missing_concrete_decision_transition` | state vocabulary and transition matrix | no |
| `missing_queue_transition` | transition matrix | no |
| `missing_persisted_decision_schema` | application record schema | no |
| `missing_write_target` | logical transaction boundary | no |
| `missing_audit_schema` | audit contract | no |
| `missing_idempotency_semantics` | idempotency and stale-state rules | no |
| `missing_failure_recovery_semantics` | failure/retry policy | no |

Therefore `future_local_simulation_contract_readiness` is `ready_for_separate_simulation_implementation`. This authorizes nothing and only means a future v66 may implement a copied-state simulation using the reviewed proposal. `production_application_readiness` remains `not_ready`.

## Determinism and zero effects

Run `py scripts/source-sandbox/preview_aespa_application_state_contract_proposal.py` or add `--self-test`. Runtime artifacts remain beneath ignored `tmp/source-sandbox/naver/aespa-application-state-contract-proposal*` directories.

The self-test passed 36 checks. First/reproduction SHA-256 pairs are:

- proposal: `8332e8c57a3c0e652ea0b015d73105fc5bcb2935499237fbdb8a3d74058c179d`
- transitions: `b57f40819cf2e9dd39407e86a24febf5ce6c5beb920c3ce65fa71ac1b445f59a`
- blocker resolution: `a2c97f77a0d858c128af38ff0d6a0d59602ea842371163bb34024aa9f59949d3`
- validation: `0fae6a4bf5aba06a8e3671d53905963eb1b57f4878af465f815da3783f74ecd7`

Historical state remains 1,000 templates, 1,000 `pending_review`, and 1,000 `not_decided`, with zero actual submissions, approvals, rejections, decided records, applications, and audit records. Application execution/simulation, source/queue/decision mutation, audit writes, production mutation/effect, and external writes are all zero.

Tracked scope is exactly the proposal contract, preview implementation, and this document. v65 stops at proposal generation, provenance separation, blocker resolution, readiness derivation, and STOP.
