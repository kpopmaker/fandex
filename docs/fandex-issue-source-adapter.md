# FANDEX Issue Source Adapter Draft

Last updated: 2026-06-22

This document describes the planned source adapter layer for future real news,
official social, YouTube, chart, event, and manual curation inputs.

This is a design draft only. The current runtime still uses deterministic
`mockIssueSignals`. No real API call, `fetch`, Supabase client, database
connection, or external data ingestion is enabled by this document.

## Why The Adapter Exists

External issue data will arrive in different shapes depending on the source:
news articles, agency press releases, official social posts, YouTube videos,
chart events, tour announcements, album events, brand campaigns, community
signals, and manual curation records.

The adapter layer keeps those source-specific formats away from `priceEngine`
and the UI. Its job is to normalize raw source records into a stable FANDEX
issue pipeline before scoring.

## Planned Data Flow

```text
external source payload
  -> IssueRawSourceItem
  -> IssueSignalCandidate
  -> IssueSignal
  -> issueScoreEngine
  -> ScoreBreakdown optional issue fields
  -> compatibleHistory issue metadata
  -> priceEngine capped issueMultiplier
  -> UI summaries
```

`priceEngine` must never call external source adapters directly. It should
continue reading only optional issue fields that already exist on
`ScoreBreakdown`.

## Source Types

The initial adapter interface allows these raw source types:

1. `news_article`
2. `press_release`
3. `official_social`
4. `youtube_video`
5. `chart_event`
6. `tour_event`
7. `album_event`
8. `brand_event`
9. `community_signal`
10. `manual_curation`

Each source type maps to an internal `IssueSourceType` and a conservative
default reliability profile.

## Normalization Stages

### 1. Raw Source Item

`IssueRawSourceItem` represents source payloads after ingestion but before FANDEX
scoring. It can hold source id, source name, URL, title, summary, snippet,
published/fetched timestamps, language, country, artist names, mapped artist
ids, keywords, author, raw sentiment, raw engagement, reliability hints, and
opaque metadata.

### 2. Issue Signal Candidate

`IssueSignalCandidate` is a FANDEX-shaped draft. It has an artist id, issue
category, title, internal source type, normalized sentiment, impact, volatility,
confidence, reliability weight, lifecycle stage, expiry, decay speed, duplicate
group id, and warnings.

Candidates are the correct place to hold normalization warnings such as missing
artist mapping, missing title, invalid date, low reliability, manual review
required, or unknown category.

### 3. Issue Signal

`IssueSignal` is the scoring input currently consumed by `issueScoreEngine`.
Adapters should only produce this shape after source normalization, duplicate
handling, reliability checks, and any required manual review.

## Reliability Handling

Default source reliability should remain conservative:

1. Press releases and official social sources can carry high confidence.
2. Major media and entertainment media are useful but should still be capped.
3. Chart platforms are reliable for chart events but not broad narrative impact.
4. Social and community signals should increase attention/volatility more than
   direct price impact.
5. Community and unknown sources should require review before strong negative
   scoring.

`IssueSourceReliabilityProfile` keeps these defaults explicit and overrideable
without changing `issueScoreEngine` or `priceEngine`.

## Clustering Boundary

Duplicate article and repeated issue handling should happen before or during the
candidate stage, not inside `priceEngine`.

Recommended grouping keys:

1. `artistId`
2. `category`
3. normalized title or canonical issue phrase
4. source time window
5. related keywords

The clustered issue should carry source count and source diversity separately
from direct sentiment or price impact, so repeated articles do not create
excessive scoring.

## Scoring Responsibility

The adapter should not directly calculate final artist price.

Recommended responsibility split:

1. Adapter: normalize source shape, source type, timestamps, artist mapping,
   reliability hints, and candidate warnings.
2. Clustering layer: merge duplicates and repeated coverage.
3. Issue scoring layer: calculate sentiment, impact, confidence, volatility,
   lifecycle decay, rumor dampening, and issue score breakdown.
4. Price engine: read already attached optional `ScoreBreakdown` issue fields
   and apply the capped issue multiplier.

## Safety Before Real API Integration

Before any real source is connected:

1. No API key should be committed or printed.
2. No `.env` file should be modified by adapter work.
3. No `fetch` should run from scoring modules.
4. No Supabase client should be imported into scoring modules.
5. `priceEngine` must not import source adapters.
6. Adapter output must be testable with local fixtures before ingestion jobs are
   enabled.

## Current Runtime

