# FANDEX v4 Scoring 구조

Last updated: 2026-06-21

이 문서는 FANDEX v4의 가격, 히스토리, 스코어링, K-pop 종합지수,
CustomIndexBuilder 연결 구조를 설명하는 내부 개발 문서입니다.
현재 구조는 실제 시장 데이터가 아니라 deterministic mock signal 기반입니다.
뉴스 API, Supabase, 외부 차트 API를 붙이기 전의 기준 구조로 사용합니다.

## 1. 전체 흐름 요약

FANDEX v4 scoring 흐름은 아래 순서로 연결됩니다.

1. `artistUniverseV4`
   - v4에서 추적할 아티스트 seed 목록입니다.
   - `id`, `ticker`, `agency`, `debutDate`, `collection.tier`,
     `collection.priorityScore`, `lifecycleStatus` 같은 기본 값을 제공합니다.

2. `mockSignals`
   - `artistUniverseV4`를 기반으로 `RawSignalSnapshot` history를 생성합니다.
   - music, album, YouTube, SNS, search, news, global, fandom, agency scale
     지표와 lifecycle 지표를 deterministic mock 값으로 만듭니다.

3. `scoreEngine`
   - `RawSignalSnapshot`을 받아 `ScoreBreakdown`을 계산합니다.
   - 현재 score key는 `releaseCycleScore`, `newsImpactScore`,
     `searchMomentumScore`, `videoMomentumScore`, `agencyFinancialScore`입니다.

4. `priceEngine`
   - `ScoreBreakdown`과 raw signal을 받아 artist price, change, volume,
     fanSizeValue를 계산합니다.
   - lifecycle multiplier는 가격 변동이 과도해지지 않도록 제한합니다.

5. `compatibleHistory`
   - raw signal, score breakdown, price result를 합쳐
     `ArtistPriceHistoryPointV4`를 생성합니다.
   - 기존 v3 UI가 읽는 legacy 필드도 함께 제공합니다.

6. `artistPriceHistory`
   - v4 artist history의 public entry point입니다.
   - `getArtistPriceHistoryV4()`와 `getArtistChartPointsV4()`를 제공합니다.

7. `artistRanking`
   - v4 price history의 latest point를 사용해 ranking row를 만듭니다.

8. `marketIndex`
   - 모든 v4 artist price history를 aggregate해 K-pop 종합지수 history를 만듭니다.

9. `CustomIndexBuilder`
   - artist detail에서 전달받은 v4 history의 `scoreBreakdown`을 우선 사용합니다.
   - 없는 경우 `v4ScoreBreakdown`, 그다음 legacy `scores`로 fallback합니다.

## 2. v4 Price/History 구조

주요 entry point는 `app/data/v4/artistPriceHistory.ts`입니다.

### `getArtistPriceHistoryV4(artistId)`

아티스트별 v4 price history를 반환합니다. 내부적으로
`getArtistPriceHistoryV4Compatible()`을 호출합니다.

### `getArtistChartPointsV4(artistId)`

차트 컴포넌트에 넘기기 쉬운 `ChartPoint[]` 형태를 반환합니다.

```text
{ time, value }
```

### `ArtistPriceHistoryPointV4`

v4 history point는 legacy UI 호환 필드와 v4 확장 필드를 함께 가집니다.

Legacy 호환 필드:

1. `time`
2. `price`
3. `volume`
4. `fanSizeValue`
5. `scores`

v4 확장 필드:

1. `date`
2. `timestamp`
3. `change`
4. `changeRate`
5. `fandomSize`
6. `scoreBreakdown`
7. `v4ScoreBreakdown`
8. `rawSignal`
9. `absoluteMetrics`
10. `lifecycleAdjustment`

`scores`는 기존 v3 factor UI를 깨지 않기 위한 adapter 값입니다.
새 계산 로직은 가능하면 `scoreBreakdown`을 우선 사용해야 합니다.

## 3. ScoreBreakdown 구조

`ScoreBreakdown`은 v4 scoring의 핵심 factor score 묶음입니다.

