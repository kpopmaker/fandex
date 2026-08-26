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

`inspectPersistentPreState` now reads normalized and request state with one SQL statement. The two values therefore come from one PostgreSQL statement snapshot instead of two independently scheduled queries.

## Outbox terminal lease recovery

`claimOutboxBatch` now starts with a data-modifying CTE that finds expired `processing` rows already at `max_attempts`, moves them to `dead_letter`, clears their lease and next-attempt fields, and records the bounded error code `lease_expired_at_attempt_limit`. Only rows below the attempt limit remain eligible for a new claim.

This closes the crash-at-attempt-eight gap: a worker that dies after its final claim can no longer leave the event permanently stranded in `processing` after the lease expires.

## Version PR auto-merge guard

Version PRs are Draft by default. Repository automation can reach its merge command only when all of the following remain true:

1. The PR is same-repository, owner-authored, targets `main`, uses a `vN-*` head, and is not Draft.
2. The exact `production-merge-approved` label is present.
3. A reviewer other than the PR author has an `APPROVED` review on the exact current head SHA.
4. Validation runs against that exact SHA with a read-only token and `persist-credentials: false`.
5. Dependency audit, static checks, persistence/security/bootstrap/readiness/merge-safety tests, plan-only DB commands, and the production build pass.
6. Immediately before merge, the workflow rechecks head SHA, Draft state, label, exact-head approval, and Vercel success.

Ready-for-review, review approval, and merge authorization are intentionally separate states. Removing Draft status alone cannot activate the merge path. The workflow does not enable a persistent GitHub auto-merge reservation; after the final authorization check it attempts only the exact-head squash merge.

## Validation boundary

The v120 test set covers derived digest tampering, closure-lineage substitution, invalid version transitions, single-statement pre-state reads, final-attempt lease expiry, workflow permissions, exact-head approval, explicit labeling, and repository instructions. Database integration remains outside this change because DB work was not authorized.
