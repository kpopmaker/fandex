export type FandexV1CategoryKey =
  | 'musicAlbum'
  | 'newsIssue'
  | 'snsFandom'
  | 'brandFit'
  | 'comebackActivity'
  | 'growthMomentum'
  | 'riskPenalty';

export type FandexV1CategoryVisibility = 'free_preview' | 'subscriber_only';

export type FandexV1SourceMode = 'mock' | 'manual_seed' | 'api_ready';

export type FandexV1PointBand =
  | 'Dominant Power'
  | 'High Power'
  | 'Rising Power'
  | 'Watch'
  | 'Early Signal'
  | 'Risk Negative';

export type FandexV1IssueTone =
  | 'Risk Dominant'
  | 'Risk Watch'
  | 'Momentum Rising'
  | 'Active Buzz'
  | 'Neutral Preview';

export type FandexV1PointInput = {
  rawPoint: number;
  coefficient: number;
  sourceCount?: number;
  confidence?: number;
};

export type FandexV1CategoryScore = {
  key: FandexV1CategoryKey;
  labelKo: string;
  labelEn: string;
  rawPoint: number;
  coefficient: number;
  cumulativePoint: number;
  visibility: FandexV1CategoryVisibility;
  descriptionKo: string;
  descriptionEn: string;
  validationHintKo: string;
  validationHintEn: string;
};

export type FandexV1Input = {
  artistId: string;
  artistName: string;
  musicAlbum: FandexV1PointInput;
  newsIssue: FandexV1PointInput;
  snsFandom: FandexV1PointInput;
  brandFit: FandexV1PointInput;
  comebackActivity: FandexV1PointInput;
  growthMomentum: FandexV1PointInput;
  riskPenalty: FandexV1PointInput;
  confidenceScore: number;
  updatedAt: string;
  sourceMode: FandexV1SourceMode;
};

export type FandexV1Result = {
  artistId: string;
  artistName: string;
  totalPositivePoint: number;
  riskPenaltyPoint: number;
  finalCumulativePoint: number;
  publicDisplayPoint: number;
  pointBand: FandexV1PointBand;
  issueTone: FandexV1IssueTone;
  confidenceScore: number;
  categories: FandexV1CategoryScore[];
  freePreviewCategories: FandexV1CategoryScore[];
  lockedCategories: FandexV1CategoryScore[];
  methodologyVersion: string;
  warnings: string[];
  validationSummary: string;
};

export const FANDEX_V1_METHODOLOGY_VERSION =
  'fandex-v1-cumulative-preview-2026-06';

const defaultCoefficients = {
  musicAlbum: 1.25,
  newsIssue: 1.1,
  snsFandom: 1.1,
  brandFit: 0.9,
  comebackActivity: 0.8,
  growthMomentum: 1,
  riskPenalty: 1.4,
} satisfies Record<FandexV1CategoryKey, number>;

