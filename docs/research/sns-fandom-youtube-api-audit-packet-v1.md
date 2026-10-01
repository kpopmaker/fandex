# FANDEX snsFandomPoint — YouTube API audit / derived-metrics application packet v1

Evaluated against:
- FANDEX main: `b76e7d22cc1c3479faca20ebf951c1be0097944b`
- snsFandomPoint candidate branch: `integration/sns-fandom-point-productionization-v1`
- YouTube policy path effective from 2026-06-01 for additional derived metrics / extended statistical-data storage

This file is a submission-preparation packet only. It does not represent provider approval.

## 1. Request type

Target form:
- YouTube Data API Services — Audit and Quota Extension Form
- https://support.google.com/youtube/contact/yt_api_form

Requested use-case family:
- **Analytics & Reporting**

Requested policy permission:
- additional derived metrics;
- extended statistical-data storage where approved;
- recurring automated collection for the declared analytics use case.

Do not claim approval until an actual provider response is recorded through
`sns-fandom-provider-approval-evidence-v1`.

## 2. API Client description

Suggested product description:

> FANDEX is a K-pop market intelligence product that collects authorized public platform observations and converts them into transparent artist-level analytics. For snsFandomPoint, FANDEX keeps public reaction/diffusion separate from fandom activity/persistence. It does not equate follower count, subscriber count, mention count, or a single engagement counter with fandom strength. The product does not infer protected attributes, does not identify individual fans in its output, and does not classify users as bots/fake engagement without provider-grounded evidence.

Suggested YouTube-specific description:

> The YouTube integration is an analytics-only read workflow. FANDEX retrieves public statistical counters for official artist channels/videos and, where separately approved, computes aggregate returning-public-commenter activity across distinct official content. Raw comment text and public commenter channel IDs are not retained by the snsFandomPoint candidate adapter. Derived metrics are clearly labeled as FANDEX-generated rather than YouTube-sourced metrics.

## 3. Exact requested endpoints

The current variable candidate needs only read endpoints:

- `youtube.channels.list`
  - channel binding / statistical channel fields;
  - current adapter use includes channel subscriber count as context-only evidence.
- `youtube.playlistItems.list`
  - enumerate the bound official channel uploads playlist for a declared
    publication-time window;
  - pagination must run to a terminal page so the window is not silently
    truncated to a manually selected / latest-N subset.
- `youtube.videos.list`
  - public video view / like / comment counters for the exact manifest set.
- `youtube.commentThreads.list`
  - public comment-thread retrieval for the aggregate recurrence candidate.
- `youtube.comments.list`
  - reply/comment retrieval when required for the declared public-comment scope.

No write/upload/moderation endpoints are part of snsFandomPoint.

Current YouTube quota documentation assigns 1 quota unit per call to each of
these five list methods. Pagination consumes additional calls and therefore
additional quota.

## 4. Exact metrics requested

### Statistical source observations

Requested stored statistical API observations:

- `youtube.video.view-count`
- `youtube.video.like-count`
- `youtube.video.comment-count`
- `youtube.channel.subscriber-count`

Important construct boundary:
- subscriber count remains **context-only**;
- it is not accepted as fandom activity/persistence by itself.

### Derived metrics

Requested FANDEX-derived metrics:

- `youtube.public-commenter.cross-content-repeat-count`
  - number of distinct public commenter channel IDs that appear on more than
    one distinct official artist video inside one declared provider period.
- `youtube.public-commenter.distinct-count`
  - aggregate distinct public commenter count used as context for the
    recurrence metric.

The application should not request approval for a final numeric
`snsFandomPoint` formula yet. Cross-dimension normalization/combination is
not approved internally and the Product contract still keeps
`snsFandomPoint = null`.

## 4a. Content-universe boundary

Public video counters are not artist-level evidence by themselves. Before any
artist-level aggregation is considered, FANDEX requires a content manifest
built from the bound official channel's uploads playlist.

The allowed v1 selection rule is:
- all uploads in one explicit publication-time window;
- enumerated through `channels.list` -> uploads playlist id ->
  `playlistItems.list`;
- pagination completed to a terminal page;
- every selected video id bound to its publication timestamp;
- the exact manifest video-id set must match the later `videos.list`
  statistical snapshot set.

The v1 contract explicitly rejects treating any of the following as equivalent
without a separately approved methodology:
- latest N videos;
- top N by views / likes / comments;
- manually curated videos;
- search-result subsets;
- unequal per-artist content counts chosen for convenience.

The publication-window duration is intentionally not hard-coded here. A future
cross-artist methodology must justify the window and use the same window
semantics across the comparison cohort.

