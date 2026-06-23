# FANDEX 뉴스/이슈 Factor 설계

Last updated: 2026-06-21

이 문서는 FANDEX가 K-pop 뉴스와 이슈를 정량 score로 변환하기 위한
내부 설계 문서입니다. 현재 작업에서는 실제 뉴스 API, Supabase, 외부 DB,
실시간 수집기를 연결하지 않습니다. 이 문서는 향후 news collector,
issue scoring engine, price impact model을 만들 때 기준으로 사용합니다.

FANDEX에서 말하는 price는 실제 증권 가격이 아니라 mock/fandom market price
개념의 내부 simulated index입니다. 뉴스/이슈 factor는 이 simulated price와
volatility, confidence를 보수적으로 조정하는 보조 신호로 다룹니다.

## 1. 뉴스/이슈 Factor의 역할

음원, 유튜브, SNS, 팬덤, 검색량, lifecycle factor는 비교적 연속적인 활동
신호입니다. 반면 뉴스/이슈 factor는 단기 충격, 신뢰도 조정, 변동성 확대를
설명하는 이벤트 신호입니다.

뉴스/이슈 factor의 역할:

1. 단기 관심도 급증을 scoreBreakdown에 반영합니다.
2. 긍정 이슈는 price momentum과 attention factor를 보조합니다.
3. 부정 이슈는 confidence 하락과 volatility 상승에 더 크게 반영합니다.
4. 루머나 중복 기사로 인한 과도한 price crash를 방지합니다.
5. official confirmation 전후로 impact를 다르게 적용합니다.

기본 원칙:

1. 단일 이슈가 전체 price를 지배하면 안 됩니다.
2. 긍정 이슈는 점진적으로 price momentum에 반영합니다.
3. 부정 이슈는 price보다 confidence와 volatility에 우선 반영합니다.
4. 같은 이슈가 여러 기사로 반복될 경우 duplicate penalty를 적용합니다.
5. issue impact는 시간에 따라 decay합니다.

## 2. 이슈 카테고리 설계

아래 표는 초기 issue category 제안입니다. 수치는 구현 전 기준값이며,
실제 적용 시에는 cap과 reliability weight를 거쳐야 합니다.

| category | 설명 | 기본 sentiment | price impact | volatility impact | confidence impact | decay speed |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `comeback_announcement` | 컴백 일정, 티저, 선공개 예고 | +55 | 중간 상승 | 중간 | 소폭 상승 | medium |
| `album_release` | 앨범 발매, 음원 공개 | +65 | 상승 | 중간 | 소폭 상승 | medium |
| `chart_record` | 국내/글로벌 차트 기록 | +60 | 상승 | 낮음 | 상승 | slow |
| `music_show_win` | 음악방송 1위 | +45 | 소폭 상승 | 낮음 | 소폭 상승 | fast |
| `tour_announcement` | 투어, 콘서트 발표 | +50 | 중간 상승 | 중간 | 상승 | medium |
| `sold_out_event` | 매진, 추가 회차, 팬미팅 성과 | +55 | 상승 | 낮음 | 상승 | medium |
| `brand_deal` | 광고, 앰버서더, 협업 계약 | +45 | 소폭 상승 | 낮음 | 상승 | slow |
| `award_win` | 시상식 수상 | +50 | 상승 | 낮음 | 상승 | slow |
| `viral_moment` | 숏폼/커뮤니티 viral 확산 | +45 | 중간 상승 | 높음 | 중립 | fast |
| `fandom_growth` | 팬덤 규모, 멤버십, 커뮤니티 성장 | +50 | 상승 | 낮음 | 상승 | slow |
| `member_issue` | 멤버 개인 이슈, 활동 공지 | -10 | 낮음 | 중간 | 상황별 | medium |
| `contract_issue` | 재계약, 전속계약, 소속 변경 | -35 | 하락 가능 | 높음 | 하락 | medium |
| `legal_issue` | 법적 분쟁, 고소, 조사 | -70 | 하락 | 매우 높음 | 큰 하락 | slow |
| `health_issue` | 건강 문제, 활동 중단 | -45 | 하락 | 중간 | 하락 | medium |
| `controversy` | 논란, 사과문, 여론 악화 | -65 | 하락 | 매우 높음 | 큰 하락 | medium |
| `hiatus_announcement` | 휴식기, 활동 중단 발표 | -55 | 하락 | 중간 | 하락 | slow |
| `enlistment` | 입대, 군백기 | -30 | 소폭 하락 | 중간 | 중립/소폭 하락 | slow |
| `disbandment_rumor` | 해체설, 활동 종료 루머 | -75 | 하락 가능 | 매우 높음 | 큰 하락 | fast |
| `agency_issue` | 소속사 경영/운영/분쟁 이슈 | -40 | 하락 가능 | 높음 | 하락 | medium |

