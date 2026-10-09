# SNSFandom v2 — Incremental Coverage Candidate v1 (offline / no runtime cutover)

Owner: [#602](https://github.com/kpopmaker/fandex/issues/602), under [#424](https://github.com/kpopmaker/fandex/issues/424).

## Scope and decision

This is an **offline deterministic reducer prototype**: it computes the next immutable candidate coverage checkpoint from the **actual raw text** of (a) the approved v2 canonical, (b) the expected next real v2 receipt, and (c) the preceding verified checkpoint (or `null` only for genesis).

No code under `scripts/operations/snsFandomYoutubeRecurringMeasurementRunnerV2.ts`, `...RuntimeV2.ts`, the Render scheduler, the production Blob adapter, or the approved revision `27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688` is changed. The current v2 measurement continues to invoke the original full `buildCoverage`.

## Candidate checkpoint and proposed storage contract

- Candidate prefix: `sns-fandom/youtube-audit/recurring/v2/coverage-candidate/v1/checkpoints/`.
- Each checkpoint would be named deterministically from the **natural UTC-hour slot**, one immutable object per completed hour, under a future separately approved writer.
- Input identities must exactly match the **original v2** canonical, source SHA and #509 OWNER evidence. A changed runtime SHA must not be inferred from current `main`.
- Every step checks current receipt identity, exact slot sequence, observation time, provider call units, quota equality, true-zero semantics, privacy restrictions and no Product/Production/provider permission escalation.
- Checkpoint binds the original window, approved source revision, OWNER evidence, monotonically contiguous slot count, last receipt path and SHA-256 of the exact raw receipt bytes, previous checkpoint digest (or genesis `null`), cumulative calls/quota/true-zero and its own SHA-256 of a fixed-order v1 payload.
- Chain digest is **tamper-evident only relative to an externally trusted immutable checkpoint root**. It is not a signature, does not prove store immutability by itself, and cannot independently prove all historical receipt bodies still exist. Do not relabel it as a completed 366-day Blob audit.
- The pure evaluator returns a `checkpointPath` and `checkpointBody` for inspection; **it never writes them**. An exactly identical already-existing checkpoint is classified as `idempotent-existing`; conflicting bytes block. Out-of-order, missing previous and duplicate receipts cannot silently advance the chain.
- Real persistence **if approved later** must use immutable `putTextIfAbsent`, verify read-back, prevent competing checkpoint writers, and preserve the existing canonical/receipt lineage with an explicit successor revision-authority contract.

## Read amplification tradeoff

Given a *trusted* preceding immutable checkpoint, the reducer processes **one next receipt text**, **one previous checkpoint text**, and **one canonical text** without loading N earlier receipts per new slot. This is a candidate for O(1) record processing each slot and O(N) total processing after a separately attested bootstrap, **not** a deployed performance improvement or observed request metric.

If moving from the current live full-scan runtime, a bootstrap would need a controlled and independently qualified **one-time sequential read of existing real immutable receipts from slot 1**, explicitly verify 0 gaps / source lineage / counters, and materialize candidate checkpoints without inventing any provider observations. This proposal has no bootstrap I/O and no authorization to write such objects.

A crash between receipt existence and checkpoint creation must be handled only by a recheck of the exact immutable prior checkpoint/receipt/current checkpoint, never skipping the slot. Concurrent writers, orphan checkpoints, valid-but-stale checkpoint tips, digest root anchoring, missing historical receipts, and safe revalidation windows still require a dedicated design and acceptance tests before any production binding.

## Negative controls and operational authority

The offline regressions cover:
- Exact genesis, contiguous increments, 24-slot chain, cumulative units/true-zero
- Missing hour, duplicate/reordered receipt, malformed source JSON
- SHA/revision/OWNER mismatch, wrong observation hour, raw privacy leakage
- Forged quota, corrupt previous checkpoint hash/count/window
- Idempotent same-body replay versus conflicting immutable path
- No Blob writes/provider calls/rebaseline/retroactive receipts/permissions

This PR adds no `workflow_dispatch`, no `schedule`, no secret, no Render deploy, no provider API, no Blob adapter write or runtime replacement. It does not update risk Product inventory. The current canonical still ends `2027-10-09T01:00:00.000Z`; final quota worksheet and provider submission remain blocked by actual whole-window observations and separate authority.

## Required next gates (not satisfied by a green PR)

1. Record real Blob request and timing evidence; do not infer billing from source arithmetic alone.
2. Build a **read-only** authorized bootstrap verification against actual Blob plus rolling checkpoint-chain security and concurrency tests.
3. Prove checkpoint immutability and recovery on abrupt exits, missing historical bodies, and multiple contenders.
4. Agree an immutable revision-bound successor activation contract, preserving the approved v2 historical window and OWNER evidence without falsifying source SHA.
5. Obtain separate exact owner authorization for any provider-runtime or Render/scheduler transition.
