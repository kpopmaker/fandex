# comebackActivityPoint / Activity Exposure source contract v1

Status: RESEARCH
Canonical construct: Activity Exposure
Legacy numeric output: NUMERIC_OUTPUT_NOT_JUSTIFIED
Golden artist: IU
Base main SHA: d7ad96f9a207e35141104882972a97829400862c

## 1. Scope

This contract defines evidence-traceable source semantics for the first v1 Activity Exposure families only:

1. Confirmed Release Event
2. Confirmed Official Content Publication Event

It does not define a numeric score, active window, decay, weight, or cross-family raw count aggregation.

## 2. Existing FANDEX reuse boundary

Reusable:

- `lib/alternative-evidence/identityFoundation.ts`
  - provider mapping records
  - identity resolution/review states
  - evidenceRefs
  - supersedesMappingId lineage
  - artist/release canonical identity separation
- source-provider registry shape patterns may be reused structurally.

Not reusable as Real Activity methodology:

- `app/data/v4/metrics/fandexMetricDefinitions.ts` activity semantics
  - current label/description describe "momentum" and "reaction"
  - current `defaultWeight` is legacy preview behavior
- `app/data/v4/metrics/fandexMetricSourceRegistry.ts`
  - activity remains `preview_seed`
- fixture provider adapters
  - mock/preview only
- raw event count addition across release/video/performance families.

## 3. Golden Artist canonical identity

FANDEX canonical artist candidate:

- fandexArtistId: `iu`
- canonicalName: `IU`
- aliases: `IU`, `아이유`, `Lee Ji-eun`, `이지은`
- artistType: `solo`

MusicBrainz provider mapping:

- provider: `musicbrainz`
- providerArtistId: `b9545342-1e6d-4dae-84ac-013374ad8d7c`
- evidence: https://musicbrainz.org/artist/b9545342-1e6d-4dae-84ac-013374ad8d7c/aliases

YouTube provider mapping candidate:

- provider: `youtube`
- channel display: `이지금 [IU Official]`
- handle: `@dlwlrma`
- providerArtistId / stable channelId: `UC3SyT4_WLHzN7JmHQwKQZww`
- official-channel evidence:
  - https://www.youtube.com/@dlwlrma
  - public channel-ID corroboration retained as research evidence

Identity status:

- MusicBrainz: `CANDIDATE_READY_FOR_REVIEW`
- YouTube: `CANDIDATE_READY_FOR_REVIEW`
- neither mapping becomes `resolved/provider-verified` merely because a text alias matches.

Identity rule:

- aliases alone never resolve provider identity.
- a provider mapping is eligible for Real event ingestion only after the stable provider entity ID is stored and the mapping is reviewed or provider-verified.
- ambiguous collaborations must retain the artist-credit participants and must not be silently rewritten as IU-only releases.

## 4. MusicBrainz Confirmed Release Event source contract

Authoritative entity boundary:

- Prefer MusicBrainz `release-group` to represent the canonical work/release family.
- Preserve concrete `release` entities as source evidence and for territory/edition dates.
- Do not treat reissues as the original occurrence.
- Do not treat recording date, copyright date, import date, or collection time as release occurrence.

Source semantics:

- `release.date` = date the specific release was first made available for that release entity/territory.
- `release-group.first-release-date` = earliest known release date across releases in the group and is retained as release-family evidence, but it is not by itself sufficient to confirm an observed v1 release event.
- a v1 `confirmed_release` requires at least one concrete MusicBrainz release with `status=Official` and a usable release date.
- both release-group and release dates can be partial dates in MusicBrainz and therefore must preserve precision.

Event construction:

- eventFamily: `release`
- eventType: `confirmed_release`
- lifecycleState: `observed`
- sourceProvider: `musicbrainz`
- sourceEntityId:
  - canonical event key uses release-group MBID when representing the first public occurrence of the release family
  - evidence may include one or more release MBIDs that establish that date
- occurredAt:
  - earliest usable date among concrete `Official` release entities supporting the release group
  - `release-group.first-release-date` remains comparison/provenance evidence and must not silently override the concrete Official-release evidence
  - preserve `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` precision; never fabricate missing month/day
- sourcePublishedAt: null unless the provider exposes a semantically valid source-publication timestamp distinct from release occurrence
- collectedAt: ingestion observation timestamp

