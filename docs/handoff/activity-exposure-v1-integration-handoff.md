# FANDEX Activity Exposure v1 Integration Handoff

TYPE = HANDOFF
TARGET = FANDEX 운영 표준
SOURCE CHAT = comebackActivityPoint variable research / Product-readiness
IMPLEMENTATION AUTHORITY = FANDEX 운영 표준

## 0. Handoff purpose

This handoff transfers the completed research candidate for the legacy `comebackActivityPoint` variable into the FANDEX Production Master Control process.

This handoff does **not** authorize:

- merge
- Production activation
- public publication
- route cutover
- Neon main-schema mutation
- numeric `comebackActivityPoint` restoration

The validated Real construct is:

`Activity Exposure Event Stream`

The legacy numeric variable remains:

`NUMERIC_OUTPUT_NOT_JUSTIFIED`

## 1. Research base and current branch

Research base main SHA:

`d7ad96f9a207e35141104882972a97829400862c`

Research branch:

`research/comeback-activity-point-source-contract-v1`

Current re-check after handoff preparation:

- latest checked main SHA = `c625d73241e799589f174e8dcfb3b8636e6f7899`
- research branch is diverged from main because main advanced by 2 daily state-data commits
- changed main paths are generated/state data only; no direct overlap with Activity Exposure research source/test paths was found
- integration must nevertheless reconstruct from latest main, not merge the old research base blindly

FANDEX 운영 표준 MUST re-check latest `main` before any integration work.

Do not assume the base SHA above is still current.

If `main` has moved:

`latest main -> re-evaluate production-relevant diff -> integrate only still-valid scope`

## 2. Canonical construct

Canonical Real construct:

`Activity Exposure`

Definition:

Evidence-traceable timeline of actual artist activity occurrences such as release and official-content publication.

Explicit exclusions:

- Activity Exposure != Momentum
- Activity Exposure != News reaction
- Activity Exposure != YouTube engagement
- Activity Exposure != Search response
- Activity Exposure != popularity
- Activity Exposure != reaction magnitude

No numeric aggregation is validated.

## 3. V1 event families

### Confirmed Release Event

Provider:

`MusicBrainz`

Research source contract:

- canonical artist mapping uses stable MusicBrainz artist MBID
- release-family identity uses release-group MBID
- observed event requires concrete supporting release with `status=Official`
- release-group `first-release-date` is retained as provenance/reference evidence
- `occurredAt` is derived from earliest usable concrete Official-release date
- date precision must remain `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`
- no fabricated month/day
- collaboration artist credits must be preserved

IU MusicBrainz mapping used in research:

`b9545342-1e6d-4dae-84ac-013374ad8d7c`

### Confirmed Official Content Publication Event

Provider:

`YouTube Data API`

Research source contract:

- stable official channel ID required
- resolve `contentDetails.relatedPlaylists.uploads`
- enumerate `playlistItems.list`
- fetch `videos.list(part=snippet)`
- `snippet.channelId` must equal canonical official channel ID
- `occurredAt = snippet.publishedAt`
- exact provider timestamp retained
- views / likes / comments excluded

IU YouTube mapping used in research:

`UC3SyT4_WLHzN7JmHQwKQZww`

Display / handle:

`이지금 [IU Official]`
`@dlwlrma`

## 4. Temporal contract

Preserve these as separate semantics:

- announcedAt
- scheduledStartAt
- scheduledEndAt
- occurredAt
- sourcePublishedAt
- collectedAt

Required invariants:

- Announcement Time != Event Occurrence Time
- Event Occurrence Time != Collection Time
- planned != observed
- cancelled != observed
- Missing != inactive
- Missing != zero
- unknown != inactive

Point events have no arbitrary persistence window.

Forbidden:

- arbitrary 7d / 14d / 30d active window
- recency decay
- numeric phase score
- implicit zero for missing source data

## 5. Research implementation artifacts

Source contract:

`docs/research/comeback-activity-point-source-contract-v1.md`

Initial real evidence fixture:

`docs/research/fixtures/iu-activity-exposure-event-stream-v1.json`

Evidence validation:

`docs/research/iu-activity-exposure-evidence-validation-v1.md`

Historical replay analysis:

`docs/research/iu-activity-exposure-historical-replay-v1.md`

Coverage / readiness review:

`docs/research/iu-activity-exposure-coverage-readiness-v1.md`

Common event validator:

