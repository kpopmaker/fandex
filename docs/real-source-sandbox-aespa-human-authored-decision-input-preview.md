# AESPA human-authored decision input intake preview

## Purpose and non-goals

v61 establishes a local, read-only intake boundary for one human-authored JSON submission. It parses the input, resolves exactly one historical AESPA lineage target, invokes the historical decision validator, classifies the intake, and stops before application. A valid v61 intake is NOT an applied decision. A valid v61 intake does NOT alter the AESPA review queue. A valid v61 intake does NOT authorize production use. Synthetic self-test decisions are not real human decisions.

The stage performs no approval, rejection, submission recording, source/review/decision mutation, external write, or pipeline authorization. It never writes into v57–v60 artifacts.

## Historical schema reuse

The authoritative validator remains `scripts/source-sandbox/validate_human_review_decisions.py` (SHA-256 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`). Templates remain defined by `scripts/source-sandbox/prepare_human_review_queue.py::decision_template` (module SHA-256 `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`). Reused helpers are `decision_template`, `contract_errors`, `validate_entry`, and `canonical_bytes`; historical main routines are not executed.

The confirmed historical vocabulary is `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. All current AESPA gates are `exception_review_required`, making `accept_exception` the approval-equivalent value and `reject` the rejection-equivalent value. Required schema fields are `internal_source_id`, `gate_id`, and `decision_intent`; explicit decisions require `reviewer_id` and `rationale_codes`. Optional metadata is `reviewer_note`, `reviewed_at`, and `requested_enrichment_fields`.

## Local input and workflow

Run `python scripts/source-sandbox/preview_aespa_human_authored_decision_input.py --submission-file tmp/source-sandbox/<local-file>.json`. The path must resolve beneath `tmp/source-sandbox`, have a `.json` suffix, and contain exactly one object. No URL, stdin, network, database, tracked source, app, or public input is accepted.

The object carries the historical decision fields plus `decision_input_id`, `decision_preview_id`, `queue_id`, `gate_id`, `internal_source_id`, `sandbox_artist_key`, and `source_type`. Each linkage value must resolve uniquely and all must identify the same v59 record. The script hashes the submission and all v59 first/repro inputs before and after processing, validates historical vocabulary, gate compatibility, reviewer metadata, rationales, and timestamp shape, writes only ignored local evidence, and reports either `valid_local_human_authored_decision_input_preview` / `eligible_for_local_validation_only` or a fail-closed invalid result. Safe summaries exclude reviewer notes; the full representation stays only in ignored tmp output.

## Self-test and safety evidence

`--self-test` creates only marked synthetic fixtures under ignored tmp directories. It covers valid `accept_exception`, valid `reject`, unsupported vocabulary, missing reviewer metadata, broken linkage, multiple submissions, malformed JSON, input/historical immutability, real-state preservation, zero effects, ignored outputs, the tracked-file allowlist, and first/repro determinism.

The checked self-test passed 24 checks across five intake cases. Canonical first/repro SHA-256 is `d89ad2f33f00b9caabd2fc298ad0c13f48ad08da9ea9b076a24a438040144680` for both; validation first/repro SHA-256 is `03e85ddcca42338fcc10b653d7130718db20129d5bd5dccab528f598f7e5f5f0` for both.

The real historical state remains 1,000 templates, 1,000 `pending_review`, 1,000 `not_decided`, zero actual submissions, approvals, rejections, and decided records. Source, queue, and decision mutations; decision applications/executions; production mutations/effects; and external writes all remain zero.

Runtime inputs and outputs live only under `tmp/source-sandbox/naver/aespa-human-authored-decision-input*` and remain ignored. The contract, script, and this document contain no real human submission. A later stage may introduce a separately controlled acceptance/staging boundary, but v61 ends after parsing, linkage verification, historical validation, and intake classification.