const positiveCategoryDefinitions: Array<{
  key: Exclude<FandexV1CategoryKey, 'riskPenalty'>;
  inputKey: Exclude<FandexV1CategoryKey, 'riskPenalty'>;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  validationHintKo: string;
  validationHintEn: string;
}> = [
  {
    key: 'musicAlbum',
    inputKey: 'musicAlbum',
    labelKo: '음원/음반 신호',
    labelEn: 'Music / Album Signal',
    descriptionKo:
      '음원, 음반, 차트, 발매 성과가 누적 포인트로 얼마나 강하게 쌓이는지 평가합니다.',
    descriptionEn:
      'Measures how strongly music, album, chart, and release outcomes accumulate as points.',
    validationHintKo: 'Circle Chart, Spotify, YouTube Music, 앨범 판매량과 비교 검증합니다.',
    validationHintEn:
      'Validate against Circle Chart, Spotify, YouTube Music, and album sales.',
  },
  {
    key: 'newsIssue',
    inputKey: 'newsIssue',
    labelKo: '뉴스/이슈 신호',
    labelEn: 'News / Issue Signal',
    descriptionKo:
      '기사량, 이슈 확산, 반복 보도, 관심 집중도를 누적 포인트로 반영합니다.',
    descriptionEn:
      'Accumulates article volume, issue spread, repeated coverage, and attention concentration.',
    validationHintKo: 'Naver News 기사량, 키워드 빈도, 이벤트 시점과 비교합니다.',
    validationHintEn:
      'Validate against Naver News article count, keyword frequency, and event timing.',
  },
  {
    key: 'snsFandom',
    inputKey: 'snsFandom',
    labelKo: 'SNS/팬덤 신호',
    labelEn: 'SNS / Fandom Signal',
    descriptionKo:
      'SNS 확산, 팬덤 반응, 커뮤니티 활동, 참여도 신호를 누적합니다.',
    descriptionEn:
      'Accumulates SNS spread, fandom response, community activity, and engagement signals.',
    validationHintKo: 'YouTube, X/Instagram 반응, 커뮤니티 언급량과 비교합니다.',
    validationHintEn:
      'Validate against YouTube, X/Instagram response, and community mentions.',
  },
  {
    key: 'brandFit',
    inputKey: 'brandFit',
    labelKo: '브랜드 적합도',
    labelEn: 'Brand-fit Signal',
    descriptionKo:
      '브랜드 적합도는 아티스트가 브랜드·캠페인·광고 시장에서 상업적으로 활용될 가능성을 평가하는 지표입니다. 광고/협업 이력, 대중 이미지 안정성, 콘셉트 적합성, 팬덤 구매력, 리스크 여부, 국내외 캠페인 활용 가능성을 반영합니다.',
    descriptionEn:
      'Brand-fit measures how commercially suitable an artist is for brand campaigns, endorsements, and advertising contexts. It reflects past collaborations, public image stability, concept alignment, fandom purchasing power, risk exposure, and domestic/global campaign usability.',
    validationHintKo: '브랜드 캠페인, 앰배서더 계약, 광고 반응, 이미지 안정성으로 검증합니다.',
    validationHintEn:
      'Validate with brand campaigns, ambassador deals, ad response, and image stability.',
  },
  {
    key: 'comebackActivity',
    inputKey: 'comebackActivity',
    labelKo: '컴백/활동 신호',
    labelEn: 'Comeback / Activity Signal',
    descriptionKo:
      '컴백, 투어, 방송, 콘텐츠 공개 등 활동 이벤트가 누적 파워에 기여하는 정도를 봅니다.',
    descriptionEn:
      'Measures how comeback, tour, broadcast, and content events contribute to cumulative power.',
    validationHintKo: '컴백 일정, 콘텐츠 공개, 투어/방송 이벤트와 비교합니다.',
    validationHintEn:
      'Validate against comeback calendars, content drops, tour, and broadcast events.',
  },
  {
    key: 'growthMomentum',
    inputKey: 'growthMomentum',
    labelKo: '성장 모멘텀',
    labelEn: 'Growth Momentum',
    descriptionKo:
      '성장 모멘텀은 현재 인기 총량이 아니라 최근 일정 기간 동안 아티스트 파워가 얼마나 빠르게 상승하거나 하락하는지를 평가하는 지표입니다. 검색량 증가, SNS 확산, 팬덤 반응, 컴백 이후 유지력, 기사량 증가, 이전 기간 대비 변화율을 반영합니다.',
    descriptionEn:
      'Growth momentum measures the recent acceleration or decline of artist power rather than the total size of current popularity. It reflects search growth, SNS spread, fandom response, post-comeback retention, news growth, and period-over-period change.',
    validationHintKo: 'Google Trends, 검색량 증가율, 기사량 변화율, 이전 기간 대비 반응으로 검증합니다.',
    validationHintEn:
      'Validate with Google Trends, search growth, news growth, and period-over-period response.',
  },
];

const riskPenaltyDefinition = {
  key: 'riskPenalty' as const,
  labelKo: '리스크 감점',
  labelEn: 'Risk Penalty',
  descriptionKo:
    '논란, 공백, 계약/활동 불확실성, 부정 이슈 집중도가 누적 점수에서 차감되는 구조입니다.',
  descriptionEn:
    'Subtracts accumulated risk from controversy, hiatus, contract/activity uncertainty, and negative issue concentration.',
  validationHintKo: '리스크 이벤트, 활동 공백, 부정 기사 집중도, 수동 검수 메모로 확인합니다.',
  validationHintEn:
    'Validate with risk events, hiatus periods, negative article concentration, and manual review notes.',
};

export function toFiniteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function roundPoint(value: number) {
  return Math.round(toFiniteNumber(value) * 10) / 10;
}

export function calculateCategoryPoint(input: FandexV1PointInput) {
  const rawPoint = toFiniteNumber(input.rawPoint);
  const coefficient = toFiniteNumber(input.coefficient, 1);

  return roundPoint(rawPoint * coefficient);
}

export function calculateRiskPenaltyPoint(input: FandexV1PointInput) {
  return Math.abs(calculateCategoryPoint(input));
}

