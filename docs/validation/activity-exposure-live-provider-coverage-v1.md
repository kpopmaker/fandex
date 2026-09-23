# Activity Exposure v1 live provider coverage report

Status: VALIDATION EVIDENCE  
Validation run: `35867441636`  
Research head: `a0a64b6fe0191cff4097b90df16fbb12fb78149a`  
Latest main checked before execution: `d7ad96f9a207e35141104882972a97829400862c`

## Verdict

`LIVE_PROVIDER_COVERAGE_GATE = BLOCKED_BY_YOUTUBE_CREDENTIAL`

The MusicBrainz live replay completed. The YouTube live replay did not run because no authorized YouTube Data API credential was available to the validation environment.

No Production merge, activation, publication, route cutover, or Neon main-schema mutation was performed.

## MusicBrainz live replay

Provider artist MBID:

`b9545342-1e6d-4dae-84ac-013374ad8d7c`

Results:

- provider release-group count: **58**
- enumerated release groups: **58 / 58**
- normalized confirmed release events: **57**
- validation issues: **0**
- Official-release support violations: **0**
- collaboration events: **12**
- collaboration credit preservation violations: **0**

Bounded partial release group:

- release-group MBID: `1299e16d-133b-47b0-b991-36cf11eff7d7`
- title: `그대네요`
- release-group first-release-date provenance: `2010-09-28`
- artist credit count: `2`
- normalized confirmed release event: **not emitted**
- coverage classification: `missing_source_data`

The release-group provenance date was **not** promoted into `occurredAt` without a usable concrete Official-release date.

Therefore MusicBrainz is:

`COMPLETE_CURRENT_INVENTORY_REPLAY_WITH_BOUNDED_PARTIAL = PASS`

This is not a claim that all 58 groups yielded an observed event.

## Collaboration integrity

The live replay emitted 12 collaboration release events.

For all 12:

- multi-artist provider credits were retained
- IU's MusicBrainz artist MBID remained present
- no collaboration event was rewritten as IU-only

Result:

`COLLABORATION_CREDIT_PRESERVATION = PASS`

## YouTube live replay

Canonical channel:

`UC3SyT4_WLHzN7JmHQwKQZww`

The validation runner checked these authorized-secret candidates:

- `YOUTUBE_API_KEY`
- `YOUTUBE_DATA_API_KEY`
- `GOOGLE_YOUTUBE_API_KEY`

All were unavailable in the GitHub Actions environment.

Therefore no claim is made about:

- complete current uploads-playlist enumeration
- exact current visible video count
- complete `snippet.publishedAt` replay
- missing/private/deleted/unavailable video classification

YouTube state remains:

`CREDENTIAL_BLOCKED`

This state is **not** converted to zero activity or inactivity.

## Preserved invariants

- canonical Real construct = Activity Exposure Event Stream
- `comebackActivityPoint = NUMERIC_OUTPUT_NOT_JUSTIFIED`
- Missing != 0
- Missing != inactive
- no event weights
- no arbitrary threshold
- no recency decay
- no arbitrary active window
- no raw cross-family count metric

## Next blocker

The nearest blocker is:

`AUTHORIZED_YOUTUBE_DATA_API_CREDENTIAL`

Only after an authorized credential is available should the same validation runner execute the current visible uploads inventory to exhaustion.

The integration candidate must not advance to a Production integration PR while this gate remains blocked.
