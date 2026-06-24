# FANDEX v1 Objectivity Validation

Status: validation design note. FANDEX scores are composite indicators, not
absolute truth. The v1 cumulative score should be tested against external
benchmarks, event outcomes, sensitivity checks, uncertainty signals, and manual
review before being presented as a mature scoring system.

`app/data/v4/scoring/fandexV1ValidationBenchmark.ts` now provides a code-level
validation benchmark scaffold. It is still mock/manual seed only and does not
mean FANDEX has completed objective validation. Objectivity should be described
as benchmark alignment, event backtesting, sensitivity analysis, uncertainty,
and manual review, not as a blanket claim.

## Principle

FANDEX v1 is designed to summarize multiple entertainment signals into one
cumulative point. It should be treated as a structured indicator that helps
interpret artist power, not as a definitive ranking of real-world value.

The validation approach references the concepts of composite indicator
robustness/sensitivity from OECD-style methodology and measurement uncertainty
from NIST-style measurement practice. Raw URLs are intentionally omitted here.

## 1. External Benchmark Correlation

Compare FANDEX category points and final cumulative points with outside
benchmarks:

1. Circle Chart.
2. YouTube views, engagement, and retention.
3. Spotify stream movement.
4. Google Trends.
5. Naver News article count.
6. Brand campaign and ambassador events.

Validation goal:

1. Confirm whether high music/album points align with chart and streaming
   strength.
2. Confirm whether news/issue points align with article volume and event timing.
3. Confirm whether brand-fit points align with real campaign activity.

## 2. Event Backtesting

Run before/after checks around known events:

1. Comeback.
2. Controversy or risk event.
3. Hiatus.
4. Brand deal.
5. Award or performance milestone.

Validation goal:

1. FANDEX points should move in the expected direction after major events.
2. Risk penalty should rise around material risk events.
3. Growth momentum should fade when post-event attention declines.

## 3. Sensitivity Analysis

Test coefficient changes and ranking stability:

1. Increase/decrease each coefficient within a documented range.
2. Check whether top rankings change too easily.
3. Identify categories that dominate final score unexpectedly.
4. Flag formulas where small coefficient changes create large rank swings.

Validation goal:

1. Coefficients should be explainable.
2. Rankings should not be fragile.
3. Category contribution should remain interpretable.

## 4. Confidence And Uncertainty

Expose uncertainty signals in subscriber research:

1. Source count.
2. Source diversity.
3. Recency.
4. Missing data warnings.
5. Manual confidence notes.

Validation goal:

1. Low-coverage scores should not look as reliable as high-coverage scores.
2. Users should understand when a score is based on thin evidence.
3. Missing categories should produce warnings instead of silent confidence.

## 5. Manual Review Loop

Human review remains part of the beta process:

1. Analysts review category contributions.
2. Analysts check whether the score explanation matches observable events.
3. Analysts flag cases where the formula misses context.
4. Review notes feed back into coefficient and data-source design.

Validation goal:

1. FANDEX reports should not blindly repeat formula output.
2. AI interpretation should be checked against human reasoning.
3. The model should improve through real report review.

## Next TODO

1. Define benchmark data tables.
2. Define event backtest cases.
3. Add coefficient sensitivity scripts.
4. Add confidence scoring rules.
5. Add manual review fields to future score snapshots.
