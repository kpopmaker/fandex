# Activity Exposure v1 raw-evidence retention and persistence review

Status: VALIDATION / PRODUCTION-READINESS REVIEW  
Construct: `Activity Exposure Event Stream`  
Legacy numeric output: `NUMERIC_OUTPUT_NOT_JUSTIFIED`  
Latest main reviewed: `d7ad96f9a207e35141104882972a97829400862c`

## 1. Decision summary

`RAW_EVIDENCE_RETENTION_REVIEW = COMPLETE_WITH_BLOCKERS`

`PRODUCTION_PERSISTENCE_SCHEMA_CHANGE_REQUIRED = YES`

No Neon main-schema mutation was performed.

The existing Production ingestion tables must **not** be reused directly for Activity Exposure.

## 2. Existing FANDEX persistence boundary

Current main migration `database/migrations/002_v121_naver_news_operational_ingestion.sql` defines:

- `fandex.source_ingestion_jobs`
  - provider constrained to `naver-news`
- `fandex.source_ingestion_raw_evidence`
  - bounded raw JSON payload
  - append-only mutation trigger
  - UPDATE/DELETE rejected
- `fandex.source_ingestion_normalized_records`
  - provider constrained to `naver-news`
  - source type constrained to `news_article`
  - append-only mutation trigger

These constraints correctly protect the existing NAVER path.

They are not a generic Activity Exposure persistence layer.

## 3. MusicBrainz acquisition / storage review

Official MusicBrainz API requirements reviewed:

- meaningful User-Agent required
- approximately one request per second per source IP unless otherwise agreed
- throttling may reject abusive clients

The research collector already:

- serializes requests
- enforces at least a 1,000 ms interval
- sends a FANDEX User-Agent

Current live run `35867441636` complied with that collector behavior.

MusicBrainz licensing distinguishes core data from supplementary data. Core database data is published under CC0, while supplementary data has different terms.

Activity Exposure currently retains only a bounded subset of release/release-group fields required by the source contract, not audiovisual content.

### MusicBrainz decision

Research / validation acquisition:

`ALLOWED_FOR_CURRENT_VALIDATION_SCOPE`

Production raw storage of the bounded core-field subset:

`CONDITIONALLY_ELIGIBLE_PENDING_FIELD_LICENSE_BOUNDARY`

Production commercial service access:

`UNRESOLVED`

Reason:

Data licensing and API-service/commercial-access terms are separate questions. If FANDEX becomes a commercial production consumer of the live MusicBrainz service, service-access/commercial-use review must be completed rather than inferring permission from CC0 data licensing alone.

Raw redistribution:

`NOT_REQUIRED_AND_NOT_AUTHORIZED_BY_THIS_REVIEW`

## 4. YouTube acquisition / storage review

The YouTube Data API live replay remains blocked because no authorized credential is available.

For public channel/video metadata obtained without user authorization, the YouTube Developer Policies describe it as Non-Authorized Data.

The policies permit temporary storage of limited Non-Authorized Data only as needed and no longer than 30 calendar days; after that it must be deleted or refreshed.

The policies also require stored API Data to be kept consistent with current YouTube API data and allow historical API Data to be displayed only when accurately contextualized in time.

### YouTube decision

Acquisition:

`BLOCKED_PENDING_AUTHORIZED_API_CREDENTIAL`

Permanent raw JSON retention:

`NOT_ELIGIBLE_AS_CURRENTLY_MODELED`

Required Production behavior for raw provider payload:

- bounded storage only
- explicit `capturedAt`
- explicit `refreshDueAt` / expiration boundary
- refresh or delete no later than applicable policy limit
- provider deletion/privacy changes must be represented
- no indefinite append-only raw payload retention

Raw redistribution:

`PROHIBITED_BY_FANDEX_SCOPE`

No raw API payload needs to be exposed to Product users.

## 5. Conflict with current database schema

The current NAVER raw-evidence table is intentionally append-only:

`UPDATE OR DELETE -> rejected`

That property is incompatible with a provider contract that requires refresh/delete of stored API Data.

Therefore:

`REUSE_NAVER_RAW_EVIDENCE_TABLE_FOR_YOUTUBE = FORBIDDEN`

This is a provider-policy mismatch, not a naming preference.

## 6. Required Activity Exposure persistence properties

A future Production persistence layer must separate at least:

### Provider observation metadata

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
- evidenceRef
- revision lineage
- normalizedEventIds

### Raw payload retention control

- rawPayloadRetentionState
- retainedAt
- refreshDueAt / expiresAt where provider policy requires it
- refreshedAt
- deletedAt or payload-evicted state
- retentionPolicyVersion

### Normalized Activity event

Normalized events must remain distinct from raw payload retention.

Raw payload expiration must not silently convert an already observed Activity event to:

- zero
- inactive
- missing
- cancelled

Historical event lineage may remain only to the extent permitted by the provider/API terms and the approved FANDEX retention policy.

## 7. Production schema verdict

Existing main schema does not provide a compliant generic storage shape for both providers.

Therefore:

`PRODUCTION_PERSISTENCE_SCHEMA_CHANGE_REQUIRED = YES`

Possible implementation direction:

- new Activity Exposure provider-observation tables; or
- a generic provider evidence layer with provider-specific retention policy fields.

The existing NAVER ingestion tables should remain unchanged.

No executable migration is authorized by this review.

## 8. Neon authority boundary

No Neon main-schema changes were executed.

Before any migration is prepared for application to Neon main, explicit user approval is required.

A migration must also preserve:

- Missing != 0
- Missing != inactive
- collaboration artist credits
- Observation Time != Collection Time
- raw payload lifecycle != normalized event lifecycle
- no numeric `comebackActivityPoint`
- no arbitrary weights / thresholds / decay / active window

## 9. Current blocker state

MusicBrainz live coverage:

`PASS_WITH_BOUNDED_PARTIAL`

YouTube live coverage:

`CREDENTIAL_BLOCKED`

Raw-evidence retention review:

`COMPLETE_WITH_SCHEMA_CHANGE_REQUIRED`

Overall:

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

Production:

`PRODUCTION_READY = NO`

## 10. Official policy references reviewed

- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz rate limiting: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
- MusicBrainz data license: https://musicbrainz.org/doc/About/Data_License
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube Developer Policies: https://developers.google.com/youtube/terms/developer-policies
