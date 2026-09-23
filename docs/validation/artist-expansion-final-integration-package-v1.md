# FANDEX Artist Expansion — Final Integration Package v1

## Exact repository state

Validation branch:
- `validation/artist-expansion-generic-naver-pipeline-v1`

Validated branch head before this package document:
- `a278d7b2c9ed085c3d29d5da37a75eaa6f53578e`

Current main at packaging time:
- `930f5d692129e75f79ca3d74e99f6751cc12bb46`

Merge base:
- `75b9e7c3d1f71e408d9bac0a45dd2857a9dac12b`

Relationship at packaging time:
- validation branch: 46 commits ahead of merge base
- validation branch: 2 commits behind current main
- GitHub compare status: `diverged`

The two main-only commits touch:
- `lib/product/activation/newsIssuePointPublicRouteCutoverApproval.ts`
- `tests/product-news-issue-point-public-route-cutover-approval-v1.test.mts`

No Artist Expansion file overlap was found in those two main-only changes.

## Integration rule

Do not merge this long-lived validation branch blindly.

Preferred Production handoff shape:
1. start from current `main`
2. re-apply only the approved Artist Expansion changes
3. preserve current Product activation/cutover files from `main`
4. run repository validation again on the resulting exact integration head
5. Production merge/activation remains owned by `FANDEX 운영 표준`

## Package A — canonical artist identity

Production-relevant:
- `app/data/v4/artistUniverse.ts`

Validation result:
- Artist Universe: 100
- canonical Korean alias ready: 100/100
- explicit NAVER query ready: 100/100
- realtime cohort: 28/28

Supporting tests/docs:
- `tests/artist-expansion-generic-naver-pipeline-v1.test.mts`
- `tests/artist-expansion-full-universe-generic-naver-v1.test.mts`
- `tests/artist-expansion-naver-identity-coverage-v1.test.mts`
- `docs/validation/artist-expansion-naver-identity-coverage-v1.md`

Runtime evidence:
- Actions run `35840233909`
- conclusion: `success`

## Package B — Last.fm generic cohort

Production-relevant:
- `scripts/lastfm-cloud/lastfm_cloud_history_v1.py`
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_delta_v1.py`
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_v1.py`
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_score_preview_v1.py`
- `scripts/fandex-cloud-migration/source/lastfm_global_interest_rolling_score_preview_v1.py`

Supporting tests:
- `tests/artist-expansion-lastfm-generic-count-v1.py`
- `tests/artist-expansion-lastfm-score-generic-cohort-v1.py`

Runtime evidence:
- Actions run `35840873344` — success
- Actions run `35845984187` — success

## Package C — Cloud / YouTube generic cohort

Production-relevant:
- `scripts/fandex-cloud-migration/source/fandex_master_score_v10.py`
- `scripts/fandex-cloud-v10/fandex_cloud_runner_v1.py`

Supporting test:
- `tests/artist-expansion-cloud-youtube-generic-cohort-v1.py`

Validation:
- cross-source artist-set parity remains strict
- fixed 10-artist cohort requirement removed
- 11-artist Naver/YouTube/Music/Last.fm parity regression passed

Runtime evidence:
- Actions run `35842202477`
- conclusion: `success`

## Package D — Music generic cohort

Production-relevant:
- `data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json`
- `scripts/fandex-cloud-migration/source/music_chart_discover_artist_candidates_v2.py`
- `scripts/fandex-cloud-migration/source/music_chart_current_presence_preview_v1.py`
- `scripts/fandex-cloud-migration/source/music_chart_current_presence_publish_v2.py`

Supporting test:
- `tests/artist-expansion-music-generic-cohort-v1.py`

Validation:
- discovery alias map externalized to seed config
- preview cohort dynamic
- publish cohort dynamic
- 11 artists × 3 platforms = 33 rows handled
- 11th configured artist discovery verified

Runtime evidence:
- Actions run `35843637144`
- conclusion: `success`

Historical validation run `35843592147` failed only because the temporary validation workflow omitted `beautifulsoup4`; after matching the production workflow dependency set, the same regression passed.

## Package E — health / daily summary generic cohort

Production-relevant:
- `scripts/fandex-cloud-migration/source/fandex_python_health_check_v3.py`
- `scripts/fandex-cloud-migration/source/fandex_daily_summary_v3.py`

Validation:
- master cohort count dynamic
- rank sequence dynamic
- Music artist set must equal master artist set
- Last.fm ready count derives from current cohort
- no fixed 10-artist contract remains in these paths

Runtime evidence:
- Python syntax validation in Actions run `35845984187`
- conclusion: `success`

## Validation-only / handoff artifacts

These files provide evidence and do not themselves require Product activation:
- `docs/validation/artist-expansion-integration-handoff-v1.md`
- `docs/validation/artist-expansion-naver-identity-coverage-v1.md`
- all `tests/artist-expansion-*` files

## Infrastructure-only file

- `vercel.json`

Purpose:
- skip Vercel builds for `validation/*` branches through `ignoreCommand`

Observed limitation:
- it can cancel the build after Vercel creates the deployment/check
- it does not prevent Vercel integration from creating a check/deployment object, and rate-limit failures can occur before the ignore command runs

Treat this as infrastructure policy, separate from Artist Expansion Product integration.

## Final validation status

- NAVER genericity: PASS
- canonical identity coverage: 100/100
- Last.fm collection/delta/rolling genericity: PASS
- Last.fm score genericity: PASS
- Cloud master/runner genericity: PASS
- YouTube expanded-cohort participation: PASS
- Music discovery/preview/publish genericity: PASS
- health/daily summary dynamic cohort handling: PASS
- known IU-specific blocker in tested paths: none found
- fixed 10-artist blocker in tested paths: removed on validation branch

## Authority boundary

This package is integration-ready evidence only.

Not performed here:
- Production PR merge
- registry transition
- Product activation
- publication
- public route cutover

Next authority:
- `FANDEX 운영 표준`
