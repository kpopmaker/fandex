# FANDEX Codex Workflow

Last updated: 2026-06-21

This document defines the default operating rules for Codex work on FANDEX.
It is meant to keep repeated implementation, verification, commit, and push
steps predictable and safe.

## 1. Basic Work Rules

Before any task:

1. Confirm the branch is `v3-redesign`.
2. Run `git status --short --branch`.
3. Confirm the working tree is clean unless the user explicitly says there are
   existing changes to continue.
4. Do not commit unless the user explicitly asks for a commit.
5. Do not push unless the user explicitly asks for a push.

When staging files:

1. Stage only files explicitly approved by the user.
2. Never stage `.next`, `node_modules`, `package-lock` changes, temporary
   files, or log files unless the user explicitly names them.
3. After staging, run `git diff --cached --name-only`.
4. If the staged file list does not exactly match the approved file list, stop
   and report the mismatch.

## 2. Verification Rules

Default verification for code or workflow changes:

1. Run `npm run lint`.
2. Run `npm run build` when approved or when the task asks for build
   verification.
3. Run `git diff --check`.

Build failure classification:

1. If normal `npm run build` fails with `spawn EPERM` and there is no
   TypeScript or code error log, treat it as a permissions issue.
2. In that case, request approval for elevated `npm run build` and use that as
   the final build result.
3. If the build log contains TypeScript, compile, route, import, or runtime
   generation errors, treat it as a code error and fix only the relevant scope.

## 3. Permission Prompt Response Rules

Use option `1. Yes, proceed` only when the command matches the safe conditions
below. Do not choose option `2` by default.

Allowed one-time approvals:

1. Elevated `npm run build`: approve when normal build failed with `spawn EPERM`
   and no code error log was shown.
2. Elevated `git add`: approve only when the command stages explicitly
   designated files.
3. Elevated `git commit`: approve only when the staged files and commit message
   match the user request.
4. Elevated `git push`: approve only when the target is `origin v3-redesign`
   and the command is not a force push.

Default rule: do not grant persistent approval unless the user explicitly
decides to do so.

## 4. Commands That Must Not Be Auto-Approved

Do not auto-approve these commands:

1. `git reset --hard`
2. `git clean`
3. `git clean -fd`
4. `rm -rf`
5. `Remove-Item -Recurse`
6. `git push --force`
7. `git add .`
8. `git add -A`
9. `npm install`
10. `npx`
11. `pnpm add`
12. `yarn add`
13. Supabase, database, API-key, or secret-management commands
14. Commands that modify or print `.env` contents

If a task appears to require one of these commands, stop and ask for explicit
direction.

## 5. Required Completion Report

At the end of a task, Codex should report:

1. Starting git status
2. Changed file list
3. Newly added file list
4. Summary of work completed
5. `npm run lint` result
6. `npm run build` result
7. `git diff --check` result
8. Commit and push status
9. Final git status

For route or feature work, also report the expected impact on the relevant
pages such as `/`, `/ranking`, `/artists/[artistId]`, and `/compare`.

## 6. Commit Unit Rules

Commit only after verification is complete and the user explicitly requests it.

Commit rules:

1. Use one commit per feature, fix, refactor, or docs/workflow unit.
2. Keep staged files limited to the requested scope.
3. Use conventional commit messages.

Recommended prefixes:

1. `feat:`
2. `refactor:`
3. `fix:`
4. `docs:`
5. `chore:`

Examples:

1. `feat: add v4 kpop market index history`
2. `refactor: stabilize compare v4 history flow`
3. `fix: guard v4 chart history values`
4. `docs: add codex workflow guide`
5. `chore: add fandex verification script`

## 7. Verification Script

The project may provide:

```bash
npm run verify:fandex
```

This should run lint and build in sequence. If the build part fails with
`spawn EPERM` and no code error log, rerun `npm run build` with elevated
permissions and report both outcomes.
