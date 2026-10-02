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


## 1a. Current form semantics verified 2026-10-02

The live YouTube Data API Services **Audit and Quota Extension Form** was
re-checked against the current provider form and policy text.

Verified submission path:

- Section 1 request type:
  `Complete a compliance audit to request for additional quota`;
- Section 5 use-case category:
  `Analytics & Reporting`;
- the form explicitly describes this category as tracking views, subscribers,
  trends, or comparing channel performance metrics;
- the derived-metrics/storage subsection appears under Section 5;
- the applicant must affirm the additional derived-metrics and data-storage
  amendment.

The amendment displayed by the provider form states that:

- Developer Policies III.E.2.a and III.E.4.h are amended for qualifying
  limited derived-metric use cases, provided custom metrics are clearly
  identified as independently generated rather than YouTube API metrics;
- III.E.4.b/c/d are amended so publicly available statistical counters and
  approved derived metrics may be retained for up to 36 calendar months;
- other API data such as titles, creator names, descriptions and comment text
  remains subject to the ordinary 30-day refresh/deletion requirements.

Important: checking the acknowledgement is **not** provider approval. The form
explicitly says YouTube will determine whether the submitted use case
qualifies.

The approval evidence contract therefore now requires all of these provider
grant states to be explicitly recorded:

- compliance audit passed;
- Analytics & Reporting use case accepted;
- Developer Policies amendment accepted;
- additional derived metrics approved;
- extended statistical storage approved.

A form submission, acknowledgement, or pending review cannot satisfy those
fields.

## 8a. Current FANDEX submission-readiness audit — 2026-10-02 live refresh

Current repository / deployment state:

- current FANDEX `main`:
  `1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1`;
- latest visible Vercel Production deployment checked:
  `dpl_Ugg1UJU2aL8BRNAehUowmHeZF5QD`;
- deployment target: `production`;
- deployment state: `READY`;
- deployment Git SHA:
  `1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1`;
- Production matches current `main` at screenshot capture time;
- the stable legal URLs and latest privacy wording are verified on that
  deployed SHA;
- stable Production alias:
  `https://fandex-eta.vercel.app`.

Authenticated Vercel fetch verification:

- `/` -> HTTP 200;
- `/privacy` -> HTTP 200;
- `/terms` -> HTTP 200.

Rendered Production evidence also confirms:

- homepage footer exposes `Privacy Policy`;
- homepage footer exposes `Terms of Service`;
- homepage footer exposes direct `YouTube Terms`;
- homepage footer exposes direct `Google Privacy`;
- `/privacy` title is `Privacy Policy | FANDEX`;
- `/terms` title is `Terms of Service | FANDEX`.

Therefore the earlier 404 legal-surface blocker is resolved.

Merged prerequisites now present on `main`:

- snsFandom Production contract PR #349: merged;
- YouTube legal surface PR #398: merged;
- verified Audit cohort v1 handoff PR #404: merged;
- Audit cohort v1 exact selected member count: 5;
- selected artists:
  BLACKPINK / TWICE / ROSÉ / RIIZE / JENNIE;
- LISA remains held;
- merged binding manifest:
  `data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json`.

The exact five-member manifest is accepted by the Product-side binding
evaluator as `binding-manifest-ready` and is the only valid
`artistChannelCount = 5` baseline for this v1 application scope.

The repository also now contains
`sns-fandom-youtube-quota-measurement-handoff-v1`, which converts the merged
cohort into one deterministic measurement task per selected channel, but it
does **not** authorize provider calls and deliberately leaves the measured
playlist-page/video-count inputs unresolved.

Important test-fixture warning:

- example values such as `reactionSnapshotRunsPerDay = 4`;
- example measurement windows such as
  `2026-09-01T00:00:00.000Z -> 2026-10-01T00:00:00.000Z`;
- placeholder Google Cloud project numbers / ids;

appear in regression tests only. They are not application evidence and must
not be copied into a real submission packet.

Current remaining concrete blockers:

- legal applicant identity evidence is not yet recorded;
- organization/self application identity evidence is not yet recorded;
- exact Google Cloud project number / providerClientRef binding evidence is
  not yet recorded;
- real measurement window is not yet declared with evidence;
- real reaction snapshot cadence is not yet declared with evidence;
- measured uploads-playlist page count per reaction run is not yet returned;
- measured included-video count per reaction run is not yet returned;
- exact quota worksheet is therefore not yet `quota-evidence-ready`;
- provider application has not been submitted;
- actual provider grant is absent.

