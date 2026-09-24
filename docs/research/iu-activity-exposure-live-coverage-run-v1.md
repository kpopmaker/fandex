# IU Activity Exposure Live Coverage Run v1

Status: RESEARCH LIVE PROVIDER EXECUTION
Artist: IU
Construct: Activity Exposure
Production mutation: NONE

## 1. Execution

GitHub Actions workflow:

`.github/workflows/activity-exposure-live-coverage-research.yml`

Diagnostic live run:

`36065220073`

Source research head:

`a06e56a89bdfe512ffd23cccbc539abde2fa5f16`

Current main captured by manifest:

`09c7b4714c9f52b8534e43747a2582bc24102c8c`

Manifest artifact:

`activity-exposure-live-coverage-manifest`

Artifact ID:

`10835943736`

Raw retained-evidence artifact:

`NOT_WRITTEN`

Reason:

`ACTIVITY_EXPOSURE_RAW_RETENTION_AUTHORIZED` was not configured as true.

No Production merge, activation, publication, route cutover, or Neon mutation occurred.

## 2. Overall gate

`blocked_live_coverage`

Reason:

`live-provider-coverage-incomplete`

`numericScoreProduced = false`

No comebackActivityPoint numeric output was produced.

## 3. MusicBrainz live result

Provider artist MBID:

`b9545342-1e6d-4dae-84ac-013374ad8d7c`

Coverage scope:

`current_visible_inventory`

Inventory exhausted:

`true`

Discovered release groups:

`58`

Normalized observed release events:

`57`

Missing release groups:

`1`

Invalid normalized events:

`0`

Coverage state:

`partial`

The single missing release group is:

- release-group MBID: `1299e16d-133b-47b0-b991-36cf11eff7d7`
- title: `그대네요`
- diagnostic: `no-official-release-returned`

Interpretation:

The release group is present in the current artist release-group browse surface, but the collector's concrete release browse constrained to `status=official` returned no supporting Official release.

Under the frozen source contract this does **not** become a confirmed observed release event.

It remains missing provider evidence for the confirmed-release construct.

It is not:

- zero activity
- inactive
- invalid event
- a reason to fabricate a date
- a reason to fall back to release-group first-release-date as confirmed occurrence

MusicBrainz current-visible inventory verdict:

`58_DISCOVERED / 57_CONFIRMED_OBSERVED / 1_MISSING_OFFICIAL_SUPPORT`

## 4. YouTube live result

Canonical channel:

`UC3SyT4_WLHzN7JmHQwKQZww`

Coverage state:

`provider_unavailable`

Reason:

`youtube-api-credential-not-configured`

GitHub Actions environment exposed no value for:

`YOUTUBE_API_KEY`

Therefore the workflow did not claim any uploads inventory coverage.

Values remain:

- discoveredEntityCount = null
- normalizedEventCount = 0
- inventoryExhausted = null

These values mean collection did not execute.

They do **not** mean zero official-content activity.

## 5. YouTube completeness hardening completed before live run

The research collector now retains uploads-playlist page observations in collector memory and exposes:

- requestedVideoIds
- returnedVideoIds
- missingVideoIds

The live coverage runner treats:

`requestedVideoIds - returnedVideoIds`

as explicit missing coverage.

Therefore future YouTube live execution cannot claim complete current-visible inventory merely because `videos.list` silently omitted deleted/private/unavailable requested IDs.

## 6. Evidence retention state

The live runner collected MusicBrainz raw observations in process memory, but persistent raw-evidence artifact writing is gated.

Because raw retention authorization was not explicitly enabled:

- retainedObservationCount in manifest = 0
- MusicBrainz digestOnlyObservationCount = 182
- authorizationState = review_required
- retained-evidence artifact upload = skipped

This is intentional fail-closed behavior.

The manifest itself contains coverage metadata and diagnostics, not the raw provider payload set.

## 7. Current research verdict

MusicBrainz live provider execution:

`PASS_EXECUTION_WITH_BOUNDED_PROVIDER_MISSING`

MusicBrainz complete-current-visible claim:

`NO`

YouTube live provider execution:

`BLOCKED_CREDENTIAL_NOT_CONFIGURED`

Raw evidence persistence authorization:

`REVIEW_REQUIRED`

Overall:

`LIVE_PROVIDER_COVERAGE_GATE = BLOCKED`

The remaining external blockers are now concrete:

1. decide whether the MusicBrainz release group `그대네요` should remain legitimately missing under the confirmed-release construct; do not weaken the construct merely to obtain 58/58
2. provide an authorized YouTube Data API credential to the research workflow if full current-visible official-content coverage is required
3. resolve intended raw-evidence retention authorization before integration review requiring retained Stored Evidence

No methodology score/weight/threshold work remains.
