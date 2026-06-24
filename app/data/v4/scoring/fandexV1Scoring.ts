export type FandexV1CategoryKey =
  | 'musicAlbum'
  | 'newsIssue'
  | 'snsFandom'
  | 'brandFit'
  | 'comebackActivity'
  | 'growthMomentum'
  | 'riskPenalty';

export type FandexV1CategoryVisibility = 'free_preview' | 'locked';

export type FandexV1SourceMode = 'mock' | 'manual_seed' | 'api_ready';

export type FandexV1ScoreBand =
  | 'High Momentum'
  | 'Strong Signal'
  | 'Watch'
  | 'Early Signal';

export type FandexV1IssueTone =
  | 'Risk Watch'
  | 'Active Buzz'
  | 'Momentum Rising'
  | 'Neutral Preview';

export type FandexV1CategoryScore = {
  key: FandexV1CategoryKey;
  labelKo: string;
  labelEn: string;
  score: number;
  weight: number;
  visibility: FandexV1CategoryVisibility;
  descriptionKo: string;
  descriptionEn: string;
};

export type FandexV1Input = {
  artistId: string;
  artistName: string;
  musicAlbumScore: number;
  newsIssueScore: number;
  snsFandomScore: number;
  brandFitScore: number;
  comebackActivityScore: number;
  growthMomentumScore: number;
  riskPenaltyScore: number;
  confidenceScore: number;
  updatedAt: string;
  sourceMode: FandexV1SourceMode;
};

export type FandexV1Result = {
  artistId: string;
  artistName: string;
  overallScore: number;
  publicScore: number;
  scoreBand: FandexV1ScoreBand;
  issueTone: FandexV1IssueTone;
  confidenceScore: number;
  categories: FandexV1CategoryScore[];
  freePreviewCategories: FandexV1CategoryScore[];
  lockedCategories: FandexV1CategoryScore[];
  riskPenaltyApplied: number;
  methodologyVersion: string;
  warnings: string[];
};

export const FANDEX_V1_METHODOLOGY_VERSION = 'fandex-v1-preview-2026-06';

const positiveCategoryDefinitions: Array<{
  key: Exclude<FandexV1CategoryKey, 'riskPenalty'>;
  inputKey:
    | 'musicAlbumScore'
    | 'newsIssueScore'
    | 'snsFandomScore'
    | 'brandFitScore'
    | 'comebackActivityScore'
    | 'growthMomentumScore';
  labelKo: string;
  labelEn: string;
  weight: number;
  visibility: FandexV1CategoryVisibility;
  descriptionKo: string;
  descriptionEn: string;
}> = [
  {
    key: 'musicAlbum',
    inputKey: 'musicAlbumScore',
    labelKo: '음원/음반 신호',
    labelEn: 'Music / Album Signal',
    weight: 25,
    visibility: 'locked',
    descriptionKo: '앨범, 컴백, 차트, 발매 흐름을 조합한 구독자 리서치 카테고리입니다.',
    descriptionEn: 'Combines album, comeback, chart, and release momentum signals.',
  },
  {
    key: 'newsIssue',
    inputKey: 'newsIssueScore',
    labelKo: '뉴스/이슈 신호',
    labelEn: 'News / Issue Signal',
    weight: 20,
    visibility: 'locked',
    descriptionKo: '뉴스 노출, 이슈 집중도, 반복 보도 흐름을 해석합니다.',
    descriptionEn: 'Interprets news exposure, issue concentration, and repeated coverage.',
  },
  {
    key: 'snsFandom',
    inputKey: 'snsFandomScore',
    labelKo: 'SNS/팬덤 신호',
    labelEn: 'SNS / Fandom Signal',
    weight: 20,
    visibility: 'locked',
    descriptionKo: 'SNS 확산, 팬덤 반응, 커뮤니티 움직임을 반영합니다.',
    descriptionEn: 'Reflects social pickup, fandom response, and community movement.',
  },
  {
    key: 'brandFit',
    inputKey: 'brandFitScore',
    labelKo: '브랜드 적합도',
    labelEn: 'Brand-fit Signal',
    weight: 15,
    visibility: 'locked',
    descriptionKo: '캠페인, 앰배서더, 협업 관점의 적합도를 봅니다.',
    descriptionEn: 'Reviews campaign, ambassador, and collaboration fit.',
  },
  {
    key: 'comebackActivity',
    inputKey: 'comebackActivityScore',
    labelKo: '컴백/활동 신호',
    labelEn: 'Comeback / Activity Signal',
    weight: 10,
    visibility: 'locked',
    descriptionKo: '활동 타이밍과 컴백/프로모션 구간의 관심도를 반영합니다.',
    descriptionEn: 'Reflects activity timing and comeback or promotion attention windows.',
  },
  {
    key: 'growthMomentum',
    inputKey: 'growthMomentumScore',
    labelKo: '성장 모멘텀',
    labelEn: 'Growth Momentum',
    weight: 10,
    visibility: 'locked',
    descriptionKo: '최근 관심 증가와 신호 상승 흐름을 preview 산식에 반영합니다.',
    descriptionEn: 'Reflects recent attention growth and rising signal movement.',
  },
];

const riskPenaltyDefinition = {
  key: 'riskPenalty' as const,
  labelKo: '리스크 감점',
  labelEn: 'Risk Penalty',
  weight: 0,
  visibility: 'locked' as const,
  descriptionKo: '이슈 리스크가 높을 때 최대 12점까지 감점하는 베타 산식 항목입니다.',
  descriptionEn: 'Preview penalty that subtracts up to 12 points when issue risk is elevated.',
};

