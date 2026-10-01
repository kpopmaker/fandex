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
  `youtube.channels.list` and `youtube.videos.list`;
- unapproved or undeclared endpoints must not be silently treated as covered.

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
- `videoId`
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
5. missing statistics remain nullable;
6. observation and collection times are distinct explicit timestamps;
7. video ids are unique and counts are null or non-negative safe integers;
8. a durable evidence reference exists; and
9. exact provider approval evidence is valid for the downstream YouTube
   metrics and endpoint set.

The current Artist Expansion collector fails at step 1 and therefore cannot
reach normalization. Once Production Operations / Artist Expansion supplies a
corrected collector profile and output contract, the bridge can feed the
existing YouTube reaction adapter without any Preview/Synthetic fallback.
