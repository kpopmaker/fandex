# SNSFandom YouTube recurring/v2 — receipt read amplification risk evidence (v1)

Owner: #602, linked to #424. This is a **source-level arithmetic model**, not a new collector design or live operation.

## Exact existing source binding

- Approved immutable provider runtime revision: `27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688`.
- `scripts/operations/snsFandomYoutubeRecurringMeasurementRunnerV2.ts`: a newly completed slot returns a new receipt, then calls `buildCoverage(dependencies.store)`.
- `buildCoverage` lists the existing `sns-fandom/youtube-audit/recurring/v2/receipts/` prefix and sequentially `readText`s **each** receipt to calculate the count, cumulative provider calls, cumulative quota units and true-zero receipts.
- `lib/server/storage/vercelBlobImmutableTextObjectStore.ts`: production `readText` uses `client.get(..., { access: 'private', useCache: false })`; `listPathnames` uses paginated list.
- This model does not profile timing, Vercel billing, provider API calls, quotas, failures, or actual request logs. No limits/budgets have been assumed.

## One-new-receipt-per-natural-hour projection

The current v2 canonical requires 366 × 24 = **8,784** hourly observations. Under one successful newly completed slot per hour, exactly one resulting `buildCoverage` pass each hour, without retries, recovery branches, duplicate runs, or additional reads:

| Observed natural slots n | Receipt GETs in the nth coverage call | Cumulative receipt GETs from successful coverage passes |
|---:|---:|---:|
| 1 | 1 | 1 |
| 24 | 24 | 300 |
| 37 | 37 | 703 |
| 8,784 | 8,784 | 38,583,720 |

Source-derived formula: `n*(n+1)/2`. These **logical read operations** are the output of a deterministic work model and are not measurements of real billed Vercel usage. They also exclude non-coverage reads, list pagination, retries and any recovered/missed slots.

`SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS` and `modelSnsFandomV2ReceiptScanWorkV1` provide identical arithmetic with unit-test negative controls. No absolute budget or guessed operational failure threshold is introduced.

## Decision boundary

The *currently deployed* v2 runtime checks the exact approved revision SHA and durable OWNER evidence before issuing provider calls. Its canonical and individual receipt records bind that revision. Therefore a new performance implementation **cannot silently replace the approved commit** or infer authority from PR review / CI GREEN.

A safe future fix requires:
1. Real read/latency/error/billing evidence where available, clearly separate from source-derived arithmetic.
2. An incremental or bounded cumulative-coverage design that maintains durable provenance and can detect missing hourly receipts without ever treating absence as zero.
3. Compatibility proofs for immutable canonical/receipt revision, idempotency and legal/provider-client scope.
4. Explicit owner authorization for any exact new execution SHA, canonical migration and/or scheduler/Render mutation, if required. Avoid retrospective provider observation, historical backfill and synthetic receipts.
5. Runtime-specific tests and owner-reviewed production cutover plan *before* touching the running scheduler.

This report and its CI have **no secrets, external provider calls, Blob reads or writes, workflow dispatch, automatic cron, runtime mutation, quota promotion, Product activation, or Production collection authority**.
