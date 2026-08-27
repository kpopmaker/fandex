# FANDEX version-PR auto-merge bootstrap guard

## Purpose

The default branch still contains the historical `pull_request_target` workflow that can queue a version-PR merge after Vercel success without an explicit merge label or an exact-base/head owner attestation. This bootstrap change installs the guarded workflow for a repository with one human maintainer.

The bootstrap branch deliberately does not match `v[0-9]+-*`. The historical workflow therefore exits without merging if this bootstrap PR is later made ready under a separate authorization.

## Guarded merge boundary

The replacement workflow requires all of the following before its write-capable job can run:

1. An open, same-repository, owner-authored `vN-*` PR still targeting the `main` ref that is not Draft. The PR author must be the repository owner and a human GitHub `User`. Closing, retargeting, or converting the PR back to Draft starts a cancelling concurrency event.
2. Exactly one `production-merge-approved` label added only after explicit exact-base/head merge authorization.
3. At least one current top-level PR comment authored by the same repository-owner `User`, with GitHub `author_association: OWNER`, whose body is exactly:

   ```text
   FANDEX_PRODUCTION_MERGE_ATTESTATION v1
   base_sha=<exact 40-character lowercase base SHA>
   head_sha=<exact 40-character lowercase head SHA>
   ```

   A bot, another account, another association, changed SHA, extra text, or malformed body cannot authorize. Comment creation, editing, and deletion use the PR concurrency key to cancel an in-progress merge run; every authorization phase fetches the current paginated issue-comment set again.
4. An unchanged open state, exact `main` base-ref name, and exact base/head pair through authorization, validation, Vercel polling, and the final pre-merge check.
5. Dependency security, static analysis, all persistence/bootstrap/deployment/merge-safety tests, plan-only database commands, and the production build.
6. A merge commit whose parents are the exact authorized base and head, pushed to `main` with an exact expected-base `--force-with-lease`. The lease rejects every changed `main`, including a move to the PR head or one of its ancestors; unconditional force is prohibited.
7. `contents: write` only in the final merge job, with pull-request metadata read-only throughout.

The workflow never creates a persistent GitHub auto-merge reservation. Ready state, owner attestation, and the final merge-authorization label remain separate actions. The owner attestation is a solo-maintainer accountability record, not independent peer review.

## Bootstrap scope

This PR changes only repository instructions and the version-PR automation, owner-attestation evaluator, package test entry, and regression test. It does not include the v120 persistence changes.

The PR may remain Ready when that state is separately authorized, but it must remain label-free and unattested until exact-base/head merge authorization. No merge, Production deployment, database connection or write, migration apply, role/password operation, or environment-variable change is part of this bootstrap preparation.
