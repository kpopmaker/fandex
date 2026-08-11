<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FANDEX version publish flow

For version branches matching `v[0-9]+-*` and targeting `main`:

1. Inspect the intended diff, run the relevant checks, commit, and push the current version branch.
2. Search for an existing PR from the current branch before creating one. Never create a duplicate PR.
3. Create a ready-for-review PR targeting `main`. Prefer the GitHub connector; use authenticated `gh` only if the connector cannot create the PR.
4. Do not call GitHub merge or enable-auto-merge tools for version PRs. The repository workflow `.github/workflows/codex-version-pr-auto-merge.yml` waits for Vercel success and queues a squash merge.
5. Poll the PR and remote `main` until the PR is merged or the workflow reports a failure. Report Vercel failure, timeout, conflict, or a changed PR head instead of forcing a merge.
6. After merge, preserve unrelated and untracked files, switch the separate local main worktree to `main`, and fast-forward it with `git pull --ff-only origin main`.
7. Report the PR number, Vercel result, merge SHA, remote `main` SHA, local `main` SHA, and divergence.

The GitHub plugin is session-scoped. A plugin installed or enabled after a Codex session started is available only to a new session. If a connector call returns `The GitHub tool has been disabled`, do not retry merge calls in that session; the repository workflow owns the merge step.