The current runtime still uses `mockIssueSignals` as the substitute for source
adapter output. This means the source adapter draft is additive design work and
does not change production scoring, price calculations, or UI rendering.

## Local Registry And Mock Harness

As of 2026-06-23, the source adapter layer includes a local registry and a mock
adapter harness for validation before any real source is connected.

Current files:

1. `app/data/v4/scoring/issueSourceAdapter.ts`
   - Defines the adapter contract, raw source item shape, candidate shape,
     warning severity, adapter capabilities, and smoke check result type.
   - Provides pure helpers for reliability normalization, candidate creation,
     and candidate-to-`IssueSignal` draft mapping.
2. `app/data/v4/scoring/issueSourceFixtures.ts`
   - Provides local fixture raw items for `news_article`, `press_release`,
     `official_social`, `youtube_video`, `chart_event`, `tour_event`,
     `brand_event`, and `manual_curation`.
   - Uses only mock/example URLs.
   - Does not call real APIs.
3. `app/data/v4/scoring/mockIssueSourceAdapter.ts`
   - Implements `IssueSourceAdapter` for local fixture validation.
   - Converts fixture raw items to `IssueSignalCandidate` records and then to
     `IssueSignal` drafts.
   - Exposes `runMockIssueSourceAdapterSmokeCheck()` for framework-free smoke
     checks.
4. `app/data/v4/scoring/issueSourceRegistry.ts`
   - Registers the mock adapter only.
   - Exposes pure registry helpers for adapter lookup, capability listing, and
     registered smoke checks.
   - Keeps future real adapters as planned names only, with no runtime import.

The current validation flow is:

```text
issueSourceFixtures
  -> mockIssueSourceAdapter.normalize()
  -> IssueSignalCandidate[]
  -> mockIssueSourceAdapter.mapToIssueSignals()
  -> IssueSignal draft[]
  -> smoke check summary
```

The smoke check is intended to confirm fixture coverage, candidate creation,
signal draft creation, warning count, source type coverage, and whether any
blocking normalization errors exist. It is not a scoring test and does not
connect adapter output to `priceEngine`, `scoreEngine`, compatible history, or
UI runtime.

Currently registered adapter:

1. `mock_issue_source_adapter`

Not implemented yet:

1. Real Naver news ingestion.
2. Real GDELT adapter.
3. Real YouTube official channel adapter.
4. Real official social adapter.
5. Real Supabase ingestion adapter.

## Naver News Adapter Skeleton

As of 2026-06-23, `app/data/v4/scoring/naverNewsIssueSourceAdapter.ts`
exists as a planned adapter skeleton for future Naver News Search integration.

Current status:

1. The adapter is skeleton/planned only.
2. It does not call the Naver News API.
3. It does not use `fetch`, axios, request clients, credentials, or `.env`.
4. It is not active in the runtime registry.
5. The active registered adapter remains `mock_issue_source_adapter` only.
6. It prepares draft request/response types and pure normalization helpers.

Prepared normalization layer:

1. Naver News response item drafts can be mapped into `IssueRawSourceItem`
   records with `sourceType: news_article`.
2. Title and description cleanup handles HTML tags and common HTML entities
   before the item enters the FANDEX source pipeline.
3. `pubDate` parsing is guarded; invalid dates return a warning and use a
   caller-provided fallback timestamp.
4. `sourceUrl` uses `originallink` first, then `link`, then an
   `example.com` fallback URL for shape checks.
5. Language and country default to `ko` and `KR`.
6. Reliability uses the current `news_article` default reliability profile.

The skeleton can create a local `IssueSourceAdapter` draft, but registry code
must keep it planned-only until a separate integration task explicitly enables
real ingestion.

Before real Naver News integration:

1. Confirm current API call limits and quota behavior.
2. Define query strategy per artist, alias, agency, and disambiguation keyword.
3. Confirm artist name disambiguation and false-positive handling.
4. Add duplicate article clustering before scoring.
5. Revisit source reliability weighting for Naver-originated articles.
6. Design Supabase ingestion jobs and retention before storing raw items.

## Future TODO

1. Enable `NaverNewsIssueSourceAdapter` only after API, credential, query, and
   ingestion boundaries are approved.
2. `GdeltIssueSourceAdapter`.
3. `YouTubeOfficialChannelIssueSourceAdapter`.
4. `OfficialSocialIssueSourceAdapter`.
5. `SupabaseIngestionAdapter`.
6. Chart event adapter.
7. Manual curation adapter.
8. Admin review workflow.
9. Duplicate clustering tests.
10. Reliability and rumor dampening tests.