`lib/research/activityExposure.ts`

Raw observation / replay contract:

`lib/research/activityExposureObservation.ts`

Product-readable truth-preserving view:

`lib/research/activityExposureProductView.ts`

MusicBrainz research collector:

`lib/server/research/musicBrainzActivityCollector.ts`

YouTube research collector:

`lib/server/research/youtubeActivityCollector.ts`

Tests:

- `tests/activity-exposure-event-contract-v1.test.mts`
- `tests/activity-exposure-observation-v1.test.mts`
- `tests/musicbrainz-activity-collector-v1.test.mts`
- `tests/youtube-activity-collector-v1.test.mts`
- `tests/iu-activity-exposure-end-to-end-v1.test.mts`
- `tests/activity-exposure-product-view-v1.test.mts`

Research validation workflow candidate:

`.github/workflows/activity-exposure-research-validation.yml`

## 6. Execution validation completed

Completed research execution checks include:

### Common event contract

`PASS_9_OF_9_VALIDATOR_SCENARIOS`

### Raw observation / deterministic replay contract

`PASS_6_OF_6_OBSERVATION_SCENARIOS`

### MusicBrainz collector

`PASS_8_OF_8_MUSICBRAINZ_COLLECTOR_SCENARIOS`

Additional collaboration-preservation test was added after coverage audit and must be included in integration re-validation.

### YouTube collector

`PASS_7_OF_7_YOUTUBE_COLLECTOR_SCENARIOS`

### Combined IU stream

`PASS_COMBINED_IU_V1_ACTIVITY_EXPOSURE_STREAM`

These passes validate contract behavior and synthetic/injected provider response execution.

They do not replace the live provider coverage gate.

## 7. Current provider coverage status

### MusicBrainz

Current IU artist page research observation:

official release-group index surface = 58

Observed categories:

- Album = 5
- Album + Compilation = 2
- EP = 13
- Single = 33
- Single + Soundtrack = 5

Research status:

`CURRENT_OFFICIAL_RELEASE_GROUP_INDEX_SURFACE_COVERED`

Still open:

`FULL_LIVE_OFFICIAL_RELEASE_DETAIL_REPLAY_NOT_EXECUTED_IN_CURRENT_ENVIRONMENT`

Required integration validation:

- run the collector across the complete current IU release-group inventory
- verify each normalized observed event has concrete Official-release support
- report groups with no usable concrete Official release date as missing/partial, not zero
- verify collaborations remain multi-artist in normalized output

### YouTube

Current official channel identity remains confirmed.

Research status:

`OFFICIAL_CHANNEL_IDENTITY_CURRENTLY_CONFIRMED`

Still open:

`FULL_VISIBLE_UPLOAD_INVENTORY_LIVE_REPLAY_NOT_EXECUTED`

Required integration validation:

- use an authorized YouTube Data API credential
- enumerate current uploads playlist to exhaustion
- resolve every returned video ID
- validate exact `snippet.publishedAt`
- classify missing/deleted/private/unavailable observations explicitly
- never substitute channel-page rendered calendar dates for missing API timestamps

## 8. Raw evidence retention gate

Deterministic replay requires retained provider evidence.

Research observation contract now distinguishes actual retained payload from digest-only evidence.

Deterministic replay is allowed only when canonical raw payload is actually retained and digest-verifiable.

Research observation contract retains:

- observationId
- provider
- providerArtistId
- sourceEntityType
- sourceEntityId
- requestRef
- responseCapturedAt
- collectedAt
- sourcePublishedAt
- providerObservedAt
- rawPayloadDigest
- rawPayloadCanonical when retention state is retained
- rawPayloadRetentionState
- evidenceRef
- revision lineage
- normalizedEventIds

Before Production persistence, FANDEX 운영 표준 must review:

- acquisition authorization
- automated collection permission
- raw storage permission
- normalized storage permission
- retention permission
- derived publication permission
- raw redistribution prohibition

Do not infer storage/publication rights from public visibility alone.

## 9. Missing / coverage states

Minimum semantics to preserve:

- covered
- partial
- missing_source_data
- identity_unresolved
- provider_unavailable
- not_in_scope
- invalid

Additional replay coverage states used in research may be retained as diagnostic states.

No Missing/Partial/Unavailable state may be coerced to numeric zero or inactive.

## 10. Duplicate contract

MusicBrainz:

