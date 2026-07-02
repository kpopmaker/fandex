import type {
  ArtistNewsItem,
  ArtistPricePoint,
  ChartPoint,
  CustomIndexConfig,
  FactorDefinitionV3,
  FactorKey,
  FactorWeights,
  KpopIssue,
  MarketIndexPoint,
} from './types';

export const factorDefinitionsV3: FactorDefinitionV3[] = [
  {
    key: 'music',
    label: 'Music',
    easyLabel: 'Music performance',
    description: 'Reflects absolute charting, streaming, downloads, and music-platform reaction.',
    defaultWeight: 18,
    helpText: 'Shows how strongly songs are being consumed and discussed.',
  },
  {
    key: 'album',
    label: 'Album',
    easyLabel: 'Album sales',
    description: 'Reflects first-week sales, cumulative sales, and fandom purchase power.',
    defaultWeight: 14,
    helpText: 'Shows whether fandom buying power is strong.',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    easyLabel: 'Video reaction',
    description: 'Reflects absolute music video views, official content views, and video engagement.',
    defaultWeight: 16,
    helpText: 'Shows whether video content is spreading.',
  },
  {
    key: 'sns',
    label: 'SNS',
    easyLabel: 'SNS reaction',
    description: 'Reflects Instagram, X, TikTok, and official-channel social engagement volume.',
    defaultWeight: 12,
    helpText: 'Shows likes, shares, comments, and conversation velocity.',
  },
  {
    key: 'search',
    label: 'Search',
    easyLabel: 'Search demand',
    description: 'Reflects absolute search volume and query growth.',
    defaultWeight: 10,
    helpText: 'Shows how much people are actively looking up the artist.',
  },
  {
    key: 'news',
    label: 'News',
    easyLabel: 'News exposure',
    description: 'Reflects article volume and issue spread across media and communities.',
    defaultWeight: 8,
    helpText: 'Shows whether the artist is becoming a broader topic.',
  },
  {
    key: 'global',
    label: 'Global',
    easyLabel: 'Global reaction',
    description: 'Reflects overseas news, global fan response, and international platform activity.',
    defaultWeight: 10,
    helpText: 'Shows whether momentum is expanding outside Korea.',
  },
  {
    key: 'fandom',
    label: 'Fandom',
    easyLabel: 'Fandom strength',
    description: 'Reflects fandom activity, community engagement, and coordinated support.',
    defaultWeight: 8,
    helpText: 'Shows whether fans are moving actively and consistently.',
  },
  {
    key: 'company',
    label: 'Company',
    easyLabel: 'Company scale',
    description: 'Reflects agency scale, operational stability, and marketing capacity.',
    defaultWeight: 4,
    helpText: 'Shows how much company support may amplify market signals.',
  },
];

export const defaultFactorWeightsV3: FactorWeights = {
  music: 18,
  album: 14,
  youtube: 16,
  sns: 12,
  search: 10,
  news: 8,
  global: 10,
  fandom: 8,
  company: 4,
};

const allFactorKeys: FactorKey[] = [
  'music',
  'album',
  'youtube',
  'sns',
  'search',
  'news',
  'global',
  'fandom',
  'company',
];

export const defaultCustomIndexConfig: CustomIndexConfig = {
  preset: 'Balanced',
  weights: defaultFactorWeightsV3,
  enabledFactors: allFactorKeys,
};

type CustomIndexViewPreset = {
  id: string;
  label: string;
  shortLabel: string;
  name: string;
  title: string;
  description: string;
  question: string;
  interpretation: string;
  preset: string;
  weights: FactorWeights;
  enabledFactors: FactorKey[];
  config: CustomIndexConfig;
};

