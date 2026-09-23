# Activity Exposure persistence schema validation v1

Status: VALIDATED IN EPHEMERAL POSTGRESQL  
Validation run: `35873969349`  
PostgreSQL: 16  
Neon main mutation: **NO**

## Result

`ACTIVITY_EXPOSURE_PERSISTENCE_CANDIDATE = PASS`

The candidate was applied after the existing FANDEX persistence migrations in a clean PostgreSQL 16 service.

## Verified invariants

- existing NAVER ingestion tables remain present
- Activity Exposure uses separate tables
- Missing/source-data absence can be persisted without fabricating an event
- collaboration provider artist credits remain multi-party
- raw payload bytes are separated from observation/event lineage
- YouTube retained raw payload requires a bounded refresh deadline
- raw payload bytes can transition from retained to evicted while retaining digest/lineage metadata
- direct in-place replacement of retained raw payload is rejected
- Activity Exposure event rows are append-only
- collection run and provider observation rows are append-only
- observed events require an occurrence value and precision
- no Activity Exposure schema column contains score/point/weight/decay/active-window semantics

## Existing NAVER protection

After applying the candidate:

- `fandex.source_ingestion_jobs` = present
- `fandex.source_ingestion_raw_evidence` = present
- `fandex.source_ingestion_normalized_records` = present

The candidate does not alter those tables.

## Production authority boundary

The candidate SQL remains under:

`docs/validation/sql/activity-exposure-persistence-candidate-v1.sql`

It is **not** a Production migration.

No file was added to `database/migrations/`.

No Neon branch or main schema was modified.

Promoting this candidate into an executable Production migration requires separate explicit authorization before any Neon main-schema change.

## Remaining blockers

1. YouTube live provider replay remains `CREDENTIAL_BLOCKED`.
2. MusicBrainz Production/commercial service-access authorization remains unresolved.
3. Production migration promotion remains unauthorized.

Overall:

`INTEGRATION_CANDIDATE_WITH_LIVE_COVERAGE_GATE`

`PRODUCTION_READY = NO`
