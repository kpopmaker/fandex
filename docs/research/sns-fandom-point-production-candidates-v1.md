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


## Existing YouTube collector compatibility

A reusable YouTube video-metrics collector exists on the Artist Expansion
validation branch, but the exact inspected version is not Production-compatible
with snsFandomPoint.

Compatibility assessment:
- source:
  `validation/artist-expansion-youtube-shadow-v1@ed8b7c293ebb9d5927cd004367546bed01b5f732`
- verdict: `not-production-compatible`

The blockers are:
- absent statistics are coerced to numeric zero;
- provider YouTube channel id is not emitted in each metric row;
- observation time is not row-bound;
- collection time is not row-bound;
- raw API responses are persisted without snsFandom-specific retention
  qualification;
- row-level evidence reference is absent.

The variable branch now has an executable fail-closed compatibility verifier and
will not accept this collector shape as Production evidence.

Required shared-runtime changes are documented in:
- `docs/research/sns-fandom-youtube-collector-handoff-v1.md`

No shared collector code was changed by this branch.


## Comparability boundary before numeric normalization

Numeric normalization is still **not approved**. Before any formula can be
considered, observations must first pass an explicit comparability contract.

The v1 comparability contract only groups construct evidence when all of the
following are identical:

- provider;
- exact provider API client/project reference;
- exact provider endpoint provenance;
- snsFandom construct dimension;
- metric id;
- unit;
- temporal basis;
- exact provider period, when the source is period-backed; or
- exact observation timestamp, when the source is point-in-time.

A comparison cohort requires observations from at least two distinct canonical
artists. This is only the mathematical minimum for a cross-artist comparison,
not a score threshold or quality threshold.

Content-level observations such as individual-video view/like/comment counters
are **not** automatically treated as artist-level comparable values. They remain
excluded until a separately justified artist-level content aggregation contract
exists. This prevents artists with different numbers/types of official videos
from being compared through an implicit sum, mean, latest-video pick, or other
arbitrary aggregation.

The comparability layer emits:

- raw evidence members;
- comparison cohort identity;
- explicit temporal basis;
- `normalizedValue = null`;
- `normalizationMethod = null`;
- cross-platform combination = false;
- cross-metric combination = false.

Accordingly, `comparable-cohorts-ready` means only that a defensible
like-for-like comparison frame exists. It does **not** mean that a normalized
score, percentile, weight, threshold, or final `snsFandomPoint` may be
produced.


## YouTube artist-level content aggregation boundary

The content-universe problem is separated from the aggregation-function
problem.

### Content-universe selection

For YouTube public-reaction evidence, the v1 selection contract accepts only:

- the bound official artist channel;
- its official uploads playlist;
- all uploads whose publication timestamps fall inside one explicitly declared
  publication-time window;
- complete pagination through a terminal `playlistItems.list` page; and
- a later `videos.list` statistical snapshot whose video-id set exactly
  matches the manifest.

This blocks silent use of:

- manually curated videos;
- latest-N videos;
- top-N by any engagement counter;
- search-result subsets;
- arbitrary unequal content samples.

The contract does not prescribe the publication-window duration. Window choice
remains a methodology question and must be justified before a cross-artist
Product score can use it.

### Aggregation function

A valid content manifest does **not** authorize an artist-level numeric
aggregation.

The current state remains:

- selected content universe: can be contract-validated;
- per-video raw counters: can remain source observations;
- artist-level sum / mean / median / max / latest-video statistic: not approved;
- cross-metric combination: not approved;
- cross-platform combination: not approved;
- normalized artist value: `null`;
- final `snsFandomPoint`: `null`.

This boundary prevents a valid source universe from being mistaken for a valid
scoring formula.


## Content-age temporal alignment before aggregation

Complete content selection does not solve exposure-time bias.

YouTube public view / like / comment counters are cumulative observations.
When two selected videos have different publication timestamps, observing them
at the same wall-clock snapshot time gives them different elapsed content ages.

The v1 age-alignment contract therefore records, for each content metric:

`contentAge = observedAt - publishedAt`