function createCustomIndexView({
  id,
  label,
  shortLabel,
  description,
  question,
  interpretation,
  weights,
  enabledFactors = allFactorKeys,
}: {
  id: string;
  label: CustomIndexConfig['preset'];
  shortLabel?: string;
  description: string;
  question?: string;
  interpretation?: string;
  weights: FactorWeights;
  enabledFactors?: FactorKey[];
}): CustomIndexViewPreset {
  const displayLabel = shortLabel ?? label;

  return {
    id,
    label,
    shortLabel: displayLabel,
    name: label,
    title: label,
    description,
    question:
      question ??
      `Which FANDEX signals explain the current ${displayLabel} movement?`,
    interpretation:
      interpretation ??
      `${displayLabel} is a simulated FANDEX view for comparing artist market signals. It is not financial advice.`,
    preset: label,
    weights,
    enabledFactors,
    config: {
      preset: label,
      weights,
      enabledFactors,
    },
  };
}

export const customIndexViews: CustomIndexViewPreset[] = [
  createCustomIndexView({
    id: 'all',
    label: '종합 포인트',
    shortLabel: 'Official FANDEX',
    description:
      'A balanced FANDEX view across music, album, video, SNS, search, news, global, fandom, and company factors.',
    question: 'How is the official FANDEX artist index moving right now?',
    interpretation:
      'Use this as the baseline simulated artist index before comparing custom views.',
    weights: defaultFactorWeightsV3,
  }),
  createCustomIndexView({
    id: 'contentReaction',
    label: '콘텐츠 반응 중심',
    shortLabel: 'Content reaction',
    description:
      'Weights YouTube and SNS reaction more heavily to evaluate content-led momentum.',
    weights: {
      music: 14,
      album: 8,
      youtube: 24,
      sns: 18,
      search: 12,
      news: 8,
      global: 10,
      fandom: 4,
      company: 2,
    },
  }),
  createCustomIndexView({
    id: 'fandomExpansion',
    label: '팬덤 확장 중심',
    shortLabel: 'Fandom expansion',
    description:
      'Weights fandom, album, SNS, and global signals to evaluate fanbase expansion.',
    weights: {
      music: 10,
      album: 16,
      youtube: 10,
      sns: 14,
      search: 10,
      news: 6,
      global: 12,
      fandom: 18,
      company: 4,
    },
  }),
  createCustomIndexView({
    id: 'globalReaction',
    label: '해외 반응 중심',
    shortLabel: 'Global reaction',
    description:
      'Weights overseas reaction, YouTube, SNS, and music signals to evaluate global momentum.',
    weights: {
      music: 14,
      album: 8,
      youtube: 18,
      sns: 12,
      search: 8,
      news: 8,
      global: 22,
      fandom: 6,
      company: 4,
    },
  }),
  createCustomIndexView({
    id: 'businessImpact',
    label: '사업성 중심',
    shortLabel: 'Business impact',
    description:
      'Weights company scale, fandom base, and commercial stability signals for longer-horizon market context.',
    weights: {
      music: 12,
      album: 12,
      youtube: 12,
      sns: 10,
      search: 8,
      news: 8,
      global: 8,
      fandom: 10,
      company: 20,
    },
  }),
  createCustomIndexView({
    id: 'buzz',
    label: '화제성 중심',
    shortLabel: 'Buzz signal',
    description:
      'Weights SNS, search, news, and YouTube to identify fast attention spikes.',
    weights: {
      music: 8,
      album: 4,
      youtube: 16,
      sns: 24,
      search: 18,
      news: 16,
      global: 8,
      fandom: 4,
      company: 2,
    },
  }),
  createCustomIndexView({
    id: 'organicPublic',
    label: '대중 확산 중심',
    shortLabel: 'Public demand',
    description:
      'Weights music, search, and SNS signals to evaluate broad public demand.',
    weights: {
      music: 26,
      album: 6,
      youtube: 12,
      sns: 14,
      search: 18,
      news: 8,
      global: 8,
      fandom: 4,
      company: 4,
    },
  }),
  createCustomIndexView({
    id: 'custom',
    label: '직접 선택',
    shortLabel: 'Custom view',
    description:
      'Choose factors manually to simulate a custom artist market lens.',
    question: 'Which factors should drive this custom FANDEX view?',
    interpretation:
      'Custom views are exploratory simulations for content planning and market reading.',
    weights: defaultFactorWeightsV3,
  }),
];

