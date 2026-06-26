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

type ArtistSeedInput = Omit<ArtistSeed, 'points' | 'dominantNotes'> & {
  startPoint: number;
  weeklyGains: number[];
  dominantNotes?: string[];
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

const defaultNotes = [
  'SNS reaction lift',
  'activity momentum build',
  'brand exposure expansion',
  'fandom spread observed',
  'music and album response preview',
  'global response preview',
];

function createPointSeries(startPoint: number, weeklyGains: number[]) {
  const gains = weeklyGains.length >= 7 ? weeklyGains : [70, 90, 110, 95, 120, 90, 110];
  const points = [startPoint];

  gains.slice(0, 7).forEach((gain) => {
    points.push(points[points.length - 1] + gain);
  });

  return points;
}

function createSeed(input: ArtistSeedInput): ArtistSeed {
  return {
    artistId: input.artistId,
    artistName: input.artistName,
    ticker: input.ticker,
    groupType: input.groupType,
    coverageStatus: input.coverageStatus,
    confidenceLevel: input.confidenceLevel,
    points: createPointSeries(input.startPoint, input.weeklyGains),
    dominantNotes: input.dominantNotes ?? defaultNotes,
  };
}

const artistSeeds: ArtistSeed[] = [
  createSeed({
    artistId: 'aespa',
    artistName: 'aespa',
    ticker: 'AESPA',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3920,
    weeklyGains: [90, 170, 130, 210, 140, 150, 150],
  }),
  createSeed({
    artistId: 'ive',
    artistName: 'IVE',
    ticker: 'IVE',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3860,
    weeklyGains: [80, 130, 160, 160, 120, 120, 150],
  }),
  createSeed({
    artistId: 'riize',
    artistName: 'RIIZE',
    ticker: 'RIIZE',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3310,
    weeklyGains: [110, 140, 150, 180, 120, 180, 170],
  }),
  createSeed({
    artistId: 'lesserafim',
    artistName: 'LE SSERAFIM',
    ticker: 'LSF',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3740,
    weeklyGains: [80, 130, 140, 120, 110, 120, 150],
  }),
  createSeed({
    artistId: 'newjeans',
    artistName: 'NewJeans',
    ticker: 'NWJNS',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4100,
    weeklyGains: [60, 50, 60, 50, 60, 70, 60],
  }),
  createSeed({
    artistId: 'blackpink',
    artistName: 'BLACKPINK',
    ticker: 'BLKPNK',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 5200,
    weeklyGains: [40, 50, 40, 30, 50, 40, 60],
  }),
  createSeed({
    artistId: 'bts',
    artistName: 'BTS',
    ticker: 'BTS',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 5900,
    weeklyGains: [40, 50, 40, 40, 40, 50, 40],
  }),
  createSeed({
    artistId: 'seventeen',
    artistName: 'SEVENTEEN',
    ticker: 'SVT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4620,
    weeklyGains: [80, 120, 90, 120, 90, 140, 110],
  }),
  createSeed({
    artistId: 'nmixx',
    artistName: 'NMIXX',
    ticker: 'NMIXX',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2860,
    weeklyGains: [60, 110, 110, 130, 90, 130, 130],
  }),
  createSeed({
    artistId: 'zerobaseone',
    artistName: 'ZEROBASEONE',
    ticker: 'ZB1',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3420,
    weeklyGains: [80, 120, 140, 150, 110, 110, 140],
  }),
  createSeed({
    artistId: 'enhypen',
    artistName: 'ENHYPEN',
    ticker: 'ENH',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4200,
    weeklyGains: [70, 110, 100, 110, 110, 120, 120],
  }),
  createSeed({
    artistId: 'txt',
    artistName: 'TXT',
    ticker: 'TXT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4070,
    weeklyGains: [60, 80, 90, 80, 80, 70, 90],
  }),
  createSeed({
    artistId: 'stray-kids',
    artistName: 'Stray Kids',
    ticker: 'SKZ',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4750,
    weeklyGains: [90, 120, 130, 140, 110, 140, 150],
  }),
  createSeed({
    artistId: 'twice',
    artistName: 'TWICE',
    ticker: 'TWICE',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 4540,
    weeklyGains: [50, 70, 60, 70, 60, 70, 60],
  }),
  createSeed({
    artistId: 'itzy',
    artistName: 'ITZY',
    ticker: 'ITZY',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3120,
    weeklyGains: [60, 80, 70, 90, 80, 80, 80],
  }),
  createSeed({
    artistId: 'nct-dream',
    artistName: 'NCT DREAM',
    ticker: 'NCTD',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3980,
    weeklyGains: [80, 110, 90, 120, 80, 90, 110],
  }),
  createSeed({
    artistId: 'tws',
    artistName: 'TWS',
    ticker: 'TWS',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2480,
    weeklyGains: [100, 140, 170, 160, 140, 180, 170],
  }),
  createSeed({
    artistId: 'boynextdoor',
    artistName: 'BOYNEXTDOOR',
    ticker: 'BND',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2590,
    weeklyGains: [90, 110, 130, 140, 120, 130, 150],
  }),
  createSeed({
    artistId: 'babymonster',
    artistName: 'BABYMONSTER',
    ticker: 'BABY',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2840,
    weeklyGains: [120, 160, 170, 190, 170, 160, 180],
  }),
  createSeed({
    artistId: 'illit',
    artistName: 'ILLIT',
    ticker: 'ILLIT',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3040,
    weeklyGains: [120, 130, 120, 110, 90, 90, 120],
  }),
  createSeed({
    artistId: 'kiss-of-life',
    artistName: 'KISS OF LIFE',
    ticker: 'KIOF',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2710,
    weeklyGains: [90, 110, 130, 140, 140, 140, 150],
  }),
  createSeed({
    artistId: 'triples',
    artistName: 'tripleS',
    ticker: 'TRPLS',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2310,
    weeklyGains: [80, 90, 120, 140, 120, 130, 140],
  }),
  createSeed({
    artistId: 'nexz',
    artistName: 'NEXZ',
    ticker: 'NEXZ',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1980,
    weeklyGains: [90, 120, 130, 130, 140, 140, 150],
  }),
  createSeed({
    artistId: 'meovv',
    artistName: 'MEOVV',
    ticker: 'MEOVV',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1900,
    weeklyGains: [110, 140, 160, 170, 150, 160, 170],
  }),
  createSeed({
    artistId: 'izna',
    artistName: 'izna',
    ticker: 'IZNA',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1850,
    weeklyGains: [90, 110, 130, 140, 130, 150, 140],
  }),
  createSeed({
    artistId: 'hearts2hearts',
    artistName: 'Hearts2Hearts',
    ticker: 'H2H',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1760,
    weeklyGains: [110, 140, 160, 180, 170, 160, 180],
  }),
  createSeed({
    artistId: 'cortis',
    artistName: 'CORTIS',
    ticker: 'CRTS',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1680,
    weeklyGains: [90, 110, 130, 140, 130, 140, 150],
  }),
  createSeed({
    artistId: 'rescene',
    artistName: 'RESCENE',
    ticker: 'RSCN',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 1700,
    weeklyGains: [80, 100, 110, 120, 120, 130, 140],
  }),
  createSeed({
    artistId: 'ateez',
    artistName: 'ATEEZ',
    ticker: 'ATZ',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 4320,
    weeklyGains: [90, 120, 130, 120, 140, 130, 150],
  }),
  createSeed({
    artistId: 'the-boyz',
    artistName: 'THE BOYZ',
    ticker: 'TBZ',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3460,
    weeklyGains: [70, 90, 100, 110, 100, 110, 120],
  }),
  createSeed({
    artistId: 'monsta-x',
    artistName: 'MONSTA X',
    ticker: 'MX',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3710,
    weeklyGains: [50, 70, 60, 80, 70, 80, 80],
  }),
  createSeed({
    artistId: 'exo',
    artistName: 'EXO',
    ticker: 'EXO',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 4680,
    weeklyGains: [40, 60, 60, 50, 70, 60, 70],
  }),
  createSeed({
    artistId: 'shinee',
    artistName: 'SHINee',
    ticker: 'SHN',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 4020,
    weeklyGains: [40, 60, 50, 60, 60, 70, 70],
  }),
  createSeed({
    artistId: 'red-velvet',
    artistName: 'Red Velvet',
    ticker: 'RV',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3890,
    weeklyGains: [50, 60, 70, 60, 70, 70, 80],
  }),
  createSeed({
    artistId: 'nct-127',
    artistName: 'NCT 127',
    ticker: 'NCT127',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3810,
    weeklyGains: [70, 90, 90, 100, 90, 100, 110],
  }),
  createSeed({
    artistId: 'nct-wish',
    artistName: 'NCT WISH',
    ticker: 'NCTW',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2440,
    weeklyGains: [100, 120, 130, 150, 140, 150, 160],
  }),
  createSeed({
    artistId: 'wayv',
    artistName: 'WayV',
    ticker: 'WAYV',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3150,
    weeklyGains: [60, 70, 80, 80, 90, 80, 90],
  }),
  createSeed({
    artistId: 'treasure',
    artistName: 'TREASURE',
    ticker: 'TRSR',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3380,
    weeklyGains: [80, 100, 110, 120, 110, 120, 130],
  }),
  createSeed({
    artistId: 'mamamoo',
    artistName: 'MAMAMOO',
    ticker: 'MMM',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3520,
    weeklyGains: [50, 60, 60, 70, 70, 80, 80],
  }),
  createSeed({
    artistId: 'oh-my-girl',
    artistName: 'OH MY GIRL',
    ticker: 'OMG',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3100,
    weeklyGains: [50, 60, 60, 70, 70, 70, 80],
  }),
  createSeed({
    artistId: 'gidle',
    artistName: '(G)I-DLE',
    ticker: 'GIDLE',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3920,
    weeklyGains: [80, 110, 120, 130, 120, 130, 140],
  }),
  createSeed({
    artistId: 'stayc',
    artistName: 'STAYC',
    ticker: 'STAYC',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2860,
    weeklyGains: [70, 90, 100, 100, 110, 100, 120],
  }),
  createSeed({
    artistId: 'fromis-9',
    artistName: 'fromis_9',
    ticker: 'FRM9',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 2760,
    weeklyGains: [50, 70, 70, 80, 80, 80, 90],
  }),
  createSeed({
    artistId: 'kep1er',
    artistName: 'Kep1er',
    ticker: 'KEP',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2980,
    weeklyGains: [70, 90, 100, 110, 100, 110, 120],
  }),
  createSeed({
    artistId: 'viviz',
    artistName: 'VIVIZ',
    ticker: 'VVZ',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 2680,
    weeklyGains: [50, 60, 70, 70, 80, 80, 80],
  }),
  createSeed({
    artistId: 'billlie',
    artistName: 'Billlie',
    ticker: 'BLL',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2420,
    weeklyGains: [70, 80, 90, 100, 100, 110, 110],
  }),
  createSeed({
    artistId: 'h1-key',
    artistName: 'H1-KEY',
    ticker: 'H1K',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2340,
    weeklyGains: [70, 80, 90, 90, 100, 110, 110],
  }),
  createSeed({
    artistId: 'qwer',
    artistName: 'QWER',
    ticker: 'QWER',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2550,
    weeklyGains: [110, 130, 150, 150, 160, 160, 170],
  }),
  createSeed({
    artistId: 'artms',
    artistName: 'ARTMS',
    ticker: 'ARTMS',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2200,
    weeklyGains: [70, 90, 100, 110, 110, 120, 120],
  }),
  createSeed({
    artistId: 'purple-kiss',
    artistName: 'PURPLE KISS',
    ticker: 'PRPK',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2180,
    weeklyGains: [60, 80, 90, 90, 100, 100, 110],
  }),
  createSeed({
    artistId: 'everglow',
    artistName: 'EVERGLOW',
    ticker: 'EVG',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2320,
    weeklyGains: [50, 70, 80, 80, 90, 90, 100],
  }),
  createSeed({
    artistId: 'weeekly',
    artistName: 'Weeekly',
    ticker: 'WKLY',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2260,
    weeklyGains: [50, 70, 80, 80, 90, 90, 100],
  }),
  createSeed({
    artistId: 'wjsn',
    artistName: 'WJSN',
    ticker: 'WJSN',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 2920,
    weeklyGains: [40, 60, 60, 70, 70, 80, 80],
  }),
  createSeed({
    artistId: 'girls-generation',
    artistName: "Girls' Generation",
    ticker: 'SNSD',
    groupType: 'girl_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 4300,
    weeklyGains: [30, 50, 50, 50, 60, 60, 60],
  }),
  createSeed({
    artistId: 'highlight',
    artistName: 'HIGHLIGHT',
    ticker: 'HLGT',
    groupType: 'boy_group',
    coverageStatus: 'partial',
    confidenceLevel: 'low',
    startPoint: 3180,
    weeklyGains: [40, 50, 60, 60, 70, 70, 80],
  }),
  createSeed({
    artistId: 'cravity',
    artistName: 'CRAVITY',
    ticker: 'CRVT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2460,
    weeklyGains: [70, 90, 100, 100, 110, 110, 120],
  }),
  createSeed({
    artistId: 'xikers',
    artistName: 'xikers',
    ticker: 'XIK',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2380,
    weeklyGains: [90, 110, 120, 130, 130, 140, 150],
  }),
  createSeed({
    artistId: 'p1harmony',
    artistName: 'P1Harmony',
    ticker: 'P1H',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2820,
    weeklyGains: [80, 100, 110, 120, 120, 130, 130],
  }),
  createSeed({
    artistId: 'tempest',
    artistName: 'TEMPEST',
    ticker: 'TMPS',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2180,
    weeklyGains: [60, 80, 90, 90, 100, 100, 110],
  }),
  createSeed({
    artistId: 'evnne',
    artistName: 'EVNNE',
    ticker: 'EVN',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2360,
    weeklyGains: [80, 100, 110, 120, 120, 130, 130],
  }),
  createSeed({
    artistId: 'oneus',
    artistName: 'ONEUS',
    ticker: 'ONS',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2580,
    weeklyGains: [60, 70, 80, 90, 90, 100, 100],
  }),
  createSeed({
    artistId: 'cix',
    artistName: 'CIX',
    ticker: 'CIX',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2480,
    weeklyGains: [50, 70, 80, 80, 90, 90, 100],
  }),
  createSeed({
    artistId: 'ab6ix',
    artistName: 'AB6IX',
    ticker: 'AB6',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2520,
    weeklyGains: [50, 70, 80, 90, 90, 90, 100],
  }),
  createSeed({
    artistId: 'sf9',
    artistName: 'SF9',
    ticker: 'SF9',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2620,
    weeklyGains: [40, 60, 70, 70, 80, 80, 90],
  }),
  createSeed({
    artistId: 'epex',
    artistName: 'EPEX',
    ticker: 'EPEX',
    groupType: 'boy_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2140,
    weeklyGains: [60, 80, 90, 90, 100, 100, 110],
  }),
  createSeed({
    artistId: 'katseye',
    artistName: 'KATSEYE',
    ticker: 'KATS',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 2420,
    weeklyGains: [120, 150, 160, 170, 170, 180, 190],
  }),
  createSeed({
    artistId: 'vcha',
    artistName: 'VCHA',
    ticker: 'VCHA',
    groupType: 'girl_group',
    coverageStatus: 'preview',
    confidenceLevel: 'low',
    startPoint: 2100,
    weeklyGains: [80, 100, 110, 120, 120, 130, 130],
  }),
  createSeed({
    artistId: 'andteam',
    artistName: '&TEAM',
    ticker: 'ANDT',
    groupType: 'boy_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3040,
    weeklyGains: [90, 110, 120, 130, 130, 140, 140],
  }),
  createSeed({
    artistId: 'xg',
    artistName: 'XG',
    ticker: 'XG',
    groupType: 'girl_group',
    coverageStatus: 'tracked',
    confidenceLevel: 'medium',
    startPoint: 3260,
    weeklyGains: [100, 120, 140, 140, 150, 150, 160],
  }),
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
  const countByCoverage = (status: ArtistIndexCoverageStatus) =>
    profiles.filter((profile) => profile.coverageStatus === status).length;
  const countByGroupType = (groupType: ArtistIndexGroupType) =>
    profiles.filter((profile) => profile.groupType === groupType).length;
  const lastUpdated = profiles.reduce(
    (latest, profile) =>
      profile.lastUpdated > latest ? profile.lastUpdated : latest,
    profiles[0]?.lastUpdated ?? '',
  );
  const dataStatus = 'editorial_seed / partial_public_signal / preview_only';

  return {
    trackedArtistCount: countByCoverage('tracked'),
    partialArtistCount: countByCoverage('partial'),
    previewArtistCount: countByCoverage('preview'),
    totalArtistCount: profiles.length,
    girlGroupCount: countByGroupType('girl_group'),
    boyGroupCount: countByGroupType('boy_group'),
    soloCount: countByGroupType('solo'),
    unitCount: countByGroupType('unit'),
    mixedCount: countByGroupType('mixed'),
    lastUpdated,
    dataStatus,
  };
}

export function runArtistIndexChartDataShapeCheck() {
  const profiles = createArtistIndexChartProfiles();
  const ids = profiles.map((profile) => profile.artistId);
  const hasEnoughArtists = profiles.length >= 60;
  const hasEightPoints = profiles.every((profile) => profile.history.length === 8);
  const hasValidLatestPoints = profiles.every((profile) => {
    const latest = profile.history[profile.history.length - 1];
    return Boolean(latest && latest.fandexPoint > 0);
  });
  const hasUniqueArtistIds = new Set(ids).size === ids.length;

  return {
    ok:
      hasEnoughArtists &&
      hasEightPoints &&
      hasValidLatestPoints &&
      hasUniqueArtistIds,
    profileCount: profiles.length,
    hasEnoughArtists,
    hasEightPoints,
    hasValidLatestPoints,
    hasUniqueArtistIds,
  };
}
