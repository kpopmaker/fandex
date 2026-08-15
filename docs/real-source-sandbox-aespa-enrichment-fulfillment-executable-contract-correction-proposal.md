# AESPA enrichment fulfillment executable contract correction proposal (v76)

## Why the adapter stopped

The attempted local disposable adapter correctly stopped because two merged v75 clauses could not be implemented together. This stage is a narrow correction proposal, not an adapter. It uses v75 as the baseline and supersedes only explicitly listed contradictory clauses; v72 field vocabulary/order, v73 target and human-request context, and v74 design provenance remain unchanged.

The first contradiction made planning both read-only and state-mutating. `build_enrichment_fulfillment_plan` says `mutates_state = false` and requires `state_unchanged`, while the lifecycle table required `requested → planned` on `plan_built` with mutation. Without that mutation, v75 also lacked a path for accepting valid evidence from `requested`.

The second contradiction required full evidence identity verification before acceptance while also requiring a changed payload carrying an already stored ID to return `conflicting_duplicate`. The changed payload necessarily hashes to a different ID, so identity-first ordering made the collision result unreachable.

## Corrected planning and lifecycle

Planning remains read-only because that is the established operation and real-target intent. `planned` is retained only as `derived_plan_status_only` in the plan output. It is not stored in persistent lifecycle, does not affect completion, and is not an acceptance precondition. Repeated planning over identical state returns identical output and changes nothing.

Persistent lifecycle uses `requested`, `not_attempted`, `evidence_available`, `partially_satisfied`, `satisfied`, `unavailable`, and `failed`. A distinct, fully valid controlled evidence envelope may transition directly from `requested` to `evidence_available`; no prior plan call is required. Evaluation then derives `not_attempted`, `partially_satisfied`, or `satisfied` from the unchanged v75 completion rules. Context-only attribution evidence can move `evidence_available` to `not_attempted`, avoiding disagreement between lifecycle and completion. `unavailable` and `failed` remain future-authorized-external outcomes only.

## Corrected duplicate ordering

`validate_enrichment_evidence` remains stateless and performs full v75 envelope validation, including content digest and evidence identity. It does not classify duplicates.

`accept_controlled_enrichment_evidence` owns state-dependent duplicate classification. It first closes the input schema and checks target/request binding. It then looks up the supplied ID among accepted controlled evidence. A matching ID with identical canonical payload excluding the ID is `idempotent_exact_duplicate`; a matching ID with different canonical payload is `conflicting_duplicate`. Both preserve stored evidence and make zero semantic change. Only an ID with no collision enters full new-evidence validation, where the v75 content-digest and evidence-ID recomputations remain strict.

This ordering deliberately makes a changed collision payload return `conflicting_duplicate`, even though recomputing that changed payload would yield another ID. It does not weaken identity checks for new evidence.

## Status precedence and operation audit

The correction freezes deterministic precedence: type, schema, target, request, acceptance-only duplicate collision, requested-field/semantic compatibility, source class, locator, external non-executability, unsafe full body, retention, excerpt bound, digest, identity, then valid. Collision classification cannot bypass schema or lineage binding.

All six public operations were re-audited. Inspection, planning, validation, and safe-result reading are read-only. Acceptance mutates only for a distinct fully valid envelope. Completion evaluation updates only derived lifecycle/completion paths. Their v75 closed schemas and status vocabularies remain unchanged, with the corrected responsibilities and lifecycle interaction recorded in the machine-readable consistency matrix.

## Authority and unchanged boundaries

The authority strategy is `v75 baseline + narrow v76 corrections`; v76 wins only for its explicit supersession list. Request identity, new-evidence identity canonicalization, content digest, locator rules, compatibility, local precedence, content and attribution completion, 1,000-code-point excerpt maximum, retention safety, external non-executability, human re-review, and safe results remain unchanged.

No adapter was implemented. No enrichment was executed. No article was retrieved. No historical state changed. There was no Naver, MyDaily, external service, Supabase, database, persistence, approval, rejection, production, scoring, ranking, chart, or public-data effect.

When pure validation and deterministic reproduction pass, the correction conformance is `passed` and a separate v77 adapter stage is ready. v77 must consume the v75 baseline plus this correction, remain controlled-fixture-only and process-local, and keep network, historical writes, and production effects at zero.
