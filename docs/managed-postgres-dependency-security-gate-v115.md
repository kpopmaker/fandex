# Managed PostgreSQL dependency security gate — v115

v115 classifies the six high-severity vulnerable-package entries reported after v114, applies only compatible targeted updates, and adds a reusable production audit gate. No database, Neon, Vercel, environment variable, credential, migration apply, or persistent write boundary was accessed.

## Baseline classification

The initial full audit reported six high package entries and zero critical entries; the production-only audit reported four high package entries and zero critical entries. A direct comparison of the committed v113 and v114 lockfiles shows that every vulnerable version below was already present in v113. The five v114 dependencies (`pg`, `@vercel/functions`, `server-only`, `@types/pg`, and `tsx`) introduced zero advisory paths.

| Package and advisory IDs | Initial path and scope | Vulnerable range / minimum fix | Fix and reachability |
| --- | --- | --- | --- |
| `brace-expansion`: 1123897/GHSA-3jxr-9vmj-r5cp, 1123898/GHSA-3jxr-9vmj-r5cp, 1130588/GHSA-mh99-v99m-4gvg, 1130591/GHSA-mh99-v99m-4gvg, 1130734/GHSA-rgw5-rvv9-x895, 1130737/GHSA-rgw5-rvv9-x895 | `eslint -> minimatch -> brace-expansion` and `eslint-config-next -> typescript-eslint -> minimatch -> brace-expansion`; dev-only | `<=1.1.17` or `3.0.0–5.0.8`; fixed at `1.1.18` and `5.0.9` | `fixAvailable: true`; lockfile-only patch updates, no runtime reachability |
| `js-yaml`: 1123911/GHSA-52cp-r559-cp3m, 1138115/GHSA-5p4m-2wfm-xmqj | `eslint -> @eslint/eslintrc -> js-yaml`; dev-only | `4.0.0–4.3.0`; fixed at `4.3.1` | `fixAvailable: true`; minor update within parent range, no runtime reachability |
| `nanoid`: 1138811/GHSA-28wg-ghj8-5hjv, 1139427/GHSA-2v37-7h3g-55p8 | `next -> postcss -> nanoid` at runtime and `@tailwindcss/postcss -> postcss -> nanoid` in tooling | `<=3.3.17`; fixed at `3.3.18` | `fixAvailable: true`; reachable through framework CSS processing, updated transitively |
| `next`: 1124170/GHSA-6gpp-xcg3-4w24, 1124171/GHSA-m99w-x7hq-7vfj, 1124184/GHSA-89xv-2m56-2m9x, 1124186/GHSA-68g3-v927-f742, 1124188/GHSA-4633-3j49-mh5q, 1124190/GHSA-4c39-4ccg-62r3, 1124192/GHSA-p9j2-gv94-2wf4, 1124194/GHSA-q8wf-6r8g-63ch, 1124196/GHSA-955p-x3mx-jcvp | direct production framework dependency | `>=16.0.0 <16.2.11`; minimum direct fix `16.2.11` | npm selected compatible non-major `16.3.2` to also resolve affected framework transitive packages; runtime reachable according to route/features used, so treated as reachable without exception |
| `postcss`: 1117015/GHSA-qx2v-qp2m-jg93, 1124252/GHSA-6g55-p6wh-862q, 1130709/GHSA-fxqj-rqcc-2cmp, 1139510/GHSA-r28c-9q8g-f849 | `next -> postcss` runtime/build path and Tailwind tooling path | `<8.5.10`, `<=8.5.11`, `<=8.5.22`, `<=8.5.17`; complete fix `8.5.23` | npm mapped the fix through `next@16.3.2`; build-time input processing is reachable |
| `sharp`: 1124066/GHSA-f88m-g3jw-g9cj | optional `next -> sharp` production image path | `<0.35.0`; fixed at `0.35.0` | npm mapped the fix through `next@16.3.2`, resolving `sharp@0.35.3`; potentially runtime reachable through Next image handling |

## Targeted changes and gate

`next` and `eslint-config-next` move together from `16.2.9` to `16.3.2`. Their normal npm resolution updates `postcss` to `8.5.23`, `nanoid` to `3.3.18`, and `sharp` to `0.35.3`. A targeted `npm update brace-expansion js-yaml` updates only the remaining permitted transitive ranges to `brace-expansion@1.1.18`/`5.0.9` and `js-yaml@4.3.1`. No major direct dependency update, force fix, allowlist, or manual lockfile edit is used.

`npm run security:audit:production` invokes the npm production audit in machine-readable mode. High or critical findings, a non-zero audit exit, malformed JSON, or registry/network failure all fail closed. Advisory data and time-dependent audit output are not tracked.

After remediation, full and production audits both contain zero high and zero critical findings. Staging migration eligibility is conditional on this gate, persistence tests, the application build, and migration plan mode all passing while every credential, database, migration-apply, and write effect remains zero.