주의:

1. 루머성 negative category는 official confirmation 전까지 price impact를 강하게 제한합니다.
2. `viral_moment`는 긍정이어도 volatility를 높게 봅니다.
3. `contract_issue`, `legal_issue`, `controversy`는 confidence 영향이 price 영향보다 중요합니다.

## 3. Sentiment Score 구조

FANDEX issue sentiment는 `-100 ~ +100` 범위로 정의합니다.

1. `+80 ~ +100`: 매우 강한 긍정
   - 대형 수상, 글로벌 chart record, 초대형 brand deal 등
2. `+40 ~ +79`: 긍정
   - 컴백 발표, 앨범 발매, 투어 발표, 팬덤 성장 등
3. `-39 ~ +39`: 중립 또는 약한 영향
   - 단순 보도, 반복 기사, 영향 불명확한 언급
4. `-40 ~ -79`: 부정
   - 논란, 건강 이슈, 계약 불확실성, 공백기 발표 등
5. `-80 ~ -100`: 강한 부정
   - 공식 법적 문제, 해체 공식화, 심각한 controversy 등

기본 처리:

1. sentiment는 항상 clamp합니다.
2. unknown source의 sentiment는 절대값을 낮춥니다.
3. duplicate issue의 sentiment는 누적하지 않고 대표 이슈로 묶습니다.
4. official confirmation 전 negative issue는 dampening합니다.

## 4. Price Impact 구조

이슈가 price에 직접 반영되는 구조는 보수적으로 제한해야 합니다.
권장 필드:

1. `shortTermImpact`
   - 당일 또는 짧은 window에서 price momentum에 반영할 값입니다.
2. `volatilityBoost`
   - chart 흔들림, 변동성, watchlist 신호에 반영합니다.
3. `confidenceAdjustment`
   - source reliability와 issue severity에 따라 confidence를 조정합니다.
4. `decayRate`
   - 시간이 지날수록 impact가 약해지는 속도입니다.
5. `sourceReliabilityWeight`
   - source type별 신뢰도 가중치입니다.
6. `duplicatePenalty`
   - 같은 이슈 반복 기사로 인한 과다 반영을 막습니다.

권장 cap:

1. 단일 positive issue의 direct price impact는 작게 제한합니다.
2. 단일 negative issue의 price crash는 official confirmation 전까지 강하게 제한합니다.
3. negative issue는 price보다 volatility/confidence에 우선 반영합니다.
4. 여러 이슈가 동시에 발생해도 하루 단위 total issue impact cap을 둡니다.

## 5. Source Reliability 구조

source reliability는 이슈가 score와 confidence에 반영되는 강도를 결정합니다.

| sourceType | 설명 | reliability weight |
| --- | --- | ---: |
| `official_agency` | 소속사 공식 공지 | 1.00 |
| `artist_official` | 아티스트 공식 채널 | 0.95 |
| `major_media` | 주요 언론사 | 0.85 |
| `entertainment_media` | 연예 전문 매체 | 0.72 |
| `chart_platform` | Circle, Billboard 등 chart/platform | 0.88 |
| `social_trend` | X, TikTok, YouTube trend | 0.55 |
| `community_rumor` | 커뮤니티/루머성 출처 | 0.28 |
| `unknown_source` | 불명확한 출처 | 0.18 |

적용 원칙:

1. official source는 confidence를 높일 수 있습니다.
2. community rumor는 volatility만 제한적으로 올리고 price impact는 낮춥니다.
3. chart platform은 긍정 이슈의 confidence를 안정적으로 높입니다.
4. unknown source는 sentiment 절대값과 impact를 모두 낮춥니다.

## 6. Duplicate / Rumor 방어 원칙

