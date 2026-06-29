# FANDEX Data Architecture Roadmap

Last updated: 2026-06-13

## Goal

Prepare FANDEX for real K-pop market intelligence data without connecting
external APIs during step 6.5.

The current app may continue using mock data, but mock rows must be shaped so
they can be replaced by verified source-driven records.

## Source Status

All artist, news, issue, and price records should be able to identify source
quality:

1. `Verified`
2. `Partially verified`
3. `Mock needs verification`

Mock data should never be presented as fully factual commercial data.

## Artist Master Data

Future artist records should support:

1. Korean name
2. English name
3. Ticker
4. Agency
5. Debut date
6. Members
7. Fandom name
8. Generation
9. Activity status
10. Keywords and excluded keywords
11. Official channels
12. Official SNS channels
13. Album release dates
14. Latest comeback date
15. Comeback/activity/hiatus metadata
16. Representative songs
17. Main markets
18. `sourceStatus`

Do not expand to 100+ real artists by guessing. Add records only as
mock-labeled placeholders or verified data.

## News and Issue Data Shape

Artist news and issue rows should support:

1. `title`
2. `summary`
3. `source`
4. `publishedAt`
5. `relatedArtists`
6. `url`
7. `sourceType`
8. `impactScore`
9. `relatedKeywords`
10. `estimatedPriceImpact`

Future source types:

1. Naver News Search API
2. Naver DataLab
3. GDELT
4. Official announcements
5. Agency press releases
6. YouTube Data API
7. Manual editorial input

## Pricing Data Direction

FANDEX price should combine absolute metric scale with lifecycle context.

Primary metric buckets:

1. Music performance
2. Album sales
3. YouTube views
4. SNS reactions
5. Search volume
6. News volume
7. Overseas response
8. Fandom response

Lifecycle fields:

1. Album release cycle
2. Comeback period
3. Activity period
4. Hiatus period
5. Comeback reaction strength
6. Activity effect
7. Hiatus retention

Relative ranking should remain a secondary display and comparison layer, not
the core price definition.

## Commercial Data Sources

Planned integrations:

1. Naver News Search API
2. Naver DataLab
3. YouTube Data API
4. GDELT
5. OpenDART, if company-level public disclosures become relevant
6. OpenAI API for summarization, classification, and draft assistance
7. Supabase database
8. Scheduled collection via Vercel Cron or Supabase Cron

Initial update cycle: 10-15 minutes.

Later optimization target: 1-minute updates if cost, quota, latency, and
stability allow.

## Sources Requiring Partnership or Review

The following sources may require partnership, permission review, licensing, or
later integration work:

1. Melon
2. Hanteo
3. Circle Chart
4. Fan platform memberships
5. Instagram detailed data
6. TikTok detailed data

## Suggested Storage Model

Supabase tables to consider later:

1. `artists`
2. `artist_aliases`
3. `artist_members`
4. `artist_channels`
5. `artist_release_events`
6. `metric_snapshots`
7. `artist_price_points`
8. `market_index_points`
9. `news_items`
10. `issue_signals`
11. `content_briefs`
12. `content_drafts`
13. `collection_logs`

## Collection Pipeline

1. Scheduled collector runs every 10-15 minutes.
2. Source adapters fetch raw API data.
3. Normalizer maps source records to canonical rows.
4. Entity linker maps news/issues to artists, members, agencies, and keywords.
5. Scoring job estimates impact, confidence, and lifecycle context.
6. Price job updates artist FANDEX price and K-pop composite index.
7. Public pages read cached, verified snapshots.
8. Private content workflows use issue context after human review.

## Privacy and Admin Boundary

Content Lab is a private/admin workflow. Public FANDEX should not present it as
a general user feature until permissions, publishing review, and API automation
are designed.