export function getFandexV1PointBand(
  finalCumulativePoint: number,
): FandexV1PointBand {
  const point = toFiniteNumber(finalCumulativePoint);

  if (point >= 5000) {
    return 'Dominant Power';
  }

  if (point >= 3000) {
    return 'High Power';
  }

  if (point >= 1500) {
    return 'Rising Power';
  }

  if (point >= 500) {
    return 'Watch';
  }

  if (point >= 0) {
    return 'Early Signal';
  }

  return 'Risk Negative';
}

export function getFandexV1IssueTone(
  input: FandexV1Input,
  result: Pick<FandexV1Result, 'totalPositivePoint' | 'riskPenaltyPoint'>,
): FandexV1IssueTone {
  const totalPositivePoint = Math.max(toFiniteNumber(result.totalPositivePoint), 0);
  const riskPenaltyPoint = Math.max(toFiniteNumber(result.riskPenaltyPoint), 0);
  const growthMomentumPoint = calculateCategoryPoint(input.growthMomentum);
  const newsIssuePoint = calculateCategoryPoint(input.newsIssue);

  if (totalPositivePoint > 0 && riskPenaltyPoint >= totalPositivePoint * 0.45) {
    return 'Risk Dominant';
  }

  if (totalPositivePoint > 0 && riskPenaltyPoint >= totalPositivePoint * 0.25) {
    return 'Risk Watch';
  }

  if (growthMomentumPoint >= 1000) {
    return 'Momentum Rising';
  }

  if (newsIssuePoint >= 1000 && riskPenaltyPoint < totalPositivePoint * 0.18) {
    return 'Active Buzz';
  }

  return 'Neutral Preview';
}

export function calculateFandexV1Score(input: FandexV1Input): FandexV1Result {
  const positiveCategories: FandexV1CategoryScore[] =
    positiveCategoryDefinitions.map((definition) => {
      const pointInput = input[definition.inputKey];
      const rawPoint = roundPoint(pointInput.rawPoint);
      const coefficient = roundPoint(pointInput.coefficient);

      return {
        key: definition.key,
        labelKo: definition.labelKo,
        labelEn: definition.labelEn,
        rawPoint,
        coefficient,
        cumulativePoint: calculateCategoryPoint(pointInput),
        visibility: 'subscriber_only',
        descriptionKo: definition.descriptionKo,
        descriptionEn: definition.descriptionEn,
        validationHintKo: definition.validationHintKo,
        validationHintEn: definition.validationHintEn,
      };
    });
  const riskRawPoint = roundPoint(input.riskPenalty.rawPoint);
  const riskCoefficient = roundPoint(input.riskPenalty.coefficient);
  const riskPenaltyPoint = calculateRiskPenaltyPoint(input.riskPenalty);
  const totalPositivePoint = roundPoint(
    positiveCategories.reduce(
      (sum, category) => sum + category.cumulativePoint,
      0,
    ),
  );
  const finalCumulativePoint = roundPoint(totalPositivePoint - riskPenaltyPoint);
  const confidenceScore = roundPoint(toFiniteNumber(input.confidenceScore));
  const warnings: string[] = [];

  if (confidenceScore < 45) {
    warnings.push('Low confidence preview: input coverage should be reviewed.');
  }

  if (
    input.sourceMode !== 'mock' &&
    input.sourceMode !== 'manual_seed' &&
    input.sourceMode !== 'api_ready'
  ) {
    warnings.push('Unsupported source mode.');
  }

  const sourceCountTotal = [
    input.musicAlbum,
    input.newsIssue,
    input.snsFandom,
    input.brandFit,
    input.comebackActivity,
    input.growthMomentum,
    input.riskPenalty,
  ].reduce((sum, item) => sum + toFiniteNumber(item.sourceCount ?? 0), 0);

  if (sourceCountTotal <= 0) {
    warnings.push('No source count supplied for preview shape validation.');
  }

  const categories: FandexV1CategoryScore[] = [
    ...positiveCategories,
    {
      key: riskPenaltyDefinition.key,
      labelKo: riskPenaltyDefinition.labelKo,
      labelEn: riskPenaltyDefinition.labelEn,
      rawPoint: riskRawPoint,
      coefficient: riskCoefficient,
      cumulativePoint: riskPenaltyPoint,
      visibility: 'subscriber_only',
      descriptionKo: riskPenaltyDefinition.descriptionKo,
      descriptionEn: riskPenaltyDefinition.descriptionEn,
      validationHintKo: riskPenaltyDefinition.validationHintKo,
      validationHintEn: riskPenaltyDefinition.validationHintEn,
    },
  ];
  const resultBase = {
    totalPositivePoint,
    riskPenaltyPoint,
  };

  return {
    artistId: input.artistId,
    artistName: input.artistName,
    totalPositivePoint,
    riskPenaltyPoint,
    finalCumulativePoint,
    publicDisplayPoint: Math.round(finalCumulativePoint),
    pointBand: getFandexV1PointBand(finalCumulativePoint),
    issueTone: getFandexV1IssueTone(input, resultBase),
    confidenceScore,
    categories,
    freePreviewCategories: categories.filter(
      (category) => category.visibility === 'free_preview',
    ),
    lockedCategories: categories.filter(
      (category) => category.visibility === 'subscriber_only',
    ),
    methodologyVersion: FANDEX_V1_METHODOLOGY_VERSION,
    warnings,
    validationSummary:
      'Preview composite indicator. Validate with external benchmarks, event backtests, sensitivity analysis, confidence signals, and manual review.',
  };
}