- canonical release-family occurrence keyed by release-group MBID
- concrete release entities are supporting evidence
- do not emit one Activity event per edition/territory release

YouTube:

- canonical publication occurrence keyed by video ID

Cross-family:

- release event and official video publication remain distinct even if title/date match
- no cross-family dedupe
- no raw cross-family count addition

## 11. Identity contract

Reuse concepts from:

`lib/alternative-evidence/identityFoundation.ts`

Useful concepts:

- provider-native IDs
- evidenceRefs
- resolution states
- review states
- supersession lineage
- artist / release separation

Do not resolve provider identities from display-text match alone.

For MusicBrainz collaboration events, preserve all provider artist credits.

## 12. Product semantics that must NOT be inherited

Existing preview `activity` metric semantics are not authoritative for this Real construct.

Do not reuse:

- “activity/comeback momentum” reaction framing
- legacy `comebackActivityPoint`
- preview seed values
- default weight
- legacy phase score
- legacy recency threshold
- legacy decay
- synthetic numeric score formula

## 13. Readiness verdict at handoff

Construct:

`METHODOLOGY_READY_FOR_V1_EVENT_STREAM`

Research implementation:

`RESEARCH_IMPLEMENTATION_READY`

Integration:

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

Production:

`PRODUCTION_READY = NO`

Legacy numeric output:

`comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`

## 14. Required FANDEX 운영 표준 integration sequence

FANDEX 운영 표준 should execute in this order:

1. fetch latest `main`
2. compare latest `main` with research branch
3. discard any research diff that is obsolete or conflicts with newer Production architecture
4. reconstruct only Production-relevant Activity Exposure contracts
5. run full typecheck / lint / targeted tests
6. execute complete live MusicBrainz IU coverage validation
7. execute complete live YouTube IU visible-upload coverage validation using authorized credential
8. produce explicit coverage report
9. review raw-evidence storage/retention authorization
10. decide whether persistence requires schema changes
11. if a Neon main-schema change is required, request explicit user approval before applying it
12. prepare integration PR only after live coverage gate passes
13. do not merge without explicit user authorization
14. do not activate/publicly expose Activity Exposure until Product UX truth-state handling is verified

## 15. Integration acceptance criteria

The candidate may advance beyond the live coverage gate only if all are true:

- latest main compatibility = PASS
- common event validator = PASS
- MusicBrainz collector tests = PASS
- collaboration credit preservation = PASS
- YouTube collector tests = PASS
- combined-stream validation = PASS
- complete live MusicBrainz IU run = PASS or explicit bounded partial coverage with no false completeness claim
- complete current-visible YouTube upload replay = PASS or explicit bounded partial coverage with no false completeness claim
- Missing != 0 preserved
- no numeric Activity methodology introduced
- raw-evidence retention authorization resolved for intended persistence scope
- Product-facing state can represent partial/missing/unavailable truthfully
- digest-only evidence is never presented as replay-capable Stored Evidence
- complete coverage with zero events is represented as an available empty timeline, not a zero score

## 16. Rejection conditions

Do NOT advance the candidate if integration introduces any of:

- `comebackActivityPoint` numeric score
- arbitrary numeric normalization
- event weights
- recency decay
- active-window persistence
- raw cross-family event counts presented as a metric
- missing source data presented as inactivity
- collaboration releases rewritten as IU-only
- rendered webpage date substituted for exact provider timestamp
- unreviewed provider identity promoted to resolved
- live coverage represented as complete without evidence

## 17. Handoff conclusion

The research work is complete enough to transfer.

The correct next authority is:

`FANDEX 운영 표준`

The correct starting state there is:

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

not:

`PRODUCTION_READY`

and not:

`NUMERIC comebackActivityPoint`.


## 18. Canonical identity / dedup update

Integration must preserve these exact identity rules:

- MusicBrainz event ID = `activity:musicbrainz:release-group:<release-group-mbid>`
- YouTube event ID = `activity:youtube:video:<video-id>`
- release edition IDs are evidence, not separate canonical Activity events
- titles and dates are attributes, never dedupe keys
- provider metadata revisions retain the same canonical event identity
- revision history belongs in Stored Evidence lineage, not as duplicate Product timeline rows
- cross-family title/date overlap never implies dedupe
- FANDEX artist identity must match the canonical target artist

Full research CI at head `4e49b19c53bfbefeb8482b1a8157084085a5475f` passed all research tests and typecheck in GitHub Actions run `35975266137`.
