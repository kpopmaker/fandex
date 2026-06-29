export type NaverNewsIssueType =
  | 'comeback'
  | 'chartPerformance'
  | 'brandCampaign'
  | 'fandomReaction'
  | 'contractAgency'
  | 'controversyRisk'
  | 'hiatusActivity'
  | 'awardPerformance'
  | 'other';

export type NaverNewsIssueTone = 'positive' | 'neutral' | 'negative' | 'mixed';

export type NaverNewsIssueSeedItem = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  outlet: string;
  publishedAt: string;
  sourceUrl: string;
  issueType: NaverNewsIssueType;
  tone: NaverNewsIssueTone;
  relevanceScore: number;
  outletCredibilityScore: number;
  recencyScore: number;
  impactScore: number;
  riskScore: number;
  noteKo: string;
  noteEn: string;
};

export type NaverNewsIssueArtistSeed = {
  artistId: string;
  artistName: string;
  sourceMode: 'manual_seed';
  updatedAt: string;
  items: NaverNewsIssueSeedItem[];
};

export type NaverNewsIssuePointResult = {
  artistId: string;
  artistName: string;
  articleCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  mixedCount: number;
  weightedIssuePoint: number;
  riskPenaltyRawPoint: number;
  issueTone: NaverNewsIssueTone;
  confidence: number;
  sourceCount: number;
  warnings: string[];
  subscriberOnlyEvidence: Array<{
    id: string;
    title: string;
    outlet: string;
    issueType: NaverNewsIssueType;
    tone: NaverNewsIssueTone;
    point: number;
    riskPoint: number;
    noteKo: string;
    noteEn: string;
  }>;
};

const riskIssueTypes = new Set<NaverNewsIssueType>([
  'contractAgency',
  'controversyRisk',
  'hiatusActivity',
]);

export function toFiniteSeedNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function getTonePointMultiplier(tone: NaverNewsIssueTone) {
  const multipliers: Record<NaverNewsIssueTone, number> = {
    positive: 1.16,
    neutral: 0.78,
    negative: 0.46,
    mixed: 0.62,
  };

  return multipliers[tone] ?? multipliers.neutral;
}

export function getIssueTypeMultiplier(issueType: NaverNewsIssueType) {
  const multipliers: Record<NaverNewsIssueType, number> = {
    comeback: 1.22,
    chartPerformance: 1.12,
    brandCampaign: 1.08,
    fandomReaction: 1.06,
    contractAgency: 0.74,
    controversyRisk: 0.58,
    hiatusActivity: 0.7,
    awardPerformance: 1.1,
    other: 0.9,
  };

  return multipliers[issueType] ?? multipliers.other;
}

export function calculateNewsIssueItemPoint(item: NaverNewsIssueSeedItem) {
  const relevanceScore = Math.max(toFiniteSeedNumber(item.relevanceScore), 0);
  const outletCredibilityScore = Math.max(
    toFiniteSeedNumber(item.outletCredibilityScore),
    0,
  );
  const recencyScore = Math.max(toFiniteSeedNumber(item.recencyScore), 0);
  const impactScore = Math.max(toFiniteSeedNumber(item.impactScore), 0);

  return roundSeedPoint(
    relevanceScore *
      outletCredibilityScore *
      recencyScore *
      impactScore *
      getTonePointMultiplier(item.tone) *
      getIssueTypeMultiplier(item.issueType),
  );
}

export function calculateNewsIssueRiskPoint(item: NaverNewsIssueSeedItem) {
  const baseRisk = Math.max(toFiniteSeedNumber(item.riskScore), 0);
  const relevanceScore = Math.max(toFiniteSeedNumber(item.relevanceScore), 0);
  const impactScore = Math.max(toFiniteSeedNumber(item.impactScore), 0);
  const typeRiskMultiplier = riskIssueTypes.has(item.issueType) ? 1.55 : 0.55;
  const toneRiskMultiplier =
    item.tone === 'negative'
      ? 1.8
      : item.tone === 'mixed'
        ? 1.25
        : item.tone === 'neutral'
          ? 0.45
          : 0.18;

  return roundSeedPoint(
    baseRisk * relevanceScore * impactScore * typeRiskMultiplier * toneRiskMultiplier,
  );
}

