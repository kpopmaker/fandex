# snsFandomPoint — YouTube collector compatibility handoff v1

Assessed source:
- branch: `validation/artist-expansion-youtube-shadow-v1`
- file: `scripts/fandex-cloud-migration/source/youtube_collect_video_metrics_v1.py`
- blob/source ref: `ed8b7c293ebb9d5927cd004367546bed01b5f732`

This handoff does not modify the shared collector. Shared provider/runtime ownership
remains outside the snsFandomPoint single-writer area.

## Current compatibility verdict

State: **not-production-compatible for snsFandomPoint evidence**

The collector is useful as research / Artist Expansion infrastructure, but its
current output cannot be promoted into the snsFandomPoint Production contract.

## Blockers

### 1. Missing values are coerced to zero

The current collector uses a numeric conversion helper whose default is zero.

That means an absent provider statistic can become indistinguishable from an
actual observed zero.

This violates:

- Missing != 0
- provider absence must remain explicit missing evidence

Required upstream behavior:
- preserve absent `viewCount`, `likeCount`, and `commentCount` as null /
  missing, not numeric zero.

### 2. Provider channel identity is not emitted in the metric rows

The request already asks YouTube for `snippet,statistics`, so channel identity
is available in the API response, but the current output schema does not emit
the provider channel id.

Required upstream behavior:
- emit exact `providerChannelId` / YouTube channel id;
- keep canonicalArtistId binding separate from provider identity;
- do not infer provider identity from display title.

### 2a. Provider API client/project identity is not emitted

Provider approval is project/client scoped. A YouTube approval granted to one
Google Cloud project must not authorize evidence collected by another client.

Required upstream behavior:
- emit a stable non-secret `providerClientRef` identifying the Google Cloud /
  API client project that performed the request;
- do not emit API keys, OAuth access tokens, refresh tokens, or client secrets;
- the value must match the provider approval / artist entitlement evidence used
  downstream.

### 2b. Exact provider endpoint provenance is not emitted

The approval evidence contract is endpoint-scoped. The collector must preserve
which YouTube API methods produced the batch.

Required upstream behavior:
- emit the exact endpoint set used for the export;
- the public reaction bridge currently requires at least
  `youtube.channels.list`, `youtube.playlistItems.list`, and
  `youtube.videos.list`;
- unapproved or undeclared endpoints must not be silently treated as covered.

### 2c. Complete official-content window is not emitted

The current collector can emit video rows, but it does not prove that those
rows represent the complete official-channel content universe for a declared
publication window. Without that proof, a latest-N, top-N, search subset, or
manual selection could be mistaken for comparable artist evidence.

Required upstream behavior:
- obtain the bound channel uploads-playlist id;
- enumerate it via `youtube.playlistItems.list`;
- preserve each selected video's `publishedAt`;
- declare exact `contentWindowStart` / `contentWindowEnd`;
- record pagination page count and evidence for the terminal page;
- expose an explicit terminal pagination state;
- pass the exact manifest video-id set to the later statistical snapshot;
- do not silently replace the complete window with a ranked or curated subset.

### 3. Observation time is not row-bound

The output has content `publishedAt`, but content publication time is not the
time at which the statistical value was observed.

Required upstream behavior:
- emit `observedAt` for the provider snapshot;
- do not reuse video `publishedAt` as observation time.

### 4. Collection time is not row-bound

The raw JSON wrapper has a generated timestamp, but the metric row itself does
not carry collection time.

Required upstream behavior:
- emit `collectedAt` separately from `observedAt`;
- preserve Observation Time != Collection Time semantics.

### 5. Raw API response retention is not qualified for snsFandomPoint

The collector writes complete raw API response batches to JSON. Those responses
include non-statistical fields such as titles / snippets.

The current YouTube additional policy allows approved statistical / derived data
to be retained longer, but other API data remains under the standard
refresh/deletion requirements.

Required upstream behavior:
- either avoid long-term raw-response persistence for this Production path; or
- implement an independently verified compliant refresh/deletion lifecycle;
- do not treat approval for statistical/derived metrics as blanket approval for
  all raw API response fields.

### 6. No row-level evidence reference

The snsFandom observation contract requires a durable non-secret evidence
reference. The current CSV row has no explicit evidence reference tying it to
the exact collection event.

Required upstream behavior:
- emit a row/batch evidence reference that can be carried into
  `fandex-observation-v1`;
- evidence refs must not contain API keys, OAuth tokens, or other secrets.

## Minimal upstream output contract required

A collector output intended for snsFandom public-reaction normalization needs
at least:

- `canonicalArtistId`
- `providerChannelId`
- `providerClientRef`
- `providerEndpoints` including the exact YouTube methods used
- `contentWindowStart`
- `contentWindowEnd`
- `uploadsPlaylistId`
- terminal pagination provenance
- `videoId`
- `publishedAt`
- `viewCount: number | null`
- `likeCount: number | null`
- `commentCount: number | null`
- `observedAt`
- `collectedAt`
- `evidenceRef`

Subscriber count, if collected, must remain context-only in snsFandomPoint.

## Explicit non-requirements

The upstream collector does not need to:

- calculate snsFandomPoint;
- combine platforms;
- choose weights or thresholds;
- infer fandom strength;
- modify the global Product registry;
- activate or publish the variable.

Those remain outside the shared collector.

## Handoff destination

Changes to this collector belong to:
- FANDEX Artist Expansion for provider/artist identity binding; and/or
- FANDEX Production Operations for shared provider runtime, retention, secrets,
  scheduling, and Production collection behavior.