export function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export function getFandexV1ScoreBand(score: number): FandexV1ScoreBand {
  const clampedScore = clampScore(score);

  if (clampedScore >= 85) {
    return 'High Momentum';
  }

  if (clampedScore >= 70) {
    return 'Strong Signal';
  }

  if (clampedScore >= 55) {
    return 'Watch';
  }

  return 'Early Signal';
}

export function getFandexV1IssueTone(input: Pick<
  FandexV1Input,
  'newsIssueScore' | 'growthMomentumScore' | 'riskPenaltyScore'
>): FandexV1IssueTone {
  const riskPenaltyScore = clampScore(input.riskPenaltyScore);
  const newsIssueScore = clampScore(input.newsIssueScore);
  const growthMomentumScore = clampScore(input.growthMomentumScore);

  if (riskPenaltyScore >= 70) {
    return 'Risk Watch';
  }

  if (newsIssueScore >= 70 && riskPenaltyScore < 40) {
    return 'Active Buzz';
  }

  if (growthMomentumScore >= 70) {
    return 'Momentum Rising';
  }

  return 'Neutral Preview';
}

export function calculateFandexV1Score(input: FandexV1Input): FandexV1Result {
  const categories: FandexV1CategoryScore[] = positiveCategoryDefinitions.map(
    (definition) => ({
      key: definition.key,
      labelKo: definition.labelKo,
      labelEn: definition.labelEn,
      score: roundScore(clampScore(input[definition.inputKey])),
      weight: definition.weight,
      visibility: definition.visibility,
      descriptionKo: definition.descriptionKo,
      descriptionEn: definition.descriptionEn,
    }),
  );

  const totalPositiveWeight = positiveCategoryDefinitions.reduce(
    (sum, definition) => sum + definition.weight,
    0,
  );
  const weightedPositiveScore =
    categories.reduce((sum, category) => {
      return sum + category.score * (category.weight / totalPositiveWeight);
    }, 0) || 0;
  const riskPenaltyScore = clampScore(input.riskPenaltyScore);
  const riskPenaltyApplied = roundScore((riskPenaltyScore / 100) * 12);
  const overallScore = roundScore(
    clampScore(weightedPositiveScore - riskPenaltyApplied),
  );
  const confidenceScore = roundScore(clampScore(input.confidenceScore));
  const warnings: string[] = [];

  if (confidenceScore < 45) {
    warnings.push('Low confidence preview: input coverage should be reviewed.');
  }

  if (input.sourceMode !== 'mock' && input.sourceMode !== 'manual_seed' && input.sourceMode !== 'api_ready') {
    warnings.push('Unsupported source mode.');
  }

  categories.push({
    key: riskPenaltyDefinition.key,
    labelKo: riskPenaltyDefinition.labelKo,
    labelEn: riskPenaltyDefinition.labelEn,
    score: roundScore(riskPenaltyScore),
    weight: riskPenaltyDefinition.weight,
    visibility: riskPenaltyDefinition.visibility,
    descriptionKo: riskPenaltyDefinition.descriptionKo,
    descriptionEn: riskPenaltyDefinition.descriptionEn,
  });

  return {
    artistId: input.artistId,
    artistName: input.artistName,
    overallScore,
    publicScore: Math.round(overallScore),
    scoreBand: getFandexV1ScoreBand(overallScore),
    issueTone: getFandexV1IssueTone(input),
    confidenceScore,
    categories,
    freePreviewCategories: categories.filter(
      (category) => category.visibility === 'free_preview',
    ),
    lockedCategories: categories.filter(
      (category) => category.visibility === 'locked',
    ),
    riskPenaltyApplied,
    methodologyVersion: FANDEX_V1_METHODOLOGY_VERSION,
    warnings,
  };
}

export function createFandexV1SampleInputs(): FandexV1Input[] {
  return [
    {
      artistId: 'ive',
      artistName: 'IVE',
      musicAlbumScore: 84,
      newsIssueScore: 72,
      snsFandomScore: 79,
      brandFitScore: 86,
      comebackActivityScore: 78,
      growthMomentumScore: 74,
      riskPenaltyScore: 22,
      confidenceScore: 76,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'manual_seed',
    },
    {
      artistId: 'riize',
      artistName: 'RIIZE',
      musicAlbumScore: 76,
      newsIssueScore: 66,
      snsFandomScore: 82,
      brandFitScore: 74,
      comebackActivityScore: 70,
      growthMomentumScore: 81,
      riskPenaltyScore: 28,
      confidenceScore: 72,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'manual_seed',
    },
    {
      artistId: 'newjeans',
      artistName: 'NewJeans',
      musicAlbumScore: 68,
      newsIssueScore: 74,
      snsFandomScore: 77,
      brandFitScore: 83,
      comebackActivityScore: 61,
      growthMomentumScore: 63,
      riskPenaltyScore: 72,
      confidenceScore: 68,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'manual_seed',
    },
    {
      artistId: 'aespa',
      artistName: 'aespa',
      musicAlbumScore: 86,
      newsIssueScore: 71,
      snsFandomScore: 80,
      brandFitScore: 84,
      comebackActivityScore: 82,
      growthMomentumScore: 76,
      riskPenaltyScore: 24,
      confidenceScore: 78,
      updatedAt: '2026-06-24T00:00:00.000Z',
      sourceMode: 'manual_seed',
    },
  ];
}

export function runFandexV1ScoringShapeCheck() {
  const sampleInputs = createFandexV1SampleInputs();
  const results = sampleInputs.map(calculateFandexV1Score);
  const averageScore =
    results.reduce((sum, result) => sum + result.overallScore, 0) /
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
    averageScore: roundScore(averageScore),
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
