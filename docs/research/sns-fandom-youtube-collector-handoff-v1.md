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