현재 score key:

1. `releaseCycleScore`
   - 앨범 발매 주기, 컴백 전후, 활동 신선도, 공백기 risk, 커리어 단계 보정을 반영합니다.
2. `newsImpactScore`
   - news volume, recency, source confidence를 반영합니다.
3. `searchMomentumScore`
   - search volume과 search growth를 반영합니다.
4. `videoMomentumScore`
   - YouTube views, video velocity, SNS assist를 반영합니다.
5. `agencyFinancialScore`
   - agency scale, overseas response, fandom response를 반영합니다.
6. `totalScore`
   - 위 factor score를 `defaultV4ScoreWeights`로 가중 평균한 값입니다.

현재 기본 weight:

1. `releaseCycleScore`: 18
2. `newsImpactScore`: 22
3. `searchMomentumScore`: 20
4. `videoMomentumScore`: 24
5. `agencyFinancialScore`: 16

CustomIndexBuilder는 `scoreBreakdown`을 기존 `FactorScores` shape로 adapter합니다.
`scoreBreakdown`이 없으면 `v4ScoreBreakdown`을 사용하고, 그것도 없으면 legacy
`scores`를 사용합니다.

## 4. Lifecycle/ReleaseCycle Scoring

v4 lifecycle scoring은 K-pop 활동 주기를 단순하고 설명 가능한 phase로 나눕니다.

### Release Cycle Phase

1. `pre_comeback`
   - 발매 전 또는 컴백 직전 구간입니다.
   - 기대감과 teaser momentum이 커질 수 있습니다.
2. `comeback_peak`
   - 발매 직후 peak 구간입니다.
   - 가장 높은 recency/momentum boost가 들어갑니다.
3. `active_promotion`
   - 방송, 콘텐츠, 팬덤 활동이 이어지는 프로모션 구간입니다.
4. `post_promotion`
   - 프로모션이 끝난 뒤 여운이 남는 구간입니다.
5. `normal`
   - 일반 활동 또는 catalog 구간입니다.
6. `hiatus`
   - 장기 공백 또는 군백기 등 활동 약화 구간입니다.
7. `predebut`
   - 데뷔 전 상태입니다.

기존 호환 phase인 `pre_release`, `launch`, `catalog`도 타입에 남아 있습니다.
`scoreEngine`은 이를 각각 `pre_comeback`, `comeback_peak`, `normal`로 normalize합니다.

### Lifecycle Factor

1. `daysSinceLastRelease`
   - 최근 발매일 기준 경과 일수입니다.
   - 없으면 `daysFromLatestRelease`를 fallback으로 사용합니다.
2. `comebackMomentum`
   - 컴백 전후 관심도와 반응 강도입니다.
3. `activityFreshness`
   - 현재 활동의 신선도입니다.
4. `hiatusRisk`
   - 공백이 길수록 커지는 risk 값입니다.
   - score를 낮추지만 0으로 급락하지 않도록 제한합니다.
5. `debutAgeFactor`
   - 데뷔 연차에 따른 가벼운 보정입니다.
6. `careerStage`
   - `rookie`, `growth`, `established`, `mature`, `legacy`로 구분합니다.
7. `releaseCycleScore`
   - phase score, recency score, lifecycle strength, hiatus penalty,
     career adjustment를 합산한 최종 lifecycle score입니다.

## 5. PriceEngine 구조

`priceEngine`은 `scoreBreakdown.totalScore`와 lifecycle multiplier를 사용해
artist price를 계산합니다.

핵심 원칙:

1. total score가 높을수록 price가 올라갑니다.
2. lifecycle multiplier는 comeback/activity/hiatus retention을 반영합니다.
3. lifecycle multiplier는 `0.68 ~ 1.18` 범위로 제한됩니다.
4. 가격은 최종적으로 `20 ~ 600` 범위로 clamp됩니다.
5. previous price가 없으면 artist id 기반 deterministic previous price를 만듭니다.
6. changeRate 계산에서 previous price가 0이면 0으로 처리합니다.