export const marketIndexHistory: MarketIndexPoint[] = [
  { time: '09:00', indexValue: 982.4, changeRate: -0.4, totalVolume: 182300, risingArtistCount: 38, fallingArtistCount: 62 },
  { time: '10:00', indexValue: 991.8, changeRate: 0.52, totalVolume: 221500, risingArtistCount: 47, fallingArtistCount: 53 },
  { time: '11:00', indexValue: 1004.2, changeRate: 1.77, totalVolume: 264200, risingArtistCount: 58, fallingArtistCount: 42 },
  { time: '12:00', indexValue: 998.6, changeRate: 1.2, totalVolume: 238100, risingArtistCount: 51, fallingArtistCount: 49 },
  { time: '13:00', indexValue: 1011.9, changeRate: 2.55, totalVolume: 312900, risingArtistCount: 66, fallingArtistCount: 34 },
  { time: '14:00', indexValue: 1026.7, changeRate: 4.05, totalVolume: 386400, risingArtistCount: 72, fallingArtistCount: 28 },
  { time: '15:00', indexValue: 1019.3, changeRate: 3.3, totalVolume: 341700, risingArtistCount: 63, fallingArtistCount: 37 },
  { time: '16:00', indexValue: 1038.5, changeRate: 5.25, totalVolume: 421800, risingArtistCount: 76, fallingArtistCount: 24 },
];

export const marketChartPoints: ChartPoint[] = marketIndexHistory.map((point) => ({
  time: point.time,
  value: point.indexValue,
}));

const baseArtistIds = [
  'aespa',
  'ive',
  'riize',
  'illit',
  'tws',
  'lesserafim',
  'newjeans',
  'nmixx',
  'babymonster',
  'boynextdoor',
];

function createScores(seed: number): Record<FactorKey, number> {
  const clamp = (value: number) => Math.min(Math.max(value, 35), 98);

  return {
    music: clamp(62 + seed * 2),
    album: clamp(58 + seed * 1.5),
    youtube: clamp(64 + seed * 2.2),
    sns: clamp(60 + seed * 1.8),
    search: clamp(55 + seed * 2.5),
    news: clamp(52 + seed * 1.6),
    global: clamp(59 + seed * 2),
    fandom: clamp(61 + seed * 1.7),
    company: clamp(57 + seed * 1.2),
  };
}

export function getArtistPriceHistory(artistId: string): ArtistPricePoint[] {
  const artistIndex = Math.max(baseArtistIds.indexOf(artistId), 0);
  const basePrice = 92 + artistIndex * 4;

  return marketIndexHistory.map((point, index) => {
    const wave = Math.sin(index + artistIndex) * 4;
    const price = Number((basePrice + index * 2.1 + wave).toFixed(2));
    const previousPrice = index === 0 ? basePrice : basePrice + (index - 1) * 2.1;

    return {
      artistId,
      time: point.time,
      price,
      changeRate: Number((((price - previousPrice) / previousPrice) * 100).toFixed(2)),
      volume: Math.round(12000 + artistIndex * 1800 + index * 2500),
      fanSizeValue: Math.round(price * (900000 + artistIndex * 90000)),
      scores: createScores(artistIndex + index),
      absoluteMetrics: {
        music: Math.round(820000 + artistIndex * 52000 + index * 18000),
        album: Math.round(140000 + artistIndex * 12000 + index * 3500),
        youtube: Math.round(1800000 + artistIndex * 170000 + index * 64000),
        sns: Math.round(96000 + artistIndex * 8700 + index * 4200),
        search: Math.round(76000 + artistIndex * 5200 + index * 3100),
        news: Math.round(32 + artistIndex * 3 + index * 2),
        global: Math.round(118000 + artistIndex * 9400 + index * 4700),
        fandom: Math.round(84000 + artistIndex * 7600 + index * 3600),
      },
      lifecycleAdjustment: {
        albumReleaseCycle: 0,
        comebackPeriod: index >= 4 ? 1.08 : 1,
        activityPeriod: 1.03,
        hiatusRetention: 1,
      },
      sourceStatus: 'Mock needs verification',
    };
  });
}