function pointInput(
  rawPoint: number,
  key: FandexV1CategoryKey,
  sourceCount: number,
  confidence: number,
): FandexV1PointInput {
  return {
    rawPoint,
    coefficient: defaultCoefficients[key],
    sourceCount,
    confidence,
  };
}

export function createFandexV1SampleInputs(): FandexV1Input[] {
  return [
    {
      artistId: 'ive',
      artistName: 'IVE',
      musicAlbum: pointInput(1240, 'musicAlbum', 18, 82),
      newsIssue: pointInput(760, 'newsIssue', 24, 76),
      snsFandom: pointInput(980, 'snsFandom', 34, 80),
      brandFit: pointInput(940, 'brandFit', 8, 78),
      comebackActivity: pointInput(680, 'comebackActivity', 7, 74),
      growthMomentum: pointInput(1120, 'growthMomentum', 16, 79),
      riskPenalty: pointInput(180, 'riskPenalty', 4, 70),
      confidenceScore: 78,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'mock',
    },
    {
      artistId: 'riize',
      artistName: 'RIIZE',
      musicAlbum: pointInput(860, 'musicAlbum', 14, 74),
      newsIssue: pointInput(640, 'newsIssue', 18, 70),
      snsFandom: pointInput(1320, 'snsFandom', 42, 82),
      brandFit: pointInput(720, 'brandFit', 6, 72),
      comebackActivity: pointInput(560, 'comebackActivity', 6, 68),
      growthMomentum: pointInput(1450, 'growthMomentum', 20, 80),
      riskPenalty: pointInput(260, 'riskPenalty', 5, 68),
      confidenceScore: 74,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'mock',
    },
    {
      artistId: 'newjeans',
      artistName: 'NewJeans',
      musicAlbum: pointInput(1040, 'musicAlbum', 15, 72),
      newsIssue: pointInput(1180, 'newsIssue', 30, 70),
      snsFandom: pointInput(1160, 'snsFandom', 36, 74),
      brandFit: pointInput(980, 'brandFit', 7, 70),
      comebackActivity: pointInput(420, 'comebackActivity', 4, 62),
      growthMomentum: pointInput(520, 'growthMomentum', 10, 64),
      riskPenalty: pointInput(1260, 'riskPenalty', 11, 66),
      confidenceScore: 68,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'mock',
    },
    {
      artistId: 'aespa',
      artistName: 'aespa',
      musicAlbum: pointInput(1560, 'musicAlbum', 22, 84),
      newsIssue: pointInput(820, 'newsIssue', 24, 78),
      snsFandom: pointInput(1180, 'snsFandom', 38, 81),
      brandFit: pointInput(1020, 'brandFit', 9, 80),
      comebackActivity: pointInput(880, 'comebackActivity', 9, 76),
      growthMomentum: pointInput(1080, 'growthMomentum', 18, 78),
      riskPenalty: pointInput(210, 'riskPenalty', 4, 72),
      confidenceScore: 80,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'mock',
    },
  ];
}

export function runFandexV1ScoringShapeCheck() {
  const sampleInputs = createFandexV1SampleInputs();
  const results = sampleInputs.map(calculateFandexV1Score);
  const averageScore =
    results.reduce((sum, result) => sum + result.finalCumulativePoint, 0) /
    Math.max(results.length, 1);
  const categoryCount = results[0]?.categories.length ?? 0;
  const lockedCategoryCount = results[0]?.lockedCategories.length ?? 0;
  const warningCount = results.reduce(
    (sum, result) => sum + result.warnings.length,
    0,
  );

  return {
    sampleCount: sampleInputs.length,
    resultCount: results.length,
    averageScore: roundPoint(averageScore),
    categoryCount,
    lockedCategoryCount,
    warningCount,
    methodologyVersion: FANDEX_V1_METHODOLOGY_VERSION,
    hasBlockingErrors:
      sampleInputs.length !== results.length ||
      categoryCount !== 7 ||
      lockedCategoryCount < 1,
  };
}
