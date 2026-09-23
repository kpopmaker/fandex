# IU Activity Exposure v1 evidence validation

Status: RESEARCH VALIDATION
Base main: `d7ad96f9a207e35141104882972a97829400862c`
Fixture: `docs/research/fixtures/iu-activity-exposure-event-stream-v1.json`

## Evidence sampled

### MusicBrainz release

IU's MusicBrainz artist entity is `b9545342-1e6d-4dae-84ac-013374ad8d7c`.

The release group `The Winning` is:

- release-group MBID: `066225ff-a8bd-4183-bff5-08329f0a063a`
- type: EP
- artist: IU
- observed South Korea release date: `2024-02-20`

A supporting official digital release is:

- release MBID: `1b43c9e0-31d4-48ae-92bc-541a6aaf4eb3`
- status: Official
- format: Digital Media
- South Korea release event: `2024-02-20`

Validation result:

`PASS_RELEASE_EVENT_CONSTRUCTION`

One release-family Activity Exposure event is created. The five MusicBrainz release entities/editions shown under the release group are supporting release evidence, not five separate Activity events.

### YouTube official content

Official channel identity:

- display: `이지금 [IU Official]`
- handle: `@dlwlrma`
- stable channel ID candidate: `UC3SyT4_WLHzN7JmHQwKQZww`

Observed official videos sampled:

- `JleoAppaxi0` — IU 'Love wins all' MV — surfaced publication date `2024-01-23`
- `mFbILexYSQg` — IU '홀씨(Holssi)' MV — surfaced publication date `2024-02-16`
- `kHW-UVXOcLU` — IU 'Shopper' MV — surfaced publication date `2024-02-20`

All three are surfaced under `이지금 [IU Official]` / Official Artist Channel.

Validation result:

`PASS_OFFICIAL_CHANNEL_IDENTITY_AT_PROVIDER_PAGE_LEVEL`

## Temporal validation

### PASS: Release occurrence and collection remain separate

`The Winning` occurred at the provider release date `2024-02-20`.
The research collection happened on `2026-09-23`.

No collection-time substitution occurred.

### PASS: Point events have no invented active duration

No 7d / 14d / 30d active window was added to release or video events.

### PASS WITH PARTIAL: YouTube timestamp precision

The retrieved YouTube evidence surface exposes publication dates, but not the full `snippet.publishedAt` timestamp in this research pass.

Therefore:

- fixture precision is `day`
- `timeZoneState = provider_full_timestamp_not_captured`
- no KST/UTC adjustment is inferred
- exact timestamp validation remains open

This is especially important for `Love wins all`: the surfaced date is `2024-01-23`, while public KST scheduling context places the MV on the following Korean calendar day. The contract must keep provider timestamp semantics authoritative rather than rewriting the date from contextual assumptions.

## Duplicate validation

### PASS: MusicBrainz editions are not raw-counted

The release group contains multiple official release entities/editions on the same date. They remain supporting evidence for one release-family occurrence.

### PASS: YouTube video ID is the provider duplicate key

Each sampled video has one stable video ID and maps to one official-content publication event.

### PASS: Cross-family events remain distinct

`The Winning` release event and `Shopper` video publication both occur on `2024-02-20`, but they are not merged and are not summed into a numeric Activity score.

## Missing / Invalid validation

Observed states exercised by the fixture:

- MusicBrainz release: `covered`
- YouTube full timestamp: `partial`

Required interpretation:

- partial != inactive
- partial != zero
- absent exact timestamp != absent publication event

No invalid event was discovered in this minimal evidence sample.

Synthetic invalid-state tests are still required before Product-readiness, including:

1. unresolved provider artist identity
2. MusicBrainz release with unusable/missing date
3. conflicting release dates without resolvable provenance
4. YouTube video whose channelId does not match the canonical official channel
5. duplicate video ID
6. attempted cross-family raw count aggregation
7. planned event incorrectly promoted to observed

## Identity validation

MusicBrainz identity is strong enough for this fixture because the canonical artist page explicitly identifies IU and links the release group.

YouTube channel identity is strong enough for research fixture construction because the sampled provider pages identify `이지금 [IU Official]` as an Official Artist Channel and link `@dlwlrma`.

Product-level provider mapping should still persist the stable provider IDs in a canonical mapping record rather than rely on display text.

## Current research verdict

`REAL_EVENT_EVIDENCE_JUSTIFIED_FOR_V1_SCOPE`

This verdict applies only to categorical/event evidence for:

- Confirmed Release Event
- Confirmed Official Content Publication Event

It does **not** justify:

- `comebackActivityPoint`
- a 0–100 Activity score
- recency decay
- active windows
- weights
- event-count summation
- Performance / Concert core coverage
- Broadcast / Promotion core coverage

## Next blocker

`COMMON_EVENT_CONTRACT_EXECUTABLE_VALIDATION_NOT_YET_IMPLEMENTED`

The next safe research step is to encode the common Activity Exposure event contract as a validation module/test and run the real fixture through it, including explicit invalid cases. This requires no Production merge, activation, publication, or Neon main schema change.
