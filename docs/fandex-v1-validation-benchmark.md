# FANDEX v1 Validation Benchmark Scaffold

Status: scaffold only. This document describes the benchmark model for checking
FANDEX v1 cumulative points against external indicators. It does not connect to
Naver, Google Trends, Circle Chart, YouTube, Spotify, Supabase, or any external
API.

## Why Validation Is Needed

FANDEX is a composite research indicator, not an absolute truth or official
certification score. Because v1 uses unbounded cumulative points, the product
needs a way to explain whether category points are directionally supported by
external signals and event history.

The validation scaffold helps subscriber research answer:

1. Does a category point move in the same direction as outside benchmarks?
2. Did the score react plausibly around major events?
3. Is the score stable under reasonable coefficient changes?
4. Is source coverage strong enough to trust the interpretation?
5. Does a human analyst need to flag an outlier?

## Benchmark Sources

Planned benchmark sources:

1. Circle Chart.
2. YouTube.
3. Spotify.
4. Google Trends.
5. Naver News article count, tone, issue type, and risk seed.
6. Brand campaign / ambassador events.
7. Manual analyst review.

Google Trends must be treated as relative interest, not absolute search volume.
Each source has different update frequency, coverage, and measurement bias.
Naver News is currently represented by manual seed preview data only. It can
help test article-count, tone-distribution, and risk-signal benchmark shape
before the real API connector is enabled.

## Validation Signal Types

The scaffold supports:

1. Correlation.
2. Event backtest.
3. Sensitivity.
4. Confidence.
5. Uncertainty.
6. Manual review.

## Correlation

Correlation checks compare FANDEX category points with external benchmarks. For
example, Music / Album Signal can be compared with chart rank, album movement,
Spotify movement, and YouTube music performance.

The scaffold should not claim proof. It should describe directional alignment.

## Event Backtest

Event backtests inspect score movement around:

1. Comeback.
2. Controversy or risk event.
3. Hiatus.
4. Brand deal.
5. Award or performance milestone.

The goal is to check whether the score moved plausibly before and after a known
event.

## Sensitivity

Sensitivity analysis checks whether ranking and category interpretation remain
stable when coefficients change.

Examples:

1. Music / Album coefficient adjustment.
2. Risk Penalty coefficient adjustment.
3. Growth Momentum coefficient adjustment for rookie or rising artists.

## Confidence And Uncertainty

Subscriber reports can expose:

1. Source count.
2. Source diversity.
3. Recency.
4. Missing data warnings.
5. Manual review required flags.
6. Manual seed article evidence and tone distribution when the user is in a
   subscriber research context.

Low confidence should not be hidden. It should be part of the interpretation.

## Manual Review

AI or automated scoring output should be reviewed by a person during report
production. Outliers should not be silently adjusted. They should be flagged
with analyst notes and reviewed separately.

## Free Vs Subscriber Exposure

Free preview:

1. Total cumulative point.
2. Point band.
3. Issue tone.

Subscriber research:

1. Benchmark alignment.
2. Confidence band.
3. Uncertainty notes.
4. Validation hints.
5. Event backtest context.
6. Analyst review note.

## Current Limits

This scaffold is limited because:

1. Real APIs are not connected.
2. It uses mock/manual seed samples.
3. Google Trends is relative interest, not absolute search volume.
4. External sources have different update frequency and coverage.
5. Benchmark normalization is not implemented.
6. Supabase storage is not implemented.

## Next TODO

1. Connect real benchmark sources.
2. Validate Naver News manual seed article count, tone, and risk shape.
3. Connect Naver News article count after API/env design is approved.
4. Add Circle Chart manual seed.
5. Define YouTube/Spotify snapshot schema.
6. Generate sensitivity analysis reports.
7. Add confidence score visualization.
8. Add validation benchmark table in subscriber reports.