Required evidence fields:

- artist-credit
- release-group MBID
- release-group title
- primary type
- secondary types when present
- first-release-date
- at least one supporting Official release MBID for an observed event
- supporting release date/territory/status
- release-group first-release-date retained separately for provenance/comparison
- retrieval URL or canonical evidence reference
- raw payload digest / revision identifier if available

Exclusions / blockers:

- artist identity unresolved or ambiguous
- only a recording date is available
- only copyright/import metadata is available
- no usable Official release date precision
- no concrete Official release supports the release-group occurrence
- release status/evidence indicates a planned future release rather than an observed release
- conflicting dates that cannot be resolved without provenance loss

Revision rule:

MusicBrainz edits can change dates or entity relationships. A corrected event must create revision lineage; it must not silently overwrite the previous research evidence.

## 5. YouTube Confirmed Official Content Publication Event source contract

Channel discovery:

1. Resolve IU to stable channelId `UC3SyT4_WLHzN7JmHQwKQZww`.
2. Retrieve `channels.list(part=contentDetails)`.
3. Use `contentDetails.relatedPlaylists.uploads` as the channel upload inventory.
4. Enumerate playlist items and resolve video IDs.
5. Retrieve video resources to confirm `snippet.channelId` and `snippet.publishedAt`.

Source semantics:

- `video.snippet.publishedAt` is the publication time used for event occurrence.
- for a video initially private and later public, YouTube documents this field as the time it became public.
- views, likes, comments, subscriber counts, and later engagement changes are explicitly outside Activity Exposure.

Event construction:

- eventFamily: `official_content`
- eventType: `official_video_publication`
- lifecycleState: `observed`
- sourceProvider: `youtube`
- sourceEntityId: YouTube video ID
- occurredAt: `video.snippet.publishedAt`
- sourcePublishedAt: same provider publication timestamp
- collectedAt: ingestion observation timestamp

Required identity/evidence checks:

- video `snippet.channelId` must equal `UC3SyT4_WLHzN7JmHQwKQZww`
- the source video ID must be stable
- retain title and relevant snippet metadata as evidence, not as identity proof by text matching
- do not ingest third-party uploads merely because their title contains IU
- official artist channel identity must be explicit in the provider mapping

Deletion/privacy/correction rule:

- disappearance from later API retrieval does not retroactively mean the publication never occurred.
- retain the historical observed event and append a revision state such as `unavailable_after_observation`, `private_after_observation`, or `deleted_after_observation` only when source evidence supports that state.
- do not synthesize a cancellation state for an already observed publication.

## 6. Common Activity Exposure Event contract v1

Required core:

- artistId
- eventId
- eventFamily
- eventType
- lifecycleState
- announcedAt
- scheduledStartAt
- scheduledEndAt
- occurredAt
- occurredAtPrecision
- sourcePublishedAt
- collectedAt
- sourceProvider
- sourceEntityId
- evidenceRef
- identityState
- missingState
- revisionId
- supersedesRevisionId

Recommended additions discovered from source semantics:

- sourceEntityType
- sourceRevisionRef
- sourcePayloadDigest
- canonicalFamilyId
- providerArtistId
- timeZoneState
- evidenceState
- conflictState

Temporal invariants:

- Announcement Time != Event Occurrence Time != Collection Time.
- planned != observed.
- Missing != inactive.
- Missing != zero.
- Unknown != inactive.
- point events do not acquire an arbitrary active duration.
- interval events require source-provided start/end semantics.

## 7. Duplicate rules

Within provider:

- MusicBrainz release family: dedupe by release-group MBID + canonical occurrence semantics; preserve supporting release entities instead of counting them as separate Activity events.
- YouTube: dedupe by video ID.

Across providers/families:

- never dedupe a release event against a video publication event merely because titles/dates match.
- they are distinct event families and remain separate evidence records.
- no raw cross-family summation is permitted.

## 8. Coverage and missing-state rules

Coverage must be reported per provider/event family, not as one generic Activity percentage.

Minimum states:

- `covered`: provider queried successfully for the required identity and event range.
- `partial`: provider returned usable evidence but known scope/precision limitations exist.
- `missing_source_data`: provider query succeeded but required event field is absent.
- `identity_unresolved`: source data exists but artist/provider identity is not resolved.
- `provider_unavailable`: collection failed or provider was unavailable.
- `not_in_scope`: event family intentionally excluded from v1.
- `invalid`: evidence violates contract invariants.

