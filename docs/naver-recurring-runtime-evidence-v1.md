# NAVER recurring runtime evidence

## Evidence boundary

At 2026-09-29 14:40 UTC, remote main and Production both referenced
`c215aaddd225f86044266348922b8c6dd19b5e64` (PR #279).
Production deployment `dpl_8rmncZ7aTeDvmjMRgEKtjqgrqcBG` was READY with no alias error.
The repository activation variable was `approved-github-hourly-v1`; the scheduler
secret name was present. Values from Vercel encrypted/sensitive placeholders were
not compared with GitHub secrets.

No GitHub recurring workflow run after PR #279 was available at that audit time.
Run `36582592127` predates PR #279 and cannot validate its OIDC write-path fix.
Five POST 403 entries existed on the PR #279 Production deployment, but their
response classes and callers were not available. They do not establish a
post-fix authenticated scheduler failure or success.

## Reading subsequent failures

The shadow scheduler now emits exactly one warning on each rejection:

`FANDEX_NAVER_RECURRING_ERROR_CLASS=<class>`

Allowed classes are `config_rejected`, `protocol_rejected`,
`authorization_rejected`, and `dispatch_failed`. The warning contains no request,
environment value, token, exception, provider payload, SQL, or Blob content.
Both runtime OIDC resolution failure and downstream scheduler failure remain
`dispatch_failed`; this log alone does not identify the failing downstream system.
Logging failure does not alter the 403 response or retry dispatch.

For an already authorized scheduled run:

1. Record the run ID, event, head SHA, UTC request time, and HTTP result.
2. Resolve the Production alias and record the deployment ID and commit.
3. Read logs scoped to that deployment, request path, and time. Use request ID
   correlation when available. Do not attribute unrelated 403s to the run.
4. A bounded warning classifies a rejection. No warning does not prove success.
5. Success requires the scheduler response evidence: HTTP 200, `ok=true`,
   `mode=shadow-recurring-scheduler`, an expected writer status such as `applied`
   or `idempotent_succeeded`, collectionKey, and slotStart. A workflow conclusion
   or deployment READY alone is insufficient.
6. Verify ingestion and mirror-write evidence separately using authorized
   read-only records. Do not infer Blob success from an HTTP status alone.

This procedure does not authorize manual dispatch, a Blob read probe, Production
verifier, environment/variable changes, backfill, activation, publication, or
cutover. Both previous Blob probe approvals remain consumed. Momentum Product
actual remains 2/7 and `productMomentumScore = null`.

## Downstream failure stage evidence

PR #280 reached Production at commit `c06fd79c7843ad1c78236a73455ce86d38c81f40`,
deployment `dpl_3pNPKDcswSwYm54xNKtsxSeEH6CW`. Read-only logs at 14:52:00 and
14:52:15 UTC on 2026-09-29 showed `dispatch_failed`. These establish that the
route's config, canonical protocol, and bearer guards passed; they do not prove
the caller was the GitHub scheduler or that runtime OIDC resolution succeeded.

The dispatch path additionally emits `FANDEX_NAVER_DISPATCH_FAILED_STAGE=<stage>`
at the operation that throws. Stages are a fixed runtime allowlist:

- Runtime setup: `runtime_oidc`, `scheduler_plan`, `writer_arguments`,
  `database_config`, `provider_config`, `pool_create`, `mirror_config`.
- Worker operations: `database_ensure`, `database_claim`, `provider_collect`,
  `response_validate`, `blob_stage`, `database_complete`, `blob_finalize`,
  `database_fail`.
- Cleanup: `pool_close`.

Stage means the operation failed, not that a specific credential, schema,
provider, or network diagnosis has been proven. Correlate the marker with its
request and route class; a cleanup or failure-recording error can add another
stage for the same request. A recoverable provider or mirror-stage failure can
produce a worker failure status without a thrown route error. Inspect the
writer status; do not equate HTTP 200 with ingestion success.

Only fixed stage names are logged. The original exception is rethrown unchanged
into the existing bounded handlers; exception text and payloads are never logged.
Operation ordering, authorization, retries, DB transactions, and mirror semantics
are unchanged. A logging exception cannot replace the operational error.

## Reusable CI

The existing recurring-classification workflow is a reusable, path-filtered PR
check that checks out the exact PR head. It runs isolated recurring and writer
tests, typecheck, lint, and build without Production credentials or requests.
It is not a temporary dispatch workflow and does not activate the scheduler.