export function calculateNaverNewsIssuePoint(
  seed: NaverNewsIssueArtistSeed,
): NaverNewsIssuePointResult {
  const warnings: string[] = [];
  const subscriberOnlyEvidence = seed.items.map((item) => ({
    id: item.id,
    title: item.title,
    outlet: item.outlet,
    issueType: item.issueType,
    tone: item.tone,
    point: calculateNewsIssueItemPoint(item),
    riskPoint: calculateNewsIssueRiskPoint(item),
    noteKo: item.noteKo,
    noteEn: item.noteEn,
  }));
  const articleCount = seed.items.length;
  const positiveCount = seed.items.filter((item) => item.tone === 'positive').length;
  const neutralCount = seed.items.filter((item) => item.tone === 'neutral').length;
  const negativeCount = seed.items.filter((item) => item.tone === 'negative').length;
  const mixedCount = seed.items.filter((item) => item.tone === 'mixed').length;
  const weightedIssuePoint = roundSeedPoint(
    subscriberOnlyEvidence.reduce((sum, item) => sum + item.point, 0),
  );
  const riskPenaltyRawPoint = roundSeedPoint(
    subscriberOnlyEvidence.reduce((sum, item) => sum + item.riskPoint, 0),
  );
  const sourceCount = new Set(seed.items.map((item) => item.outlet)).size;
  const confidence = roundSeedPoint(
    seed.items.reduce(
      (sum, item) =>
        sum +
        (toFiniteSeedNumber(item.relevanceScore) +
          toFiniteSeedNumber(item.outletCredibilityScore) +
          toFiniteSeedNumber(item.recencyScore)) /
          3,
      0,
    ) / Math.max(articleCount, 1),
  );

  if (seed.sourceMode !== 'manual_seed') {
    warnings.push('Only manual_seed sourceMode is supported in this preview helper.');
  }

  if (articleCount === 0) {
    warnings.push('No manual seed article items supplied.');
  }

  if (sourceCount <= 1 && articleCount > 1) {
    warnings.push('Manual seed source diversity is low.');
  }

  return {
    artistId: seed.artistId,
    artistName: seed.artistName,
    articleCount,
    positiveCount,
    neutralCount,
    negativeCount,
    mixedCount,
    weightedIssuePoint,
    riskPenaltyRawPoint,
    issueTone: getAggregateIssueTone({
      positiveCount,
      neutralCount,
      negativeCount,
      mixedCount,
      riskPenaltyRawPoint,
      weightedIssuePoint,
    }),
    confidence,
    sourceCount,
    warnings,
    subscriberOnlyEvidence,
  };
}

