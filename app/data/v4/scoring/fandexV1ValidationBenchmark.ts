import type { FandexV1CategoryKey } from './fandexV1Scoring';

export type FandexValidationBenchmarkSource =
  | 'circleChart'
  | 'youtube'
  | 'spotify'
  | 'googleTrends'
  | 'naverNews'
  | 'brandCampaign'
  | 'manualReview';

export type FandexValidationMetricKey =
  | 'musicChartRank'
  | 'albumSalesRank'
  | 'videoViewGrowth'
  | 'searchInterestTrend'
  | 'articleVolume'
  | 'articleSentimentProxy'
  | 'brandDealEvent'
  | 'comebackEvent'
  | 'riskEvent'
  | 'hiatusEvent'
  | 'manualAnalystReview';

export type FandexValidationSignalType =
  | 'correlation'
  | 'eventBacktest'
  | 'sensitivity'
  | 'confidence'
  | 'uncertainty'
  | 'manualReview';

export type FandexValidationExpectedDirection =
  | 'positive'
  | 'negative'
  | 'neutral';

export type FandexValidationConfidenceBand = 'High' | 'Medium' | 'Low';

export type FandexValidationAlignment =
  | 'Aligned'
  | 'Partially Aligned'
  | 'Needs Review';

export type FandexValidationWarningLevel = 'none' | 'watch' | 'review';

export type FandexValidationBenchmarkInput = {
  artistId: string;
  artistName: string;
  benchmarkSource: FandexValidationBenchmarkSource;
  metricKey: FandexValidationMetricKey;
  signalType: FandexValidationSignalType;
  observedValue: number;
  expectedDirection: FandexValidationExpectedDirection;
  fandexCategoryKey: FandexV1CategoryKey;
  fandexCategoryPoint: number;
  confidence: number;
  sourceCount: number;
  periodLabel: string;
  noteKo: string;
  noteEn: string;
};

export type FandexValidationBenchmarkResult = {
  artistId: string;
  artistName: string;
  benchmarkSource: FandexValidationBenchmarkSource;
  metricKey: FandexValidationMetricKey;
  signalType: FandexValidationSignalType;
  validationScore: number;
  confidenceBand: FandexValidationConfidenceBand;
  alignment: FandexValidationAlignment;
  warningLevel: FandexValidationWarningLevel;
  summaryKo: string;
  summaryEn: string;
  limitationsKo: string;
  limitationsEn: string;
};

export function toFiniteValidationNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundValidationValue(value: number) {
  return Math.round(toFiniteValidationNumber(value) * 10) / 10;
}

export function getConfidenceBand(
  confidence: number,
): FandexValidationConfidenceBand {
  const value = toFiniteValidationNumber(confidence);

  if (value >= 75) {
    return 'High';
  }

  if (value >= 50) {
    return 'Medium';
  }

  return 'Low';
}

export function getValidationAlignment(
  input: FandexValidationBenchmarkInput,
): FandexValidationAlignment {
  const validationScore = calculateValidationScore(input);

  if (validationScore >= 75) {
    return 'Aligned';
  }

  if (validationScore >= 45) {
    return 'Partially Aligned';
  }

  return 'Needs Review';
}

export function calculateValidationScore(
  input: FandexValidationBenchmarkInput,
) {
  const observedValue = Math.abs(toFiniteValidationNumber(input.observedValue));
  const categoryPoint = Math.abs(
    toFiniteValidationNumber(input.fandexCategoryPoint),
  );
  const sourceCount = Math.max(toFiniteValidationNumber(input.sourceCount), 0);
  const confidence = Math.max(toFiniteValidationNumber(input.confidence), 0);
  const observedScale = Math.min(observedValue / 100, 1.4);
  const categoryScale = Math.min(categoryPoint / 1200, 1.4);
  const distance = Math.abs(observedScale - categoryScale);
  const directionalPenalty =
    input.expectedDirection === 'neutral'
      ? Math.min(categoryScale * 18, 18)
      : input.expectedDirection === 'negative' && categoryPoint > observedValue * 14
        ? 12
        : 0;
  const sourceBonus = Math.min(sourceCount * 1.5, 12);
  const rawScore =
    82 - distance * 34 - directionalPenalty + sourceBonus + confidence * 0.08;

  return roundValidationValue(Math.min(Math.max(rawScore, 0), 100));
}

function getWarningLevel(
  alignment: FandexValidationAlignment,
  confidenceBand: FandexValidationConfidenceBand,
): FandexValidationWarningLevel {
  if (alignment === 'Needs Review' || confidenceBand === 'Low') {
    return 'review';
  }

  if (alignment === 'Partially Aligned' || confidenceBand === 'Medium') {
    return 'watch';
  }

  return 'none';
}