The merged legal URLs, repository documentation, and three required screenshot
artifacts are now evidence-backed. Applicant identity, Cloud-project identity,
cadence, and actual quota measurements remain external-owner evidence.

Submission readiness still does not imply provider approval. Even after a
future packet evaluates as `submission-ready`, the contract keeps:

- `providerApprovalGranted = false`;
- `productionCollectionAuthorized = false`.

## 6a. Evidence-bound quota worksheet

The quota worksheet is now executable as
`sns-fandom-youtube-quota-worksheet-v1`.

It intentionally does not choose:

- artist count;
- reaction snapshot cadence;
- comment-persistence cadence;
- provider batch limits;
- per-method quota costs;
- quota headroom;
- requested daily quota.

All of those inputs must come from measured or provider-documented evidence.

The worksheet accepts:

- measured artist-channel count;
- measured uploads-playlist page count per reaction run;
- measured video count per reaction run;
- measured comment-thread/comment page counts when that scope is actually
  included;
- explicitly declared runs/day;
- provider batch limits;
- quota units per call;
- non-secret evidence references for each assumption.

It calculates only the evidence-backed minimum projected quota/day.

It always leaves:

- `requestedQuotaUnitsPerDay = null`;
- `headroomFactorApplied = false`;
- all arbitrary-default flags = false.

This means the code never invents an application quota request or safety
margin. If the owner wants quota headroom above the measured projection, that
must be justified separately in the provider application.

The audit-submission readiness contract now requires a real
`quota-evidence-ready` worksheet. A free-form `quotaEstimateRef` string by
itself is no longer sufficient. The worksheet must also match the exact
provider client/project reference and the exact endpoint scope of the
application.

Current provider documentation rechecked on 2026-10-02:

- YouTube Data API quota calculator:
  https://developers.google.com/youtube/v3/determine_quota_cost
- channels.list:
  https://developers.google.com/youtube/v3/docs/channels/list
- playlistItems.list:
  https://developers.google.com/youtube/v3/docs/playlistItems/list
- videos.list:
  https://developers.google.com/youtube/v3/docs/videos/list
- commentThreads.list:
  https://developers.google.com/youtube/v3/docs/commentThreads/list
- comments.list:
  https://developers.google.com/youtube/v3/docs/comments/list

The current quota calculator shows each of the five list methods above at
1 quota unit per call and notes that additional pagination requests incur
additional quota. The worksheet still requires these costs as evidence-bound
inputs rather than freezing them into Product code.

Batch limits are also evidence inputs rather than Product constants. This
avoids silently assuming that a provider request parameter limit, result-page
limit, or multi-ID batching rule is stable across policy/API revisions.


## 7a. Google Cloud project / API client identity evidence

The audit packet now requires an executable
`sns-fandom-youtube-provider-client-identity-v1` artifact.

A free-form `providerClientRef` or `cloudProjectRef` string is not enough.

The identity artifact must bind, without storing credential material:

- provider = `youtube-data-api`;
- exact FANDEX `providerClientRef`;
- exact numeric Google Cloud project number;
- Google Cloud project id when known;
- a secret **locator** only, such as a GitHub Actions secret name;
- non-secret evidence reference proving the Cloud project / credential binding;
- exact verification timestamp.

The artifact rejects API key values, OAuth tokens, client secrets, and
secret-like evidence references.

The current repository already demonstrates a separate Brand Fit YouTube
workflow that expects a GitHub Actions secret named
`FANDEX_BRAND_FIT_YOUTUBE_API_KEY`. That proves only that a secret locator is
part of an existing workflow contract. It does **not** prove:

- that the secret currently exists;
- that snsFandomPoint may reuse that credential;
- which Google Cloud project owns that key; or
- that the owning project has the required snsFandom provider approval.

Therefore Brand Fit's secret name cannot be promoted into snsFandom client
identity evidence by assumption.

The audit-readiness gate now requires:

- a `provider-client-identity-ready` artifact;
- exact provider-client-ref equality between identity, quota worksheet, and
  audit packet;
- exact Cloud-project evidence-ref equality between the identity artifact and
  the audit packet;
- a non-null validated Google Cloud project number.

Even after this identity validation passes, provider approval remains false
until an actual provider grant is recorded.


