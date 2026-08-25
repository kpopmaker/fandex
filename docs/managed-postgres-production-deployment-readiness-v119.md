# Managed Postgres Production deployment readiness v119

## Outcome

This phase evaluated readiness only. It did not deploy, create a PR, merge, connect to a database, run a migration, mutate a role, change an environment variable, process an outbox event, persist business data, or operate a snapshot.

| Readiness dimension | Result |
| --- | --- |
| Production infrastructure | `ready` |
| Build | `ready` |
| Security | `ready` |
| Source integration | `blocked` |
| Environment binding | `ready` |
| Privileged legacy environment | `blocked` |
| Runtime entrypoint | `ready` |
| Business persistence safety | `ready` |
| Rollback | `ready` |
| Production deployment technical readiness | `blocked` |
| Production deployment authorization | `not_authorized` |
| Production deployment execution readiness | `not_ready` |

`deployment_performed` and `business_persistence_performed` are both `false`.

## v118 lineage

- Migration 001: `8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a`
- v117 grant plan: `05e8eba83f4b88d7d4897b42f4cc62c3cc337dc35f88b8efa618aee8302ba546`
- Corrected verifier: `e1012c0738bddda1c319a9f814589b66cfa48de6f79e753f7dbf6d9111f43048`
- Migrator verification: `f6eeb2b4b9343aa4baeb4b3753f67bb2fd4cc9837c59bc3d4a07535af78d4529`
- Runtime verification: `4b77a9e0a71a465e6f3ff60d8961449ffcd49fc87cee510a19c9b2f74ede9c7a`
- Owner catalog: `d523a7fde57b6b76fd8c6a7661707a57d61cebc19e07888f275adb493d2f2725`
- ACL: `53415aa48c6c5cbad29c49b267e72fba1408235d54395e56fc108248b845ce17`
- Vercel metadata: `43e0a21bf3c7f215491edd2be692cfdd3fd434bda3f8f21a0667e31856622d37`
- v118 aggregate readiness: `e1bd710f0000652f05e1b8584bf246290232c4ac99fdca515307d1234bf46289`

## Git source integration

- Expected Production Branch: `main`
- Vercel project setting for Production Branch: `unverified`
- Latest READY Production deployment source branch: `main`
- Remote `main` SHA: `627fbd1e88f7de73869a237d9aa5bd22597e6501`
- Required v118 SHA: `c5d6be5d6e3d43218319b878d46ab8b92683a3c8`
- Remote main commit object available locally: `false`
- Remote main contains v118: `unknown`
- v118 versus main ahead/behind: `unknown`

The remote SHA was read with `git ls-remote` and no fetch was performed. Because the remote commit object is unavailable locally, ancestry was not guessed. Direct `--prod` deployment from the current version branch is not planned; deployment must use the Git Production Branch path.

Required follow-up:

1. Create a PR containing the v118/v119 changes.
2. Review and merge it into `main`.
3. Re-evaluate Production deployment readiness after the merge.

Those actions were not performed in v119.

## Environment metadata

Seven Vercel metadata reads were performed. Only names, scopes, and Sensitive status were retained. Secret value reads and secret hashes were both zero.

| Name | Scope | Sensitive |
| --- | --- | --- |
| `FANDEX_MIGRATION_DATABASE_URL` | Production | yes |
| `FANDEX_RUNTIME_DATABASE_URL` | Production | yes |
| `DATABASE_URL` | Production | yes |
| `DATABASE_URL` | Preview | yes |
| `DATABASE_URL_UNPOOLED` | Production | yes |
| `DATABASE_URL_UNPOOLED` | Preview | yes |

The FANDEX variables have no Preview or Development exposure. Migration is statically constrained to the unpooled migrator variable and runtime to the pooled runtime variable.

The two legacy owner-bound variables remain a blocker because they may inject unnecessary privileged credentials into the deployed server runtime. They have already been replaced by FANDEX least-privilege variables. Removal or modification requires separate explicit authorization and was not performed here. Their Preview exposure further reinforces the blocker.

