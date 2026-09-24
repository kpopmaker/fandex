# IU Activity Exposure coverage and Product-readiness v1

Status: RESEARCH PRODUCT-READINESS REVIEW
Golden artist: IU
Base main SHA: `d7ad96f9a207e35141104882972a97829400862c`
Research branch: `research/comeback-activity-point-source-contract-v1`

## 1. Current main / branch drift

Latest checked `main` is now:

`c625d73241e799589f174e8dcfb3b8636e6f7899`

Research branch status at this review:

- research branch has diverged from current main
- current main is 2 commits ahead of the original research base
- those 2 main commits modify only generated/state data under `data/fandex-cloud-v10/state` and `data/lastfm-cloud`
- no Activity Exposure research source/test path overlap was found
- production-code compatibility therefore remains `PASS_NO_DIRECT_CODE_CONFLICT`, but integration must use latest main rather than the original research base

No Production merge, activation, publication, route cutover, or Neon main-schema mutation has been performed from this chat.

## 2. MusicBrainz current catalog surface

The current MusicBrainz IU artist page explicitly shows official release groups by this artist.

Current visible official release-group categories:

- Album: 5
- Album + Compilation: 2
- EP: 13
- Single: 33
- Single + Soundtrack: 5

Total currently visible official release groups:

`58`

This confirms that the MusicBrainz source is not limited to the initial `The Winning` sample and has broad historical catalog coverage from 2008 through current entries.

Coverage state:

`CURRENT_OFFICIAL_RELEASE_GROUP_INDEX_SURFACE_COVERED`

Important limitation:

The complete collector path also verifies one or more concrete `Official` release entities for each release group before producing a confirmed observed event.

In this execution environment, the MusicBrainz JSON web-service endpoint could not be directly traversed live through the available external web tool. Therefore all 58 release groups were not re-fetched here with their concrete Official-release pages.

Full live concrete-release replay state:

`FULL_LIVE_OFFICIAL_RELEASE_DETAIL_REPLAY_NOT_EXECUTED_IN_CURRENT_ENVIRONMENT`

This does not invalidate the collector contract. It prevents claiming complete live coverage.

## 3. MusicBrainz collaboration integrity

The current catalog surface includes collaborations and multi-artist credits.

The research collector has been hardened so normalized events now retain:

- providerArtistCredits
- each provider artist MBID when available
- credited name
- canonical provider name
- participationScope = solo | collaboration

A release is not silently rewritten as IU-only merely because IU is one participant.

Current state:

`COLLABORATION_IDENTITY_PRESERVATION_IMPLEMENTED`

## 4. YouTube current live surface

Canonical official channel:

- display: `이지금 [IU Official]`
- stable channel ID candidate: `UC3SyT4_WLHzN7JmHQwKQZww`
- handle: `@dlwlrma`

Current public search surfaces continue to identify recent 2026 uploads as coming from the Official Artist Channel.

This confirms that the canonical channel mapping remains live.

Coverage state:

`OFFICIAL_CHANNEL_IDENTITY_CURRENTLY_CONFIRMED`

However, the public channel `/videos` surface exposed to this execution environment does not enumerate the complete visible upload inventory.

The research collector requires an actual YouTube Data API key to execute:

1. channels.list(part=contentDetails)
2. relatedPlaylists.uploads
3. playlistItems.list pagination
4. videos.list(part=snippet)
5. exact snippet.publishedAt validation

No live YouTube Data API credential is available in this research execution context.

Therefore:

`FULL_VISIBLE_UPLOAD_INVENTORY_LIVE_REPLAY_NOT_EXECUTED`

and YouTube coverage remains:

`PARTIAL_LIVE_COVERAGE`

This is not converted to zero activity or inactivity.

## 5. Event-contract readiness

Validated:

- Activity Exposure semantics
- release family contract
- official-content family contract
- temporal separation
- point-event semantics
- Missing != 0
- Missing != inactive
- planned != observed
- canonical provider identity
- duplicate rules
- revision/raw-observation contract
- deterministic retained-evidence replay contract
- retained raw payload must actually be present for replay; digest-only evidence is integrity-only and is not replay-capable
- Product-readable Activity Exposure view with explicit availability / coverage / Stored Evidence trace
- MusicBrainz research collector
- YouTube research collector
- combined IU stream
- cross-family non-additivity
- collaboration identity preservation

Not introduced:

- comebackActivityPoint numeric score
- 0-100 normalization
- event weights
- recency weights
- decay
- arbitrary active window
- cross-family raw event count
- reaction-magnitude semantics

## 6. Current readiness verdict

### Activity Exposure methodology

`METHODOLOGY_READY_FOR_V1_EVENT_STREAM`

### Research implementation

`RESEARCH_IMPLEMENTATION_READY`

### Integration readiness

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

The implementation is structurally ready to be reconstructed as an integration candidate, but a Production-relevant integration must retain live-coverage gates.

### Production readiness

`PRODUCTION_READY = NO`

Open Production blockers:

1. complete live MusicBrainz collector run over the current IU official release-group inventory, including concrete Official-release evidence
2. complete live YouTube uploads-playlist replay with a real authorized Data API credential
3. persistence destination / authorization review for retained raw provider evidence
4. integration against current Production architecture under the FANDEX operating-standard gate
5. latest-main reconstruction from `c625d73241e799589f174e8dcfb3b8636e6f7899` or later
6. no Product UI/public route may treat partial provider coverage as zero or inactive

### Numeric legacy variable

`comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`

