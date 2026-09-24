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
| `integration/*` | required as applicable | enabled |
| `main` | required by Production gate | enabled |

The Vercel suppression is implemented with `git.deploymentEnabled` in `vercel.json`, not with an Ignored Build Step. This prevents matching branches from being eligible for Git-triggered deployments instead of creating a deployment and canceling the build later.

## Atomic integration rule

Do not assemble final integration candidates by repeatedly pushing each source-file change to an `integration/*` branch.

Preferred sequence:

1. assemble and validate changes on a Vercel-disabled `work/*` or `validation/*` branch;
2. freeze the approved file set and exact base;
3. create the final `integration/*` candidate as one atomic/squashed commit whenever practical;
4. run the repository validation gate on that exact candidate;
5. consume at most one Vercel Preview for that exact integration head;
6. after explicit merge authorization, allow `main` to produce the Production deployment;
7. verify live behavior before changing Production counts or publication state.

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