export function createNaverNewsIssueManualSeedSamples(): NaverNewsIssueArtistSeed[] {
  return [
    {
      artistId: 'ive',
      artistName: 'IVE',
      sourceMode: 'manual_seed',
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        createSeedItem({
          id: 'manual-ive-001',
          artistId: 'ive',
          artistName: 'IVE',
          title: 'Fictionalized preview: IVE comeback teaser gains fan attention',
          issueType: 'comeback',
          tone: 'positive',
          relevanceScore: 8.8,
          outletCredibilityScore: 7.4,
          recencyScore: 8.1,
          impactScore: 8.5,
          riskScore: 0.8,
          noteKo: '컴백 티저 관련 관심 증가를 가정한 manual seed입니다.',
          noteEn: 'Manual seed for assumed comeback teaser attention.',
        }),
        createSeedItem({
          id: 'manual-ive-002',
          artistId: 'ive',
          artistName: 'IVE',
          title: 'Fictionalized preview: brand campaign visuals receive coverage',
          issueType: 'brandCampaign',
          tone: 'positive',
          relevanceScore: 7.7,
          outletCredibilityScore: 7.1,
          recencyScore: 7.5,
          impactScore: 7.2,
          riskScore: 0.5,
          noteKo: '브랜드 캠페인 보도 흐름을 가정한 preview seed입니다.',
          noteEn: 'Preview seed for assumed brand campaign coverage.',
        }),
        createSeedItem({
          id: 'manual-ive-003',
          artistId: 'ive',
          artistName: 'IVE',
          title: 'Fictionalized preview: repeated topic concentration needs review',
          issueType: 'other',
          tone: 'mixed',
          relevanceScore: 6.5,
          outletCredibilityScore: 6.8,
          recencyScore: 7,
          impactScore: 5.9,
          riskScore: 2.6,
          noteKo: '반복 보도 집중도 검수 필요성을 표현하는 manual seed입니다.',
          noteEn: 'Manual seed for repeated coverage concentration review.',
        }),
      ],
    },
    {
      artistId: 'riize',
      artistName: 'RIIZE',
      sourceMode: 'manual_seed',
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        createSeedItem({
          id: 'manual-riize-001',
          artistId: 'riize',
          artistName: 'RIIZE',
          title: 'Fictionalized preview: fandom reaction around performance clip rises',
          issueType: 'fandomReaction',
          tone: 'positive',
          relevanceScore: 8.4,
          outletCredibilityScore: 6.9,
          recencyScore: 8.6,
          impactScore: 8.1,
          riskScore: 0.6,
          noteKo: '퍼포먼스 클립 팬덤 반응을 가정한 manual seed입니다.',
          noteEn: 'Manual seed for assumed performance clip fandom reaction.',
        }),
        createSeedItem({
          id: 'manual-riize-002',
          artistId: 'riize',
          artistName: 'RIIZE',
          title: 'Fictionalized preview: chart mention coverage remains steady',
          issueType: 'chartPerformance',
          tone: 'neutral',
          relevanceScore: 6.9,
          outletCredibilityScore: 7,
          recencyScore: 6.8,
          impactScore: 6.2,
          riskScore: 0.8,
          noteKo: '차트 관련 중립 보도 흐름을 가정한 preview seed입니다.',
          noteEn: 'Preview seed for neutral chart coverage.',
        }),
      ],
    },
    {
      artistId: 'neon-pulse',
      artistName: 'NEON PULSE',
      sourceMode: 'manual_seed',
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        createSeedItem({
          id: 'manual-neon-pulse-001',
          artistId: 'neon-pulse',
          artistName: 'NEON PULSE',
          title: 'Fictionalized preview: schedule volatility draws mixed source coverage',
          issueType: 'other',
          tone: 'mixed',
          relevanceScore: 8.7,
          outletCredibilityScore: 7.6,
          recencyScore: 8.2,
          impactScore: 8.3,
          riskScore: 7.2,
          noteKo: 'Fictional schedule volatility and mixed source coverage manual seed.',
          noteEn: 'Manual seed for schedule volatility and mixed source coverage.',
        }),
        createSeedItem({
          id: 'manual-neon-pulse-002',
          artistId: 'neon-pulse',
          artistName: 'NEON PULSE',
          title: 'Fictionalized preview: data confidence watch triggered by uneven source volume',
          issueType: 'other',
          tone: 'mixed',
          relevanceScore: 7.8,
          outletCredibilityScore: 7.2,
          recencyScore: 7.9,
          impactScore: 7.6,
          riskScore: 8.4,
          noteKo: 'Fictional source-volume confidence calibration preview seed.',
          noteEn: 'Preview seed for source-volume confidence calibration.',
        }),
        createSeedItem({
          id: 'manual-neon-pulse-003',
          artistId: 'neon-pulse',
          artistName: 'NEON PULSE',
          title: 'Fictionalized preview: fan support discussion continues',
          issueType: 'fandomReaction',
          tone: 'mixed',
          relevanceScore: 6.8,
          outletCredibilityScore: 6.6,
          recencyScore: 7.1,
          impactScore: 6.5,
          riskScore: 3.2,
          noteKo: '팬덤 반응이 긍정/부정 혼재된 상황을 가정한 manual seed입니다.',
          noteEn: 'Manual seed for mixed fandom reaction.',
        }),
      ],
    },
    {
      artistId: 'aespa',
      artistName: 'aespa',
      sourceMode: 'manual_seed',
      updatedAt: '2026-06-24T00:00:00.000Z',
      items: [
        createSeedItem({
          id: 'manual-aespa-001',
          artistId: 'aespa',
          artistName: 'aespa',
          title: 'Fictionalized preview: award performance coverage lifts interest',
          issueType: 'awardPerformance',
          tone: 'positive',
          relevanceScore: 8.6,
          outletCredibilityScore: 7.5,
          recencyScore: 8,
          impactScore: 8.4,
          riskScore: 0.5,
          noteKo: '시상식/무대 성과 보도 흐름을 가정한 manual seed입니다.',
          noteEn: 'Manual seed for award performance coverage.',
        }),
        createSeedItem({
          id: 'manual-aespa-002',
          artistId: 'aespa',
          artistName: 'aespa',
          title: 'Fictionalized preview: global brand campaign mention expands',
          issueType: 'brandCampaign',
          tone: 'positive',
          relevanceScore: 7.9,
          outletCredibilityScore: 7.3,
          recencyScore: 7.8,
          impactScore: 7.7,
          riskScore: 0.4,
          noteKo: '글로벌 브랜드 캠페인 언급 확산을 가정한 preview seed입니다.',
          noteEn: 'Preview seed for global brand campaign mentions.',
        }),
      ],
    },
  ];
}

