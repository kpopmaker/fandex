# Activity Exposure Production live provider validation v1

Status: VALIDATION EVIDENCE  
Run: `35894200088`  
Candidate head validated: `fe0e7be0886c4264d1ad67f0916a51bd73ecb68f`

## Verdict

`PRODUCTION_COLLECTOR_PARITY = PASS`

`PRODUCT_TRUTH_STATE_REPRESENTATION = PASS`

`LIVE_PROVIDER_COVERAGE_GATE = BLOCKED_BY_YOUTUBE_CREDENTIAL`

The workflow conclusion is intentionally failure because the final enforcement step rejects a blocked full live-coverage gate.

The runner itself completed successfully and uploaded its report.

## MusicBrainz Production live replay

- provider release groups: 58
- enumerated: 58 / 58
- confirmed release events: 57
- missing_source_data release groups: 1
- missing release-group ID: `1299e16d-133b-47b0-b991-36cf11eff7d7`
- identity unresolved release groups: 0
- collaboration events: 12
- collaboration-credit violations: 0
- collection status: `bounded_partial`
- coverage state: `partial`

These values reproduce the prior research live replay.

Therefore:

`MUSICBRAINZ_PRODUCTION_COLLECTOR_LIVE_PARITY = PASS`

## YouTube

No authorized YouTube Data API credential was available.

State:

`credential_blocked`

No event count, upload count, or inactivity claim was fabricated.

## Product read model

The non-numeric Production read model successfully represented:

- MusicBrainz = bounded_partial / partial
- YouTube = credential_blocked / provider_unavailable
- event count = 57
- numeric fact present = false

Result:

`PRODUCT_ACTIVITY_EXPOSURE_READ_MODEL = OK`

`PRODUCT_NUMERIC_FACT = FALSE`

Therefore a provider-unavailable state does not require conversion to:

- zero
- inactive
- synthetic fallback
- numeric comebackActivityPoint

## Preserved invariants

- canonical construct = Activity Exposure Event Stream
- `comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`
- Missing != 0
- Missing != inactive
- no event weights
- no arbitrary threshold
- no recency decay
- no active window
- collaboration credits preserved
- release and official-content event families remain distinct

## Current gate

The only unresolved live provider gate is:

`AUTHORIZED_YOUTUBE_DATA_API_CREDENTIAL`

Until it is available:

- no integration PR
- no merge
- no activation
- no publication
- no Neon main-schema mutation