The snsFandomPoint branch should only consume the corrected output through its
variable-specific adapters after exact provider approval evidence is present.


## Variable-side acceptance bridge

The snsFandomPoint branch now includes
`snsFandomPointYoutubeCollectorBridge.ts`.

The bridge does not call YouTube and does not replace the shared collector. It
only accepts an upstream export after:

1. the declared collector profile passes the compatibility verifier;
2. canonical artist and provider channel ids are explicit;
3. provider API client/project identity is explicit and matches approval
   evidence;
4. exact provider endpoint provenance is explicit;
5. a complete official-channel uploads manifest exists for an explicit
   publication-time window and pagination terminates;
6. the statistical snapshot video ids exactly match that manifest;
7. missing statistics remain nullable;
8. observation and collection times are distinct explicit timestamps;
9. video ids are unique and counts are null or non-negative safe integers;
10. a durable evidence reference exists; and
11. exact provider approval evidence is valid for the downstream YouTube
    metrics and endpoint set.

The current Artist Expansion collector fails at step 1 and therefore cannot
reach normalization. Once Production Operations / Artist Expansion supplies a
corrected collector profile and output contract, the bridge can feed the
existing YouTube reaction adapter without any Preview/Synthetic fallback.


## Content-age collection requirement before aggregation

A corrected complete-window snapshot is still only source evidence. It is not
automatically artist-level aggregation evidence.

YouTube view / like / comment counters are cumulative. If two videos were
published on different dates but observed in the same batch timestamp, the
older video has had more elapsed exposure time. The variable contract therefore
does not treat those raw cumulative values as directly comparable merely
because they came from the same snapshot.

For direct raw content-level comparison without an additional exposure model,
the v1 methodology requires exact equality of:

`observedAt - publishedAt`

across the content samples being compared.

Consequences for shared collection:

- a single batch snapshot can remain valid raw source evidence;
- that batch usually will **not** be aggregation-ready when selected videos
  have different publication dates;
- an aggregation-ready direct-comparison path would need per-content
  observations captured at a common elapsed content age; or
- a separately justified exposure-adjustment model would need its own
  methodology, tests, and approval.

The snsFandom variable contract currently allows neither interpolation nor
extrapolation between snapshots to manufacture an age-aligned value.

This is a downstream Product methodology requirement, not a request for this
branch to modify the global scheduler.


## Methodology validation dataset collection handoff

The next real-data requirement is not “collect more YouTube rows.” It is a
controlled cross-artist methodology dataset.

Shared collection / operations must eventually be able to provide, for each
artist included in the methodology study:

1. a complete official-channel publication-window manifest;
2. the exact `publishedAt` of each selected upload;
3. real view / like / comment observations from `youtube.videos.list`;
4. observations captured at one declared elapsed content age:
   `observedAt - publishedAt`;
5. the same elapsed content age across every artist in one validation dataset;
6. exact provider client/project provenance;
7. non-secret evidence references;
8. Missing preserved as Missing, never zero; and
9. enough durable source evidence to regenerate the dataset for revision
   stability review.

No Product target age is chosen by this handoff. The variable contract accepts
an exact elapsed-age value supplied by the future methodology study; choosing
that value requires separate evidence.

Do not make artists artificially comparable by:
- dropping videos merely to equalize content counts;
- substituting latest-N or top-N videos;
- interpolating a missing target-age value;
- extrapolating future cumulative counters; or
- filling unavailable metrics with zero.

The variable branch does not modify the global scheduler. If future approved
collection requires per-content target-age scheduling, that runtime work
belongs to FANDEX Production Operations after the methodology collection plan
is approved.


## Sensitivity-study collection requirements

One age-aligned validation dataset is not enough to approve an aggregation
methodology.

The methodology-study contract requires additional real evidence for:

### Content-age sensitivity
- at least two validation-ready datasets;
- same construct / metric / provider client / endpoint semantics;
- distinct exact elapsed content ages;
- no interpolation or extrapolation between them.

### Release-volume sensitivity
- real datasets must contain actual variation in selected official-content
  counts;
- collectors must not manufacture this variation by dropping content;
- content-count equalization remains prohibited.

### Missingness sensitivity
- an explicit study artifact / evidence reference is required;
- Missing must remain Missing;
- the variable contract does not authorize replacing missing provider values
  with zero for the sensitivity study.

### Revision stability
- every validation dataset entering the study must already have passed its
  revision-stability audit.

The study itself does not choose a winning aggregation method. It only produces
decision-support evidence. Any future runtime scheduling needed to collect
multiple exact content ages remains a Production Operations responsibility and
must not be introduced by this variable branch.


## Validation-study capture planning handoff

Once provider approval and a corrected shared collector are available, the
variable-side planner can emit deterministic prospective capture tasks for
methodology validation.

The shared runtime should consume, not redefine:

- exact canonical artist id;
- exact YouTube channel id;
- exact manifest video id;
- selected metric id;
- explicit target content age;
- computed captureAt;
- target validation dataset id;
- manifest evidence reference.

The shared runtime must not:

- invent a default target age;
- shift a missed capture to collection time;
- replace a missed exact-age capture with a later current counter;
- trim content counts to make artists equal;
- mutate dataset ids or content selection;
- treat planning-ready as provider authorization.

The planner itself never schedules jobs and always reports
`schedulerMutationAllowed = false` and
`collectionExecutionAuthorized = false`.
