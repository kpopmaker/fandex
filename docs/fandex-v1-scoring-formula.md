# FANDEX v1 Unbounded Cumulative Point Formula

Status: preview scoring structure. FANDEX v1 is now an unbounded cumulative
point model, not a 0-100 percentage score. It does not connect to live APIs,
Supabase, auth, payment, entitlement checks, or AI generation.

## Why Unbounded Points

K-pop artists can have very different scale, velocity, and commercial power. A
0-100 capped score compresses those gaps and makes a dominant artist look only
slightly stronger than a mid-tier artist. FANDEX v1 therefore uses cumulative
points with no upper bound.

This means:

1. Scores above 100 are normal.
2. Scores in the thousands are normal.
3. A negative final score is possible when risk penalties dominate.
4. The score is a composite indicator, not an absolute truth.

## Formula

```text
FANDEX cumulative score
  = sum(raw category point * category coefficient)
    - (raw risk point * risk coefficient)
```

The final score is not clamped to 100. No maximum score is defined.

## Categories And Coefficients

Positive categories:

1. Music / Album Signal: coefficient `1.25`.
2. News / Issue Signal: coefficient `1.1`.
3. SNS / Fandom Signal: coefficient `1.1`.
4. Brand-fit Signal: coefficient `0.9`.
5. Comeback / Activity Signal: coefficient `0.8`.
6. Growth Momentum: coefficient `1.0`.

Penalty category:

1. Risk Penalty: coefficient `1.4`.

Each category receives a raw point input. The raw point is multiplied by the
coefficient to produce the cumulative contribution. Risk uses the same
raw-point x coefficient structure, but it is subtracted from the positive total.

## Brand-fit Definition

Brand-fit measures how commercially suitable an artist is for brand campaigns,
endorsements, and advertising contexts. It reflects past collaborations, public
image stability, concept alignment, fandom purchasing power, risk exposure, and
domestic/global campaign usability.

Korean product wording:

브랜드 적합도는 아티스트가 브랜드·캠페인·광고 시장에서 상업적으로 활용될 가능성을 평가하는 지표입니다. 광고/협업 이력, 대중 이미지 안정성, 콘셉트 적합성, 팬덤 구매력, 리스크 여부, 국내외 캠페인 활용 가능성을 반영합니다.

## Growth Momentum Definition

Growth momentum measures the recent acceleration or decline of artist power
rather than the total size of current popularity. It reflects search growth, SNS
spread, fandom response, post-comeback retention, news growth, and
period-over-period change.

Korean product wording:

성장 모멘텀은 현재 인기 총량이 아니라 최근 일정 기간 동안 아티스트 파워가 얼마나 빠르게 상승하거나 하락하는지를 평가하는 지표입니다. 검색량 증가, SNS 확산, 팬덤 반응, 컴백 이후 유지력, 기사량 증가, 이전 기간 대비 변화율을 반영합니다.

## Point Bands

Point bands use cumulative point thresholds:

1. `>= 5000`: Dominant Power / 압도적 파워.
2. `>= 3000`: High Power / 강한 파워.
3. `>= 1500`: Rising Power / 상승세.
4. `>= 500`: Watch / 관찰 필요.
5. `>= 0`: Early Signal / 초기 신호.
6. `< 0`: Risk Negative / 리스크 우위.

## Issue Tone

Issue tone uses risk, growth momentum, and news/issue cumulative points:

1. Risk Penalty >= 45% of positive total: Risk Dominant / 리스크 우위.
2. Risk Penalty >= 25% of positive total: Risk Watch / 리스크 주시.
3. Growth Momentum cumulative point >= 1000: Momentum Rising / 상승 모멘텀.
4. News / Issue cumulative point >= 1000 and risk is low: Active Buzz / 이슈 활성.
5. Otherwise: Neutral Preview / 중립 미리보기.

## Free Vs Subscriber Exposure

Free preview can show:

1. Final cumulative point.
2. Point band.
3. Issue tone.
4. Minimal artist metadata.

Free preview must not show:

1. Category raw points.
2. Coefficients.
3. Category cumulative contributions.
4. Risk penalty details.
5. Source count.
6. Validation hints.
7. AI interpretation.

Subscriber research is designed to unlock:

1. Category raw point.
2. Category coefficient.
3. Category contribution.
4. Risk penalty detail.
5. Source count and confidence context.
6. Validation hints.
7. AI interpretation.

Objective validation is handled by the separate validation benchmark scaffold.
Subscriber breakdown can include validation hints, confidence bands,
uncertainty notes, and benchmark alignment when those sources are connected.

## Current Limits

This phase is limited because:

1. It uses mock/manual seed preview inputs.
2. Live APIs are not connected.
3. Source-specific normalization is not implemented yet.
4. Supabase score snapshots are not implemented.
5. Score history is not implemented.
6. AI interpretation backend is not implemented.
7. Subscriber entitlement checks are not implemented.

## Next TODO

1. Connect Naver News actual issue signal.
2. Define raw data schema.
3. Build validation benchmark table.
4. Run sensitivity analysis.
5. Add confidence/uncertainty display.
6. Add Supabase score snapshot.
7. Add score history.
8. Implement subscriber category breakdown unlock.