같은 이슈가 여러 기사로 반복될 경우 issue count를 그대로 impact로 누적하면 안 됩니다.

중복 방어:

1. `artistId + category + normalizedTitle + timeWindow` 기준으로 issue group을 만듭니다.
2. 같은 issue group 안에서는 대표 source와 대표 sentiment만 사용합니다.
3. 기사 수는 impact가 아니라 confidence 보조값으로만 제한적으로 사용합니다.
4. 같은 category가 짧은 시간에 반복되면 cap 또는 decay를 적용합니다.

루머 방어:

1. official confirmation 전 negative issue는 direct price impact를 낮춥니다.
2. `community_rumor`, `unknown_source`는 confidence를 낮추고 volatility만 소폭 올립니다.
3. 공식 확인 전 `disbandment_rumor`, `legal_issue`, `contract_issue`는 crash 방지 cap을 적용합니다.
4. official confirmation 이후 source reliability와 severity에 따라 impact를 재계산합니다.
5. 정정 보도나 해결 공지가 나오면 negative impact를 빠르게 decay합니다.

## 7. Issue Lifecycle

이슈는 시간에 따라 단계가 바뀌며 impact와 volatility도 달라집니다.

1. `breaking`
   - 최초 감지 단계입니다.
   - volatility는 높지만 confidence는 낮을 수 있습니다.
   - price impact는 제한적으로만 반영합니다.

2. `confirmed`
   - official 또는 high reliability source로 확인된 단계입니다.
   - confidence가 올라가며 impact 계산 신뢰도가 높아집니다.

3. `amplified`
   - 여러 신뢰 가능한 source와 SNS에서 확산되는 단계입니다.
   - shortTermImpact와 volatilityBoost가 가장 클 수 있습니다.

4. `cooling`
   - 추가 보도와 반응이 줄어드는 단계입니다.
   - price impact는 빠르게 약해지고 volatility도 낮아집니다.

5. `resolved`
   - 사과, 해명, 공식 정정, 활동 재개 등으로 이슈가 정리된 단계입니다.
   - negative issue는 confidence 회복을 일부 반영할 수 있습니다.

6. `archived`
   - 장기 기록용 상태입니다.
   - price에는 거의 반영하지 않고 history/context로만 남깁니다.

## 8. ScoreBreakdown 연동 설계

현재 구현에는 아래 score key가 없습니다. 향후 확장 후보입니다.

1. `issueScore`
   - issue category, source reliability, lifecycle stage를 합친 종합 issue 점수
2. `newsSentimentScore`
   - 뉴스 sentiment를 `-100 ~ +100`에서 score scale로 변환한 값
3. `issueMomentumScore`
   - 이슈 확산 속도와 시간 window 내 기사/검색/SNS 반응
4. `controversyRiskScore`
   - 부정 이슈의 severity와 unresolved risk
5. `confidenceScore`
   - source reliability와 확인 여부 기반 신뢰도
6. `volatilityScore`
   - 급등락 가능성 또는 불확실성

설계 원칙:

1. scoreBreakdown 확장은 기존 key를 깨지 않는 additive 방식으로 진행합니다.
2. UI adapter는 새 key가 없어도 fallback으로 동작해야 합니다.
3. negative score는 price보다 confidence/volatility 쪽에 더 강하게 연결합니다.

## 9. PriceEngine 연동 설계

향후 priceEngine에서 issue factor를 반영할 때 원칙:

1. 단일 이슈가 price를 과도하게 움직이지 않도록 cap을 적용합니다.
2. negative issue는 confidence 하락과 volatility 상승에 더 크게 반영합니다.
3. positive issue는 price momentum과 attention factor에 반영합니다.
4. issue impact는 lifecycle stage와 시간에 따라 decay합니다.
5. lifecycle factor와 중복 반영되지 않도록 category별 조정을 둡니다.
6. comeback announcement와 album release는 lifecycle/releaseCycle과 겹치므로 중복 boost를 제한합니다.
7. legal/contract/controversy는 official confirmation 전까지 price impact dampening을 적용합니다.

예시 구조:

1. `priceImpact = capped(shortTermImpact * reliabilityWeight * decay)`
2. `volatility = baseVolatility + volatilityBoost`
3. `confidence = baseConfidence + confidenceAdjustment`

