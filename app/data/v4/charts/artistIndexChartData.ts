export type ArtistIndexDataStatus =
  | 'editorial_seed'
  | 'verified_manual'
  | 'partial_public_signal'
  | 'preview_only';

export type ArtistIndexConfidenceLevel = 'high' | 'medium' | 'low';

export type ArtistIndexGroupType =
  | 'girl_group'
  | 'boy_group'
  | 'solo'
  | 'mixed'
  | 'unit';

export type ArtistIndexCoverageStatus = 'tracked' | 'partial' | 'preview';

export type ArtistIndexTrendBand =
  | 'rising'
  | 'stable'
  | 'falling'
  | 'volatile'
  | 'insufficient_data';

export type ArtistIndexHistoryPoint = {
  date: string;
  artistId: string;
  artistName: string;
  fandexPoint: number;
  musicAlbumPoint: number;
  newsIssuePoint: number;
  snsFandomPoint: number;
  brandFitPoint: number;
  comebackActivityPoint: number;
  growthMomentumPoint: number;
  riskAdjustmentPoint: number;
  dataStatus: ArtistIndexDataStatus;
  confidenceLevel: ArtistIndexConfidenceLevel;
  note: string;
};

export type ArtistIndexChartProfile = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
  coverageStatus: ArtistIndexCoverageStatus;
  lastUpdated: string;
  history: ArtistIndexHistoryPoint[];
};

type ArtistSeed = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
  coverageStatus: ArtistIndexCoverageStatus;
  confidenceLevel: ArtistIndexConfidenceLevel;
  points: number[];
  dominantNotes: string[];
};

const dates = [
  '2026-W18',
  '2026-W19',
  '2026-W20',
  '2026-W21',
  '2026-W22',
  '2026-W23',
  '2026-W24',
  '2026-W25',
];

