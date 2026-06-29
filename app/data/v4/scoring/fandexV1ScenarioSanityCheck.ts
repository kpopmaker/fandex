export type FandexV1ScenarioKey =
  | 'highComebackMomentum'
  | 'stableTopTier'
  | 'brandSafeGrowth'
  | 'fandomSpike'
  | 'hiatusRisk'
  | 'controversyRisk'
  | 'weakSignalLowMomentum';

export type FandexV1ScenarioCategoryKey =
  | 'musicAlbum'
  | 'newsIssue'
  | 'snsFandom'
  | 'brandFit'
  | 'comebackActivity'
  | 'growthMomentum'
  | 'riskPenalty';

export type FandexV1ScenarioRiskLevel = 'Low' | 'Watch' | 'High' | 'Dominant';

export type FandexV1ScenarioPointBand =
  | 'Dominant Power'
  | 'High Power'
  | 'Rising Power'
  | 'Watch'
  | 'Early Signal'
  | 'Risk Negative';

export type FandexV1ScenarioInput = {
  scenarioKey: FandexV1ScenarioKey;
  scenarioNameKo: string;
  scenarioNameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  categoryRawPoints: Record<FandexV1ScenarioCategoryKey, number>;
  expectedBehaviorKo: string;
  expectedBehaviorEn: string;
  analystNoteKo: string;
  analystNoteEn: string;
};

export type FandexV1ScenarioContribution = {
  key: FandexV1ScenarioCategoryKey;
  labelKo: string;
  labelEn: string;
  rawPoint: number;
  coefficient: number;
  cumulativePoint: number;
  direction: 'positive' | 'drag';
};

export type FandexV1ScenarioResult = {
  scenarioKey: FandexV1ScenarioKey;
  scenarioNameKo: string;
  totalCumulativePoint: number;
  positiveCumulativePoint: number;
  riskPenaltyPoint: number;
  netPoint: number;
  topPositiveCategory: FandexV1ScenarioContribution;
  strongestDragCategory: FandexV1ScenarioContribution;
  pointBand: FandexV1ScenarioPointBand;
  riskLevel: FandexV1ScenarioRiskLevel;
  confidence: number;
  warnings: string[];
  subscriberOnlyBreakdown: FandexV1ScenarioContribution[];
};

export type FandexV1ScenarioComparisonResult = {
  scenarioCount: number;
  highestScenario: Pick<FandexV1ScenarioResult, 'scenarioKey' | 'scenarioNameKo' | 'netPoint'>;
  lowestScenario: Pick<FandexV1ScenarioResult, 'scenarioKey' | 'scenarioNameKo' | 'netPoint'>;
  widestGapPoint: number;
  averageNetPoint: number;
  riskSensitiveScenarioCount: number;
  scenarios: FandexV1ScenarioResult[];
  warnings: string[];
};

const scenarioCoefficients = {
  musicAlbum: 1.25,
  newsIssue: 1.1,
  snsFandom: 1.1,
  brandFit: 0.9,
  comebackActivity: 0.8,
  growthMomentum: 1,
  riskPenalty: 1.4,
} satisfies Record<FandexV1ScenarioCategoryKey, number>;

const scenarioLabels: Record<
  FandexV1ScenarioCategoryKey,
  { ko: string; en: string }
> = {
  musicAlbum: { ko: '음원/음반 신호', en: 'Music / Album Signal' },
  newsIssue: { ko: '뉴스/이슈 신호', en: 'News / Issue Signal' },
  snsFandom: { ko: 'SNS/팬덤 신호', en: 'SNS / Fandom Signal' },
  brandFit: { ko: '브랜드 적합도', en: 'Brand-fit Signal' },
  comebackActivity: { ko: '컴백/활동 신호', en: 'Comeback / Activity Signal' },
  growthMomentum: { ko: '성장 모멘텀', en: 'Growth Momentum' },
  riskPenalty: { ko: '리스크 감점', en: 'Risk Penalty' },
};

const positiveCategoryKeys: Exclude<
  FandexV1ScenarioCategoryKey,
  'riskPenalty'
>[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
  'comebackActivity',
  'growthMomentum',
];

export function toFiniteScenarioNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function getScenarioRiskLevel(
  riskPenaltyPoint: number,
): FandexV1ScenarioRiskLevel {
  const point = Math.max(toFiniteScenarioNumber(riskPenaltyPoint), 0);

  if (point >= 2400) {
    return 'Dominant';
  }

  if (point >= 1200) {
    return 'High';
  }

  if (point >= 500) {
    return 'Watch';
  }

  return 'Low';
}