`0.68 ~ 1.18` 제한은 lifecycle factor가 가격을 과도하게 폭등 또는 폭락시키지
않게 하기 위한 안전장치입니다. lifecycle은 중요한 신호지만 FANDEX price 전체를
단독으로 지배하면 안 됩니다.

## 6. K-pop Market Index 구조

K-pop 종합지수는 `app/data/v4/marketIndex.ts`에서 생성합니다.

### `getKpopMarketIndexHistoryV4()`

모든 v4 artist history를 같은 point index 기준으로 모아 시장 index history를 만듭니다.

각 point의 주요 필드:

1. `date`
2. `timestamp`
3. `time`
4. `indexValue`
5. `change`
6. `changeRate`
7. `volume`
8. `totalVolume`
9. `marketCap`
10. `fanCap`
11. `artistCount`

### 가중 평균 방식

기본 방식은 `fanSizeValue` 기반 가중 평균입니다.

```text
weighted price = sum(artist price * artist fanSizeValue weight)
indexValue = weighted price * 10
```

`totalWeight`가 0이면 단순 평균으로 fallback합니다.

### `getKpopMarketChartPointsV4()`

홈 차트가 쓰는 `ChartPoint[]` adapter입니다.

### `getKpopMarketIndexSummaryV4()`

latest point에 `highValue`, `lowValue`를 더한 summary를 반환합니다.

## 7. CustomIndexBuilder 구조

CustomIndexBuilder는 현재 artist detail page에서 사용됩니다.

데이터 우선순위:

1. `scoreBreakdown`
2. `v4ScoreBreakdown`
3. legacy `scores`

adapter 동작:

1. v4 scoreBreakdown을 기존 `FactorScores` shape로 변환합니다.
2. `releaseCycleScore`는 album/fandom 성격에 반영됩니다.
3. `videoMomentumScore`는 YouTube/SNS 성격에 반영됩니다.
4. `searchMomentumScore`는 search/SNS/music 일부에 반영됩니다.
5. `newsImpactScore`는 news에 반영됩니다.
6. `agencyFinancialScore`는 global/company/fandom 일부에 반영됩니다.

custom index 계산:

1. active factor의 weight만 사용합니다.
2. weight 합계가 0이면 score 0을 반환합니다.
3. score는 `0 ~ 100`으로 clamp합니다.
4. `scoreToPrice()`는 기존 price scale을 유지하기 위해
   `100 * exp((score - 50) / 50)`을 사용합니다.
5. finite가 아닌 chart value는 제외합니다.

## 8. 현재 UI 연결 상태

### `/`

홈은 `getKpopMarketIndexSummaryV4()`와 `getKpopMarketChartPointsV4()`를 사용해
K-pop 종합지수와 chart를 표시합니다.

### `/ranking`

ranking은 `getArtistRankingRowsV4()`를 사용합니다. 내부적으로 artist별 v4
history의 latest point를 읽어 price, changeRate, volume, fanCap을 만듭니다.

### `/artists/[artistId]`

artist detail은 `getArtistPriceHistoryV4()`로 가격/거래량/팬덤 규모/factor score를
계산하고, `getArtistChartPointsV4()`로 차트 데이터를 받습니다.
CustomIndexBuilder에도 v4 history를 전달합니다.

### `/compare`

compare는 `getArtistPriceHistoryV4()`로 latest 지표를 만들고,
`getArtistChartPointsV4()`를 compare chart용 history로 adapter합니다.

### `CustomIndexBuilder`

v4 scoreBreakdown 우선, legacy scores fallback 구조로 custom index chart를 만듭니다.

## 9. 안전장치 원칙

v4 scoring과 UI adapter는 다음 방어 원칙을 유지해야 합니다.

1. `safeNumber`
   - finite number만 통과시키고 나머지는 fallback 값으로 처리합니다.
2. `safePositiveNumber`
   - 가격, 거래량, fanCap, indexValue처럼 음수가 표시되면 안 되는 값에 사용합니다.
3. `clamp`
   - score, price, lifecycle multiplier의 범위를 제한합니다.