export function runNaverNewsIssueManualSeedShapeCheck() {
  const samples = createNaverNewsIssueManualSeedSamples();
  const results = samples.map(calculateNaverNewsIssuePoint);
  const warningCount = results.reduce(
    (sum, result) => sum + result.warnings.length,
    0,
  );
  const evidenceCount = results.reduce(
    (sum, result) => sum + result.subscriberOnlyEvidence.length,
    0,
  );

  return {
    sampleCount: samples.length,
    resultCount: results.length,
    evidenceCount,
    warningCount,
    hasBlockingErrors:
      samples.length !== results.length ||
      samples.some((seed) => seed.sourceMode !== 'manual_seed') ||
      results.some((result) => result.articleCount < 1),
  };
}

function createSeedItem(
  input: Omit<NaverNewsIssueSeedItem, 'outlet' | 'publishedAt' | 'sourceUrl'> & {
    outlet?: string;
    publishedAt?: string;
    sourceUrl?: string;
  },
): NaverNewsIssueSeedItem {
  return {
    outlet: 'FANDEX manual preview desk',
    publishedAt: '2026-06-24T00:00:00.000Z',
    sourceUrl: `https://example.com/fandex/manual-seed/${input.id}`,
    ...input,
  };
}

function getAggregateIssueTone({
  positiveCount,
  neutralCount,
  negativeCount,
  mixedCount,
  riskPenaltyRawPoint,
  weightedIssuePoint,
}: {
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  mixedCount: number;
  riskPenaltyRawPoint: number;
  weightedIssuePoint: number;
}): NaverNewsIssueTone {
  if (
    negativeCount > positiveCount ||
    riskPenaltyRawPoint > Math.max(weightedIssuePoint * 0.55, 1)
  ) {
    return 'negative';
  }

  if (mixedCount > 0 || riskPenaltyRawPoint > Math.max(weightedIssuePoint * 0.25, 1)) {
    return 'mixed';
  }

  if (positiveCount > neutralCount) {
    return 'positive';
  }

  return 'neutral';
}

function roundSeedPoint(value: number) {
  return Math.round(toFiniteSeedNumber(value) * 10) / 10;
}
