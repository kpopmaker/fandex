# Activity Exposure v1 Production integration preflight

Status: PRE-INTEGRATION VALIDATION  
Latest main checked: `d7ad96f9a207e35141104882972a97829400862c`  
Research head: `a0a64b6fe0191cff4097b90df16fbb12fb78149a`

## Verdict

`LATEST_MAIN_COMPATIBILITY = PASS_WITH_RECONSTRUCTION_REQUIRED`

`DIRECT_RESEARCH_BRANCH_MERGE = FORBIDDEN`

`INTEGRATION_PR_ALLOWED = NO`

The research branch is 24 commits ahead and 0 commits behind the checked main.

All 16 research diff files are additions relative to main.

There is no current file-level merge conflict with main, but the research implementation is intentionally namespaced as research code and must not be promoted by blindly merging/cherry-picking the branch.

## Research diff classification

### Semantic source of truth — reconstruct into Production architecture

These files contain validated semantics and executable behavior that may be reused as source material:

- `lib/research/activityExposure.ts`
- `lib/research/activityExposureObservation.ts`
- `lib/server/research/musicBrainzActivityCollector.ts`
- `lib/server/research/youtubeActivityCollector.ts`

Disposition:

`RECONSTRUCT_NOT_CHERRY_PICK`

Production code should preserve their tested invariants while moving responsibilities into the current Product / ingestion architecture.

### Validation-only

- `.github/workflows/activity-exposure-research-validation.yml`
- `tests/activity-exposure-event-contract-v1.test.mts`
- `tests/activity-exposure-observation-v1.test.mts`
- `tests/musicbrainz-activity-collector-v1.test.mts`
- `tests/youtube-activity-collector-v1.test.mts`
- `tests/iu-activity-exposure-end-to-end-v1.test.mts`

Disposition:

`VALIDATION_SOURCE_ONLY`

These should be adapted to the reconstructed candidate rather than treated as Product runtime files.

### Research / handoff documentation

- `docs/handoff/activity-exposure-v1-integration-handoff.md`
- `docs/research/comeback-activity-point-source-contract-v1.md`
- `docs/research/fixtures/iu-activity-exposure-event-stream-v1.json`
- `docs/research/iu-activity-exposure-coverage-readiness-v1.md`
- `docs/research/iu-activity-exposure-evidence-validation-v1.md`
- `docs/research/iu-activity-exposure-historical-replay-v1.md`

Disposition:

`REFERENCE_EVIDENCE_ONLY`

## Product contract compatibility finding

Current main Product variable models are numeric:

- `ProductVariableReadModel.fact: ProductNumericFact`
- `ProductMetricReadModel.fact: ProductNumericFact`
- metric scoring metadata also contains numeric value / score / weight fields

Therefore the canonical Activity Exposure Event Stream **must not** be forced through the existing numeric `comebackActivityPoint` read model.

Doing so would reintroduce the rejected numeric construct.

Required direction:

`NEW_NON_NUMERIC_ACTIVITY_EXPOSURE_READ_MODEL_REQUIRED_FOR_PRODUCT_EXPOSURE`

This is a Product-contract requirement, not authorization to expose the construct publicly.

A future read model must be capable of representing at least:

- event stream
- provider identity
- event family
- participation scope
- all collaboration artist credits
- occurredAt precision
- sourcePublishedAt
- collectedAt
- evidence lineage
- covered / partial / missing_source_data / identity_unresolved / provider_unavailable / not_in_scope / invalid

It must not require:

- numeric score
- weight
- normalization
- rank
- recency decay
- active window

## Ingestion architecture finding

Current main ingestion implementation is NAVER-specific.

Existing persisted ingestion contracts constrain:

- provider = `naver-news`
- source type = `news_article`
- raw evidence as append-only
- normalized records as append-only

Activity Exposure requires provider-specific collectors and provider-aware raw retention semantics.

Therefore:

`CURRENT_NAVER_INGESTION_PATH_REUSE = NO`

The existing NAVER path should remain unchanged.

## Persistence dependency

Prior retention review established:

`PRODUCTION_PERSISTENCE_SCHEMA_CHANGE_REQUIRED = YES`

No Neon main-schema mutation has been performed.

Because the user requires explicit approval before Neon main-schema changes, persistence implementation is blocked at the schema-application boundary.

A temporary design or migration draft may be prepared later, but no main schema change is authorized.

## Live provider gate

MusicBrainz:

`PASS_WITH_BOUNDED_PARTIAL`

Evidence:

- 58 / 58 current release groups enumerated
- 57 confirmed release events
- one release group retained as missing_source_data
- 12 collaboration events
- 0 collaboration-credit preservation violations
- 0 validator issues

YouTube:

`CREDENTIAL_BLOCKED`

No authorized YouTube Data API credential is currently available in the validation environment.

Therefore:

`LIVE_PROVIDER_COVERAGE_GATE = BLOCKED_BY_YOUTUBE_CREDENTIAL`

## Integration blocker ordering

The nearest blocker remains:

1. authorized YouTube Data API credential
2. complete current-visible uploads replay
3. truthful coverage report
4. raw-evidence retention authorization resolution for intended persistence
5. explicit approval before any Neon main-schema change
6. reconstruct Product/ingestion candidate from then-latest main
7. targeted + full validation
8. integration PR
9. separate explicit merge authorization
10. separate activation/publication UX gate

## Guardrails retained

- canonical construct = Activity Exposure Event Stream
- `comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`
- Missing != 0
- Missing != inactive
- Observation Time != Collection Time
- collaboration artist credits preserved
- no arbitrary weights
- no thresholds
- no recency decay
- no active window
- no raw cross-family count metric
- no Production merge
- no activation
- no publication
- no Neon main-schema mutation

## Current state

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

`PRODUCTION_READY = NO`
