# Real Source Sandbox Approval Gate Preview

Status: local-only gate classification. This work records no approval or
rejection decision, creates no production approval snapshot, and changes no
quality or eligibility result.

## Purpose

The v41 preview classifies the 2,000 normalized Naver items in the 아이유
sandbox into pre-decision work queues. It uses the v39 quality/eligibility
preview and the v40 attribution audit without converting either result into an
approval.

The 1,000 news records still lack `author_or_publisher`. V40 verified that their
original CSV provides no trusted attribution candidate, but this provider
limitation does not waive the attribution requirement or make those records
quality-ready.

Every gate record has `decision_status: not_decided`.

## Read-Only Approval Investigation

Existing boundaries were reviewed without modifying their files or adopting
them as production policy:

- `app/data/v4/sources/sourceSignalReviewQueuePreview.ts` organizes fixture
  candidates for manual review.
- `app/data/v4/sources/sourceSignalReviewActionPreview.ts` previews review
  actions without production writes.
- `docs/production-source-architecture-decision.md` places a human approval gate
  before score application.
- `docs/production-source-storage-schema-adr.md` separates
  `source_review_items`, immutable `source_approval_snapshots`, and append-only
  `audit_events`.

V41 stops before human decision input, audit persistence, approval snapshots,
or score application.

## Source-Type Metadata Contract

`scripts/source-sandbox/source_type_metadata_contract.preview.json` has version
`v1`, scope `local_sandbox_preview_only`, and `production_policy: false`. It is a
reviewable sandbox contract, not a production policy or database schema.

It contains two rules:

- `naver_news_attribution_exception_review` keeps attribution required. Missing
  attribution may enter exception review only when provider-limitation evidence
  is verified; complete records may become approval candidates.
- `naver_blog_attribution_required` keeps attribution required and routes a
  missing value to manual review; complete records may become approval
  candidates.

The contract contains no item IDs, dataset counts, numeric scores, thresholds,
approved states, or rejected states. Unsupported provider/type pairs are
blocked rather than inferred.

## Gate Classifications

- **approval_candidate:** quality is ready, eligibility is a candidate, mapping
  evidence is confirmed, a contract rule exists, and required attribution is
  present. This is still not approval.
- **exception_review_required:** the only quality issue is missing attribution,
  the news rule explicitly requires exception review, and the attribution audit
  verifies no candidate column, no recovery, no row-link failure, and no value
  conflict. This status is not an approval candidate.
- **manual_review_required:** a review condition remains but does not satisfy the
  narrow exception contract, or mapping/evidence requires manual attention.
- **blocked:** quality/eligibility or identity/linkage is blocked, required
  content identity is missing, provider/type is unsupported, or no contract rule
  exists. Blocked does not delete or reject the source.

Reason codes are deduplicated and alphabetically sorted. No classification
changes upstream quality, eligibility, mapping, or normalized source data.

## Record and Output Boundaries

`gate_id` is a SHA-256-based identity derived from contract version, sandbox
artist key, internal source ID, and content hash. Records preserve only IDs,
states, reason codes, selected attribution/publication metadata, and raw row
number. Title, summary, and full source payload are not copied.

The first run writes:

- `tmp/source-sandbox/naver/iu/approval-gate-preview.json`
- `tmp/source-sandbox/naver/iu/approval-gate-preview-summary.json`

The reproduction run writes matching files below
`tmp/source-sandbox/naver/iu/repro-check/`. These local files are ignored by Git.

## v41 Local Result

| Gate status | News | Blog | Total |
| --- | ---: | ---: | ---: |
| Approval candidate | 0 | 1,000 | 1,000 |
| Exception review required | 1,000 | 0 | 1,000 |
| Manual review required | 0 | 0 | 0 |
| Blocked | 0 | 0 | 0 |

All 2,000 records are `not_decided`. Attribution is present for 1,000 blog
records, missing with a verified provider limitation for 1,000 news records,
and missing-unverified for zero records. Normalized, mapping, and quality input
counts all match, with zero duplicate gate or internal source IDs.

Contract rule usage is:

- `naver_blog_attribution_required`: 1,000
- `naver_news_attribution_exception_review`: 1,000

Each applicable gate reason code occurs 1,000 times. Blog candidates use
`contract_rule_satisfied`, `eligibility_candidate`, `mapped_confirmed_source`,
`quality_ready`, and `required_metadata_complete`. News exception review uses
`attribution_recovery_unavailable`, `eligibility_review_required`,
`exception_review_required_by_contract`, `missing_author_or_publisher`,
`provider_attribution_unavailable`, `provider_limitation_verified`, and
`quality_review_required`.

## Determinism Check

Both runs produced this gate preview SHA-256:

```text
e49492cfea6f53e4d44afa864f3b0f22b7d5f2f72d358d6dd89d3425cb6ca8c5
```

The 2,000 records, order, gate IDs, reason arrays, and contents were identical.
Normalized, mapping, quality, and gate internal source ID sets match exactly.
Summary statistics and contract-rule usage match after excluding the intentional
execution timestamp `generated_at`. News approval-candidate count is zero, and
exception review occurs only for news.

## Boundaries and Next Steps

This preview makes no external call, creates no actual approval/rejection,
deletes no source, grants no attribution exemption, and calculates no sentiment,
importance, rank, delta, or FANDEX score. No ranking or artist page reads it.

Possible next contracts are human decision input, a provider attribution upgrade
or separate enrichment strategy, and audit-event/approval-snapshot structure.
Each remains separate from an actual decision or production write.