위 구조는 설계 예시이며 현재 코드에는 추가하지 않습니다.

## 10. Mock Data 설계

향후 `mockSignals` 또는 별도 `mockIssueSignals`에 들어갈 수 있는 필드:

1. `issueId`
2. `artistId`
3. `category`
4. `title`
5. `sourceType`
6. `sentimentScore`
7. `reliabilityWeight`
8. `publishedAt`
9. `detectedAt`
10. `lifecycleStage`
11. `impactScore`
12. `volatilityImpact`
13. `confidenceImpact`
14. `expiresAt`
15. `duplicateGroupId`
16. `officiallyConfirmed`
17. `relatedKeywords`
18. `sourceStatus`

Mock data 원칙:

1. 모든 mock issue는 mock임을 명확히 표시합니다.
2. 실제 기사 제목처럼 오해될 수 있는 문구는 피합니다.
3. negative mock issue는 과도한 price crash를 만들지 않습니다.
4. source reliability와 lifecycle stage가 함께 있어야 합니다.

## 11. UI 연결 TODO

향후 UI 연결 후보:

1. artist detail latest news
   - 최신 뉴스 카드에 issue category, sentiment, confidence 표시
2. ranking issue badge
   - 급등/급락 row에 주요 issue badge 표시
3. market index issue summary
   - K-pop 종합지수 상승/하락에 영향을 준 issue 요약
4. compare issue delta
   - 두 아티스트 간 issue 영향 차이 표시
5. CustomIndexBuilder issue factor toggle
   - issue/news factor를 custom perspective에 포함
6. issue impact tooltip
   - price, volatility, confidence에 어떤 영향을 주는지 설명

이번 문서 작업에서는 UI를 변경하지 않습니다.

## 12. 안전장치 원칙

issue factor는 시장 오해를 만들 수 있으므로 보수적으로 설계합니다.

1. sentiment clamp
   - sentiment는 항상 `-100 ~ +100`으로 제한합니다.
2. impact cap
   - 단일 issue와 하루 total issue impact 모두 cap을 둡니다.
3. reliability floor/ceiling
   - unknown source는 낮게, official source는 높게 제한합니다.
4. duplicate detection
   - 반복 기사로 인한 중복 반영을 막습니다.
5. rumor penalty
   - 루머성 source는 price impact보다 volatility에만 제한적으로 반영합니다.
6. source whitelist/blacklist 가능성
   - production 전 source 정책을 분리합니다.
7. negative issue dampening before official confirmation
   - 공식 확인 전 negative issue의 price crash를 방지합니다.
8. NaN/undefined/null 방어
   - 모든 score, impact, reliability, decay 값은 safeNumber와 clamp를 거칩니다.
9. division by zero 방어
   - duplicate group weight, source count, decay denominator가 0이면 fallback합니다.

## 13. 다음 구현 단계

권장 구현 순서:

1. `IssueSignal` 타입 추가
2. `mockIssueSignals` 추가
3. `issueScoreEngine` 추가
4. `scoreBreakdown`에 `issueScore` 또는 관련 additive key 추가
5. `priceEngine`에 capped issue impact 반영
6. artist detail news panel 연결
7. ranking issue badge 연결
8. 실제 뉴스 API adapter 설계
9. Supabase schema 설계
10. duplicate grouping 및 rumor dampening 테스트 추가

각 단계는 별도 commit 단위로 진행하고, 기존 v4 price/history adapter와 UI fallback을
깨지 않는 방식으로 확장합니다.

## 14. Current Implementation Status

As of 2026-06-22, the news/issue factor is implemented as a mock-based FANDEX
signal. It does not connect to a real news API, Supabase, an external database,
or external data collection.

Completed implementation:

1. `IssueSignal` type added.
2. `mockIssueSignals` added as deterministic local mock input.
3. `issueScoreEngine` implemented.
4. `ScoreBreakdown` optional issue fields connected.
5. `compatibleHistory` preserves `issueScoreBreakdown` and
   `issueSignalsSummary`.
6. `priceEngine` applies a capped issue impact multiplier.
7. `/artists/[artistId]` displays a `News & issue signals` panel.
8. `/ranking` displays issue impact badges.
9. `/compare` displays an `Issue signal comparison` summary.
10. `/` displays a `Market issue climate` summary.

Current safety rules:

