# Activity Exposure YouTube Credential / Acquisition Path Audit v1

Status: RESEARCH BLOCKER AUDIT
Construct: Activity Exposure
Provider: YouTube
Production mutation: NONE

## 1. Question

Can the current FANDEX environment execute the YouTube v1 official-content live collector without introducing a new credential path?

Required live path:

1. channels.list(part=contentDetails)
2. relatedPlaylists.uploads
3. playlistItems.list pagination
4. videos.list(part=snippet)
5. exact snippet.publishedAt validation

## 2. Repository / GitHub findings

Current repository search found no existing main-branch references to:

- YOUTUBE_API_KEY
- GOOGLE_API_KEY
- YouTube Data API credential wiring
- reusable YouTube live collector secret mapping

The research workflow explicitly references:

`secrets.YOUTUBE_API_KEY`

The actual live research run observed:

`youtube-api-credential-not-configured`

Therefore:

`GITHUB_ACTIONS_REUSABLE_YOUTUBE_CREDENTIAL = NOT_FOUND`

No secret value was inspected or exposed.

## 3. Vercel findings

Connected Vercel account contains project:

`fandex`

Project ID:

`prj_aT3p8zmjyochu8iGmFOuNR1lSU7v`

The current connected Vercel toolset confirms the project and deployments, but does not expose a working environment-variable listing action in this execution context.

Repository/deployment evidence also shows no application code path currently consuming a YouTube Data API environment variable.

Therefore:

`VERCEL_REUSABLE_YOUTUBE_CREDENTIAL = NOT_CONFIRMED`

This is not equivalent to proving no hidden Vercel environment variable exists.

It means no credential path is presently verifiable/reusable from the available integration surface.

## 4. Official API requirement

YouTube Data API requests require either:

- API key, or
- OAuth 2.0 token

The Activity Exposure collector reads public channel/video metadata and does not need user-private scopes, so an API key is sufficient for the selected v1 read path.

However, a credential is still required for every YouTube Data API request.

## 5. Non-key alternatives

Public YouTube webpages/search surfaces can corroborate individual videos and rendered publication dates.

They do not provide the same contract as the Data API for:

- deterministic uploads-playlist exhaustion
- stable API pagination
- complete requestedVideoIds inventory
- requested-minus-returned missing detection
- exact provider-native snippet.publishedAt for every visible item
- machine-verifiable current-visible inventory completeness

Therefore webpage scraping/search must not be promoted as a substitute for the v1 live coverage contract.

Verdict:

`NO_EQUIVALENT_OFFICIAL_NON_KEY_PATH_FOR_CURRENT_V1_CONTRACT`

## 6. Current YouTube blocker

`YOUTUBE_LIVE_COVERAGE_BLOCKED_CREDENTIAL_NOT_CONFIGURED`

This is now an external execution/input blocker, not a missing collector implementation blocker.

The collector, missing-video detection, coverage manifest, Product truth semantics, and CI validation are already implemented.

## 7. Safe next integration input

To execute the existing live coverage contract, the research environment needs an authorized credential mapped to:

`YOUTUBE_API_KEY`

The credential should be:

- restricted to YouTube Data API v3
- stored as a secret, never committed
- never printed to logs or artifacts
- used only for the research read path required by the current contract

No Production activation or publication follows automatically from adding such a credential.

## 8. Current verdict

GitHub Actions reusable credential:

`NOT_FOUND`

Vercel reusable credential:

`NOT_CONFIRMED_WITH_AVAILABLE_TOOLING`

Equivalent official non-key acquisition path:

`NO`

YouTube live coverage:

`BLOCKED_CREDENTIAL_NOT_CONFIGURED`

Legacy numeric comebackActivityPoint:

`NUMERIC_OUTPUT_NOT_JUSTIFIED`
