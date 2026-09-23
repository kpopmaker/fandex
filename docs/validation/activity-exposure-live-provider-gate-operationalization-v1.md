# Activity Exposure live provider gate operationalization v1

Status: VALIDATION / OPERATIONAL GATE  
Validation run: `35874852648`  
Artifact ID: `10757192719`

## Purpose

Make `LIVE_PROVIDER_COVERAGE_GATE` directly rerunnable after an authorized YouTube Data API credential is added, without requiring a dummy code commit.

## Workflow changes

`.github/workflows/validate-activity-exposure-live-provider-coverage-v1.yml` now supports:

- `workflow_dispatch`
- credential preflight without printing credential values
- live MusicBrainz + YouTube replay
- report artifact upload even when the gate is blocked
- explicit gate enforcement

The workflow exits non-zero unless:

`liveCoverageGate === PASS_WITH_TRUTHFUL_PROVIDER_COVERAGE`

## Current enforced run

Run:

`35874852648`

Credential preflight:

`AUTHORIZED_YOUTUBE_CREDENTIAL_AVAILABLE=false`

MusicBrainz:

- state: `bounded_partial`
- provider release groups: 58
- enumerated: 58
- normalized confirmed release events: 57
- bounded missing_source_data groups: 1
- collaboration events: 12
- collaboration credit violations: 0
- Official release support violations: 0
- validation issues: 0

YouTube:

- state: `credential_blocked`
- credential source: none
- live uploads replay: not executed
- no zero/inactive inference performed

Enforcement:

- `LIVE_PROVIDER_COVERAGE_GATE=BLOCKED`
- workflow conclusion: `failure`
- failure is intentional and represents the unresolved live coverage gate

## Operational unblock path

Add one authorized repository Actions secret:

- `YOUTUBE_API_KEY`, or
- `YOUTUBE_DATA_API_KEY`, or
- `GOOGLE_YOUTUBE_API_KEY`

Then manually dispatch:

`Validate Activity Exposure live provider coverage v1`

No source-contract change, code patch, or dummy commit should be required.

## Forbidden substitutes

Do not bypass the gate with:

- HTML scraping
- RSS substitution
- search-result counts
- third-party uploads
- synthetic YouTube fixtures presented as live coverage
- zero activity for unavailable credential
- inferred inactive state

## Authority boundary

This operationalization does not authorize:

- Production merge
- Product activation
- publication
- public-route cutover
- Neon main-schema migration
- numeric `comebackActivityPoint`

Current canonical construct remains:

`Activity Exposure Event Stream`