## Static runtime and persistence inspection

Actual runtime credential references:

- `lib/server/persistence/contracts.ts`: validates only `FANDEX_RUNTIME_DATABASE_URL` for runtime and only `FANDEX_MIGRATION_DATABASE_URL` for migration.
- `lib/server/persistence/db.ts`: creates the server-only runtime pool from the runtime boundary.
- `scripts/database/run-postgres-migrations.mts`: uses the migration boundary in explicit plan/apply tooling.

No legacy fallback, cross-use of runtime and migration credentials, `NEXT_PUBLIC` database credential, dynamic database environment lookup, or build/install/start lifecycle migration or seed was found.

Persistence operations are defined in `lib/server/persistence/adapter.ts` and invoked only from explicit staging validation and tests. They are not wired to a Route Handler, Server Action, Cron, middleware, instrumentation, build lifecycle, or start lifecycle. Therefore this remains an infrastructure-only deployment boundary; automatic collection/application and business persistence are inactive.

## Build and security gates

- `npm ci`: passed; package lock unchanged
- Production dependency audit: eligible, high 0, critical 0
- Typecheck: passed
- Lint: passed
- Security tests: 3/3
- Persistence tests: 15/15
- Role bootstrap tests: 11/11
- Production bootstrap tests: 24/24
- v119 readiness tests: 8/8
- Migration plan: passed, plan only
- Role plan: passed, plan only
- Production build: passed

Build-time DB connections, queries, migration applies, role mutations, environment mutations, business persistence, outbox processing, and deployment creation were all zero.

## Deployment and rollback plans

The deterministic deployment plan requires a `main` commit containing the v119 readiness change, all listed build/test/security gates, the two FANDEX Production Sensitive bindings, infrastructure-only behavior, read-only application and route health checks, no database probe, no business write, and separate explicit deployment approval.

The previous READY Production deployment is identifiable from read-only metadata:

- Source branch: `main`
- Source commit: `1ff8c87a175c4035c57695a26f2f8e241c0b3baf`

Application rollback would select that previous READY deployment, require separate authorization, execute a Vercel application rollback, and perform read-only health checks. Migration 001 is additive and backward-compatible, the previous application does not use the new `fandex` schema, and ordinary application rollback does not require a database rollback. `pre-v117-production-baseline` remains disaster-recovery-only and was not used.

## Blockers

1. Remote `main` ancestry and the Vercel project Production Branch setting are not independently verified.
2. v118/v119 changes require PR review and merge to `main` before deployment reassessment.
3. Legacy owner-bound `DATABASE_URL` and `DATABASE_URL_UNPOOLED` remain present and require separately authorized removal.
4. Production deployment is not authorized.

## Sanitized digests

- Source manifest: `59af43bb193bd762b41d0d06ecd8d84b247a921c892084fbbca790c1edea23eb`
- Environment manifest: `e5561f92300fcc6b94086cba35586bb2f70dd55c05b0680eca0024ea8ce9e00c`
- Deployment plan: `bb18c9491417fa97c293c631666e296865fd91db51da5a124ebc1674a9745df7`
- Rollback plan: `12538463261f8b066b563beb0c3d6ee7af0272d331900bf131b1e97ebde69d2d`
- Aggregate readiness: `5e94e647c656afd0b8e7f04ac22adcc0b17ac919d1491158ffcbb0e9bd441bcd`

No secret, URL, host, username, password, token, project/team/account identifier, or derived hash is included in these digests.

## External-effect counters

| Effect | Count |
| --- | ---: |
| Git remote metadata reads | 1 |
| Vercel metadata reads | 7 |
| npm registry commands | 2 |
| Secret value reads | 0 |
| Secret hashes | 0 |
| DB connections | 0 |
| DB queries | 0 |
| Migration applies | 0 |
| Role mutations | 0 |
| Environment mutations | 0 |
| Business writes | 0 |
| Outbox operations | 0 |
| Deployments | 0 |
| Snapshot changes | 0 |
| PRs | 0 |
| Merges | 0 |