Without an additional exposure model, direct comparison of raw cumulative
content counters is marked ready only when the elapsed content age is exactly
the same across the content samples.

This is not a threshold. It is a like-for-like temporal requirement.

The contract explicitly keeps:

- interpolation = false;
- extrapolation = false;
- aggregation method = null;
- aggregate value = null;
- artist-level aggregation readiness = false;
- normalization readiness = false.

A same-time batch snapshot of videos published on different dates is therefore
valid source evidence but **age-alignment-blocked** for direct artist-level
aggregation.

A future methodology has two possible paths, neither currently approved:

1. collect each content item's cumulative metric at a common elapsed content
   age; or
2. justify a separate exposure-adjustment / growth-curve model.

No arbitrary age bucket, interpolation rule, extrapolation rule, or decay
formula is introduced in v1.


## Reaction aggregation methodology decision gate

After content-universe selection and content-age alignment, FANDEX still does
not choose an artist-level aggregation formula automatically.

Two possible reaction constructs are kept distinct:

- **typical-content-reaction-intensity** — asks about the reaction magnitude of
  a representative content item while keeping release volume separate; and
- **window-total-reaction-volume** — treats the amount of released content and
  the total reaction generated within the window as part of the construct.

These are not interchangeable. A formula cannot silently decide which
construct FANDEX means.

The v1 methodology decision contract therefore requires an explicit internal
decision record with:

- exact construct target;
- exact metric id;
- selected method id;
- the existing complete-window content selection rule;
- exact-age-aligned content requirement;
- explicit release-volume treatment;
- missing-policy = block;
- non-secret methodology evidence reference;
- real-data validation dataset reference;
- at least two distinct canonical artists, which is only the mathematical
  minimum for cross-artist validation;
- confirmation that content-age sensitivity, release-volume sensitivity,
  missingness sensitivity, and revision stability were reviewed.

A `research-only` decision never becomes Product aggregation.

Even a structurally valid `approved` decision still produces:
- executionImplemented = false;
- aggregateValue = null;
- normalizedValue = null.

The numeric execution must be implemented and validated separately after a
real methodology decision exists. This prevents the contract layer from
smuggling in an arbitrary sum, mean, median, maximum, latest-content rule,
weight, or threshold.

Current repository state:
- no approved reaction aggregation decision exists;
- no artist-level reaction aggregate is produced;
- per-video YouTube evidence therefore cannot satisfy Product reaction
  readiness;
- `snsFandomPoint` remains null.


## Real reaction methodology validation dataset contract

The aggregation methodology decision is now bound to an executable validation
dataset contract rather than a free-form claim that “real data was reviewed.”

The dataset is built from each artist's:

- exact canonical artist / official YouTube channel binding;
- complete official-channel publication-window manifest;
- real `youtube.videos.list` observations;
- exact provider API client/project reference;
- exact content-level evidence references; and
- exact content age derived from `observedAt - publishedAt`.

A dataset is structurally eligible only when:

- it contains at least two distinct canonical artists; this is the mathematical
  minimum for cross-artist validation and is **not** a claim of statistical
  representativeness;
- all source observations are `materialClass = real`;
- the selected metric is fully observed for every manifest content item;
- all selected content samples inside each artist are exactly age-aligned;
- the target elapsed content age is identical across artists;
- all artists use the same approved provider client/project;
- the statistical endpoint provenance is exactly
  `youtube.videos.list`; and
- each artist's manifest video set exactly equals its selected metric
  observation set.

The contract intentionally does **not** equalize the number of content items
per artist. Doing so would silently change the construct by dropping real
official content. Release-volume sensitivity must instead be evaluated
explicitly by the later methodology analysis.

### Revision stability

A structurally valid dataset remains non-eligible for methodology approval
until revision stability is assessed.

The revision audit requires at least two distinct dataset revision references
because one revision cannot establish stability. The audit itself remains
evidence-based and must carry a non-secret evidence reference.

States:
- `unassessed` -> structurally ready at most;
- `changed` -> methodology validation remains ineligible;
- `stable` with sufficient revision evidence -> validation-ready.