## 6b. Verified artist-channel manifest before quota counting

The measured quota worksheet now consumes
`sns-fandom-youtube-audit-artist-binding-manifest-v1`.

This prevents the Product artist-universe target from being reused as provider
quota evidence.

The binding manifest requires:

- exact canonical artist id;
- exact YouTube channel id;
- verified binding state;
- non-secret evidence reference;
- exact verification time;
- explicit inclusion/exclusion from the submitted audit scope;
- explicit shared-channel caveat when one provider channel is bound to more
  than one canonical artist.

A shared/label channel cannot enter the v1 audit cohort merely to increase
coverage. Shared-channel members are rejected from the audit scope even when
the ambiguity is documented.

The quota worksheet now requires:

- a `binding-manifest-ready` artifact;
- `measuredUsage.artistChannelCount` to exactly equal the manifest's
  `auditScopeMemberCount`.

Therefore the current Product universe value of 100 cannot satisfy quota
readiness unless a real verified audit manifest actually contains 100 eligible
unique artist-channel members.

Current main was checked on 2026-10-02:

- `app/data/v4/artistUniverse.ts` has 100 artist seeds;
- that file has 0 explicit YouTube channel bindings.

The external identity handoff is tracked in issue #402.


## 6c. Exact quota-measurement handoff for Audit cohort v1

The variable branch now includes
`sns-fandom-youtube-quota-measurement-handoff-v1`.

Its purpose is to turn the merged five-member Audit cohort v1 into an exact,
non-authorizing measurement packet before the quota worksheet is assembled.

The handoff re-runs the binding-manifest evaluator internally against the
actual manifest input. It does not trust a precomputed ready-state flag.

For the approved cohort it therefore preserves:

- exact selected artist count = 5;
- exact artist/channel mapping from the merged manifest;
- exact reaction-only endpoint scope:
  - `youtube.channels.list`
  - `youtube.playlistItems.list`
  - `youtube.videos.list`
- LISA remains outside the v1 handoff;
- comment endpoints cannot be added silently.

The handoff also requires, before it can become
`measurement-handoff-ready`:

- a validated Google Cloud provider-client identity;
- an explicit measurement window;
- an explicit reaction snapshot cadence;
- non-secret cadence evidence;
- provider batch-limit evidence;
- provider quota-cost evidence.

When ready, it emits one deterministic measurement task per selected artist
channel. Each task requires the downstream measurement owner to produce:

- uploads playlist id;
- actual playlistItems pages traversed for the declared measurement window;
- actual included-video count.

The handoff deliberately leaves:

- `uploadManifestPageCountPerReactionRun = null`;
- `videoCountPerReactionRun = null`;
- quota worksheet assembly disabled.

Those values may become non-null only after an actual evidence-backed
measurement result is returned.

The contract always keeps:

- automatic provider call = false;
- collection execution authorization = false;
- scheduler mutation = false;
- deployment authorization = false;
- arbitrary cadence = false;
- arbitrary measurement window = false.

Therefore creating a measurement handoff is not approval to call YouTube.


## 6d. Real-vs-fixture quota evidence boundary

The merged five-member Audit cohort resolves only the artist/channel cardinality
input for quota planning:

- `artistChannelCount = 5`.

It does **not** resolve the following worksheet inputs:

- `uploadManifestPageCountPerReactionRun`;
- `videoCountPerReactionRun`;
- `reactionSnapshotRunsPerDay`;
- provider client / Google Cloud project identity;
- requested measurement window.

The quota-measurement handoff contract requires all of those planning inputs to
be explicit and evidence-bound before it can become
`measurement-handoff-ready`. Even then, the handoff sets:

- `automaticProviderCallAllowed = false`;
- `collectionExecutionAuthorized = false`;
- `quotaWorksheetAssemblyAllowed = false`.

The actual page/video counts must come back from an authorized measurement
execution or equivalent owner-supplied evidence. Test fixtures are never valid
production evidence.


## 6e. Official quota-cost evidence resolved; batch-ID limits still unresolved

Official YouTube documentation rechecked on 2026-10-02 records:

- `youtube.channels.list` -> 1 quota unit per call;
- `youtube.playlistItems.list` -> 1 quota unit per call;
- `youtube.videos.list` -> 1 quota unit per call;
- each additional paginated request incurs the method quota cost;
- `playlistItems.list.maxResults` accepts up to 50 items per page.