export function getScenarioPointBand(
  netPoint: number,
): FandexV1ScenarioPointBand {
  const point = toFiniteScenarioNumber(netPoint);

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

export function getTopPositiveCategory(
  categoryContributions: FandexV1ScenarioContribution[],
) {
  const positives = categoryContributions.filter(
    (contribution) => contribution.direction === 'positive',
  );

  return positives.reduce(
    (top, contribution) =>
      contribution.cumulativePoint > top.cumulativePoint ? contribution : top,
    positives[0] ?? createEmptyContribution('musicAlbum', 'positive'),
  );
}

export function getStrongestDragCategory(
  categoryContributions: FandexV1ScenarioContribution[],
) {
  const drags = categoryContributions.filter(
    (contribution) => contribution.direction === 'drag',
  );

  return drags.reduce(
    (top, contribution) =>
      contribution.cumulativePoint > top.cumulativePoint ? contribution : top,
    drags[0] ?? createEmptyContribution('riskPenalty', 'drag'),
  );
}

export function calculateFandexV1ScenarioResult(
  input: FandexV1ScenarioInput,
): FandexV1ScenarioResult {
  const positiveContributions = positiveCategoryKeys.map((key) =>
    createContribution(key, input.categoryRawPoints[key], 'positive'),
  );
  const riskContribution = createContribution(
    'riskPenalty',
    input.categoryRawPoints.riskPenalty,
    'drag',
  );
  const subscriberOnlyBreakdown = [...positiveContributions, riskContribution];
  const positiveCumulativePoint = roundScenarioPoint(
    positiveContributions.reduce(
      (sum, contribution) => sum + contribution.cumulativePoint,
      0,
    ),
  );
  const riskPenaltyPoint = riskContribution.cumulativePoint;
  const netPoint = roundScenarioPoint(positiveCumulativePoint - riskPenaltyPoint);
  const warnings: string[] = [
    'Fictionalized scenario only; do not treat as real artist data.',
  ];
  const confidence = calculateScenarioConfidence(input, riskPenaltyPoint);

  if (riskPenaltyPoint > positiveCumulativePoint) {
    warnings.push('Risk penalty exceeds positive cumulative point.');
  }

  if (input.scenarioKey === 'controversyRisk' && input.categoryRawPoints.newsIssue <= 0) {
    warnings.push('Controversy risk scenario should keep newsIssue visibility explicit.');
  }

  return {
    scenarioKey: input.scenarioKey,
    scenarioNameKo: input.scenarioNameKo,
    totalCumulativePoint: positiveCumulativePoint,
    positiveCumulativePoint,
    riskPenaltyPoint,
    netPoint,
    topPositiveCategory: getTopPositiveCategory(subscriberOnlyBreakdown),
    strongestDragCategory: getStrongestDragCategory(subscriberOnlyBreakdown),
    pointBand: getScenarioPointBand(netPoint),
    riskLevel: getScenarioRiskLevel(riskPenaltyPoint),
    confidence,
    warnings,
    subscriberOnlyBreakdown,
  };
}

export function createFandexV1ScenarioSanitySamples(): FandexV1ScenarioInput[] {
  return [
    {
      scenarioKey: 'highComebackMomentum',
      scenarioNameKo: 'Scenario A: 긍정적 컴백 모멘텀',
      scenarioNameEn: 'Scenario A: High comeback momentum',
      descriptionKo:
        '음원/음반, 컴백/활동, 성장 모멘텀이 동시에 강한 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with strong music, comeback activity, and growth momentum.',
      categoryRawPoints: {
        musicAlbum: 1580,
        newsIssue: 980,
        snsFandom: 1140,
        brandFit: 860,
        comebackActivity: 1420,
        growthMomentum: 1680,
        riskPenalty: 140,
      },
      expectedBehaviorKo: '빠른 상승세를 반영해 높은 netPoint가 나와야 합니다.',
      expectedBehaviorEn: 'Expected to produce high net points from fast momentum.',
      analystNoteKo: '단기 급등 후 지속성은 별도 benchmark로 확인해야 합니다.',
      analystNoteEn: 'Retention after the spike should be checked with benchmarks.',
    },
    {
      scenarioKey: 'stableTopTier',
      scenarioNameKo: 'Scenario B: 안정적 상위권',
      scenarioNameEn: 'Scenario B: Stable top tier',
      descriptionKo:
        '음원/음반, SNS/팬덤, 브랜드 적합도가 안정적으로 높은 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with stable music, fandom, and brand-fit strength.',
      categoryRawPoints: {
        musicAlbum: 1700,
        newsIssue: 720,
        snsFandom: 1500,
        brandFit: 1320,
        comebackActivity: 760,
        growthMomentum: 640,
        riskPenalty: 120,
      },
      expectedBehaviorKo: '폭발적 상승은 아니지만 안정적인 상위권 점수가 나와야 합니다.',
      expectedBehaviorEn: 'Expected to remain high without requiring explosive momentum.',
      analystNoteKo: '성장 속도보다 누적 기반과 안정성이 강한 구조입니다.',
      analystNoteEn: 'This checks durable base strength rather than acceleration.',
    },
    {
      scenarioKey: 'brandSafeGrowth',
      scenarioNameKo: 'Scenario C: 브랜드 안전 성장',
      scenarioNameEn: 'Scenario C: Brand-safe growth',
      descriptionKo:
        '브랜드 적합도, 팬덤 반응, 긍정적 뉴스 흐름이 좋은 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with brand fit, fandom response, and constructive news tone.',
      categoryRawPoints: {
        musicAlbum: 980,
        newsIssue: 860,
        snsFandom: 1220,
        brandFit: 1580,
        comebackActivity: 620,
        growthMomentum: 980,
        riskPenalty: 80,
      },
      expectedBehaviorKo: '광고/캠페인 관점에서 강점이 netPoint에 반영되어야 합니다.',
      expectedBehaviorEn: 'Expected to show campaign-friendly strength in net points.',
      analystNoteKo: '브랜드 적합도는 단일 인기 총량이 아니라 안정성과 활용성을 봅니다.',
      analystNoteEn: 'Brand fit checks usability and stability, not just popularity size.',
    },
    {
      scenarioKey: 'fandomSpike',
      scenarioNameKo: 'Scenario D: 팬덤 반응 급등',
      scenarioNameEn: 'Scenario D: Fandom spike',
      descriptionKo:
        'SNS/팬덤과 뉴스/이슈가 급등하지만 음원/음반은 중간 수준인 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with sharp fandom and issue lift but mid music signal.',
      categoryRawPoints: {
        musicAlbum: 760,
        newsIssue: 1320,
        snsFandom: 1760,
        brandFit: 740,
        comebackActivity: 680,
        growthMomentum: 1260,
        riskPenalty: 360,
      },
      expectedBehaviorKo: '팬덤 급등은 보이지만 지속성 검증이 필요해야 합니다.',
      expectedBehaviorEn: 'Expected to show a spike while requiring retention checks.',
      analystNoteKo: '일시적 화제성과 지속적 성장의 구분이 필요합니다.',
      analystNoteEn: 'This separates short-lived buzz from durable growth.',
    },
    {
      scenarioKey: 'hiatusRisk',
      scenarioNameKo: 'Scenario E: 활동 공백 리스크',
      scenarioNameEn: 'Scenario E: Hiatus risk',
      descriptionKo:
        '음원/음반, 컴백/활동, 성장 모멘텀이 낮고 리스크 감점이 있는 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with low activity and meaningful hiatus risk.',
      categoryRawPoints: {
        musicAlbum: 360,
        newsIssue: 420,
        snsFandom: 640,
        brandFit: 520,
        comebackActivity: 180,
        growthMomentum: 220,
        riskPenalty: 980,
      },
      expectedBehaviorKo: '활동성 저하와 리스크가 netPoint를 낮춰야 합니다.',
      expectedBehaviorEn: 'Expected to lower net points through low activity and risk drag.',
      analystNoteKo: '공백 자체를 단정하지 않고 활동성 저하 scenario로만 해석합니다.',
      analystNoteEn: 'This is an activity-gap scenario, not a claim about any artist.',
    },
    {
      scenarioKey: 'controversyRisk',
      scenarioNameKo: 'Scenario F: 논란성 이슈 리스크',
      scenarioNameEn: 'Scenario F: Controversy risk',
      descriptionKo:
        '뉴스/이슈 rawPoint는 높지만 negative/mixed tone과 리스크 감점이 큰 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with high issue visibility but strong negative or mixed risk drag.',
      categoryRawPoints: {
        musicAlbum: 620,
        newsIssue: 1600,
        snsFandom: 720,
        brandFit: 360,
        comebackActivity: 340,
        growthMomentum: 260,
        riskPenalty: 2200,
      },
      expectedBehaviorKo: '기사량이 많아도 리스크 감점 때문에 netPoint가 낮아져야 합니다.',
      expectedBehaviorEn: 'Expected to lower net points even when article visibility is high.',
      analystNoteKo: '단순 기사량과 긍정적 점수는 분리해서 봐야 합니다.',
      analystNoteEn: 'Article volume should be separated from positive score contribution.',
    },
    {
      scenarioKey: 'weakSignalLowMomentum',
      scenarioNameKo: 'Scenario G: 약한 신호와 낮은 모멘텀',
      scenarioNameEn: 'Scenario G: Weak signal and low momentum',
      descriptionKo:
        '전반적 rawPoint와 성장 모멘텀이 낮은 fictionalized scenario입니다.',
      descriptionEn:
        'Fictionalized scenario with generally low raw points and low momentum.',
      categoryRawPoints: {
        musicAlbum: 220,
        newsIssue: 180,
        snsFandom: 260,
        brandFit: 240,
        comebackActivity: 160,
        growthMomentum: 140,
        riskPenalty: 90,
      },
      expectedBehaviorKo: '낮은 누적 점수와 초기 신호 수준으로 분류되어야 합니다.',
      expectedBehaviorEn: 'Expected to remain low and classify as an early signal.',
      analystNoteKo: '낮은 점수는 실패 단정이 아니라 관측 신호 부족을 의미합니다.',
      analystNoteEn: 'Low score means limited observed signal, not a failure claim.',
    },
  ];
}

export function compareFandexV1Scenarios(
  samples: FandexV1ScenarioInput[],
): FandexV1ScenarioComparisonResult {
  const scenarios = samples.map(calculateFandexV1ScenarioResult);
  const fallback = scenarios[0] ?? calculateFandexV1ScenarioResult(
    createFandexV1ScenarioSanitySamples()[0]!,
  );
  const highest = scenarios.reduce(
    (top, scenario) => (scenario.netPoint > top.netPoint ? scenario : top),
    fallback,
  );
  const lowest = scenarios.reduce(
    (bottom, scenario) => (scenario.netPoint < bottom.netPoint ? scenario : bottom),
    fallback,
  );
  const averageNetPoint = roundScenarioPoint(
    scenarios.reduce((sum, scenario) => sum + scenario.netPoint, 0) /
      Math.max(scenarios.length, 1),
  );
  const warnings = scenarios.flatMap((scenario) => scenario.warnings);

  if (scenarios.length === 0) {
    warnings.push('No scenarios supplied for comparison.');
  }

  warnings.push(
    'Scenario coefficients are local constants and should stay synchronized with FANDEX v1 scoring coefficients.',
  );

  return {
    scenarioCount: scenarios.length,
    highestScenario: pickScenarioSummary(highest),
    lowestScenario: pickScenarioSummary(lowest),
    widestGapPoint: roundScenarioPoint(highest.netPoint - lowest.netPoint),
    averageNetPoint,
    riskSensitiveScenarioCount: scenarios.filter(
      (scenario) => scenario.riskLevel === 'High' || scenario.riskLevel === 'Dominant',
    ).length,
    scenarios,
    warnings,
  };
}

export function runFandexV1ScenarioSanityCheck() {
  return compareFandexV1Scenarios(createFandexV1ScenarioSanitySamples());
}

function createContribution(
  key: FandexV1ScenarioCategoryKey,
  rawPoint: number,
  direction: 'positive' | 'drag',
): FandexV1ScenarioContribution {
  const label = scenarioLabels[key];
  const safeRawPoint = roundScenarioPoint(Math.max(toFiniteScenarioNumber(rawPoint), 0));
  const coefficient = scenarioCoefficients[key];

  return {
    key,
    labelKo: label.ko,
    labelEn: label.en,
    rawPoint: safeRawPoint,
    coefficient,
    cumulativePoint: roundScenarioPoint(safeRawPoint * coefficient),
    direction,
  };
}

function createEmptyContribution(
  key: FandexV1ScenarioCategoryKey,
  direction: 'positive' | 'drag',
): FandexV1ScenarioContribution {
  return createContribution(key, 0, direction);
}

function calculateScenarioConfidence(
  input: FandexV1ScenarioInput,
  riskPenaltyPoint: number,
) {
  const positiveSignalCount = positiveCategoryKeys.filter(
    (key) => toFiniteScenarioNumber(input.categoryRawPoints[key]) > 0,
  ).length;
  const riskAdjustment = getScenarioRiskLevel(riskPenaltyPoint) === 'Dominant' ? -8 : 0;

  return Math.max(40, Math.min(88, 56 + positiveSignalCount * 4 + riskAdjustment));
}

function pickScenarioSummary(result: FandexV1ScenarioResult) {
  return {
    scenarioKey: result.scenarioKey,
    scenarioNameKo: result.scenarioNameKo,
    netPoint: result.netPoint,
  };
}

function roundScenarioPoint(value: number) {
  return Math.round(toFiniteScenarioNumber(value) * 10) / 10;
}