export function getArtistChartPoints(artistId: string): ChartPoint[] {
  return getArtistPriceHistory(artistId).map((point) => ({
    time: point.time,
    value: point.price,
  }));
}

export const trendingIssues: KpopIssue[] = [
  {
    id: 'issue-001',
    rank: 1,
    headline: 'Comeback teaser drives search demand',
    summary:
      'Search demand and video reaction increased after a comeback teaser, lifting simulated FANDEX momentum.',
    category: 'Comeback',
    relatedArtistIds: ['aespa', 'ive'],
    relatedKeywords: ['comeback', 'teaser', 'music video'],
    issueScore: 94.2,
    newsCount: 38,
    searchGrowthRate: 128.4,
    impact: 'Market index up',
    updatedAt: '16:00',
    sourceNames: ['News', 'YouTube', 'SNS'],
    sourceType: 'Other',
    confidence: 72,
    sourceData: ['Mock news count', 'Mock search growth', 'Mock SNS reaction'],
    graphImpact: 1.8,
    estimatedPriceImpact: 2.4,
  },
  {
    id: 'issue-002',
    rank: 2,
    headline: 'Rookie boy group content reaction accelerates',
    summary:
      'Original content clips spread across communities and short-form platforms, increasing attention volume.',
    category: 'SNS',
    relatedArtistIds: ['riize', 'tws', 'boynextdoor'],
    relatedKeywords: ['original content', 'variety', 'short-form'],
    issueScore: 88.7,
    newsCount: 21,
    searchGrowthRate: 72.1,
    impact: 'Attention increased',
    updatedAt: '15:50',
    sourceNames: ['YouTube', 'X', 'TikTok'],
    sourceType: 'Other',
    confidence: 68,
    sourceData: ['Mock short-form reaction', 'Mock SNS reaction'],
    graphImpact: 1.1,
    estimatedPriceImpact: 1.6,
  },
  {
    id: 'issue-003',
    rank: 3,
    headline: 'Global fandom lifts music video replay',
    summary:
      'International fan accounts and reaction channels are pushing renewed music video attention.',
    category: 'Global reaction',
    relatedArtistIds: ['babymonster', 'lesserafim'],
    relatedKeywords: ['global reaction', 'reaction video', 'music video'],
    issueScore: 84.9,
    newsCount: 17,
    searchGrowthRate: 61.8,
    impact: 'Artist index up',
    updatedAt: '15:40',
    sourceNames: ['Global news', 'YouTube'],
    sourceType: 'Global news',
    confidence: 66,
    sourceData: ['Mock global news volume', 'Mock YouTube replay'],
    graphImpact: 0.9,
    estimatedPriceImpact: 1.2,
  },
  {
    id: 'issue-004',
    rank: 4,
    headline: 'Broadcast performance clips trend upward',
    summary:
      'Recent stage clips are spreading on SNS, increasing video reaction and search attention.',
    category: 'Broadcast',
    relatedArtistIds: ['illit', 'nmixx'],
    relatedKeywords: ['broadcast', 'stage', 'performance'],
    issueScore: 81.3,
    newsCount: 12,
    searchGrowthRate: 49.7,
    impact: 'Attention increased',
    updatedAt: '15:30',
    sourceNames: ['YouTube', 'SNS'],
  },
  {
    id: 'issue-005',
    rank: 5,
    headline: 'Fandom concept analysis spreads',
    summary:
      'Concept interpretation posts are spreading in fan communities and supporting fandom engagement.',
    category: 'Fandom',
    relatedArtistIds: ['aespa', 'newjeans'],
    relatedKeywords: ['concept', 'analysis', 'fandom'],
    issueScore: 78.5,
    newsCount: 9,
    searchGrowthRate: 42.5,
    impact: 'Attention increased',
    updatedAt: '15:20',
    sourceNames: ['Community', 'SNS'],
  },
  {
    id: 'issue-006',
    rank: 6,
    headline: 'Album preorder conversation increases',
    summary:
      'Album-related search demand and fan purchase conversation rose after preorder activity started.',
    category: 'Album',
    relatedArtistIds: ['ive', 'riize'],
    relatedKeywords: ['preorder', 'album', 'first week'],
    issueScore: 75.8,
    newsCount: 11,
    searchGrowthRate: 36.2,
    impact: 'Artist index up',
    updatedAt: '15:10',
    sourceNames: ['News', 'Commerce'],
  },
  {
    id: 'issue-007',
    rank: 7,
    headline: 'Member-focused clips increase search demand',
    summary:
      'Member-specific short-form clips increased individual and group-level search demand.',
    category: 'SNS',
    relatedArtistIds: ['ive', 'aespa', 'illit'],
    relatedKeywords: ['short-form', 'member', 'viral'],
    issueScore: 72.4,
    newsCount: 8,
    searchGrowthRate: 31.9,
    impact: 'Attention increased',
    updatedAt: '15:00',
    sourceNames: ['TikTok', 'Instagram'],
  },
  {
    id: 'issue-008',
    rank: 8,
    headline: 'Global chart mention boosts overseas reaction',
    summary:
      'Global chart-related mentions increased overseas reaction and music-platform interest.',
    category: 'Music',
    relatedArtistIds: ['lesserafim', 'babymonster'],
    relatedKeywords: ['global chart', 'overseas', 'music'],
    issueScore: 70.6,
    newsCount: 14,
    searchGrowthRate: 29.2,
    impact: 'Artist index up',
    updatedAt: '14:50',
    sourceNames: ['Global news', 'Music platform'],
  },
  {
    id: 'issue-009',
    rank: 9,
    headline: 'Rookie fandom name search grows',
    summary:
      'Fandom-name and member-name searches rose together, signaling rookie-market awareness.',
    category: 'Fandom',
    relatedArtistIds: ['tws', 'illit'],
    relatedKeywords: ['fandom name', 'rookie', 'member'],
    issueScore: 67.8,
    newsCount: 6,
    searchGrowthRate: 23.5,
    impact: 'Attention increased',
    updatedAt: '14:40',
    sourceNames: ['Search', 'SNS'],
  },
  {
    id: 'issue-010',
    rank: 10,
    headline: 'Agency schedule announcement lifts short-term attention',
    summary:
      'Official schedule and promotion announcements increased related keyword demand.',
    category: 'Issue',
    relatedArtistIds: ['nmixx', 'boynextdoor'],
    relatedKeywords: ['official schedule', 'promotion', 'announcement'],
    issueScore: 64.1,
    newsCount: 5,
    searchGrowthRate: 18.6,
    impact: 'Limited impact',
    updatedAt: '14:30',
    sourceNames: ['Official', 'News'],
  },
];

