# snsFandomPoint Production candidate inventory v1

Evaluated against main: `b76e7d22cc1c3479faca20ebf951c1be0097944b`

## Product construct

`snsFandomPoint` is not a follower-count alias and is not a mention-count alias.

The v1 contract keeps two constructs separate:

1. **SNS public reaction / diffusion** — directly observed public content reaction signals such as content views, likes, and comments where an authorized provider contract allows them.
2. **Fandom activity / persistence** — evidence that construct-relevant observations recur across distinct observation times. The v1 persistence layer records only whether temporal history exists. It does not infer individual fan identity, bot status, loyalty, or a numeric persistence score.

No raw values from different platforms are averaged. No cross-dimension weight, threshold, or score formula exists in v1.

## Provider qualification

### YouTube Data API — conditional candidate

Official documentation allows retrieval of channel/video/comment data, but non-authorized API data has storage/refresh limits. YouTube also documents an additional approval path for analytics use cases that need derived metrics and extended statistical-data storage.

Production status: **conditional-approval-required**.

Required before FANDEX Production use:

- approved analytics / derived-metrics use case recorded for FANDEX;
- retention behavior approved or implemented so stored data complies with the applicable refresh/deletion rules;
- exact YouTube channel identity binding supplied by Artist Expansion;
- prospective snapshot collection established because current public counters do not provide FANDEX's prior snapshots.

References:

- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/terms/derived-metrics-policy
- https://developers.google.com/youtube/v3/docs/channels
- https://developers.google.com/youtube/v3/docs/comments

### Instagram API — coverage-limited candidate

Meta's current Instagram Platform documentation describes management of Instagram Business or Creator accounts linked through the platform. That does not establish arbitrary read coverage of the full K-pop artist universe.

Production status: **authorized-account-only**.

Blockers:

- arbitrary K-pop artist coverage not established;
- storage/retention and derived-publication rights not yet qualified for this FANDEX use case.

Reference:

- https://developers.facebook.com/documentation/instagram-platform

### TikTok Display API — coverage-limited candidate

TikTok Display API requires a TikTok user to authorize the app and grants scopes for that user's profile/public videos.

Production status: **authorized-account-only**.

This is not sufficient for generic K-pop coverage unless each target artist account authorizes FANDEX.

References:

- https://developers.tiktok.com/docs/en/display-api-overview
- https://developers.tiktok.com/docs/en/display-api-get-started
- https://developers.tiktok.com/docs/en/scopes-overview

### TikTok Research API — not a commercial Production source

TikTok states that Research Tools are for qualifying non-commercial research and explicitly says commercial users are not eligible.

Production status: **not-production-eligible**.

References:

- https://developers.tiktok.com/products/research-api/
- https://developers.tiktok.com/docs/en/research-api-faq

### X API — unresolved

X can support commercial analytics under some arrangements, but this repository does not yet contain an exact current license/plan record establishing FANDEX rights for recurring collection, retention, and derived metric publication.

Production status: **rights-unresolved**.

No X data should enter `snsFandomPoint` until the exact commercial entitlement and terms are recorded.

## Minimal realistic source combination

The smallest currently actionable candidate is **YouTube-first**, with the same authorized source family contributing:

- public-reaction observations from official artist content statistics; and
- prospective temporal history showing repeated construct-relevant observations.

This is deliberately not called a Production source yet. It remains rights-blocked until the documented YouTube analytics/derived-metrics and retention requirements are satisfied.

The YouTube candidate adapter therefore:

- accepts only exact canonical-artist-to-channel binding supplied externally;
- emits raw observations without cross-platform aggregation;
- keeps subscriber count as **context-only**, so follower count cannot satisfy fandom readiness by itself;
- preserves missing values as missing, never zero;
- creates only categorical temporal-history evidence;
- emits no numeric `snsFandomPoint`.

## History requirement

Historical access is prospective for the first candidate.

A single snapshot is `history-insufficient`. Two or more distinct observation times establish only `temporal-history-present`, which is the mathematical minimum for change-over-time evidence, not a fandom-strength threshold. The contract still does not infer persistence strength or produce a score.

## Current Product readiness

Current state: **provider-rights-blocked**.

Even after rights are cleared and dual-dimension evidence exists, the v1 contract keeps:

- `snsFandomPoint = null`
- `numericProductEligible = false`
- Product activation/publication = false

until a separately justified cross-dimension combination methodology is approved.