No state above may be converted to numeric zero activity.

## 9. Research readiness result

MusicBrainz Confirmed Release Event:
`SOURCE_CONTRACT_READY_FOR_IU_EVIDENCE_VALIDATION`

YouTube Confirmed Official Content Publication Event:
`SOURCE_CONTRACT_READY_FOR_IU_EVIDENCE_VALIDATION`

Canonical provider identity:
`STABLE_PROVIDER_IDS_CAPTURED_AS_RESEARCH_CANDIDATES`

Remaining nearest blocker:

`IU_PROVIDER_MAPPING_REVIEW_AND_FIRST_REAL_EVIDENCE_FIXTURE`

Next research step:

Build a small IU Real-evidence fixture/event stream from both providers and test temporal precision, duplicate handling, identity, revision, and Missing/Invalid states. Provider identity must be reviewed as part of that fixture validation before any Product-readiness promotion.

## 10. Source references

- MusicBrainz release-group search semantics:
  https://musicbrainz.org/doc/MusicBrainz_API/Search
- MusicBrainz release date semantics:
  https://musicbrainz.org/doc/Style/Release
- IU MusicBrainz artist identity:
  https://musicbrainz.org/artist/b9545342-1e6d-4dae-84ac-013374ad8d7c/aliases
- YouTube IU official channel:
  https://www.youtube.com/@dlwlrma
- YouTube channels resource:
  https://developers.google.com/youtube/v3/docs/channels
- YouTube upload playlist retrieval:
  https://developers.google.com/youtube/v3/guides/implementation/videos
- YouTube videos resource / publishedAt:
  https://developers.google.com/youtube/v3/docs/videos
- YouTube playlistItems:
  https://developers.google.com/youtube/v3/docs/playlistItems

## 11. Collector hardening note

The research collector must follow MusicBrainz Web Service rate limiting. Requests are serialized with at least a 1,000 ms interval between calls, use a meaningful User-Agent, page by the actual number of returned entities, and fail closed if provider pagination counts change during one collection pass.


## 12. Observation-time semantics

Observation metadata uses distinct clocks.

`responseCapturedAt`

- the FANDEX observation time for a specific provider response/evidence capture
- timestamp-only
- provider payload capture semantics
- part of deterministic observation identity

`collectedAt`

- the later FANDEX ingestion/storage time for that captured observation
- timestamp-only
- may equal responseCapturedAt in a synchronous collector, but equality is not assumed by the contract
- must not precede responseCapturedAt

`sourcePublishedAt`

- provider publication timestamp only when the provider exposes that semantic directly
- YouTube `snippet.publishedAt` qualifies for official-content publication
- MusicBrainz release dates do not become sourcePublishedAt because they are release occurrence dates, not provider publication timestamps

`providerObservedAt`

- reserved for an explicit provider-native observation timestamp distinct from publication/occurrence
- must remain null when no such provider field exists
- MusicBrainz release / first-release dates must not be copied here
- YouTube `snippet.publishedAt` must not be copied here

Observation identity is based on:

- artist
- provider
- provider entity
- responseCapturedAt
- raw payload digest

It is not based on collectedAt. Re-ingesting the exact same captured evidence later must not create a new provider observation identity.

Current contract:

`activity-exposure-observation-v2-research`

## 13. Live coverage boundary semantics

Provider coverage claims must declare their scope.

Allowed scope forms:

- `current_visible_inventory`
- `bounded_provider_query`
- `stored_evidence_set`
- `not_available`

Coverage also records:

- `coverageObservedAt`: when the coverage claim was established
- `eventTimeStart` / `eventTimeEnd`: event-time query boundaries when applicable
- `observationBasis`: provider inventory, provider query, stored evidence, or unavailable

`complete` always means:

`complete within the declared coverage scope`

It never silently means:

`complete historical truth for the artist`

Therefore exhausting the current YouTube uploads playlist can justify completeness for the current visible inventory while historical deleted/private/unavailable videos can still prevent an all-history completeness claim.

Likewise, a successful MusicBrainz current inventory pass only supports the declared current provider scope and revision state.

Product truth invariant:

`completeMeansCompleteWithinDeclaredScope = true`
