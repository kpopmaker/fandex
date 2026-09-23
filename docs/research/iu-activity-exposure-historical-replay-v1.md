# IU Activity Exposure historical replay feasibility v1

Status: RESEARCH
Base main SHA: `d7ad96f9a207e35141104882972a97829400862c`
Research branch: `research/comeback-activity-point-source-contract-v1`

## 1. Validator execution result

The Activity Exposure validator was compiled with TypeScript and executed against 9 contract scenarios in a local isolated execution environment.

Result:

`PASS_9_OF_9_VALIDATOR_SCENARIOS`

Validated cases:

1. valid IU release + official-content stream
2. planned event carrying occurredAt is rejected
3. observed event without occurredAt is rejected
4. month precision is accepted without fabricating day precision
5. precision mismatch is rejected
6. non-canonical YouTube channel identity is rejected
7. non-canonical MusicBrainz artist identity is rejected
8. duplicate provider entity is rejected
9. prohibited numeric methodology fields are rejected

No numeric comebackActivityPoint methodology was introduced.

## 2. GitHub Actions execution note

A branch-local research validation workflow was added, but connector-authored commits did not create a push-triggered Actions run.

This is an execution-environment limitation, not a validator failure.

The validator was therefore compiled and executed directly using the available TypeScript compiler.

## 3. MusicBrainz historical replay feasibility

Verdict:

`HISTORICAL_REPLAY_FEASIBLE_WITH_CURRENT_DATABASE_REVISION_CAVEAT`

MusicBrainz supports browse requests by artist MBID and paging via `limit` and `offset`.

This means the IU artist MBID can be used to enumerate release groups/release entities without relying on text search.

For release groups, `first-release-date` is the earliest known release date represented in the current MusicBrainz database.

Replay construction:

1. canonical IU MusicBrainz artist MBID
2. browse all release groups linked to the artist
3. page until all current release groups are exhausted
4. preserve release-group MBID, artist credit, primary/secondary type, first-release-date
5. fetch supporting release entities where required
6. construct one release-family Activity Exposure event per canonical release-group occurrence
7. sort locally by occurrence precision/date

Important limitation:

MusicBrainz is editable.

A replay performed today reconstructs history from the **current MusicBrainz database state**. It does not by itself reproduce what MusicBrainz returned at an earlier collection date.

Therefore:

- historical event occurrence replay: supported
- historical provider-state replay: not guaranteed
- exact prior-source revision replay: requires FANDEX-retained raw payload/revision evidence

Required FANDEX retention for deterministic future replay:

- collectedAt
- raw provider response or canonical raw digest
- source MBIDs
- source revision/evidence reference
- normalized event revision
- supersession lineage

## 4. YouTube historical replay feasibility

Verdict:

`HISTORICAL_REPLAY_PARTIAL_WITH_LIVE_CHANNEL_INVENTORY_LIMITATION`

YouTube exposes a channel's uploads playlist through the channel resource.

The uploads playlist can be paged with `playlistItems.list`:

- maximum 50 items per page
- `nextPageToken` is used until exhaustion

This allows enumeration of the official channel's currently visible upload inventory.

Replay construction:

1. canonical official IU channel ID
2. resolve channel uploads playlist
3. enumerate all playlist pages
4. retain video IDs
5. resolve each video resource
6. validate `snippet.channelId`
7. capture `snippet.publishedAt`
8. construct one official-content publication event per stable video ID

Important limitation:

The live uploads playlist is not a complete immutable historical ledger.

Videos later deleted, made private, or otherwise unavailable may no longer be recoverable from a fresh replay.

Therefore:

- replay of currently visible historical publications: supported
- complete reconstruction of all historically observed publications from current YouTube alone: not guaranteed
- deterministic replay of previously observed deleted/private videos: requires FANDEX-retained observation evidence

Required FANDEX retention:

- video ID
- canonical channel ID
- exact publishedAt captured at observation time
- collectedAt
- title/snippet evidence snapshot or digest
- availability/lifecycle revision evidence
- revision lineage

## 5. Cross-provider replay rule

Historical replay is performed **within each event family/provider contract**.

Do not produce:

- total Activity event count
- cross-family count addition
- cross-family weight
- recency decay
- active-window score

Replay output is an ordered evidence stream, not a numeric metric.

## 6. Coverage semantics for replay

MusicBrainz replay coverage:

- `covered_current_db`: full current artist-linked result set paged successfully
- `partial_current_db`: paging or entity detail incomplete
- `provider_unavailable`: replay query failed
- `historical_revision_unknown`: current database can reconstruct occurrence but not prior collection-state revision

YouTube replay coverage:

- `covered_visible_inventory`: complete currently visible uploads playlist paged successfully
- `partial_visible_inventory`: pagination/inventory fetch incomplete
- `historical_unavailability_gap`: previously observed deleted/private items may be absent
- `provider_unavailable`: API unavailable
- `timestamp_precision_partial`: exact publishedAt not captured

None of these states mean zero activity.

## 7. Product-readiness impact

Current status:

- construct semantics: PASS
- MusicBrainz source contract: PASS
- YouTube source contract: PASS
- common event validator: PASS
- first Real IU evidence fixture: PASS
- duplicate semantics: PASS
- Missing/Invalid semantics: PASS
- historical replay feasibility: PASS_WITH_PROVIDER_LIMITATIONS
- deterministic retained-evidence replay implementation: NOT_YET_IMPLEMENTED

Current nearest blocker:

`DETERMINISTIC_REPLAY_RETENTION_AND_COLLECTOR_CONTRACT_NOT_YET_IMPLEMENTED`

The next safe research step is to define a collector/persistence-neutral raw observation contract that retains enough source evidence for deterministic replay without modifying Neon main schema or Production routes.

## 8. External provider semantics referenced

MusicBrainz:

- API supports lookup, browse and search requests.
- browse requests support paging via offset/limit.
- release-group search semantics define firstreleasedate as earliest release date in the group.

YouTube:

- channel uploads are represented by an uploads playlist.
- playlistItems.list can enumerate all playlist items through pageToken pagination.
- maxResults supports up to 50 items per page.