export function calculateFandexV1ValidationBenchmark(
  input: FandexValidationBenchmarkInput,
): FandexValidationBenchmarkResult {
  const validationScore = calculateValidationScore(input);
  const confidenceBand = getConfidenceBand(input.confidence);
  const alignment = getValidationAlignment(input);
  const warningLevel = getWarningLevel(alignment, confidenceBand);

  return {
    artistId: input.artistId,
    artistName: input.artistName,
    benchmarkSource: input.benchmarkSource,
    metricKey: input.metricKey,
    signalType: input.signalType,
    validationScore,
    confidenceBand,
    alignment,
    warningLevel,
    summaryKo: `${input.artistName} ${input.periodLabel} mock benchmark alignment: ${alignment}. ${input.noteKo}`,
    summaryEn: `${input.artistName} ${input.periodLabel} mock benchmark alignment: ${alignment}. ${input.noteEn}`,
    limitationsKo:
      '이 결과는 mock/manual seed 기반 검증 scaffold이며 실제 외부 데이터 연결 전 preview입니다.',
    limitationsEn:
      'This result is a mock/manual seed validation scaffold before live external data connection.',
  };
}

export function createFandexV1ValidationBenchmarkSamples(): FandexValidationBenchmarkInput[] {
  return [
    {
      artistId: 'ive',
      artistName: 'IVE',
      benchmarkSource: 'circleChart',
      metricKey: 'musicChartRank',
      signalType: 'correlation',
      observedValue: 86,
      expectedDirection: 'positive',
      fandexCategoryKey: 'musicAlbum',
      fandexCategoryPoint: 1550,
      confidence: 78,
      sourceCount: 5,
      periodLabel: '2026-W25 preview',
      noteKo: '음원/음반 누적 포인트와 차트 강세가 같은 방향인지 확인하는 샘플입니다.',
      noteEn:
        'Sample check for whether music/album cumulative points move with chart strength.',
    },
    {
      artistId: 'riize',
      artistName: 'RIIZE',
      benchmarkSource: 'youtube',
      metricKey: 'videoViewGrowth',
      signalType: 'eventBacktest',
      observedValue: 74,
      expectedDirection: 'positive',
      fandexCategoryKey: 'snsFandom',
      fandexCategoryPoint: 1452,
      confidence: 74,
      sourceCount: 7,
      periodLabel: '2026-W25 preview',
      noteKo: '영상 반응 증가와 SNS/팬덤 포인트의 방향성을 비교하는 샘플입니다.',
      noteEn:
        'Sample comparison between video growth and SNS/fandom points.',
    },
    {
      artistId: 'newjeans',
      artistName: 'NewJeans',
      benchmarkSource: 'naverNews',
      metricKey: 'articleVolume',
      signalType: 'uncertainty',
      observedValue: 81,
      expectedDirection: 'neutral',
      fandexCategoryKey: 'riskPenalty',
      fandexCategoryPoint: 1764,
      confidence: 62,
      sourceCount: 4,
      periodLabel: '2026-W25 preview',
      noteKo: '기사량이 관심 신호인지 리스크 신호인지 수동 검수가 필요한 샘플입니다.',
      noteEn:
        'Sample case where article volume needs manual review before interpreting attention as risk.',
    },
    {
      artistId: 'aespa',
      artistName: 'aespa',
      benchmarkSource: 'brandCampaign',
      metricKey: 'brandDealEvent',
      signalType: 'manualReview',
      observedValue: 79,
      expectedDirection: 'positive',
      fandexCategoryKey: 'brandFit',
      fandexCategoryPoint: 918,
      confidence: 80,
      sourceCount: 3,
      periodLabel: '2026-W25 preview',
      noteKo: '브랜드 캠페인 이벤트와 브랜드 적합도 포인트를 비교하는 샘플입니다.',
      noteEn:
        'Sample comparison between brand campaign events and brand-fit points.',
    },
  ];
}

export function runFandexV1ValidationBenchmarkShapeCheck() {
  const samples = createFandexV1ValidationBenchmarkSamples();
  const results = samples.map(calculateFandexV1ValidationBenchmark);
  const averageValidationScore =
    results.reduce((sum, result) => sum + result.validationScore, 0) /
    Math.max(results.length, 1);
  const reviewCount = results.filter(
    (result) => result.warningLevel === 'review',
  ).length;

  return {
    sampleCount: samples.length,
    resultCount: results.length,
    averageValidationScore: roundValidationValue(averageValidationScore),
    benchmarkSourceCount: new Set(samples.map((sample) => sample.benchmarkSource))
      .size,
    signalTypeCount: new Set(samples.map((sample) => sample.signalType)).size,
    reviewCount,
    hasBlockingErrors:
      samples.length !== results.length ||
      results.some((result) => !Number.isFinite(result.validationScore)),
  };
}
