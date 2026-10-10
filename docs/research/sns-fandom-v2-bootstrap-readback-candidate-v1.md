# SNSFandom v2 — Read-only Bootstrap Replay Candidate v1

Owner: [#602](https://github.com/kpopmaker/fandex/issues/602); source program [#424](https://github.com/kpopmaker/fandex/issues/424).

## What is implemented

A **read-only, one-time O(N) verification** of actual previously stored canonical + v2 receipts for a strictly operator-corroborated UTC hourly horizon. The evaluator replays from the first real slot `2026-10-08T01:00:00.000Z`, validating each existing receipt with the merged PR #607 pure SHA-256 incremental candidate; no writes, requests to YouTube, synthetic receipts or historical backfill.

- Uses approved original runtime `27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688` and owner cutover evidence `github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425` as exact immutable identities.
- Requires exact UTC-hour `through_observed_slot_start` previously **independently verified** from both naturally dispatched Render cron and the corresponding successful provider-backed GitHub Actions log. **The user-supplied horizon is not itself scheduler proof.**
- Verifies the existing canonical manifest, receipt path index, each receipt's source SHA, observation clock, provider/quota counters, true-zero semantics and privacy/authorization invariants via the pure candidate evaluator.
- Builds a *transient* hash-linked chain from genesis; compares each **already existing** checkpoint's exact bytes against the recomputed value and rejects conflicts. Outputs only checkpoint path/hash and aggregate report, never the bodies.
- Missing/out-of-order hours, inaccessible indexed objects, forged/altered body, malformed path, checkpoint orphan, conflicting stored checkpoint or bad epoch block the candidate. **Missing ≠ 0.**
- Later real receipts beyond the operator-confirmed horizon are not claimed verified. First 24 natural hours have separately qualified via read-only Blob audit [#37934151302](https://github.com/kpopmaker/fandex/actions/runs/37934151302).

## Safety / execution boundary

PR CI runs **offline tests and typecheck only**. A separate GitHub Actions `workflow_dispatch` exists solely for an **explicit main-branch read-only opt-in**, with `verify_live_blob=true` and exact `through_observed_slot_start`; no schedule or automatic trigger.

The CLI passes only `readText` and `listPathnames` capabilities to the verifier, even though its underlying existing Blob token can write. Its source contains no writer or provider call. **This Draft PR does not execute the live verification**. When merged, the owner/operator must separately run the main-only workflow; its success is never assumed. The workflow's read-only CLI does make actual private GET/list requests when explicitly triggered, and may incur usage; it does not read secrets into logs.

No candidate checkpoint is durably created; `checkpointBodiesPersisted=0`, `blobWrites=0`. The resulting SHA chain is not a digital signature or substitute for external immutable root attestation or periodic historical body reads. All runtime, scheduler and Product authorization flags remain false.

## Design risks still open before any write-enabled bootstrap or runtime cutover

1. The candidate source revision is not the same as the immutable production-approved v2 provider runtime; publishing this verifier does **not** grant new collector execution authority.
2. Concurrent checkpoint writers and crash recovery need separately approved atomic `putTextIfAbsent` semantics, reread-after-conflict, lineage/root attestation and stale tip detection. Existing checkpoint orphans block; no automatic repair.
3. Real end-to-end partial-year cost, actual Blob usage and observed latency have not been measured. Replaying O(N) one time costs N receipt GETs plus list calls (and each stored checkpoint GET), **not** a free optimization.
4. Periodic historical integrity verification and full 366-day canonical completion remain independent.
5. No provider submission, Production collection, Product activation, Render/environment mutation or scheduler cutover is permitted by this candidate or its tests.

The test suite uses in-memory mock receipts and never accesses live Blob. Actual 366-day final quota/worksheet cannot be promoted from partial-window counts. Keep #602 and #424 open.
