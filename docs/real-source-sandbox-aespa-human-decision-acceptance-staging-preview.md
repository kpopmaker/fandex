# AESPA human decision acceptance staging preview

## Purpose and boundary

v62 transforms one v61-valid local JSON intake into a deterministic, runtime-only staging representation and then stops. A staged candidate is NOT an applied decision. No real approval or rejection was recorded. No real AESPA decision state changed. No production action occurred. Synthetic staging fixtures are not real human decisions.

The stage does not record a submission, persist staging, mutate source/queue/decision state, execute application, or authorize production. It never writes into v57–v61 artifacts.

## Historical reuse and discovered semantics

The authoritative validator is `validate_human_review_decisions.py` (SHA-256 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`), with blank templates from `prepare_human_review_queue.py::decision_template` (module SHA-256 `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`). v61 intake behavior is imported from `preview_aespa_human_authored_decision_input.py` (SHA-256 `ad1ba38a4ac37d71445626978e92aae1271383cc10dfd3d90e7ccf40c7bf90aa`). The v58 application boundary is documented by `preview_aespa_decision_application.py` (SHA-256 `fa4e59b18d1a8bddf50c1244175e358b736569b11aeb5ff2a7434a045a3f4d81`). Historical main routines are not executed.

The confirmed vocabulary is `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. Historical application code classifies only `not_decided` as `no_action`; every other valid intent is `would_require_explicit_application`. Thus `defer` and `request_enrichment` remain application candidates under the historical code and are not reinterpreted by v62. For current AESPA `exception_review_required` gates, `accept_exception` is the approval-equivalent branch and `reject` is the rejection branch.

## Staging workflow and representation

Run `python scripts/source-sandbox/preview_aespa_human_decision_acceptance_staging.py --submission-file tmp/source-sandbox/<local-file>.json`. The imported v61 boundary requires one read-only JSON object beneath `tmp/source-sandbox`, validates decision metadata through the historical validator, and requires exactly one matching lineage across `decision_input_id`, `decision_preview_id`, `queue_id`, `gate_id`, `internal_source_id`, `sandbox_artist_key`, and `source_type`.

For valid intake, the historical validator's pure `validate_entry`, `canonical_bytes`, and `digest` helpers supply the effect and deterministic IDs; v58's explicit actionability rule supplies `actionability_status`. This avoids executing the historical time-bearing summary builder. The minimal ignored canonical record contains linkage IDs, decision intent, source/artist keys, validation and historical dry-run IDs, effect/classification, staging safety flags, and review metadata needed for inspection. Safe summary output omits reviewer note and all full submission content. The submission and v59 first/repro evidence are hashed before and after processing and must remain unchanged.

## Self-test, determinism, and zero effects

`--self-test` creates only marked synthetic tmp fixtures for actionable `accept_exception`, actionable `reject`, non-action `not_decided`, unsupported intent, broken linkage, and missing reviewer metadata. It also proves multiple submissions and malformed JSON fail closed. First/repro runs use fixed selection, timestamp, metadata, IDs, ordering, and canonical serialization.

The checked self-test passed 27 checks across six staging cases. Canonical first/repro SHA-256 is `503d19b8905ca21e3f2722a2d9385b05abfc61b276193a7362393b50db121c3d` for both; validation first/repro SHA-256 is `49888a5cfd1cec808425d2d59cb2e4c542db5c28dfb8e05c7bd750df0a6ebd36` for both.

The historical real state remains 1,000 templates, 1,000 `pending_review`, 1,000 `not_decided`, and zero actual submissions, approvals, rejections, or decided records. Persisted staging, application/execution, source/queue/decision mutation, production mutation/effect, external write, and production authorization counts are zero. Runtime candidates are not counted as real staged records.

Tracked scope is exactly the v62 contract, script, and this document. Inputs and outputs stay under ignored `tmp/source-sandbox/naver/aespa-human-decision-acceptance-staging*`. A later separately reviewed stage may simulate application or add an authorization gate; v62 ends at validated intake, deterministic staging candidate, historical application classification, and STOP.
