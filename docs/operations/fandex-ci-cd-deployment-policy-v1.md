# FANDEX CI/CD Deployment Policy v1

## Goal

Reduce Vercel build-rate consumption while preserving exact-head acceptance evidence for final integration candidates and Production deployments.

## Branch policy

| Branch class | GitHub Actions | Vercel Git deployment |
| --- | --- | --- |
| `validation/*` | allowed | disabled |
| `research/*` | allowed | disabled |
| `verify/*` | allowed | disabled |
| `diagnostic/*` | allowed | disabled |
| `work/*` | allowed | disabled |
| `integration/*` | required as applicable | disabled |
| `main` | required by Production gate | enabled |

The Vercel suppression is implemented with `git.deploymentEnabled` in `vercel.json`, not with an Ignored Build Step. This prevents matching branches from being eligible for Git-triggered deployments instead of creating a deployment and canceling the build later.

## Atomic integration rule

Do not assemble final integration candidates by repeatedly pushing each source-file change to an `integration/*` branch.

Preferred sequence:

1. assemble and validate changes on a Vercel-disabled `work/*` or `validation/*` branch;
2. freeze the approved file set and exact base;
3. create the final `integration/*` candidate as one atomic/squashed commit whenever practical;
4. run the repository validation gate on that exact candidate;
5. do not require an automatic Vercel Preview for `integration/*` while trusted `vercel.json` explicitly disables that head deployment;
6. after explicit merge authorization, let the guarded merge workflow compose and validate the exact base/head pair before updating `main`;
7. allow `main` to produce the Production deployment;
8. verify live behavior before changing Production counts or publication state.

## Authority boundary

This policy changes deployment triggering only.

It does not authorize:
- PR merge;
- Product activation;
- registry transition;
- public-route cutover;
- Product publication;
- Neon schema mutation.

Those actions remain under the existing FANDEX Production Master Control gates.


## Guarded merge and Vercel requirement

Automatic Vercel Git deployment is main-only under the current trusted configuration.

The guarded merge workflow therefore evaluates the trusted base version of `vercel.json` before deciding whether a PR-head Vercel status is required.

- If the exact head ref or the wildcard rule explicitly disables Git deployment, the PR-head Vercel wait is not required.
- If deployment is enabled for the exact head ref, the existing Vercel success requirement remains mandatory.
- If the deployment policy is missing, malformed, or otherwise unspecified, the evaluator fails closed by treating the Vercel head check as required.
- This decision is made from the checked-out trusted base, not from untrusted PR-head configuration.

Skipping a PR-head Vercel wait does not weaken the merge authorization boundary. The guarded workflow still requires the exact owner attestation, the exact `production-merge-approved` label, exact-base/head reconciliation, dependency security audit, typecheck, lint, persistence/deployment safety tests, plan-only database checks, and a production bundle build before it can update `main`.

Production deployment remains bound to `main`. A disabled integration Preview is not a Production deployment substitute and does not authorize Product activation, publication, cutover, or any runtime mutation.
