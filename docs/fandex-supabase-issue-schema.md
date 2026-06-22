# FANDEX Supabase Issue Schema Draft

Last updated: 2026-06-22

This is a schema design draft for future issue/news ingestion. It is not a
migration file. No Supabase CLI command has been run, and no database connection
is required for this document.

The current FANDEX runtime remains mock-based through `mockIssueSignals`.

## Design Principles

1. Keep raw source items separate from clustered issues.
2. Keep source reliability separate from raw items and issue scoring.
3. Keep artist mapping in a join table.
4. Support duplicate article clustering and repeated issue coverage.
5. Support rumor/reliability weighting and manual curation.
6. Preserve lifecycle, time decay, and event history for later scoring.
7. Allow multiple future adapters without changing `priceEngine`.

## Table Drafts

### issue_sources

Purpose: Registry of source adapters and source providers.

Main columns:

1. `id uuid primary key`
2. `source_key text not null`
3. `source_name text not null`
4. `source_type text not null`
5. `base_reliability numeric not null`
6. `supports_realtime boolean not null default false`
7. `supports_backfill boolean not null default false`
8. `enabled boolean not null default false`
9. `created_at timestamptz not null`
10. `updated_at timestamptz not null`

Relationships:

1. Referenced by `issue_raw_items.source_id`.
2. Referenced by `issue_source_reliability.source_id`.

Index candidates:

1. Unique index on `source_key`.
2. Index on `(source_type, enabled)`.

RLS considerations:

1. Public clients should not write.
2. Admin/service role can manage source registry.
3. Read access can be limited to trusted server routes.

Unique constraints:

1. `source_key`.

Retention:

1. Keep indefinitely unless a source is retired.

Before migration:

1. Confirm source type enum values.
2. Confirm whether source registry should be editable in admin UI.

### issue_raw_items

Purpose: Store normalized raw source records before clustering and scoring.

Main columns:

1. `id uuid primary key`
2. `source_id uuid not null references issue_sources(id)`
3. `external_id text not null`
4. `source_url text`
5. `title text not null`
6. `summary text`
7. `body_snippet text`
8. `published_at timestamptz`
9. `fetched_at timestamptz not null`
10. `language text`
11. `country text`
12. `author text`
13. `raw_sentiment_score numeric`
14. `raw_engagement_score numeric`
15. `reliability_hint numeric`
16. `metadata jsonb not null default '{}'::jsonb`
17. `created_at timestamptz not null`

Relationships:

1. Belongs to `issue_sources`.
2. Can be linked to `issue_clusters` through `issue_cluster_events`.

Index candidates:

1. Unique index on `(source_id, external_id)`.
2. Index on `published_at`.
3. GIN index on `metadata` only if needed.

RLS considerations:

1. Service role writes raw ingestion.
2. Admin can inspect.
3. Public clients should not read full raw payloads by default.

Unique constraints:

1. `(source_id, external_id)`.

Retention:

1. Keep raw items for 90 to 180 days by default.
2. Keep linked high-impact items longer if needed for audit.

Before migration:

1. Confirm privacy and copyright retention policy.
2. Confirm whether full body text is allowed or only snippets.

### issue_clusters

Purpose: Canonical issue grouping used for duplicate detection and scoring.

Main columns:

1. `id uuid primary key`
2. `cluster_key text not null`
3. `canonical_title text not null`
4. `category text not null`
5. `lifecycle_stage text not null`
6. `first_seen_at timestamptz not null`
7. `last_seen_at timestamptz not null`
8. `expires_at timestamptz`
9. `source_count integer not null default 0`
10. `source_diversity_score numeric`
11. `officially_confirmed boolean not null default false`
12. `status text not null default 'active'`
13. `created_at timestamptz not null`
14. `updated_at timestamptz not null`

Relationships:

1. Linked to raw items through `issue_cluster_events`.
2. Linked to artists through `issue_artist_links`.
3. Can produce `issue_signals`.

Index candidates:

1. Unique index on `cluster_key`.
2. Index on `(status, last_seen_at)`.
3. Index on `(category, lifecycle_stage)`.

RLS considerations:

1. Admin/service role writes.
2. Public-facing reads should use curated views, not raw cluster tables.

Unique constraints:

1. `cluster_key`.

Retention:

1. Keep active and resolved clusters.
2. Archive low-impact clusters after 180 days.

Before migration:

1. Define cluster key generation.
2. Define lifecycle transition rules.

### issue_signals

Purpose: Scoring-ready issue signal records compatible with `IssueSignal`.

Main columns:

1. `id uuid primary key`
2. `cluster_id uuid references issue_clusters(id)`
3. `issue_id text not null`
4. `artist_id text not null`
5. `category text not null`
6. `title text not null`
7. `source_type text not null`
8. `sentiment_score numeric not null`
9. `reliability_weight numeric not null`
10. `published_at timestamptz not null`
11. `detected_at timestamptz not null`
12. `lifecycle_stage text not null`
13. `impact_score numeric not null`
14. `volatility_impact numeric not null`
15. `confidence_impact numeric not null`
16. `expires_at timestamptz not null`
17. `decay_speed text`
18. `duplicate_group_id text`
19. `officially_confirmed boolean`
20. `related_keywords text[]`
21. `created_at timestamptz not null`

