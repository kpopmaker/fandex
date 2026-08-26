# FANDEX version-PR auto-merge bootstrap guard

## Purpose

The default branch still contains the historical `pull_request_target` workflow that can queue a version-PR merge after Vercel success without an explicit merge label or a current exact-head human approval. This bootstrap change installs the guarded workflow before any Draft version PR is made ready for review.

The bootstrap branch deliberately does not match `v[0-9]+-*`. The historical workflow therefore exits without merging if this bootstrap PR is later made ready under a separate authorization.

## Guarded merge boundary

The replacement workflow requires all of the following before its write-capable job can run:

1. A same-repository, owner-authored `vN-*` PR targeting `main` that is not Draft.
2. Exactly one `production-merge-approved` label added only after explicit exact-head merge authorization.
3. At least one current trusted non-author approval on the exact head SHA and no active trusted changes request on that SHA.
4. An unchanged exact base/head pair through authorization, validation, Vercel polling, and the final pre-merge check.
5. Dependency security, static analysis, all persistence/bootstrap/deployment/merge-safety tests, plan-only database commands, and the production build.
6. A merge commit whose parents are the exact authorized base and head, pushed to `main` without force. If `main` moves, Git rejects the update.

The workflow never creates a persistent GitHub auto-merge reservation. Draft release, review approval, and merge authorization remain separate actions.

## Bootstrap scope

This PR changes only repository instructions and the version-PR automation, evaluator, package test entry, and regression test. It does not include the v120 persistence changes.

The PR must remain Draft until separately authorized. No merge, Production deployment, database connection or write, migration apply, role/password operation, or environment-variable change is part of this bootstrap preparation.
