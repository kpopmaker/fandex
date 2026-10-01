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

### YouTube Analytics / Reporting APIs — authorized persistence candidate

Official channel reports require OAuth authorization from the channel owner. The reporting schema can segment user activity by `subscribed_status` and date, allowing FANDEX to observe repeated aggregate activity from the subscribed audience without tracking individual viewers.

Production status: **authorized-account-only**.

This is a bounded candidate for the **fandom activity / persistence** dimension, not a claim that every subscriber is a fan. The adapter uses aggregate subscribed-view activity across provider periods and never infers individual identity or loyalty.

Blockers:

- channel-owner authorization is required;
- generic K-pop artist coverage is therefore not established;
- shared OAuth/runtime handling belongs outside this variable-specific branch.

References:

- https://developers.google.com/youtube/analytics/channel_reports
- https://developers.google.com/youtube/reporting
- https://developers.google.com/youtube/reporting/v1/reports/channel_reports

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

The smallest currently actionable candidate for **SNS public reaction / diffusion** is **YouTube-first**, using official artist-content statistics after the relevant provider rights are cleared.

That does **not** satisfy the separate **fandom activity / persistence** construct. Repeated snapshots of the same YouTube view/like/comment counter are reaction history, not evidence that FANDEX may relabel as fandom persistence.

Accordingly, there is currently **no generic, full-universe qualified minimum source combination** for the complete `snsFandomPoint` construct.

For an artist that explicitly authorizes FANDEX, the strongest current bounded candidate is:
- public-reaction evidence from YouTube statistics under the applicable YouTube data/derived-metric/storage permissions; plus
- aggregate subscribed-audience activity history from YouTube Analytics/Reporting.

That authorized-account path still does not solve arbitrary K-pop coverage. For artists without channel-owner authorization, a separately qualified persistence source is still required. Until then, the Product remains blocked rather than filling the missing dimension with reaction history.

YouTube itself is deliberately not called a Production source yet. It remains rights-blocked until the documented YouTube analytics/derived-metrics and retention requirements are satisfied.

The YouTube candidate adapter therefore:

- accepts only exact canonical-artist-to-channel binding supplied externally;
- emits raw observations without cross-platform aggregation;
- keeps subscriber count as **context-only**, so follower count cannot satisfy fandom readiness by itself;
- preserves missing values as missing, never zero;
- creates categorical history only within the same provider artist/content/metric scope;
- does not let reaction history satisfy the fandom-persistence dimension;
- emits no numeric `snsFandomPoint`.

## History requirement

Historical access differs by source:
- public YouTube Data API reaction evidence requires compliant prospective snapshot handling unless an approved storage path applies;
- authorized YouTube Analytics/Reporting can query owned-channel activity over explicit report periods.

A single observation remains `history-insufficient`. Two or more distinct observation times within the **same provider artist/content/metric scope** establish only `temporal-history-present`, which is the mathematical minimum for change-over-time evidence, not a fandom-strength threshold. Reaction history still cannot satisfy the fandom-persistence dimension. The contract does not infer persistence strength or produce a score.

## Current Product readiness

Current state: **provider-rights-blocked**.

Even after rights are cleared and dual-dimension evidence exists, the v1 contract keeps:

- `snsFandomPoint = null`
- `numericProductEligible = false`
- Product activation/publication = false

until a separately justified cross-dimension combination methodology is approved.


## Validation scope

Exact variable-scope CI must cover only the five snsFandomPoint files introduced by this candidate and must not modify shared runtime, scheduler, database, registry, or deployment configuration.


## Artist-scoped entitlement contract

Authorized-account sources are not promoted to globally Production-ready merely because their API exists.

The variable contract now requires an explicit, secret-free artist/provider entitlement record before authorized-account evidence can enter readiness. The entitlement binds:

- canonical artist id;
- exact provider and provider artist/channel id;
- authorization class;
- allowed snsFandom dimensions;
- recorded OAuth scopes;
- verification and validity times;
- non-secret evidence reference;
- explicit rights for commercial Product use, recurring automated collection, storage/retention, and derived metric publication.

An entitlement is fail-closed when pending, revoked, expired, not yet valid, missing a required right, mismatched to the canonical artist/provider identity, or missing the provider-specific scope.

For YouTube Analytics the candidate adapter additionally requires the official `yt-analytics.readonly` scope and an exact channel-owner OAuth entitlement. No access or refresh token is persisted in this variable contract.

This enables artist-specific readiness without mutating the global Artist registry or pretending that one artist's authorization applies to another artist.


## Generic public-comment persistence candidate

A second persistence path is now modeled for generic public-channel coverage using the YouTube Data API comment surface.

The candidate uses only fields already exposed by the official comment resource, including public comment author channel id and comment publication time. It computes one aggregate construct signal:

- `youtube.public-commenter.cross-content-repeat-count`: the number of public commenter channel ids that appear across more than one distinct official artist video within the declared provider period.

This is intentionally named **returning public commenter activity**, not “fan count.” It does not infer that a commenter is a fan, does not classify bots/fake engagement, and does not retain comment text, comment ids, or commenter channel ids in its output.

The candidate remains **conditional-approval-required**. From June 1, 2026, YouTube's additional derived-metrics/data-storage policy applies only to audited analytics use cases that explicitly receive permission through the quota-extension/analytics approval path. The repository therefore requires separate recorded approval for this exact commenter-recurrence metric, commercial Product use, recurring collection, and aggregate retention before the source can be promoted.

Even with approval, historical completeness is not assumed: deleted/unavailable comments, pagination scope, disabled comments, and incomplete collection windows remain evidence limitations.

References:

- https://developers.google.com/youtube/v3/docs/comments
- https://developers.google.com/youtube/v3/docs/commentThreads
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/terms/derived-metrics-policy


## Provider approval evidence gate

Conditional providers are no longer promoted by boolean flags or by manually
rewriting their qualification state.

The runtime contract now accepts
`sns-fandom-provider-approval-evidence-v1`. A conditional provider becomes
evidence-eligible only when an actual approval record is valid at evaluation
time and covers the exact:

- provider;
- snsFandom construct dimension;
- metric id;
- approved endpoints;
- commercial Product use;
- recurring automated collection;
- aggregate retention;
- derived-metric publication.

For the current YouTube additional-policy model, approval evidence also
fail-closes retention claims above the documented 36-month statistical /
derived-metric ceiling and the 30-day non-statistical refresh window.

Submission preparation is recorded in:
- `docs/research/sns-fandom-youtube-api-audit-packet-v1.md`

A submitted form is not approval. Only a provider decision may populate an
`approved` evidence record.