const artistSeeds: ArtistSeed[] = [
  {
    artistId: 'aespa',
    artistName: 'aespa',
    ticker: 'AESPA',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3920, 4010, 4180, 4310, 4520, 4660, 4810, 4960],
    dominantNotes: ['컴백 활동 반응', 'SNS 반응 확산', '브랜드 노출'],
  },
  {
    artistId: 'ive',
    artistName: 'IVE',
    ticker: 'IVE',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3860, 3940, 4070, 4230, 4390, 4510, 4630, 4780],
    dominantNotes: ['브랜드 노출', '팬덤 확산', '음원 반응'],
  },
  {
    artistId: 'riize',
    artistName: 'RIIZE',
    ticker: 'RIIZE',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3310, 3420, 3560, 3710, 3890, 4010, 4190, 4360],
    dominantNotes: ['팬덤 확산', 'SNS 반응', '활동 모멘텀'],
  },
  {
    artistId: 'lesserafim',
    artistName: 'LE SSERAFIM',
    ticker: 'LSF',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3740, 3820, 3950, 4090, 4210, 4320, 4440, 4590],
    dominantNotes: ['음원 반응', '브랜드 노출', '콘텐츠 반응'],
  },
  {
    artistId: 'newjeans',
    artistName: 'NewJeans',
    ticker: 'NWJNS',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [4100, 4160, 4210, 4270, 4320, 4380, 4450, 4510],
    dominantNotes: ['팬덤 기반', '브랜드 노출', '음원 관심'],
  },
  {
    artistId: 'blackpink',
    artistName: 'BLACKPINK',
    ticker: 'BLKPNK',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    points: [5200, 5240, 5290, 5330, 5360, 5410, 5450, 5510],
    dominantNotes: ['브랜드 노출', '글로벌 팬덤 반응', '콘텐츠 관심'],
  },
  {
    artistId: 'bts',
    artistName: 'BTS',
    ticker: 'BTS',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    points: [5900, 5940, 5990, 6030, 6070, 6110, 6160, 6200],
    dominantNotes: ['글로벌 팬덤 반응', '브랜드 노출', '음원 관심'],
  },
  {
    artistId: 'seventeen',
    artistName: 'SEVENTEEN',
    ticker: 'SVT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [4620, 4700, 4820, 4910, 5030, 5120, 5260, 5370],
    dominantNotes: ['팬덤 확산', '앨범 반응', '활동 모멘텀'],
  },
  {
    artistId: 'nmixx',
    artistName: 'NMIXX',
    ticker: 'NMIXX',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [2860, 2920, 3030, 3140, 3270, 3360, 3490, 3620],
    dominantNotes: ['SNS 반응', '음원 반응', '팬덤 확산'],
  },
  {
    artistId: 'zerobaseone',
    artistName: 'ZEROBASEONE',
    ticker: 'ZB1',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3420, 3500, 3620, 3760, 3910, 4020, 4130, 4270],
    dominantNotes: ['팬덤 확산', '컴백 활동 반응', 'SNS 반응'],
  },
  {
    artistId: 'enhypen',
    artistName: 'ENHYPEN',
    ticker: 'ENH',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [4200, 4270, 4380, 4480, 4590, 4700, 4820, 4940],
    dominantNotes: ['글로벌 팬덤 반응', '앨범 반응', '활동 모멘텀'],
  },
  {
    artistId: 'txt',
    artistName: 'TXT',
    ticker: 'TXT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [4070, 4130, 4210, 4300, 4380, 4460, 4530, 4620],
    dominantNotes: ['팬덤 기반', '음원 관심', 'SNS 반응'],
  },
  {
    artistId: 'stray-kids',
    artistName: 'Stray Kids',
    ticker: 'SKZ',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [4750, 4840, 4960, 5090, 5230, 5340, 5480, 5630],
    dominantNotes: ['글로벌 팬덤 반응', '앨범 반응', '콘텐츠 반응'],
  },
  {
    artistId: 'twice',
    artistName: 'TWICE',
    ticker: 'TWICE',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    points: [4540, 4590, 4660, 4720, 4790, 4850, 4920, 4980],
    dominantNotes: ['팬덤 기반', '브랜드 노출', '콘텐츠 관심'],
  },
  {
    artistId: 'itzy',
    artistName: 'ITZY',
    ticker: 'ITZY',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3120, 3180, 3260, 3330, 3420, 3500, 3580, 3660],
    dominantNotes: ['SNS 반응', '팬덤 기반', '활동 모멘텀'],
  },
  {
    artistId: 'nct-dream',
    artistName: 'NCT DREAM',
    ticker: 'NCTD',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3980, 4060, 4170, 4260, 4380, 4460, 4550, 4660],
    dominantNotes: ['팬덤 확산', '앨범 반응', '활동 모멘텀'],
  },
  {
    artistId: 'tws',
    artistName: 'TWS',
    ticker: 'TWS',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [2480, 2580, 2720, 2890, 3050, 3190, 3370, 3540],
    dominantNotes: ['신규 팬덤 반응', 'SNS 반응', '활동 모멘텀'],
  },
  {
    artistId: 'boynextdoor',
    artistName: 'BOYNEXTDOOR',
    ticker: 'BND',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [2590, 2680, 2790, 2920, 3060, 3180, 3310, 3460],
    dominantNotes: ['콘텐츠 반응', '팬덤 확산', 'SNS 반응'],
  },
  {
    artistId: 'babymonster',
    artistName: 'BABYMONSTER',
    ticker: 'BABY',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [2840, 2960, 3120, 3290, 3480, 3650, 3810, 3990],
    dominantNotes: ['신규 팬덤 반응', '콘텐츠 반응', 'SNS 확산'],
  },
  {
    artistId: 'illit',
    artistName: 'ILLIT',
    ticker: 'ILLIT',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [3040, 3160, 3290, 3410, 3520, 3610, 3700, 3820],
    dominantNotes: ['음원 반응', 'SNS 반응', '팬덤 확산'],
  },
  {
    artistId: 'kiss-of-life',
    artistName: 'KISS OF LIFE',
    ticker: 'KIOF',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    points: [2710, 2800, 2910, 3040, 3180, 3320, 3460, 3610],
    dominantNotes: ['SNS 반응', '콘텐츠 반응', '팬덤 확산'],
  },
  {
    artistId: 'triples',
    artistName: 'tripleS',
    ticker: 'TRPLS',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [2310, 2390, 2480, 2600, 2740, 2860, 2990, 3130],
    dominantNotes: ['팬덤 확산', '콘텐츠 반응', 'SNS 반응'],
  },
  {
    artistId: 'nexz',
    artistName: 'NEXZ',
    ticker: 'NEXZ',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1980, 2070, 2190, 2320, 2450, 2590, 2730, 2880],
    dominantNotes: ['신규 팬덤 반응', '콘텐츠 반응', '활동 모멘텀'],
  },
  {
    artistId: 'meovv',
    artistName: 'MEOVV',
    ticker: 'MEOVV',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1900, 2010, 2150, 2310, 2480, 2630, 2790, 2960],
    dominantNotes: ['신규 팬덤 반응', 'SNS 반응', '브랜드 노출'],
  },
  {
    artistId: 'izna',
    artistName: 'izna',
    ticker: 'IZNA',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1850, 1940, 2050, 2180, 2320, 2450, 2600, 2740],
    dominantNotes: ['신규 팬덤 반응', '콘텐츠 반응', 'SNS 반응'],
  },
  {
    artistId: 'hearts2hearts',
    artistName: 'Hearts2Hearts',
    ticker: 'H2H',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1760, 1870, 2010, 2170, 2350, 2520, 2680, 2860],
    dominantNotes: ['신규 팬덤 반응', '브랜드 노출', 'SNS 반응'],
  },
  {
    artistId: 'cortis',
    artistName: 'CORTIS',
    ticker: 'CRTS',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1680, 1770, 1880, 2010, 2150, 2280, 2420, 2570],
    dominantNotes: ['신규 팬덤 반응', '콘텐츠 반응', '활동 모멘텀'],
  },
  {
    artistId: 'rescene',
    artistName: 'RESCENE',
    ticker: 'RSCN',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    points: [1700, 1780, 1880, 1990, 2110, 2230, 2360, 2500],
    dominantNotes: ['SNS 반응', '콘텐츠 반응', '팬덤 확산'],
  },
];

