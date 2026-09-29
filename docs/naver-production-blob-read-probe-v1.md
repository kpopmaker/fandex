# Bounded Production Blob read verification candidate

This is verification-only, read-only and default dormant until explicitly invoked. It adds no secret and performs no environment mutation, Blob write, database access, Momentum verifier rerun, publication or public-route/read cutover.

External project OIDC issuance was tested on validation branch `validation/naver-post-activation-blob-read-20260929-v1`, final evidence commit [1e13c71](https://github.com/kpopmaker/fandex/commit/1e13c717ea31980d566cb61da7fcea36dcf76c11). [Actions run 36507621463](https://github.com/kpopmaker/fandex/actions/runs/36507621463) failed with `BlobOidcEnvironmentNotAllowedError`: a development token cannot read the Production-only binding. That did not establish object absence.

The candidate route uses Production runtime `VERCEL_OIDC_TOKEN` and `BLOB_STORE_ID` only. It requires both the existing scheduler bearer secret and exact header `x-fandex-blob-read-verification-id: ops-naver-blob-read-verification-20260929-v1`. The ID is a public purpose binding, not another secret. Preview fails closed before reading storage. Only POST with an empty body and no query is accepted; no request can choose a prefix, object path, token or store.

The shared adapter now offers a read-only factory. The runtime client imports only Blob get/list; no write capability is injected. Each invocation is bounded to eight list pages (1000 entries each), three reads, 2 MiB per body and a 15-second storage timeout. Exhausted bounds are READ_FAILED, never an empty-store result. The route max duration is 30 seconds. Authorization occurs before body/storage reads; nonempty bodies are rejected and empty-body parsing has a one-second bound.

The fixed activation cutoff is `2026-09-29T00:22:42.680Z`. Complete inventories are filtered by upload timestamp through the observation cutoff. The latest eligible scheduler manifest is decoded using existing code, bound to a post-activation job and checked for exact identity/request/path/digests. Stage-only is reported when an eligible job exists and the linked manifest is absent; concurrent finalization is rejected as ambiguous. C requires both prefix lists to succeed and no eligible objects. Storage, integrity and limit failures are READ_FAILED with a bounded class only.

The response contains classification, cutoff and at most jobId, collectionKey, resultSha256 and the two digests. No records, titles, summaries, source URLs, raw object bodies, tokens or store IDs are returned or logged. resultSha256 is format-checked and protected by the verified envelope digest; the mirror does not contain all raw inputs to independently recompute that hash. There is no DB-result comparison claim.

The separate invocation workflow is workflow_dispatch only on main, requires exact purpose confirmation (default NO), uses the existing scheduler secret, makes one POST without retry, validates a bounded response and logs only one of A/B/C/READ_FAILED. The validation CI workflow runs fixtures/typecheck/lint/build and never calls Production.

**Execution requires separate explicit approval after merge.** Creating or merging this candidate is not invocation approval. No invocation was performed while preparing the candidate. No merge authorization should be added to the Draft PR.

“One-time” describes the approved operational execution, not a durable replay lock: without writes there is no global consumed flag. The workflow denies rerun attempts, but a new separately approved dispatch is technically possible. Retire the candidate route/workflow in a follow-up change after the approved observation. No schedule, startup hook or automatic probe executes it.