This remains unchanged.

The validated Real construct is:

`Activity Exposure Event Stream`

not a numeric activity score.

## 7. Nearest next blocker

`LIVE_PROVIDER_COVERAGE_GATE`

The next meaningful execution is not more methodology design.

It is a controlled live collector validation in an environment that can:

- call MusicBrainz Web Service end-to-end under its rate limit
- call YouTube Data API using an authorized research credential
- retain bounded research evidence
- report complete/partial/missing coverage without Production publication

Until that gate passes, the correct handoff state is:

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`


## 8. Stored Evidence truth correction

The research observation contract was tightened after the initial replay review.

Previous problem:

`rawPayloadRetentionState=retained` could be present while the observation object contained only a digest. That was not sufficient to justify deterministic replay.

Current contract:

- `retained` => canonical raw payload is present in the research observation and digest-verifiable
- `digest-only` => integrity metadata only; deterministic replay = false
- `not-retained` => deterministic replay = false
- retained payload digest mismatch => validation issue

Current state:

`STORED_EVIDENCE_REPLAY_SEMANTICS_HARDENED`

## 9. Product-readable Activity Exposure form

Research-only Product DTO:

`lib/research/activityExposureProductView.ts`

It exposes:

- construct = Activity Exposure
- availability = available | partial | unavailable | data_issue
- numericScore = null
- numericScoreState = not_justified
- provider coverage states
- timeline event semantics
- occurredAt / sourcePublishedAt / collectedAt separately
- Stored Evidence trace per normalized event
- retained_payload vs digest_only vs unavailable
- explicit truth invariants preventing Missing -> 0 or Missing -> inactive

A complete provider coverage result with zero events is represented as an available empty timeline, not as a zero score and not as missing data.

Current state:

`PRODUCT_READABLE_TRUTH_FORM_IMPLEMENTED`


## 10. Canonical event identity and deduplication

Canonical event identity is now provider-native and title/date independent.

MusicBrainz:

`activity:musicbrainz:release-group:<release-group-mbid>`

Rules:

- release-group MBID is the canonical event entity
- concrete release MBIDs remain supporting evidence only
- multiple editions / territories under one release group do not create additional Activity Exposure events
- same title/date across different release groups remains distinct
- collaboration credits do not change canonical event identity

YouTube:

`activity:youtube:video:<video-id>`

Rules:

- video ID is the canonical event entity
- playlist duplication does not create multiple events
- title or metadata revision does not create a new canonical event

Cross-family:

- release and official-content events never dedupe merely because date/title overlap

Revision handling:

- normalized event identity remains stable across provider metadata revisions
- historical revisions belong in Stored Evidence observation lineage
- multiple normalized revisions of the same provider entity may not coexist as separate timeline events

Canonical FANDEX artist identity is also validated so a provider event cannot be silently attached to a different FANDEX artist.

Current state:

`CANONICAL_EVENT_IDENTITY_AND_DEDUP_CONTRACT_LOCKED`

## 11. Full research CI verification

GitHub Actions workflow:

`.github/workflows/activity-exposure-research-validation.yml`

Run:

`35975266137`

Head:

`4e49b19c53bfbefeb8482b1a8157084085a5475f`

Result:

`PASS`

Successful steps:

- Activity Exposure event contract tests
- Activity Exposure observation tests
- MusicBrainz collector tests
- YouTube collector tests
- IU end-to-end stream tests
- Product-readable view tests
- Typecheck

This supersedes earlier partial/local-only execution claims for the current research head.


## 12. Observation-time and live-coverage boundary lock

The research contract now separates four temporal meanings:

- event occurrence = `occurredAt`
- provider publication = `sourcePublishedAt`
- provider response capture / FANDEX observation = `responseCapturedAt`
- FANDEX ingestion/storage = `collectedAt`

`providerObservedAt` is reserved for a distinct provider-native observation timestamp and is null for current MusicBrainz/YouTube v1 evidence because neither current source field used by Activity Exposure has that semantic.

Observation IDs now use `responseCapturedAt`, not `collectedAt`.

Current state:

`OBSERVATION_TIME_SEMANTICS_LOCKED`

Product coverage now requires an explicit declared scope:

- current visible inventory
- bounded provider query
- stored evidence set
- unavailable

A `complete` state means complete only within that declared scope.

Current state:

`LIVE_COVERAGE_BOUNDARY_SEMANTICS_LOCKED`

This does not clear the external `LIVE_PROVIDER_COVERAGE_GATE`; it makes the eventual live result representable without overstating historical completeness.


## 13. Current main re-check and CI confirmation

Latest checked main:

`658d10d94ef73ced0200961a25e742f2c203da1c`

Current research divergence:

- main advanced by 4 commits from the original research base
- changed main paths are generated/state data plus Vercel deployment-policy files
- no direct path overlap with Activity Exposure research implementation was found

Compatibility state:

`PASS_NO_DIRECT_CODE_CONFLICT_WITH_CURRENT_MAIN`

Latest full research validation:

- GitHub Actions run: `35995504797`
- research head: `14c4bb8a3e76d96e8447a712934c59422c851a75`
- event contract tests: PASS
- observation contract tests: PASS
- MusicBrainz collector tests: PASS
- YouTube collector tests: PASS
- IU end-to-end stream tests: PASS
- Product-readable view tests: PASS
- typecheck: PASS

Observation / coverage semantics are therefore validated at the current research head.

The remaining external blocker is still:

`LIVE_PROVIDER_COVERAGE_GATE`
