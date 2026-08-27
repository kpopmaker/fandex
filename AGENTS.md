<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FANDEX version publish flow

For version branches matching `v[0-9]+-*` and targeting `main`:

1. Inspect the intended diff, run the relevant checks, commit, and push the current version branch.
2. Search for an existing PR from the current branch before creating one. Never create a duplicate PR.
3. Create a **Draft** PR targeting `main` unless the user explicitly authorizes ready-for-review for that exact head. Prefer the GitHub connector; use authenticated `gh` only if the connector cannot create the PR.
4. Treat ready-for-review, owner attestation, and merge authorization as separate states. Never add the `production-merge-approved` label without explicit merge authorization for the exact PR base and head.
5. Do not call GitHub merge or enable-auto-merge tools for version PRs. This solo-maintainer repository uses the workflow `.github/workflows/codex-version-pr-auto-merge.yml`, which can create and push an exact-base/head merge commit only while the PR is open, owner-authored by the repository owner's human `User` account, and still targets `main`. It requires all checks to pass, at least one current repository-owner issue comment with `author_association: OWNER` whose body is exactly the three lines below, and the exact `production-merge-approved` label. Any different base/head or edited/deleted attestation is unauthorized.

   ```text
   FANDEX_PRODUCTION_MERGE_ATTESTATION v1
   base_sha=<exact 40-character lowercase base SHA>
   head_sha=<exact 40-character lowercase head SHA>
   ```

   The merge job must keep PR and issue-comment metadata read-only and update `main` only through an exact expected-base `--force-with-lease`; unconditional force is prohibited. The lease must fail if `main` moves from the authorized base, including when it moves to the PR head or one of its ancestors, and the workflow must not leave a persistent GitHub auto-merge reservation.
6. If merge is explicitly authorized, confirm the exact open/Ready/base/head state first, post the exact owner-attestation comment, then add the merge-authorization label last so the guarded workflow runs. Poll the PR and remote `main` until the PR is merged or the workflow reports a failure. Report Vercel failure, timeout, conflict, a changed PR base/head, an edited/deleted/missing owner attestation, or removed authorization instead of forcing a merge.
7. If merge or Production deployment is excluded, do not post the owner attestation or add the merge-authorization label. Preserve any separately authorized Ready state; otherwise keep a newly created PR Draft, and stop after the authorized Preview/checks state.
8. After an authorized merge, preserve unrelated and untracked files, switch the separate local main worktree to `main`, and fast-forward it with `git pull --ff-only origin main`.
9. Report the PR number, Draft/authorization state, Vercel result, merge SHA if any, remote `main` SHA, local `main` SHA, and divergence.

The GitHub plugin is session-scoped. A plugin installed or enabled after a Codex session started is available only to a new session. If a connector call returns `The GitHub tool has been disabled`, do not retry merge calls in that session; the repository workflow owns the merge step.
