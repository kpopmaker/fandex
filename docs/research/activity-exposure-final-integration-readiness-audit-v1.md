# FANDEX Activity Exposure Final Integration-Readiness Audit v1

Status: FINAL RESEARCH / PRODUCT-READINESS AUDIT
Legacy variable: comebackActivityPoint
Canonical construct: Activity Exposure
Production mutation: NONE

## 1. Current repository state

Latest checked main:

`8d68d97a389522c268e976196bc342acc605fd7a`

Research head at final audit:

`8b64d0c66fa859d2a61ec1cc2020bd499ba489b5`

Research branch:

`research/comeback-activity-point-source-contract-v1`

Branch relationship:

- ahead of current main: 84 commits
- behind current main: 10 commits
- status: diverged
- merge base: `d7ad96f9a207e35141104882972a97829400862c`

The long-lived research branch must NOT be merged wholesale.

Integration must reconstruct only the still-valid Production-relevant contracts on top of current main.

## 2. Current-main compatibility

Changes added to main after the previous Product truth-semantics audit include:

- Naver news Stored Evidence read-path/performance changes
- persistence contract changes
- runtime Postgres TLS verification hardening

No direct Activity Exposure research source/test path conflict was found.

Current verdict:

`PASS_NO_DIRECT_CODE_CONFLICT_WITH_MAIN_8D68D97A`

Semantic compatibility with current Product truth-preservation contracts remains PASS.

## 3. Construct verdict

Validated Product construct:

`Activity Exposure Event Stream`

The legacy name `comebackActivityPoint` does not justify a numeric output.

Final numeric verdict:

`NUMERIC_OUTPUT_NOT_JUSTIFIED`

Forbidden methodology remains:

- arbitrary weights
- arbitrary phase scores
- recency thresholds
- recency decay
- arbitrary active windows
- raw cross-family event-count aggregation
- Missing -> 0
- Missing -> inactive

## 4. Internal research blockers audit

### Construct semantics

`CLOSED`

Activity Exposure is event exposure, not Momentum or reaction magnitude.

### Provider event semantics

`CLOSED`

V1 core:

- MusicBrainz confirmed release
- YouTube official-content publication

### Canonical event identity

`CLOSED`

MusicBrainz:

`activity:musicbrainz:release-group:<release-group-mbid>`

YouTube:

`activity:youtube:video:<video-id>`

### Deduplication

`CLOSED`

- release editions remain supporting evidence
- playlist duplicates do not create multiple events
- provider revisions do not create duplicate Product timeline rows
- cross-family title/date overlap does not imply dedupe

### Observation-time semantics

`CLOSED`

Separated:

- occurredAt
- sourcePublishedAt
- responseCapturedAt
- collectedAt
- providerObservedAt

### Stored Evidence trace semantics

`CLOSED`

- retained payload != digest-only
- replay requires actual retained/digest-verifiable payload
- Product lineage is separate from provider replay payload
- evidence failure does not rewrite Product truth

### Product-readable Activity Exposure form

`CLOSED`

Product DTO preserves:

- availability
- coverage
- timeline
- source/evidence trace
- no numeric score
- complete empty timeline != zero score
- partial/missing != zero/inactive

### Coverage boundary semantics

`CLOSED`

`complete` means complete within the declared coverage scope only.

### Live coverage manifest / acceptance contract

`CLOSED`

Gate decisions are explicit and fail closed.

### Provider-specific retention design

`CLOSED_AT_RESEARCH_LEVEL`

- MusicBrainz minimized replay subset
- YouTube 30-day refresh/delete boundary for retained public/non-authorized API data
- Product persistent lineage separated from raw provider replay data

### Full research CI

`CLOSED`

Latest final-audit validation run:

`36067692273`

Head:

`8b64d0c66fa859d2a61ec1cc2020bd499ba489b5`

Result:

`PASS`

Validated:

- event contract
- observation contract
- MusicBrainz collector
- YouTube collector
- IU combined stream
- Product-readable view
- live coverage manifest
- provider-specific retention policy
- TypeScript typecheck

## 5. Live provider evidence status

### MusicBrainz

Live current-visible inventory execution completed.

Result:

- discovered release groups = 58
- confirmed observed release events = 57
- missing Official-status support = 1
- invalid events = 0
- inventory exhausted = true

The single gap:

`1299e16d-133b-47b0-b991-36cf11eff7d7 / 그대네요`

Unfiltered concrete release:

`8634da4e-9649-4dcf-a901-2ed6dbb0f438`

Provider metadata:

- date = 2010-09-28
- country = KR
- status = null

Root cause:

`MUSICBRAINZ_SOURCE_METADATA_LIMITATION`

Not a collector defect.

The methodology remains unchanged and does not reinterpret status=null as Official.

MusicBrainz research blocker status:

`CLOSED_WITH_TRUTHFUL_BOUNDED_MISSING`

### YouTube

Collector/runtime architecture:

`READY`

Current live execution:

`BLOCKED_CREDENTIAL_NOT_CONFIGURED`

No reusable credential was found in repository/GitHub Actions wiring.

Connected Vercel project exists, but an existing reusable credential could not be confirmed with the available integration surface.

Equivalent official non-key acquisition path:

`NO`

YouTube live provider coverage is therefore an external execution/input gate.

## 6. Remaining blockers classification

### Internal research blockers

`NONE`

No further methodology, identity, dedupe, observation, evidence-trace, Product-form, coverage-contract, collector-architecture, or retention-policy research blocker remains.

### External integration gates

1. `YOUTUBE_API_KEY` or equivalent authorized YouTube Data API credential
2. implementation-scope decision for provider evidence persistence/refresh-delete behavior
3. latest-main reconstruction and integration validation under FANDEX operating-standard authority
4. explicit approval for any Neon main-schema mutation if integration determines one is required
5. explicit approval before merge
6. Product activation/publication gates remain separate

These are integration/operations gates, not reasons to continue redesigning the research construct.

## 7. Final readiness verdict

Methodology:

`READY`

Research implementation:

`READY`

Research CI:

`READY`

MusicBrainz source behavior:

`READY_WITH_EXPLICIT_SOURCE_LIMITATION`

YouTube collector implementation:

`READY`

YouTube live provider execution:

`EXTERNAL_CREDENTIAL_GATE_OPEN`

Stored Evidence retention design:

`READY_FOR_INTEGRATION_IMPLEMENTATION`

Product truth semantics:

`READY_FOR_INTEGRATION`

Overall research verdict:

`RESEARCH_COMPLETE`

Handoff verdict:

`HANDOFF_READY_FOR_FANDEX_OPERATING_STANDARD`

Integration status:

`INTEGRATION_READY_WITH_EXTERNAL_PROVIDER_GATE`

Production status:

`PRODUCTION_READY = NO`

Legacy numeric status:

`comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`

## 8. Required next authority

Further Production-relevant work belongs in:

`FANDEX 운영 표준`

That chat should:

1. fetch latest main
2. read the Activity Exposure handoff and this final audit
3. reconstruct only required code/contracts on latest main
4. resolve/provision YouTube live credential through an authorized secret path
5. execute live YouTube coverage
6. implement provider-specific Stored Evidence persistence/refresh-delete behavior
7. run full integration validation
8. request explicit approval before any main-schema mutation
9. request explicit approval before merge
10. keep activation/publication separate from merge

This research branch should remain a reference implementation and evidence package, not a direct Production merge source.
