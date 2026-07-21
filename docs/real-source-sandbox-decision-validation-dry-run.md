# Real Source Sandbox Decision Validation Dry Run

## Scope and safety boundary

V43 validates the structure of the local-only human decision input prepared in V42 and builds a deterministic decision-application dry-run preview. The active review queue contains 1,000 news `exception_review_required` items, and all 1,000 entries in the existing decision template remain blank decisions with `decision_intent: not_decided`.

The application contract is not production policy. Its scope is `local_sandbox_preview_only`, `production_policy` is `false`, and `dry_run_only` is `true`. The validator does not change the decision template, apply approval or rejection, accept an exception, write to storage, create approval snapshots or audit events, calculate or apply scores, or connect anything to FANDEX ranking or artist pages.

## Read-only concept review

The following existing files were inspected without modification:

- `app/data/v4/sources/sourceSignalReviewActionPreview.ts` describes fixture-backed review actions as previews that do not approve, reject, persist state, calculate score deltas, or update FANDEX surfaces.
- `app/data/v4/sources/sourceWriteSafetyPreview.ts` separates dry-run safety and write guards from an actual write or rollback implementation.
- `app/data/v4/sources/sourceWriteAuditPreview.ts` models read-only audit checkpoints without creating an audit log.
- `app/data/v4/sources/sourceRollbackReadinessPreview.ts` models recovery readiness without restore or rollback execution.
- `docs/production-source-storage-schema-adr.md` separates `source_review_items`, immutable `source_approval_snapshots`, `score_application_batches`, `score_application_items`, and append-only `audit_events`. It requires an approval snapshot before score application and an audit event for writes or state transitions.
- `docs/production-source-architecture-decision.md` places explicit human approval between evaluation and score application and treats an approved snapshot as the rollback reference.
- `docs/real-source-sandbox-human-review-queue.md` establishes the V42 blank-template boundary and proposes validation plus a decision-application dry run as a guarded next step.

These proposal and preview concepts informed naming and safety boundaries only. No preview helper is promoted to production policy or implemented as a database schema.

## Application contract preview

| Decision intent | Allowed gate statuses | Dry-run effect |
| --- | --- | --- |
| `not_decided` | `approval_candidate`, `exception_review_required`, `manual_review_required`, `blocked` | `no_change` |
| `approve_candidate` | `approval_candidate` | `would_record_approval_decision` |
| `accept_exception` | `exception_review_required` | `would_record_exception_acceptance` |
| `reject` | all four gate statuses | `would_record_rejection` |
| `defer` | all four gate statuses | `would_record_deferral` |
| `request_enrichment` | all four gate statuses | `would_record_enrichment_request` |

The intent set matches input contract `v1`. A `not_decided` entry is valid only when `reviewer_id`, `reviewer_note`, and `reviewed_at` are null and both `rationale_codes` and `requested_enrichment_fields` are empty. A real decision requires a non-empty reviewer and at least one rationale, including at least one rationale allowed by its application rule. This preserves explicit human attribution and the reason for a consequential action. `request_enrichment` additionally requires at least one requested field; all other intents must leave enrichment fields empty.

The real-input command requires `--require-all-not-decided`. If any non-`not_decided` entry is found, processing stops before output creation and reports only the count, because it may represent a real human decision. The validator never fills missing reviewers or rationales, changes an intent, or generates `reviewed_at`.

## Privacy and deterministic identifiers

Validation output includes only whether a reviewer is present and counts of rationale and enrichment fields. It does not copy `reviewer_id`, `reviewer_note`, the original `reviewed_at`, article title, summary, or raw payload. This minimizes unnecessary replication of reviewer and source content into derived artifacts.

- `decision_input_hash` is SHA-256 over the canonical JSON form of the unchanged decision entry (UTF-8, sorted object keys, compact separators).
- `validation_id` is SHA-256 over the application contract version, queue item ID, and decision input hash, separated by newlines.
- `dry_run_id` is SHA-256 over the application contract version, validation ID, and dry-run effect, separated by newlines.

Records are ordered by `queue_item_id`. These rules make validation and dry-run records reproducible without timestamps in either record set. `generated_at` appears only in the summary.

## Local result

- Queue items: 1,000
- Decision entries: 1,000
- Valid / invalid: 1,000 / 0
- `not_decided` / actionable decisions: 1,000 / 0
- `no_change`: 1,000
- All five `would_record_*` effects: 0
- Missing / extra decision entries: 0 / 0
- Duplicate queue, decision-entry, validation, and dry-run IDs: 0
- Production writes: 0
- Approval snapshots created: 0
- Audit events created: 0
- Score applications: 0

Every real decision intent remained `not_decided`; consequently every dry-run effect was `no_change` and every actionability status was `no_action`. No source was approved, rejected, deleted, or accepted as an exception.

The first and second runs used the same blank decision template with `--require-all-not-decided`. Their validation JSON SHA-256 values both equal `49afacbd839a75af88896934397a47099d4b07995a706d7074f51a64bf7b364d`, and their dry-run JSON SHA-256 values both equal `848835fb95136a2f6ad65d7c3e5325e3c8c034434db2f2a8e3c5b3ee721f6cb5`. Record order, validation IDs, dry-run IDs, decision input hashes, and summary statistics excluding `generated_at` also match. The existing decision template hash remained `83d07667b79dfec03c874eb525e9fa40ff2d7dd5232c79db5bbf9fa6dc710176`.

The in-memory self-test passed 18 synthetic cases covering blank decisions, reviewer and rationale requirements, gate/intent compatibility, enrichment fields, unknown and duplicate values, structural linkage failure, non-mutation, and `would_*` effects. It creates no files.

All generated validation, dry-run, summary, and reproduction-check artifacts live below `tmp/source-sandbox/naver/iu/` and remain outside Git tracking. No external API was called.

## Next boundary

Only after explicit human decision input is ready and the user separately approves further work should a future step consider:

1. a validated decision batch preview;
2. an approval snapshot and audit event schema dry-run; and
3. safeguards for any later explicit application.

That future review must remain separate from actual production writes and score application unless independently authorized.
