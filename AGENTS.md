<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FANDEX version publish flow

For version branches matching `v[0-9]+-*` and targeting `main`:

1. Inspect the intended diff, run the relevant checks, commit, and push the current version branch.
2. Search for an existing PR from the current branch before creating one. Never create a duplicate PR.
3. Create a **Draft** PR targeting `main` unless the user explicitly authorizes ready-for-review for that exact head. Prefer the GitHub connector; use authenticated `gh` only if the connector cannot create the PR.
4. Treat ready-for-review, review approval, and merge authorization as separate states. Never add the `production-merge-approved` label without explicit merge authorization for the exact PR head.
5. Do not call GitHub merge or enable-auto-merge tools for version PRs. The repository workflow `.github/workflows/codex-version-pr-auto-merge.yml` can create and non-force push an exact-base/head merge commit only while the PR is open and still targets `main`, after all checks pass, at least one current trusted non-author APPROVED review targets the exact head SHA, no current trusted reviewer has an active CHANGES_REQUESTED decision on that SHA, and the exact `production-merge-approved` label is present. Its merge job must keep pull-request metadata read-only. The push must fail if `main` moves from the authorized base, and the workflow must not leave a persistent GitHub auto-merge reservation.
6. If merge is authorized, confirm the exact-base/head review state first and add the merge-authorization label last so the guarded workflow runs. Poll the PR and remote `main` until the PR is merged or the workflow reports a failure. Report Vercel failure, timeout, conflict, a changed PR base/head, dismissed or superseded approval, active trusted changes request, or removed authorization instead of forcing a merge.
7. If merge or Production deployment is excluded, keep the PR Draft, do not add the merge-authorization label, and stop after the authorized Preview/checks state.
8. After an authorized merge, preserve unrelated and untracked files, switch the separate local main worktree to `main`, and fast-forward it with `git pull --ff-only origin main`.
9. Report the PR number, Draft/authorization state, Vercel result, merge SHA if any, remote `main` SHA, local `main` SHA, and divergence.

The GitHub plugin is session-scoped. A plugin installed or enabled after a Codex session started is available only to a new session. If a connector call returns `The GitHub tool has been disabled`, do not retry merge calls in that session; the repository workflow owns the merge step.