Evidence refs:

- quota calculator:
  https://developers.google.com/youtube/v3/determine_quota_cost
- channels.list:
  https://developers.google.com/youtube/v3/docs/channels/list
- playlistItems.list:
  https://developers.google.com/youtube/v3/docs/playlistItems/list
- videos.list:
  https://developers.google.com/youtube/v3/docs/videos/list

These facts resolve the v1 reaction-endpoint quota-cost evidence and the
playlist page-size evidence.

The documented `maxResults` values are result-set/page-size controls, not
direct evidence of the maximum number of comma-separated IDs accepted by an
`id` filter. In particular, `videos.list` explicitly states that
`maxResults` is not supported with the `id` filter.

Therefore FANDEX does not promote either method's `maxResults` value into an
ID-filter batching claim:

- `maxChannelIdsPerCall` remains null;
- `maxVideoIdsPerCall` remains null;
- the combined provider batch-limit evidence remains incomplete;
- no test-fixture batch size may be promoted into the real worksheet.

A provider-documented ID-filter limit or actual approved-client measurement is
still required for both channel-ID and video-ID batching inputs.


## 7b. Evidence-source discovery result

Read-only evidence discovery was performed across connected sources before
asking the owner to supply more data.

Google Drive searches included:

- `FANDEX YouTube Google Cloud`;
- `YouTube API project number`;
- `snsFandom YouTube`;
- `YouTube quota`;
- `Google Cloud project`;
- `GCP`.

The recorded connected-Drive searches returned no matching files. Therefore no
Drive document was found that provides a non-secret Google Cloud project
number or an exact project-to-snsFandom-provider-client binding.

GitHub issue/PR history was also searched for a real approved reaction cadence
or measurement window. No owner-approved real cadence/window evidence was
found. The existing `reactionSnapshotRunsPerDay = 4` and dated measurement
window values remain regression fixtures only.

Therefore these values stay unresolved rather than being inferred.


## 8b. Screenshot evidence captured and preserved

Screenshot evidence was captured from stable Production on 2026-10-02.

Two captures are valid submission-supporting evidence: the Privacy Policy and
homepage legal-link placement. The third historical capture used the same
homepage root and is explicitly rejected as Analytics & Reporting feature
evidence because that surface labels itself as synthetic / preview data.

Production SHA at capture:
- `1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1`

GitHub Actions:
- workflow: `Capture snsFandom YouTube audit screenshots v1`
- run: `37025375542`
- result: **SUCCESS**
- artifact id: `11235301864`
- artifact name: `sns-fandom-youtube-audit-screenshots-v1`
- artifact digest:
  `sha256:b764b7ac2d41f13ca4011727f6797eb10aa8ba2bd46a9a9278b4533ae96ebf19`
- GitHub artifact expiry:
  `2026-12-31T15:12:54Z`

Captured files:

1. `privacy-policy.png`
   - purpose: Privacy Policy screenshot
   - SHA256:
     `209294b1320cbfea2c25c587c2e774c8f116beb1288bcd90613ccc385965b513`

2. `homepage-legal-links.png`
   - purpose: homepage screenshot with visible legal footer links
   - SHA256:
     `d7b7059e805a9f1b34ac68be43a2eafecdcfef1a83a5b3565c6ffef95f1523b1`

Historical rejected candidate:
- `analytics-reporting-dashboard.png`
- SHA256:
  `bf02a0d27493cfa05596276a767d3fd4e10e94d1ca4a056a3531aa97c9f6ddc5`
- source URL: stable homepage root
- rejection reason: the captured source explicitly identifies the dashboard
  data as synthetic / preview, so it is not valid evidence of a real
  Analytics & Reporting feature.

Therefore `dashboardFeatureScreenshotRef` remains unresolved until a real,
non-simulated Analytics & Reporting feature surface exists and is captured.

The valid Privacy Policy and homepage legal-link PNGs were visually checked
and render the intended Production surfaces rather than blank/error pages.

A long-term copy of the complete ZIP was also stored in the connected Google
Drive:

- folder: `02_FANDEX`
- Drive file id:
  `1llzxJnLw0CVsOiQuYHzbX_O8OlcCto-j`
- file:
  `sns-fandom-youtube-audit-screenshots-v1-run-37025375542.zip`

The Drive copy prevents the submission packet from depending solely on the
90-day GitHub artifact retention period.
