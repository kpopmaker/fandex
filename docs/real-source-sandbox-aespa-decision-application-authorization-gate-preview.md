# AESPA decision application authorization gate preview

## Purpose and boundary

v63 accepts exactly one local JSON submission compatible with v61, rebuilds its v62 runtime-only staging candidate, checks the historical target state and known application classification, reports eligibility for a future local application simulation, and stops. A positive v63 gate result is NOT an applied decision. A positive v63 gate result is NOT production authorization. No real approval or rejection was recorded. No AESPA review or decision state changed. No source data changed. Synthetic gate fixtures are not real human decisions.

The stage does not record a submission or authorization, persist a staged decision, apply an intent, mutate source/review/decision state, contact a service, or execute production behavior. Runtime output is evidence only and remains beneath ignored `tmp/source-sandbox` paths.

## Historical reuse and semantics

The authoritative validator is `scripts/source-sandbox/validate_human_review_decisions.py` (SHA-256 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`). The decision template builder is `scripts/source-sandbox/prepare_human_review_queue.py::decision_template` (module SHA-256 `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`). v61 intake is imported from `scripts/source-sandbox/preview_aespa_human_authored_decision_input.py` (SHA-256 `ad1ba38a4ac37d71445626978e92aae1271383cc10dfd3d90e7ccf40c7bf90aa`). v62 staging is imported from `scripts/source-sandbox/preview_aespa_human_decision_acceptance_staging.py` (SHA-256 `720f13ceb4c75e799e5a41554c6454f0b8b800ab722361b58f7626610eb758ee`). The v58 boundary is `scripts/source-sandbox/preview_aespa_decision_application.py` (SHA-256 `fa4e59b18d1a8bddf50c1244175e358b736569b11aeb5ff2a7434a045a3f4d81`). Historical main routines are never executed.

Reused pure helpers include v61 `context`, `ensure_local_submission_path`, `parse_one`, and `evaluate`; v62 `context`, `validator_linkage_fields`, and `build_staging`; validator `validate_entry`, `canonical_bytes`, and `digest`; and builder `decision_template` through v61 context verification.

The code-confirmed vocabulary is `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. Historical validation maps only `not_decided` to `no_action`; every other valid intent maps to `would_require_explicit_application`. v63 preserves this classification, including `defer` and `request_enrichment`, without executing their behavior.

## Boundaries and preconditions

The v61 boundary requires an existing `.json` file under `tmp/source-sandbox`, exactly one object, valid schema and reviewer metadata, and exactly one consistent historical match across `decision_input_id`, `decision_preview_id`, `queue_id`, `gate_id`, `internal_source_id`, `sandbox_artist_key`, and `source_type`. Missing, duplicate, ambiguous, cross-record, or conflicting linkage fails closed.

The v62 boundary requires valid v61 intake, re-resolves the seven linkage fields exactly once, invokes the historical validator, and accepts only the known `no_action` or `would_require_explicit_application` classifications. Its staged representation remains runtime-only, unpersisted, not applied, and not for production.

Historically required v63 preconditions are: valid v61 intake/schema/metadata/linkage; valid v62 staging; a known historical application classification; and a uniquely matched target whose queue is still `pending_review`, whose current decision is `not_decided`, and whose historical submission template remains blank and `not_decided`. These state rules come from the v59 lineage checks used by v61 and the template builder, rather than newly invented application permissions. There is no historical applied-decision store to query; the verified blank target and the zero historical decided/application counts are the available conflict evidence.

Wrapper safety preconditions are: local-path containment; exactly one input object; SHA-256 equality before/after; immutable hashes for the four v59 lineage artifacts; pinned hashes for every reused implementation; deterministic canonical serialization; ignored tmp-only output; exact tracked-file allowlisting; known classification only; and fail-closed handling of invalid, ambiguous, or incompatible state.

An actionable valid candidate receives `eligible_for_future_local_application_simulation_only`. A valid `not_decided` candidate receives `not_eligible_non_action`. Invalid, ambiguous, or state-incompatible input receives `not_eligible_validation_failure`. Every result states `application_executed=false`, `authorization_persisted=false`, and `production_authorization=false`.

## CLI, runtime evidence, and tests

Run normal mode with:

`py scripts/source-sandbox/preview_aespa_decision_application_authorization_gate.py --submission-file tmp/source-sandbox/<local-file>.json`

(`python` is equivalent where the system Python command is configured.) Run deterministic fixtures with `--self-test`. Outputs are written only to `tmp/source-sandbox/naver/aespa-decision-application-authorization-gate/`; reproduction outputs use the matching `-repro` directory. The safe summary does not expose `reviewer_note`. The canonical ignored record may retain metadata needed for local validation.

The self-test passed 35 checks across eight gate cases: actionable `accept_exception`, actionable `reject`, valid no-action `not_decided`, unsupported intent, broken linkage, missing reviewer metadata, a copied synthetic historical-state conflict, and copied synthetic duplicate/ambiguous linkage. Separate malformed-JSON and multiple-submission inputs fail during parsing. Every fixture is marked controlled, synthetic, not a real human decision, authorization-gate-preview-only, not applied, and not for production.

Deterministic SHA-256 pairs are:

- canonical first/reproduction: `7aee4e549f172db0b44d68b02d3e802ab103c80ff4ecccd74d72382f7b68c9e6`
- validation first/reproduction: `ac306db56e9d0c3f9ca61dbd5348c7e59f4e5a84900684dd55e9ce42be550498`
- authorization-gate evidence first/reproduction: `ab4cc64af80c2a2696c15538f80f1d8c81561296afc3e4b003c2c2d5c9f1ea9f`

## Real state, effects, and next stage

Verified historical AESPA state remains 1,000 templates, 1,000 `pending_review`, and 1,000 `not_decided`, with zero actual submissions, approvals, rejections, decided records, staged decision records, and authorization records. Persisted authorization, decision application, source mutation, review-queue mutation, decision-state mutation, production mutation/effect, and external-write counts are all zero. Runtime gate outputs are not persisted authorization records.

Tracked scope is exactly the v63 contract, implementation, and this document. A later separately authorized stage may implement a strictly controlled local application simulation against synthetic or copied sandbox state. It must not mutate historical real AESPA state without separate explicit authorization. v63 ends at validated human-authored input, validated staging candidate, state/precondition check, future local application-simulation eligibility, and STOP.