Relationships:

1. Optionally belongs to `issue_clusters`.
2. Uses artist ids from FANDEX artist universe.

Index candidates:

1. Unique index on `issue_id`.
2. Index on `(artist_id, detected_at desc)`.
3. Index on `(expires_at, lifecycle_stage)`.

RLS considerations:

1. Service role writes.
2. Public reads should go through curated API or materialized summaries.

Unique constraints:

1. `issue_id`.

Retention:

1. Keep scoring signals for audit and backtesting.
2. Archive expired low-impact signals after a retention window.

Before migration:

1. Confirm category/source/lifecycle enum strategy.
2. Confirm score precision and clamp constraints.

### issue_artist_links

Purpose: Map clusters or raw items to one or more FANDEX artists.

Main columns:

1. `id uuid primary key`
2. `cluster_id uuid references issue_clusters(id)`
3. `raw_item_id uuid references issue_raw_items(id)`
4. `artist_id text not null`
5. `artist_name_matched text`
6. `match_confidence numeric not null`
7. `match_method text not null`
8. `created_at timestamptz not null`

Relationships:

1. Links raw items and clusters to artists.

Index candidates:

1. Index on `(artist_id, created_at desc)`.
2. Unique index on `(cluster_id, artist_id)` where `cluster_id is not null`.
3. Unique index on `(raw_item_id, artist_id)` where `raw_item_id is not null`.

RLS considerations:

1. Service/admin writes.
2. Public reads can use derived summaries only.

Retention:

1. Follow raw item or cluster retention.

Before migration:

1. Define artist alias matching rules.
2. Define manual correction flow.

### issue_source_reliability

Purpose: Track source-specific reliability and override history.

Main columns:

1. `id uuid primary key`
2. `source_id uuid not null references issue_sources(id)`
3. `reliability_weight numeric not null`
4. `source_status text not null`
5. `reason text`
6. `effective_from timestamptz not null`
7. `effective_to timestamptz`
8. `created_by text`
9. `created_at timestamptz not null`

Relationships:

1. Belongs to `issue_sources`.

Index candidates:

1. Index on `(source_id, effective_from desc)`.
2. Partial unique index for one active reliability row per source.

RLS considerations:

1. Admin/service role only.

Retention:

1. Keep indefinitely for audit.

Before migration:

1. Define approved source status values.
2. Define who can override reliability.

### issue_cluster_events

Purpose: Store source observations and lifecycle events for a cluster.

Main columns:

1. `id uuid primary key`
2. `cluster_id uuid not null references issue_clusters(id)`
3. `raw_item_id uuid references issue_raw_items(id)`
4. `event_type text not null`
5. `event_at timestamptz not null`
6. `event_weight numeric`
7. `notes text`
8. `metadata jsonb not null default '{}'::jsonb`

Relationships:

1. Belongs to `issue_clusters`.
2. Optionally references `issue_raw_items`.

Index candidates:

1. Index on `(cluster_id, event_at desc)`.
2. Index on `(event_type, event_at desc)`.

RLS considerations:

1. Service/admin writes.
2. Public clients should not write.

Retention:

1. Follow cluster retention.

Before migration:

1. Define event types such as `created`, `source_added`, `confirmed`,
   `amplified`, `cooling`, `resolved`, `manual_override`.

### issue_manual_overrides

Purpose: Allow admin/manual curation without mutating raw source history.

Main columns:

1. `id uuid primary key`
2. `cluster_id uuid references issue_clusters(id)`
3. `signal_id uuid references issue_signals(id)`
4. `override_type text not null`
5. `override_payload jsonb not null`
6. `reason text not null`
7. `created_by text not null`
8. `created_at timestamptz not null`
9. `expires_at timestamptz`

Relationships:

1. May target a cluster or a signal.

Index candidates:

1. Index on `(cluster_id, created_at desc)`.
2. Index on `(signal_id, created_at desc)`.
3. Index on `expires_at`.

RLS considerations:

1. Admin-only writes.
2. Service role can read for scoring.

Retention:

1. Keep indefinitely for audit unless policy requires pruning.

Before migration:

1. Define override types.
2. Define admin authentication and audit requirements.

## Draft SQL Notes

Any SQL in future documents should be treated as draft until a migration task is
explicitly approved. Do not create `supabase/migrations` files from this draft
without a separate implementation request.

## Migration Readiness Checklist

1. Confirm enum strategy for source, category, lifecycle, status, and event
   types.
2. Confirm raw payload retention and copyright policy.
3. Confirm admin role model.
4. Confirm service role ingestion job boundaries.
5. Confirm whether public API reads use tables, views, or materialized summaries.
6. Confirm backfill strategy and rate limits.
7. Confirm rollback policy for bad source ingests.
