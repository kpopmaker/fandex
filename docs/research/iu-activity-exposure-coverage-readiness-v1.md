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
