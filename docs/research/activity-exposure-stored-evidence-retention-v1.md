# Activity Exposure Stored Evidence Retention Policy v1

Status: RESEARCH POLICY / PRODUCT-READINESS
Construct: Activity Exposure
Production mutation: NONE

## 1. Goal

Define the minimum Stored Evidence retention required for Activity Exposure without treating every provider as if indefinite raw payload storage were equally permissible.

The retention design separates:

1. Product-persistent lineage
2. provider replay payload
3. provider-specific refresh/delete requirements

## 2. Current FANDEX Product Stored Evidence compatibility

Current main Product Stored Evidence read models expose lineage such as:

- observationId
- canonicalSourceUrl
- observedAt
- collectedAt
- sourceRecordIds
- rawEvidenceIds

The Product contract does not require a raw provider payload to be embedded in the public/read-model surface.

This is compatible with Activity Exposure.

Product-visible truth should depend on normalized event identity and evidence lineage, not direct exposure of raw provider response bodies.

## 3. MusicBrainz retention

Official MusicBrainz licensing states that core database data is CC0, while supplementary data has separate attribution/non-commercial/share-alike terms.

Activity Exposure must therefore avoid treating an arbitrary full MusicBrainz response as automatically unrestricted.

Research retention policy:

`musicbrainz-minimized-core-metadata`

Retain only the minimized metadata subset required to reconstruct the normalized event, such as:

- artist MBID / artist credit identity needed for the event
- release-group MBID
- supporting release MBID
- title when required for traceability
- status
- date
- territory/country when used
- event-normalization lineage
- provider source reference
- payload digest

Do not persist unrelated supplementary fields merely because they were present in the provider response.

For this minimized research subset there is no YouTube-style 30-day refresh/delete rule.

Persistent replay claim:

`ALLOWED_FOR_MINIMIZED_MUSICBRAINZ_REPLAY_SUBSET`

subject to field-level licensing review during Production integration.

## 4. YouTube retention

The selected v1 YouTube path uses public/non-authorized YouTube Data API metadata.

Current YouTube developer policy requires limited Non-Authorized API Data to be deleted or refreshed within 30 calendar days.

Therefore:

`YOUTUBE_RAW_API_PAYLOAD_INDEFINITE_RETENTION = NOT_ALLOWED_BY_RESEARCH_POLICY`

Research retention policy:

`youtube-non-authorized-api-data-30d`

For retained YouTube replay evidence:

- record responseCapturedAt
- calculate refreshOrDeleteBy = responseCapturedAt + 30 calendar days
- delete or refresh retained API metadata by that deadline
- do not claim indefinite deterministic replay from an old raw payload
- do not expose API keys/tokens in evidence
- do not retain audiovisual content

Current research workflow retained-evidence artifact retention is 7 days when explicitly enabled, which remains inside this boundary.

## 5. Product-persistent lineage

Long-lived Product lineage SHOULD persist FANDEX-owned trace metadata rather than depend on indefinite provider raw payload storage.

Minimum Product-persistent Activity Exposure lineage:

- canonical FANDEX artistId
- canonical eventId
- sourceProvider
- provider entity IDs needed to address/re-fetch the source
- eventFamily / eventType
- occurredAt + precision
- sourcePublishedAt when semantically valid
- responseCapturedAt / collectedAt lineage
- observationId
- rawPayloadDigest
- evidenceRef / canonical source URL
- coverage state / coverage scope
- revision lineage
- Stored Evidence state

Provider API metadata that remains subject to refresh/delete requirements must be handled in the provider evidence layer, not assumed to be permanent Product data.

## 6. YouTube long-term Product rule

A Product surface may not rely on a YouTube API payload older than the allowed refresh/delete boundary as permanently valid provider evidence.

At or before the refresh deadline:

- refresh the API metadata and create a new observation/revision, or
- delete the retained API payload

If the source can no longer be refreshed:

- preserve the FANDEX event/evidence lineage only to the extent separately justified
- mark Stored Evidence availability/verification truthfully
- do not silently rewrite the historical timeline to zero/inactive
- do not represent expired provider payload as currently verified Stored Evidence

## 7. MusicBrainz long-term Product rule

MusicBrainz minimized replay evidence may be retained as a replay source when the retained fields are confirmed to fall within the permitted licensing scope.

Production integration should keep this distinction explicit:

`MINIMIZED_REPLAY_SUBSET != ARBITRARY_FULL_PROVIDER_RESPONSE`

## 8. Authorization state

Research raw payload retention remains opt-in.

Current environment variable:

`ACTIVITY_EXPOSURE_RAW_RETENTION_AUTHORIZED`

When false/unset:

- no retained raw-evidence artifact
- digest/lineage only
- deterministic replay from Stored Evidence is not claimed

When true:

- research artifacts may contain provider replay evidence only within the provider-specific policy
- YouTube artifact retention must remain under its refresh/delete boundary
- this flag does not authorize Production database persistence

## 9. Current verdict

MusicBrainz minimized research replay retention:

`CONDITIONALLY_JUSTIFIED`

YouTube temporary research replay retention:

`JUSTIFIED_WITH_30_DAY_REFRESH_OR_DELETE_BOUNDARY`

YouTube indefinite raw payload retention:

`NOT_JUSTIFIED`

Product persistent trace without raw payload:

`JUSTIFIED_AS_INTEGRATION_PATTERN`

Production retention authorization:

`STILL_REQUIRES_INTEGRATION-SCOPE REVIEW`

No numeric comebackActivityPoint semantics are introduced.
