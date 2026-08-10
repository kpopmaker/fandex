# AESPA human decision submission readiness preview

This v59 work runs only in the isolated `fandex-v54` worktree from base `fe67ca8`. It consumes the v57 explicit decision-input preview and the v58 decision-application dry-run preview. Both first/repro pairs must be deterministic and provenance-verified before any output is written.

The scope is schema readiness for 1,000 future human decision submissions. All 1,000 source records remain `pending_review`, all remain `not_decided`, and all v58 application inspections remain `no_action`. The preview contains 1,000 blank historical templates, not submitted decisions. Actual human submissions, approvals, rejections, decided values, reviewer metadata, and human timestamps are all zero.

No separate historical submission builder exists. The authoritative schema is the historical human-review decision contract consumed by `validate_human_review_decisions.py`; blank templates come from `prepare_human_review_queue.py::decision_template`. The validator module SHA-256 is `8956db9a596c89091eff82497a3b6dc722de6ca48c05e736450a8169e5823c31`, and the queue/template module SHA-256 is `694b1f541218ae9c6697422319b7966b2985f168bc0bc7d98dc00502f90c5819`. Reused pure helpers are `decision_template`, `contract_errors`, `linkage_errors`, `validate_entry`, `build_outputs`, `canonical_bytes`, `digest`, and `duplicates`; neither historical `main()` is executed.

Required submission field names are `internal_source_id`, `gate_id`, and `decision_intent`. Conditional required decision field names are `reviewer_id` and `rationale_codes`. Optional field names are `reviewer_note`, `reviewed_at`, and `requested_enrichment_fields`. Required preview linkage field names are `decision_input_id`, `decision_preview_id`, `queue_id`, `gate_id`, `internal_source_id`, `sandbox_artist_key`, and `source_type`.

Canonical output is written only to ignored local tmp locations. Validation, summary, this document, and the tracked contract contain no raw source URL, author/publisher, title, summary/text, sample, archive location, or source filename values. First/repro runs must produce identical canonical and validation hashes; self-test uses synthetic fixtures only.

Production and registry identities remain unconfirmed. Decision application candidates and executions are zero. Production mutation/effect and database, storage, pipeline, score, ranking, and artist-page operations are zero. A later step requires a separate controlled human-decision fixture or submission stage with operator review; this preview does not authorize it.
