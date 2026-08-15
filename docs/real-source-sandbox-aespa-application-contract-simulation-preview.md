# AESPA application contract copied-state simulation preview (v67)

v64 stopped because the historical FANDEX modules did not define concrete application transitions. The first attempted simulation also stopped because v65 remained a proposal at a logical level and did not pin every executable choice. v66 supplied the missing intent/outcome and queue mappings, deterministic `applied_at`, canonical hashing, and exact `copied_state_v1` paths. v67 therefore simulates that tracked proposal without treating it as historical behavior.

## Authority and boundary

The sole transition authority is the v66 executable-semantics contract, SHA-256 `7617fb6afe91a05f8b13007ff83a86ebfe2266898b46e308cdea732d7f372225`, whose local-simulation readiness is `ready`; its historical and production authority are false and production readiness remains `not_ready`. Historical modules are used only for vocabulary, validation, metadata requirements, linkage, and current-state facts. v65 contributes only fields explicitly marked `proposed_v65`. Runtime transformations are `simulated_from_proposed_v66`; fixtures are `controlled_fixture_only`.

The copy contains `/identity`, `/decision`, `/review_queue`, `/source`, and `/application`. Its seven identity paths are immutable. Only the ten paths in `v66.copied_state_schema.proposal_mutable_paths` may change. Historical state and both local input files are hashed before and after; runtime JSON is written only under the ignored first/repro tmp directories.

## Executed semantics

| intent | outcome | queue | result |
|---|---|---|---|
| `not_decided` | null | `pending_review` | `no_action` |
| `approve_candidate` | `candidate_approved` | `resolved` | `applied` |
| `accept_exception` | `exception_accepted` | `resolved` | `applied` |
| `reject` | `rejected` | `resolved` | `applied` |
| `defer` | `deferred` | `deferred` | `applied` |
| `request_enrichment` | `enrichment_requested` | `enrichment_requested` | `applied` |

Actionable cases require an explicit `application_context.applied_at` matching strict UTC `YYYY-MM-DDTHH:MM:SSZ`; there is no time fallback. `not_decided` forbids it and creates neither application nor audit evidence. The v66 `sha256_canonical_json_array_v1` serializer and every tracked test vector are checked. The expected-state fingerprint uses the exact ten-field v66 order. A mismatch returns `conflict` without a mutable change.

Application identity uses the exact nine-component v66 order. An identical retry returns `idempotent_existing_result`; a different identity for the same target returns `conflict`. The 20-field application record and 14-field audit event are assembled in contract order. `reviewer_note` remains in the private preview record and is excluded from safe summaries. Application record, decision, queue, and audit construction share one logical atomic boundary; injected component failure discards the working copy.

Every successful diff reports changed paths, unchanged identities, before/after hashes, intent, and provenance. Source eligibility is asserted unchanged, and score, ranking, chart, public-data, and production mutation counters remain zero.

## Validation evidence

Self-test covers the six intents, exact retry, conflicting retry, stale fingerprint, missing/invalid context, broken lineage, missing metadata, unsupported intent, multiple/malformed input parsing guards, atomic component failure, immutable tamper, outside-allowlist mutation, and v66 readiness/hash tamper guards. First and reproduction trees are independently generated and compared. Real counts remain 1,000 templates, 1,000 pending reviews, 1,000 `not_decided`, and zero submissions, approvals, rejections, decided items, applications, or audits. All real-effect counters are zero.

v67 does not prove historical application behavior. v67 simulates the v66 proposed executable FANDEX contract. No real AESPA decision was applied. No real application record or audit event was written. No historical queue, source, or decision state changed. No scoring, ranking, chart, or public data changed. Production application readiness remains `not_ready`.

If these local guarantees hold, v68 may define an application persistence interface and execution-readiness plan, including the adapter boundary and write preconditions. It must still perform no production writes.