function createHistoryPoint(
  seed: ArtistSeed,
  fandexPoint: number,
  index: number,
): ArtistIndexHistoryPoint {
  const pointWeight = fandexPoint / 100;
  const musicAlbumPoint = Math.round(pointWeight * (24 + (index % 3)));
  const newsIssuePoint = Math.round(pointWeight * (14 + (index % 2)));
  const snsFandomPoint = Math.round(pointWeight * (29 + (index % 4)));
  const brandFitPoint = Math.round(pointWeight * (18 + (index % 3)));
  const comebackActivityPoint = Math.round(pointWeight * (12 + (index % 4)));
  const growthMomentumPoint = Math.round(pointWeight * (11 + (index % 5)));
  const rawTotal =
    musicAlbumPoint +
    newsIssuePoint +
    snsFandomPoint +
    brandFitPoint +
    comebackActivityPoint +
    growthMomentumPoint;
  const riskAdjustmentPoint = Math.max(rawTotal - fandexPoint, 0);

  return {
    date: dates[index],
    artistId: seed.artistId,
    artistName: seed.artistName,
    fandexPoint,
    musicAlbumPoint,
    newsIssuePoint,
    snsFandomPoint,
    brandFitPoint,
    comebackActivityPoint,
    growthMomentumPoint,
    riskAdjustmentPoint,
    dataStatus:
      seed.coverageStatus === 'tracked'
        ? 'editorial_seed'
        : seed.coverageStatus === 'partial'
          ? 'partial_public_signal'
          : 'preview_only',
    confidenceLevel: seed.confidenceLevel,
    note: seed.dominantNotes[index % seed.dominantNotes.length],
  };
}

