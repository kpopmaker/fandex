# FANDEX v120 integrity, outbox, and auto-merge safety

## Scope

This change hardens the existing managed-Postgres persistence boundary and the repository-owned version-PR automation. It does not connect to a database, apply a migration, mutate an environment variable, merge a pull request, or deploy to Production.

## Persistence integrity

`validatePersistenceBundle` now verifies relationships that were previously represented only by well-formed strings:

- `normalizedPostDigest` must be the canonical SHA-256 of the exact public v36 normalized projection.
- `requestPostDigest` must be the canonical SHA-256 of the exact persistent closed-request projection, including request/source identity, requested fields, closure reference, closed/fulfilled flags, and next record version.
- The v110 closure record ID, closure-record SHA-256, and copied-closed-request SHA-256 must match one authoritative lineage tuple.
- The evidence headline must equal the normalized headline.
- Normalized and request versions must each advance by exactly one from the expected pre-state version.
- The outbox event has one exact event type and is bound to the same request ID.
- The canonical payload and idempotency key include `v120_exact_post_state_v1`, so the stricter post-state contract cannot collide with the historical v116 transaction that used the v112 idempotency key.

`inspectPersistentPreState` now reads normalized and request state with one SQL statement. The two values therefore come from one PostgreSQL statement snapshot instead of two independently scheduled queries.

The requested-field tuple is now independently bound at every persistent transition boundary. The present-state lock reads the actual `requested_fields`, stale-state classification requires exact ordered equality, the request UPDATE includes the tuple in its compare-and-swap predicate, and the postcondition reads and rechecks it. Reordered, missing, extra, or post-application-mutated fields fail closed even if a stored state digest happens to match.

Deterministic v120 contract values:

- Idempotency key: `42321543a2d98f7add059c1d31c27581c7610767da8310832cba356819a52287`
- Canonical payload SHA-256: `ea55b96781c0619edfdd57b483fcd69b9c4f1c6498da4dbf117b7202503c0118`
- Persistent request post-state SHA-256: `a20d64d9fda71eb2167a8e6e852a7e6d71e64d9c61bb6565a72a5ddd7ed0a3e5`

## Outbox terminal lease recovery

`claimOutboxBatch` now starts with a bounded, lock-skipping candidate CTE that finds at most the requested batch size of expired `processing` rows already at `max_attempts`, moves them to `dead_letter`, clears their lease and next-attempt fields, and records the bounded error code `lease_expired_at_attempt_limit`. Only rows below the attempt limit remain eligible for a new claim. Both terminal cleanup and normal claiming use `FOR UPDATE SKIP LOCKED`.

This closes the crash-at-attempt-eight gap: a worker that dies after its final claim can no longer leave the event permanently stranded in `processing` after the lease expires.

## Version PR auto-merge guard

Version PRs are Draft by default. Repository automation can reach its merge command only when all of the following remain true:

1. The PR is same-repository, owner-authored, targets `main`, uses a `vN-*` head, and is not Draft.
2. The exact `production-merge-approved` label is present.
3. The latest decisive review from at least one trusted `OWNER`, `MEMBER`, or `COLLABORATOR` reviewer is `APPROVED` on the exact current head SHA, and no trusted reviewer has a current `CHANGES_REQUESTED` decision on that SHA.
4. Review pagination is flattened before evaluation; author, outsider, old-head, dismissed, and superseded approvals cannot authorize a merge.
5. The exact base and head SHAs remain unchanged. Validation composes their merge tree locally and runs against that result with a read-only token and `persist-credentials: false`.
6. Dependency audit, static checks, persistence/security/bootstrap/readiness/merge-safety tests, plan-only DB commands, and the production build pass.
7. Immediately before merge, the workflow rechecks base/head SHAs, Draft state, label, current trusted review state, and Vercel success.
8. The workflow composes a merge commit whose two parents are the exact authorized base and head, then performs a non-force push to `main`. A concurrently advanced `main` is not an ancestor of that commit, so Git rejects the ref update instead of merging an unvalidated base.

Ready-for-review, review approval, and merge authorization are intentionally separate states. Removing Draft status alone cannot activate the merge path. The workflow does not enable a persistent GitHub auto-merge reservation; after the final authorization check it attempts only the exact-base/head guarded merge-commit push.

## Validation boundary

The v120 test set covers derived digest tampering, closure-lineage substitution, invalid version transitions, versioned idempotency, explicit legacy-v116 classification, single-statement pre-state reads, requested-field pre-state/CAS/postcondition enforcement, bounded final-attempt lease expiry, workflow permissions, exact-base/head validation and non-force push behavior, trusted current review decisions, explicit labeling, and repository instructions. An exact legacy v116 state now fails before writes with `legacy_v116_state_requires_fresh_branch`; validating the new contract requires a fresh staging branch under separate DB authorization. Database integration remains outside this change because DB work was not authorized.