4. finite check
   - chart point value가 finite가 아니면 제외합니다.
5. division by zero 방어
   - weight 합계, previous price, totalWeight가 0이면 fallback합니다.
6. empty history 방어
   - history가 비어 있으면 빈 배열, 0 summary, row 제외, 또는 notFound 흐름으로 처리합니다.
7. legacy fallback 유지
   - v4 field가 없더라도 기존 `time`, `price`, `volume`, `fanSizeValue`, `scores`는 유지합니다.

## 10. 다음 확장 TODO

현재 구조는 mock 기반입니다. 다음 단계에서는 아래 작업을 순서대로 검토합니다.

1. 실제 뉴스/이슈 factor 설계
2. album release schedule mock 고도화
3. `artistUniverseV4` 100명 확장
4. 실제 chart/API 연동 전 adapter 분리
5. Supabase schema 설계
6. market index sector/group index 확장
7. CustomIndexBuilder preset 저장 기능
8. scoreBreakdown UI 설명 tooltip 추가
9. verified source status와 mock source status의 화면 표시 정책 정리
10. release event/calendar 기반 lifecycle signal 생성기 분리

## 11. Issue Price Impact Guardrail

`priceEngine` applies a limited issue impact multiplier after the base score
scale and lifecycle multiplier are calculated.

Rules:

1. `priceEngine` does not import or call `issueScoreEngine`.
2. Issue impact reads only optional issue fields already present on
   `scoreBreakdown`.
3. Missing issue fields return a neutral `1.0` multiplier.
4. `issueScore`, `newsSentimentScore`, `confidenceScore`,
   `controversyRiskScore`, and `volatilityScore` are clamped to `0 ~ 100`.
5. The final issue multiplier is capped to `0.94 ~ 1.06`.
6. This is still a mock-based limited price impact step before any real news
   API, Supabase, DB, or external data integration.

## 12. Current News/Issue Factor Wiring

As of 2026-06-22, the news/issue factor is wired end-to-end as a mock-based
supporting signal.

Implemented flow:

1. `IssueSignal` and `IssueScoreBreakdown` live in
   `app/data/v4/scoring/types.ts`.
2. `mockIssueSignals` provides deterministic local issue inputs.
3. `issueScoreEngine` converts mock issue signals into issue score breakdowns.
4. `scoreEngine` attaches optional issue fields to `ScoreBreakdown`.
5. `compatibleHistory` preserves `issueScoreBreakdown` and
   `issueSignalsSummary` on `ArtistPriceHistoryPointV4`.
6. `priceEngine` applies a capped issue multiplier as a secondary price input.
7. `/artists/[artistId]`, `/ranking`, `/compare`, and `/` read the preserved
   issue metadata for UI summaries.

Price guardrails:

1. `priceEngine` does not import or call `issueScoreEngine`.
2. `priceEngine` reads only optional issue fields already present on
   `ScoreBreakdown`.
3. The issue multiplier is capped to `0.94 ~ 1.06`.
4. The lifecycle multiplier remains capped to `0.68 ~ 1.18`.
5. The final price clamp remains `20 ~ 600`.
6. The effective price calculation remains:

```text
basePrice * scoreScale * lifecycleMultiplier * issueMultiplier
```

The issue factor is intentionally a weak supporting factor. It should not
replace lifecycle, score, ranking, volume, or fan-size signals, and it must not
create large price jumps by itself.

UI connection status:

1. `/` shows a market-level `Market issue climate` summary.
2. `/ranking` shows a small issue impact badge per row/card.
3. `/artists/[artistId]` shows a `News & issue signals` panel.
4. `/compare` shows an `Issue signal comparison` summary.

Current tone thresholds are aligned across the UI:

1. `Risk`: `controversyRiskScore >= 65`
2. `Watch`: `issueScore <= 40`, `controversyRiskScore >= 35`, or
   `negativeIssueCount > positiveIssueCount`
3. `Positive`: `issueScore >= 60 && controversyRiskScore < 50`
4. `Neutral` or `Balanced`: all other states