export function createArtistIndexChartProfiles(): ArtistIndexChartProfile[] {
  return artistSeeds.map((seed) => ({
    artistId: seed.artistId,
    artistName: seed.artistName,
    ticker: seed.ticker,
    groupType: seed.groupType,
    coverageStatus: seed.coverageStatus,
    lastUpdated: '2026-06-26',
    history: seed.points.map((point, index) =>
      createHistoryPoint(seed, point, index),
    ),
  }));
}

export const artistIndexChartProfiles = createArtistIndexChartProfiles();

export function getArtistIndexChartProfile(artistId: string) {
  return artistIndexChartProfiles.find((profile) => profile.artistId === artistId);
}

export function getAllTrackedArtistIndexProfiles() {
  return artistIndexChartProfiles.filter(
    (profile) => profile.coverageStatus === 'tracked',
  );
}

export function getLatestArtistIndexPoint(artistId: string) {
  const profile = getArtistIndexChartProfile(artistId);
  return profile?.history[profile.history.length - 1];
}

export function calculateIndexDelta(history: ArtistIndexHistoryPoint[]) {
  const first = history[0];
  const latest = history[history.length - 1];

  if (!first || !latest) {
    return 0;
  }

  return latest.fandexPoint - first.fandexPoint;
}

export function calculateIndexDeltaPercentForInternalUseOnly(
  history: ArtistIndexHistoryPoint[],
) {
  const first = history[0];

  if (!first || first.fandexPoint === 0) {
    return 0;
  }

  return calculateIndexDelta(history) / first.fandexPoint;
}

export function getIndexTrendBand(
  history: ArtistIndexHistoryPoint[],
): ArtistIndexTrendBand {
  if (history.length < 3) {
    return 'insufficient_data';
  }

  const deltas = history.slice(1).map((point, index) => {
    const previous = history[index];
    return point.fandexPoint - previous.fandexPoint;
  });
  const positiveCount = deltas.filter((delta) => delta > 0).length;
  const negativeCount = deltas.filter((delta) => delta < 0).length;
  const totalDelta = calculateIndexDelta(history);
  const averageAbsDelta =
    deltas.reduce((total, delta) => total + Math.abs(delta), 0) / deltas.length;
  const directionChanges = deltas.slice(1).filter((delta, index) => {
    const previous = deltas[index];
    return Math.sign(delta) !== Math.sign(previous);
  }).length;

  if (directionChanges >= 3 && averageAbsDelta >= 80) {
    return 'volatile';
  }

  if (positiveCount >= deltas.length - 1 && totalDelta >= 180) {
    return 'rising';
  }

  if (negativeCount >= deltas.length - 1 && totalDelta <= -120) {
    return 'falling';
  }

  return 'stable';
}

export function getCoverageSummary(profiles: ArtistIndexChartProfile[]) {
  const trackedArtistCount = profiles.filter(
    (profile) => profile.coverageStatus === 'tracked',
  ).length;
  const partialArtistCount = profiles.filter(
    (profile) => profile.coverageStatus === 'partial',
  ).length;
  const previewArtistCount = profiles.filter(
    (profile) => profile.coverageStatus === 'preview',
  ).length;
  const lastUpdated = profiles.reduce(
    (latest, profile) =>
      profile.lastUpdated > latest ? profile.lastUpdated : latest,
    profiles[0]?.lastUpdated ?? '',
  );
  const dataStatus = 'editorial_seed';

  return {
    trackedArtistCount,
    partialArtistCount,
    previewArtistCount,
    totalArtistCount: profiles.length,
    lastUpdated,
    dataStatus,
  };
}

export function runArtistIndexChartDataShapeCheck() {
  const profiles = createArtistIndexChartProfiles();
  const hasEnoughArtists = profiles.length >= 18;
  const hasEightPoints = profiles.every((profile) => profile.history.length >= 8);
  const hasValidLatestPoints = profiles.every((profile) => {
    const latest = profile.history[profile.history.length - 1];
    return Boolean(latest && latest.fandexPoint > 0);
  });

  return {
    ok: hasEnoughArtists && hasEightPoints && hasValidLatestPoints,
    profileCount: profiles.length,
    hasEnoughArtists,
    hasEightPoints,
    hasValidLatestPoints,
  };
}