export const artistNewsItems: ArtistNewsItem[] = [
  {
    id: 'news-aespa-001',
    artistId: 'aespa',
    title: 'Comeback teaser increases fandom reaction',
    summary: 'Search demand and video reaction rose after the teaser release.',
    detail:
      'After the comeback teaser, fan communities and SNS showed more keyword mentions, and YouTube viewing momentum strengthened. In FANDEX terms, search, YouTube, and SNS factors contributed to the price move.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '16:00',
    relatedKeywords: ['comeback', 'teaser', 'search demand'],
    impactScore: 92,
    estimatedPriceImpact: 2.4,
    sourceStatus: 'Mock needs verification',
    importanceScore: 92,
  },
  {
    id: 'news-aespa-002',
    artistId: 'aespa',
    title: 'Concept analysis content spreads',
    summary: 'Fan interpretation posts are spreading across communities.',
    detail:
      'Concept and storyline analysis posts increased fandom engagement. This can be read as a signal for deeper fan-market involvement.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '15:30',
    relatedKeywords: ['concept', 'analysis', 'fandom'],
    impactScore: 86,
    estimatedPriceImpact: 1.7,
    sourceStatus: 'Mock needs verification',
    importanceScore: 86,
  },
  {
    id: 'news-aespa-003',
    artistId: 'aespa',
    title: 'Music video clips regain attention',
    summary: 'Existing music video clips are spreading again on short-form platforms.',
    detail:
      'Fan edits and reaction clips increased short-form circulation, adding to YouTube and SNS factor scores.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '14:50',
    relatedKeywords: ['music video', 'short-form', 'viral'],
    impactScore: 79,
    estimatedPriceImpact: 1.2,
    sourceStatus: 'Mock needs verification',
    importanceScore: 79,
  },
  {
    id: 'news-aespa-004',
    artistId: 'aespa',
    title: 'Global fan reaction increases',
    summary: 'Overseas fan accounts are driving more reaction.',
    detail:
      'Global fan accounts shared related content, lifting the global reaction score.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '14:20',
    relatedKeywords: ['global reaction', 'global', 'fan accounts'],
    impactScore: 73,
    estimatedPriceImpact: 0.9,
    sourceStatus: 'Mock needs verification',
    importanceScore: 73,
  },
  {
    id: 'news-aespa-005',
    artistId: 'aespa',
    title: 'Member keyword searches rise',
    summary: 'Member-specific search demand increased alongside group interest.',
    detail:
      'Member clips and photos spread across SNS, supporting overall group search demand.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '13:40',
    relatedKeywords: ['member', 'search demand', 'SNS'],
    impactScore: 70,
    estimatedPriceImpact: 0.8,
    sourceStatus: 'Mock needs verification',
    importanceScore: 70,
  },
  {
    id: 'news-aespa-006',
    artistId: 'aespa',
    title: 'Official SNS post reaction rises',
    summary: 'Official SNS post engagement accelerated.',
    detail:
      'Likes and comments increased faster than the previous baseline and were reflected in the SNS factor score.',
    source: 'FANDEX mock news',
    sourceName: 'FANDEX mock news',
    sourceType: 'Other',
    relatedArtists: ['aespa'],
    publishedAt: '13:00',
    relatedKeywords: ['SNS', 'likes', 'comments'],
    impactScore: 68,
    estimatedPriceImpact: 0.6,
    sourceStatus: 'Mock needs verification',
    importanceScore: 68,
  },
];

export function getNewsByArtistId(artistId: string): ArtistNewsItem[] {
  const matchedNews = artistNewsItems.filter((item) => item.artistId === artistId);

  if (matchedNews.length > 0) {
    return matchedNews;
  }

  return artistNewsItems.map((item, index) => ({
    ...item,
    id: `${artistId}-news-${index + 1}`,
    artistId,
  }));
}

export function getLatestMarketPoint(): MarketIndexPoint {
  return marketIndexHistory[marketIndexHistory.length - 1];
}

export function getIssueById(issueId: string): KpopIssue | undefined {
  return trendingIssues.find((issue) => issue.id === issueId);
}

export function calculateCustomScore(
  scores: Record<FactorKey, number>,
  weights: FactorWeights
): number {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return Object.entries(weights).reduce((sum, [key, weight]) => {
    const factorKey = key as FactorKey;
    return sum + scores[factorKey] * (weight / totalWeight);
  }, 0);
}