No sum, mean, median, maximum, latest-video value, or other artist-level
aggregation function is approved by this manifest contract.

## 5. Data minimization / retention statement

The intended implementation is fail-closed:

- raw comment text: not persisted by the recurrence adapter;
- raw comment IDs: not persisted in adapter output;
- raw commenter channel IDs: used only transiently inside the aggregation
  operation and not emitted/persisted by the adapter;
- individual fan identity: not inferred;
- protected demographic / health / political / religious / sexual attributes:
  not inferred;
- bot/fake-engagement status: not inferred without provider-grounded evidence.

Requested retention under the additional YouTube policy, if approved:

- public statistical endpoint data: up to the provider-approved limit,
  never exceeding 36 calendar months under the current additional policy;
- approved derived metrics: up to the provider-approved limit,
  never exceeding 36 calendar months under the current additional policy;
- non-statistical API data remains subject to the standard refresh/deletion
  requirements and must not be treated as covered by the 36-month exception.

The provider approval evidence contract rejects a YouTube approval record that
claims more than 36 months for statistical/derived data or more than 30 days
for the non-statistical refresh window under the current policy model.

## 6. Quota calculation worksheet

Do not invent an expected volume. Populate this from the actual artist
universe and collection cadence before submission.

Let:

- `A` = number of bound official artist channels;
- `U_pages` = total `playlistItems.list` pages required to enumerate the
  declared official-channel publication windows;
- `V` = total official videos included in one reaction snapshot;
- `C_pages` = total `commentThreads.list` pages collected in one comment
  recurrence window;
- `R_pages` = total `comments.list` reply/comment pages collected in that
  window;
- `S` = reaction snapshot runs per day;
- `P` = comment-persistence collection windows executed per day.

Because each current read call costs 1 unit:

- channel-stat calls/day =
  `ceil(A / provider_max_ids_per_channels_list_call) * S`
- upload-manifest calls/day = `U_pages * S`
- video-stat calls/day =
  `ceil(V / provider_max_ids_per_videos_list_call) * S`
- comment-thread calls/day = `C_pages * P`
- comment calls/day = `R_pages * P`
- projected snsFandomPoint YouTube quota/day =
  sum of the five terms above.

Record the actual measured pagination/call counts from a permitted dry run or
staging collector before entering the quota request.

## 7. Evidence the current YouTube form requires

Prepare per Google Cloud project:

- publicly accessible Privacy Policy URL;
- privacy-policy screenshots showing the YouTube-specific sections,
  Google Privacy Policy link, and deletion/retention behavior;
- homepage screenshot showing where the Privacy Policy is linked and relevant
  YouTube branding/integration context;
- Terms of Service documentation;
- dashboard / feature screenshots for the Analytics & Reporting use case;
- OAuth flow screenshots only when OAuth is part of that project/use case;
- exact endpoint selection;
- expected API usage volume;
- Google Cloud project number.

If a review demo account is required, credentials must be entered directly
into the provider form. **Never commit demo credentials, API keys, OAuth
tokens, refresh tokens, or client secrets to this repository.**

## 8. Submission blockers that cannot be fabricated in code

The following remain external-owner inputs and must be supplied before a real
submission:

- legal applicant name;
- organization legal name, if applying as an organization;
- primary access URL;
- public Privacy Policy URL;
- Terms of Service URL/documentation;
- Google Cloud project number(s);
- current measured endpoint usage / requested quota;
- required screenshots;
- review/demo credentials if the form requires them;
- confirmation of which Google Cloud project actually owns the FANDEX YouTube
  API Client.

## 9. Approval evidence to record after provider response

A positive response must be converted into
`sns-fandom-provider-approval-evidence-v1` with:

- exact provider id;
- state = `approved`;
- exact approved dimensions;
- exact approved metric IDs;
- exact allowed endpoints;
- approval date / validity period;
- non-secret evidence reference to the provider decision;
- explicit booleans for:
  - commercial Product use;
  - recurring automated collection;
  - aggregate retention;
  - derived-metric publication;
- provider-approved retention limits.

Do not record `approved` from a submitted form, an acknowledgement email, or
an assumption. Only a provider decision that actually grants the requested
use case may satisfy the readiness gate.

## 10. Current nearest blocker

Internal contract/adapter/readiness support is implemented.

External blocker:
- obtain an actual YouTube approval decision for the exact Analytics &
  Reporting use case, metrics, endpoints, storage and publication rights; or
- for the authorized-account path, obtain exact artist channel-owner OAuth
  entitlement.

Until one of those exists as evidence, Production collection remains blocked.
