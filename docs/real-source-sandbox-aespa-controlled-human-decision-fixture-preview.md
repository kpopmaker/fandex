# AESPA controlled human decision fixture preview

## Purpose and boundary

v60 proves only that the historical decision schema validates two deterministic, synthetic local fixtures. The two explicit decisions are synthetic controlled fixtures only. They are not real decisions on the AESPA review queue. No real source state was modified. No production action was performed.

This stage does not perform human review or submission, apply a decision, authorize a pipeline, or mutate application/production state. Runtime artifacts exist only under ignored `tmp/source-sandbox/naver/aespa-controlled-human-decision-fixture*` directories.

## Historical reuse and discovered schema

The authoritative validator is `scripts/source-sandbox/validate_human_review_decisions.py` (SHA-256 `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`). The historical template builder is `scripts/source-sandbox/prepare_human_review_queue.py::decision_template` (module SHA-256 `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`). Reused pure helpers are `decision_template`, `contract_errors`, `validate_entry`, and `canonical_bytes`; neither historical main routine is executed.

The discovered decision vocabulary is `not_decided`, `approve_candidate`, `accept_exception`, `reject`, `defer`, and `request_enrichment`. Required fields are `internal_source_id`, `gate_id`, and `decision_intent`; decided entries conditionally require `reviewer_id` and `rationale_codes`. Optional metadata fields are `reviewer_note`, `reviewed_at`, and `requested_enrichment_fields`.

All 1,000 AESPA records have the historical gate `exception_review_required`, so the approval-equivalent fixture uses `accept_exception` with `provider_attribution_unavailable_verified`. The rejection-equivalent fixture uses `reject` with `unreliable_source`. Both use reviewer `controlled_fixture_reviewer`, timestamp `2026-01-01T00:00:00Z`, and unmistakably synthetic notes. They are deep-copied historical templates and are never written back to v57, v58, or v59.

## Results

The controlled set contains exactly two entries: one approval-equivalent fixture and one rejection-equivalent fixture. Both are valid and none is invalid. Reviewer ID, review timestamp, rationale, and note are populated on both. `decision_input_id`, `decision_preview_id`, `queue_id`, `gate_id`, and `internal_source_id` are each unique and preserve their source linkage.

The real historical AESPA state remains: 1,000 templates, 1,000 `pending_review`, 1,000 `not_decided`, and zero actual submissions, approvals, rejections, or decided records. Source mutations, decision applications, production mutations/effects, external writes, and pipeline authorizations are zero.

First and reproduction runs validate independently. Canonical first/repro SHA-256 is `bc01d87dbe4b0e0448a01fccce2bf402c666d0d8a4a1d59bf2995db2394cc843` for both; validation first/repro SHA-256 is `ed0b7d7f91a7762e3b06764fcd76474baa37ea06e79f972a893b62dcae4fe83e` for both. Self-test passed 18 checks covering the contract, exact branch counts, historical validation, immutable original input hash, linkage uniqueness, zero effects, deterministic outputs, ignored tmp paths, and the exact tracked-file allowlist.

The status `valid_local_controlled_human_decision_fixture_preview` with eligibility `eligible` means only that the historical schema successfully validates controlled local explicit-decision fixtures. A later, separately authorized stage may accept real human-authored decision input; v60 does not implement or authorize that flow.
