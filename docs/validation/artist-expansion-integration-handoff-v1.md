# FANDEX Artist Expansion — Integration-Ready Handoff v1

Branch: `validation/artist-expansion-generic-naver-pipeline-v1`

## Scope

Validation only. This handoff does not perform Production merge, Product Operations approval, activation, publication, or public cutover.

## Validation result

- Artist Universe total: 100
- canonical Korean alias ready: 100/100
- explicit NAVER query ready: 100/100
- generic NAVER pipeline regression coverage: 100/100
- realtime artist identity ready: 28/28
- IU-specific hard-coding blocker in tested NAVER path: not found
- Missing handling: fail-closed, never coerced to 0 or Stable
- provider preserved as `naver-news`
- canonical artist ownership preserved end-to-end
- observedAt and collectedAt semantics remain distinct
- no Variable or metric binding fabricated by the adapter

## Runtime evidence

GitHub Actions:

- workflow: `Artist Expansion Generic NAVER Validation v1`
- run id: `35840233909`
- head SHA: `06cf93d1b661af4f4c6346b3bf3c5b94a80b453e`
- event: `push`
- conclusion: `success`

Successful steps:

1. Install dependencies
2. Typecheck
3. Generic multi-artist regression
4. Full-universe identity coverage
5. Full-universe generic NAVER regression

## Vercel validation-branch protection

Validation branch builds are skipped using root `vercel.json`:

`VERCEL_GIT_COMMIT_REF=validation/*` => ignoreCommand exits 0.

Verification deployment:

- deployment id: `dpl_EPEJ3UJ4nAtbJ8orJWrTdmUsNW3s`
- head SHA: `06cf93d1b661af4f4c6346b3bf3c5b94a80b453e`
- state: `CANCELED`
- reason: validation branch ignored before build

This validates that subsequent validation-branch commits can avoid consuming Preview build capacity.

## Temporary validation workflow cleanup

The one-time validation workflow was removed after the successful run.

Cleanup commit:

- `e3742f76f6d82af48c5944f87e6ab9bce0055a20`

The successful Actions run remains historical evidence.

## Handoff status

`ARTIST_EXPANSION_INTEGRATION_READY = YES`

Next authority: `FANDEX 운영 표준`

That chat should independently inspect the exact branch/head diff before deciding whether and how to integrate. This handoff does not authorize merge or Production activation.


## Last.fm generic artist-count validation

A second expansion blocker was found outside the NAVER path: Last.fm collection and migration scripts assumed exactly 10 artists.

Validation-branch fixes:

- `scripts/lastfm-cloud/lastfm_cloud_history_v1.py`
  - seed count is now dynamic
  - snapshot completeness denominator derives from the current seed set
  - score readiness derives from the current delta row count
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_delta_v1.py`
  - removed exact 10-artist requirement
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_v1.py`
  - first snapshot defines the expected artist set
  - later snapshots must match that exact set and dynamic count
  - readiness output denominator is dynamic

Runtime regression:

- test: `tests/artist-expansion-lastfm-generic-count-v1.py`
- synthetic cohort size: 11 artists
- workflow run id: `35840873344`
- head SHA: `502af7fc6fae272da07cf350df33f22099a61ca9`
- conclusion: `success`

Successful steps:

1. Python syntax check
2. Generic 11-artist regression

The temporary Last.fm validation workflow was removed after PASS.

Cleanup commit:

- `cb104d4b46f76002bc236750538d01083a22b0eb`

Updated conclusion:

- NAVER identity/pipeline genericity: PASS
- Last.fm artist-count genericity: PASS
- known fixed 10-artist blocker: REMOVED on validation branch


## Cloud / YouTube generic cohort validation

A fixed-cohort blocker was found in the Cloud v10 integration path:

- `fandex_master_score_v10.py` required all source sets to contain exactly 10 artists.
- `fandex_cloud_runner_v1.py` hard-coded an exact 10-artist Last.fm set.

Validation-branch fixes:

- Cloud master now requires:
  - non-empty source artist set
  - exact artist-set parity across Naver / YouTube / Music / Last.fm
  - no fixed cohort size
- Cloud runner Last.fm bootstrap now:
  - derives the expected cohort from the first snapshot
  - requires subsequent snapshots to match the same exact artist set
  - uses a dynamic expected count
- step descriptions no longer claim a fixed 10-artist cohort.

Runtime regression:

- test: `tests/artist-expansion-cloud-youtube-generic-cohort-v1.py`
- synthetic cohort size: 11 artists
- covers:
  - Naver source parity
  - YouTube source parity
  - Music source parity
  - Last.fm source parity
  - master ranking generation
  - cloud runner Last.fm bootstrap
- workflow run id: `35842202477`
- head SHA: `2fdcb585207f1b1d708e20e8b3593c38fbd5bbcf`
- conclusion: `success`

Successful steps:

1. Python syntax check
2. Generic 11-artist cloud and YouTube cohort regression

The temporary workflow was removed after PASS.

Cleanup commit:

- `7448fa3a956bc3146f479c6053cd6cc80a3495e4`

Updated genericity conclusion:

- NAVER pipeline: PASS
- Last.fm variable-count path: PASS
- Cloud master cross-source cohort: PASS
- YouTube source participation in >10 artist cohort: PASS
- fixed 10-artist cloud blocker: REMOVED on validation branch
