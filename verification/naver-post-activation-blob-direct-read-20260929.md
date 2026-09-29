# NAVER post-activation private Blob direct read — 2026-09-29

## 판정

**BLOCKED: BLOB_OIDC_ENVIRONMENT_NOT_ALLOWED**

요청한 validation branch/workflow를 생성·push하고 GitHub Actions에서 실제 실행했다. 기존 VERCEL_TOKEN으로 project OIDC token 발급과 Production Blob store ID 조회까지 성공했으나, 첫 private Blob list 요청이 `BlobOidcEnvironmentNotAllowedError`로 거부됐다.

발급 토큰의 environment는 `development`이고 확인된 store binding은 `production` 단독이다. 이는 이번 검증 요청의 인증 범위 blocker다. Production scheduler의 403 원인이라고 주장하지 않는다.

**A/B/C 판정 유보:** list가 성공하여 빈 배열이 반환된 상황이 아니다. 따라서 C (`POST_ACTIVATION_BLOB_OBJECT_NOT_FOUND`)로 분류하지 않는다. job existence, manifest finalize, 실제 객체 간 digest 일치는 여전히 미입증이다.

## 실행 식별

- Repository: `kpopmaker/fandex`
- 최신 main, 시작·workflow guard·종료 시 확인: `54bb0f0fcdbf6860893cc7fb9e4b021131348d71`
- Branch: `validation/naver-post-activation-blob-read-20260929-v1`
- 최초 구현 commit: `be87ac07c0ef214648b65e40bf3fc782a91b07ff`
- 실제 오류 분류 검증 commit: `abdd4d97f3a8821ab2b8b99b3431d137c1bd9acd`
- Activation execution: [36502683565](https://github.com/kpopmaker/fandex/actions/runs/36502683565)
- Activated deployment: `dpl_FLYKAKV7u7reTGsUzG7XC4BvHnZg`, READY / production / expected project and SHA verified by API.
- Deployment READY: `2026-09-29T00:22:42.680Z` (09:22:42.680 KST)
- First read run: [36507383215](https://github.com/kpopmaker/fandex/actions/runs/36507383215), failed in private_blob_list.
- Diagnostic read run: [36507621463](https://github.com/kpopmaker/fandex/actions/runs/36507621463), failed in private_blob_list with the specific SDK error.
- Second observation cutoff: `2026-09-29T01:23:19.437Z` (10:23:19.437 KST).
- Both executions are new validation-workflow runs. No Production verifier rerun occurred.

## 실제 확인 결과

| 항목 | 결과 |
| --- | --- |
| Exact merged code preserved | PASS: ingestion/storage/shared digest code and package/lock unchanged |
| Locked SDK | `@vercel/blob 2.8.0`, npm ci, installed version equals lock |
| OIDC issuance | PASS: POST /v1/projects/{projectId}/token?teamId=…, body {"source":"vercel-cli:pull"} |
| Project env metadata | PASS: GET /v10/projects/{projectId}/env?decrypt=false |
| Production store binding | PASS: unique Production-only entry selected using merged adapter precedence |
| Store ID value | Retrieved in memory via GET /v1/projects/{projectId}/env/{envId}; value never printed or persisted |
| OIDC environment | `development` (allowlisted claim only; token never printed) |
| Private Blob list | FAIL: `BlobOidcEnvironmentNotAllowedError` |
| Private Blob get | Not reached |
| Actual object integrity / finalize | Not reached |
| A / B / C | Not assigned; access denial is not object absence |

The API returned `decrypted: false` for the store ID entry. The report does not infer encrypted/plain storage semantics from that flag alone. The actual SDK failure was the specific environment-not-allowed error, not a reported store-not-found error.

## 정확한 prefix와 검증 구현

Prefixes were read from current merged `lib/server/ingestion/naverNewsStoredEvidenceMirror.ts`, not guessed:

- Canonical jobs: `fandex/naver-news/stored-evidence-mirror/v1/jobs/`
- Scheduler manifests: `fandex/naver-news/stored-evidence-mirror/v1/scheduler-manifests/`

The script guards these source declarations at runtime and uses the unchanged `vercelBlobImmutableTextObjectStore.ts` adapter for private get. The Blob SDK import contains only `get` and `list`. The injected put capability throws locally; no Blob put/delete function is imported or called.

The verifier implements:

1. Full pagination for both exact prefixes; timestamps bounded after deployment READY and through snapshot cutoff.
2. Selection of latest post-activation scheduler manifest by official collection-key slot.
3. Exact referenced canonical job read with validated pathname; both objects must be post-activation.
4. Reuse of existing job and manifest repository decoders.
5. Explicit cross-object jobId, collectionKey, requestContract, jobObjectPath and jobPayloadDigest checks.
6. Recalculation of both envelope payload digests.
7. resultSha256 format and digest binding checks. The current mirror schema does not carry all raw inputs needed to independently recompute resultSha256; this audit makes no DB-result equality claim.
8. Separate A/B/C outcomes only after successful reads. Corruption, pagination/read errors, invalid timestamps, missing linked objects and scan races fail closed instead of being misreported as C.

## 검증

- Local: 14/14 tests passed, including A/B/C fixtures, job/result digest tampering, manifest tampering, self-consistent wrong link, absent referenced body, manifest path mismatch and concurrent finalize.
- Existing stored-evidence mirror tests reused.
- GitHub Actions: the same 14-test step passed in both runs.
- Local typecheck passed; changed-file lint passed (and lint was repeated after diagnostic-field change).
- No live object integrity pass is claimed from synthetic test success.

Files on the validation branch:

- `.github/workflows/verify-naver-post-activation-blob-read.yml`
- `scripts/verification/naverBlobDirectRead.mjs`
- `tests/naver-blob-direct-read.test.mts`
- `verification/run-36507383215/naver-blob-direct-read-result.json`
- `verification/run-36507621463/naver-blob-direct-read-result.json`

The workflow has read-only GitHub permissions, no checkout credential persistence, exact repository/branch/main guards, and no scheduled/manual trigger. Documentation-only follow-up commits do not trigger another audit. Vercel configuration already disables deployments for validation/* branches.

## 다음 blocker와 경계

The requested official token endpoint's documented request accepts `source` and team scoping; it does not document a Production environment selector. This actual invocation produced a development token. Repeating the same request cannot be treated as a solution to the observed environment denial.

To complete direct object verification, a read authentication/execution path accepted by the Production-only store is required. This work did not broaden the store's allowed environments, retrieve/use a separate long-lived Blob write token, or deploy a Production reader.

Because C has not been established, the conditional CRON/auth metadata and scheduler 403 investigation was not advanced. No Production instrumentation patch or observability PR was created.

No secrets/store IDs, raw private object bodies, or unsanitized SDK/API errors are in logs or artifacts. Tokens stayed in process memory; no GITHUB_ENV export was used.

No PR merge, Blob write/delete, backfill, Production environment mutation, DB call/mutation, verifier execution, Registry mutation, publication or read/public-route cutover occurred. The only authorized authentication POST was project OIDC issuance.

## 공식 API 및 소스 근거

- [Generate project OIDC token](https://vercel.com/docs/rest-api/projects/generate-a-project-oidc-token)
- [Read project environment variables](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name)
- [Read individual environment variable](https://vercel.com/docs/rest-api/projects/retrieve-the-decrypted-value-of-an-environment-variable-of-a-project-by-id)
- [Merged mirror implementation](https://github.com/kpopmaker/fandex/blob/54bb0f0fcdbf6860893cc7fb9e4b021131348d71/lib/server/ingestion/naverNewsStoredEvidenceMirror.ts)
- [Merged Blob adapter](https://github.com/kpopmaker/fandex/blob/54bb0f0fcdbf6860893cc7fb9e4b021131348d71/lib/server/storage/vercelBlobImmutableTextObjectStore.ts)

The installed SDK's error mapper recognizes the provider's `oidc_environment_not_allowed` response or matching environment-denial message as `BlobOidcEnvironmentNotAllowedError`. Only that allowlisted class name is reported.