No aggregate or normalized value is emitted by the validation-dataset
contract.

### Methodology binding

An aggregation decision must now match the exact validation dataset:

- dataset id;
- construct;
- metric;
- real material class;
- canonical-artist count; and
- revision-stability review state.

A different dataset cannot be substituted after a methodology decision is
recorded without causing the decision gate to fail closed.


## Methodology study evidence gate

The methodology decision no longer accepts sensitivity-review booleans as
sufficient evidence by themselves.

A separate `sns-fandom-reaction-methodology-study-v1` contract now binds the
decision-support evidence to real validation datasets.

A study can become `decision-support-ready` only when:

- the primary dataset is real and `validation-ready`;
- all supporting datasets are also real and validation-ready;
- construct, metric, provider client, and endpoint provenance remain
  consistent across datasets;
- at least two distinct aggregation method ids have result evidence on the
  primary dataset;
- content-age sensitivity uses at least two real validation datasets with
  distinct exact target content ages;
- the declared content-age comparison references only datasets actually
  supplied to the study;
- release-volume sensitivity evidence exists and the supplied real data
  actually contains at least two distinct selected-content counts;
- missingness sensitivity has an explicit non-secret evidence reference; and
- every supplied validation dataset has passed revision-stability review.

The study deliberately produces:
- no selected method;
- no method ranking;
- no score.

It only establishes that enough evidence exists for a separate methodology
decision.

### Decision binding

The final aggregation decision must exactly match:

- methodology study id;
- primary validation dataset id;
- construct;
- metric;
- compared method-id set; and
- all four sensitivity / revision review states.

A methodology decision cannot swap datasets, omit an evaluated method, or
claim a review state that the study did not establish.

Even after all these gates, numeric execution remains a separate unimplemented
step and the Product value remains null.


## Existing YouTube shadow evidence audit

Existing Artist Expansion YouTube artifacts were inspected before declaring
new collection to be required.

### Discovery artifact

Workflow run:
- `36800253141`

Artifact:
- id: `11135500171`
- name: `artist-expansion-youtube-discovery-v2`

Preserved files:
- `youtube_seed_candidates_v1_latest.csv`
- `fandex_youtube_seed_candidates_latest.json`
- `FANDEX_YOUTUBE_SEED_DISCOVERY_REPORT.txt`

Verdict: **not a reaction methodology validation dataset**.

These are seed-discovery / review candidates. They do not contain the required
age-aligned raw view / like / comment observation history.

### Full reviewed cohort shadow artifact

Workflow run:
- `36841902398`

Artifact:
- id: `11150549597`
- name: `artist-expansion-youtube-full-reviewed-cohort-v1`

Preserved file:
- `youtube_v3_full_reviewed_cohort_shadow_v1_latest.json`

The artifact contains derived `youtubePointV3Shadow` values for 21 artists,
not the raw content-level metric observations needed by the new methodology
contract.

The artifact itself explicitly records:

- `scoreMode = historical_youtube_v3_formula_on_heterogeneous_reviewed_seed_evidence`;
- `historicalLineageComplete = false`;
- `commonSeedSelectionPolicyEstablished = false`;
- `comparabilityThresholdDefined = false`;
- `productEligibilityEvaluated = false`;
- `rebaselineAuthorized = false`.

It is therefore not admissible as evidence that the current
`snsFandomPoint` reaction aggregation methodology is valid.

### Historical manifest

The existing
`youtube_historical_approved_seed_manifest_v1.json` explicitly states that
the original raw metrics were never committed and that the manifest does not
claim exact historical metric reproducibility.

Verdict: **not reusable for the real methodology validation dataset**.

### Consequence

No currently preserved repository / GitHub Actions artifact satisfies the
required combination of:

- complete official uploads-window manifest;
- real raw content counters;
- exact observation time;
- exact common elapsed content age;
- same provider client / endpoint provenance;
- multi-artist cohort;
- reproducible revision evidence.

The Product remains fail-closed. Old derived YouTube points and historical seed
IDs must not be backfilled into the new validation dataset.