1. `priceEngine` does not import or call `issueScoreEngine`.
2. `priceEngine` reads only optional issue fields already attached to
   `ScoreBreakdown`.
3. The issue multiplier is capped to `0.94 ~ 1.06`.
4. Missing issue data falls back to neutral values:
   - `issueScore`: `50`
   - `confidenceScore`: `50`
   - `controversyRiskScore`: `0`
   - active, positive, and negative counts: `0`
5. UI surfaces clamp score display to `0 ~ 100` and guard empty issue arrays.
6. Current UI tone thresholds are:
   - `Risk`: `controversyRiskScore >= 65`
   - `Watch`: `issueScore <= 40`, `controversyRiskScore >= 35`, or
     `negativeIssueCount > positiveIssueCount`
   - `Positive`: `issueScore >= 60 && controversyRiskScore < 50`
   - `Neutral` / `Balanced`: all other states

Remaining TODO:

1. Real news source adapter.
2. Duplicate article clustering.
3. More advanced rumor and reliability weighting.
4. Source reliability scoring and verification status.
5. More advanced time decay by issue category and lifecycle state.
6. Issue detail modal or drill-down view.
7. Admin/manual curation workflow.
8. Supabase schema design.
9. Production source whitelist and blacklist policy.
10. Tests for duplicate grouping, rumor dampening, and issue expiry.

## 15. Source Adapter And Supabase Drafts

The next integration layer is prepared as draft-only design work:

1. `app/data/v4/scoring/issueSourceAdapter.ts`
   - Defines source adapter types and pure normalization helpers.
   - Does not call real APIs.
   - Does not use `fetch`.
   - Does not import Supabase clients.
   - Does not change `mockIssueSignals`, `issueScoreEngine`, `scoreEngine`,
     `compatibleHistory`, `priceEngine`, or UI runtime behavior.
2. `docs/fandex-issue-source-adapter.md`
   - Documents the planned flow from external raw source payloads to
     `IssueRawSourceItem`, `IssueSignalCandidate`, and `IssueSignal`.
   - Explains reliability handling, duplicate clustering boundaries, scoring
     responsibility, and pre-integration safety rules.
3. `docs/fandex-supabase-issue-schema.md`
   - Documents a draft Supabase schema for future issue ingestion.
   - This is not a migration and has not been applied to any database.
   - No Supabase project, client, or CLI command is connected by this draft.

Current runtime remains `mockIssueSignals` based. `priceEngine` and UI surfaces
continue reading only issue metadata that has already been converted into
`ScoreBreakdown` and compatible history fields. Even after real source adapters
are added, `priceEngine` must not call external sources or Supabase directly.

## 16. Adapter Registry And Mock Harness

As of 2026-06-23, a local adapter registry and mock adapter harness have been
added for source adapter validation.

Current adapter layer roles:

1. `app/data/v4/scoring/issueSourceAdapter.ts`
   - Type and contract layer.
   - Defines `IssueRawSourceItem`, `IssueSignalCandidate`,
     `IssueSourceAdapter`, adapter capabilities, warning severity, and smoke
     check result types.
2. `app/data/v4/scoring/issueSourceRegistry.ts`
   - Local adapter registration and lookup layer.
   - Currently registers only `mock_issue_source_adapter`.
   - Lists future adapter names without importing or running real adapters.
3. `app/data/v4/scoring/mockIssueSourceAdapter.ts`
   - Local validation adapter.
   - Converts fixture raw items to candidates and `IssueSignal` drafts.
   - Provides a framework-free smoke check summary.
4. `app/data/v4/scoring/issueSourceFixtures.ts`
   - Fixture input for validating adapter flow without external APIs.
   - Covers news article, press release, official social, YouTube video, chart
     event, tour event, brand event, and manual curation source types.

Runtime connection status:

1. `priceEngine` is still driven by issue fields already attached to
   `ScoreBreakdown`.
2. UI pages still read compatible history issue metadata generated from the
   existing mock issue scoring path.
3. Runtime scoring remains based on `mockIssueSignals` and
   `issueScoreEngine`.
4. Adapter output is not yet connected directly to runtime price calculation,
   ranking, compare, market index, or artist detail UI.
5. No real news API, external API key, Supabase client, Supabase project, or DB
   migration is used by the adapter registry step.
