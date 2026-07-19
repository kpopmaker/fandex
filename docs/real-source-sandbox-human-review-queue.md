# Real Source Sandbox Human Review Queue

## Scope

This local-only sandbox step prepares a deterministic human review queue from the 2,000 normalized Naver sources associated with the IU sandbox identity. It does not implement a production review policy, approve or reject a source, accept an exception, create an approval snapshot, or record an audit event.

The approval gate input contained 1,000 blog `approval_candidate` records and 1,000 news `exception_review_required` records. Approval candidates are excluded from the active queue, but exclusion does not mean that they are approved. All decision templates remain `not_decided`.

## Read-only concept review

The implementation was informed by these existing read-only and proposal-level boundaries:

- `app/data/v4/sources/sourceSignalReviewQueuePreview.ts` presents fixture-backed review queue states without writes.
- `app/data/v4/sources/sourceSignalReviewActionPreview.ts` previews review actions without applying approval or rejection.
- `docs/production-source-storage-schema-adr.md` separates review items, approval snapshots, and audit events as distinct conceptual records.
- `docs/production-source-architecture-decision.md` keeps human approval between source evaluation and score application.

Those files were inspected only. Their helpers and proposals are not treated as a production contract by this sandbox.

## Decision contract preview

`human_review_decision_contract.preview.json` defines a local input shape for a future human decision validator. Its scope is `local_sandbox_preview_only`, and `production_policy` is `false`. Candidate decision intents are:

- `not_decided`
- `approve_candidate`
- `accept_exception`
- `reject`
- `defer`
- `request_enrichment`

Gate-specific allowed intents prevent an exception acceptance from being used outside an exception review and prevent an approval-candidate intent from being used outside an approval candidate. Any decision other than `not_decided` requires a reviewer and at least one rationale. This run supplies neither: every template entry has a null reviewer, an empty rationale list, and `not_decided` as its intent.

## Queue construction

Only `exception_review_required`, `manual_review_required`, and `blocked` gate records enter the active queue. Records are ordered without a numeric priority score by review category, source type, presence and lexical value of `published_at`, and `internal_source_id`. A `queue_item_id` is the SHA-256 digest of the contract version and gate ID, so the same input and contract produce the same identifier and order.

Review context contains the cleaned title and no more than 200 characters of a whitespace-normalized summary excerpt. It does not copy the complete summary or raw source payload.

## Local result

- Total gate records: 2,000
- Active review queue: 1,000 news records
- Exception review queue: 1,000
- Manual review queue: 0
- Blocked review queue: 0
- Excluded approval candidates: 1,000 blog records
- Decision template entries: 1,000
- `not_decided` template entries: 1,000
- Duplicate queue item IDs: 0
- Duplicate internal source IDs: 0

The active queue reason codes each appeared 1,000 times: `attribution_recovery_unavailable`, `eligibility_review_required`, `exception_review_required_by_contract`, `missing_author_or_publisher`, `provider_attribution_unavailable`, `provider_limitation_verified`, and `quality_review_required`.

Two executions produced identical queue SHA-256 values (`d946c5b0a5c6731ccf634d2b3f628453a3287535005abcfc48dac8afba011dff`) and identical decision-template SHA-256 values (`83d07667b79dfec03c874eb525e9fa40ff2d7dd5232c79db5bbf9fa6dc710176`). Record order, identifiers, and summary statistics excluding `generated_at` also matched. The in-memory contract self-test passed all 10 cases, including routing, allowed intents, reviewer requirements, rationale requirements, and the empty `not_decided` template.

## Safety boundary and next step

Queue, summary, and decision-template outputs are written under `tmp/source-sandbox/` and remain outside Git tracking. This step does not alter normalized sources, mappings, quality, eligibility, or approval-gate results. It does not calculate sentiment, importance, priority, or FANDEX scores and does not connect data to ranking or artist pages.

A possible next step is a validator for human-authored decision input followed by a decision-application dry-run contract. That work would still need explicit safeguards before any approval snapshot, audit event, or production write is considered.
