import { artists, type Artist } from './artists';

export type FactorKey =
  | 'musicAlbum'
  | 'officialContent'
  | 'officialSns'
  | 'searchNews'
  | 'globalReaction'
  | 'agencyFundamental'
  | 'awards'
  | 'fanPlatform'
  | 'fanViral';

export type SignalType =
  | 'surging'
  | 'rising'
  | 'neutral'
  | 'falling'
  | 'plunging'
  | 'volume_spike';

export type FactorDefinition = {
  key: FactorKey;
  label: string;
  description: string;
  defaultWeight: number;
  speed: 'fast' | 'slow';
};

export type FactorScores = Record<FactorKey, number>;
export type FactorWeights = Record<FactorKey, number>;

export type PricePresetKey =
  | 'balanced'
  | 'music'
  | 'viral'
  | 'global'
  | 'fandom'
  | 'fundamental';

export type MockPriceOptions = {
  enabledFactors?: FactorKey[];
  weights?: Partial<FactorWeights>;
  now?: Date;
};

export type ArtistPrice = {
  artistId: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
  agency: string;
  trackingTier: Artist['trackingTier'];
  price: number;
  previousPrice: number;
  change: number;
  changeRate: number;
  volume: number;
  fanCap: number;
  momentum: number;
  signal: SignalType;
  confidence: number;
  factorScores: FactorScores;
  customScore: number;
  updatedAt: string;
};

export const factorDefinitions: FactorDefinition[] = [
  {
    key: 'musicAlbum',
    label: '음원·앨범',
    description: '초동, 음원 순위, 스트리밍 성적',
    defaultWeight: 22,
    speed: 'slow',
  },
  {
    key: 'officialContent',
    label: '공식 콘텐츠',
    description: 'MV, 티저, 앨범 프로모션, 자체 웹예능 반응',
    defaultWeight: 12,
    speed: 'fast',
  },
  {
    key: 'officialSns',
    label: '공식 SNS',
    description: '인스타그램, X, 틱톡 등 공식 채널 반응',
    defaultWeight: 16,
    speed: 'fast',
  },
  {
    key: 'searchNews',
    label: '검색·뉴스',
    description: '포털 검색량, 뉴스, 블로그, 카페글 반응',
    defaultWeight: 8,
    speed: 'fast',
  },
  {
    key: 'globalReaction',
    label: '해외 반응',
    description: '해외 뉴스, 글로벌 차트, 글로벌 SNS 반응',
    defaultWeight: 14,
    speed: 'fast',
  },
  {
    key: 'agencyFundamental',
    label: '소속사 펀더멘털',
    description: '소속사 매출, 영업이익, 시가총액, 회사 규모',
    defaultWeight: 12,
    speed: 'slow',
  },
  {
    key: 'awards',
    label: '음악방송·수상',
    description: '음악방송 1위, 시상식, 공식 수상 이력',
    defaultWeight: 6,
    speed: 'slow',
  },
  {
    key: 'fanPlatform',
    label: '팬 플랫폼',
    description: '팬 소통 플랫폼, 멤버십, 공식 팬덤 자산',
    defaultWeight: 6,
    speed: 'slow',
  },
  {
    key: 'fanViral',
    label: '팬채널·바이럴',
    description: '팬채널, 바이럴 채널, 2차 확산 콘텐츠',
    defaultWeight: 4,
    speed: 'fast',
  },
];

export const allFactorKeys = factorDefinitions.map(
  (factor) => factor.key
) as FactorKey[];

export const defaultFactorWeights = factorDefinitions.reduce(
  (acc, factor) => {
    acc[factor.key] = factor.defaultWeight;
    return acc;
  },
  {} as FactorWeights
);

export const pricePresets: Record<
  PricePresetKey,
  {
    label: string;
    enabledFactors: FactorKey[];
    description: string;
  }
> = {
  balanced: {
    label: '종합형',
    enabledFactors: allFactorKeys,
    description: '모든 요소를 균형 있게 반영한 기본 FANDEX Price',
  },
  music: {
    label: '음원형',
    enabledFactors: ['musicAlbum', 'officialContent', 'awards'],
    description: '음원, 앨범, 공식 성적 중심 지표',
  },
  viral: {
    label: '바이럴형',
    enabledFactors: ['officialContent', 'officialSns', 'searchNews', 'fanViral'],
    description: 'SNS, 유튜브, 검색량, 팬채널 확산 중심 지표',
  },
  global: {
    label: '글로벌형',
    enabledFactors: ['globalReaction', 'officialContent', 'officialSns', 'musicAlbum'],
    description: '해외 반응과 글로벌 콘텐츠 반응 중심 지표',
  },
  fandom: {
    label: '팬덤형',
    enabledFactors: ['fanPlatform', 'fanViral', 'musicAlbum', 'searchNews'],
    description: '팬덤 자산, 구매력, 커뮤니티 반응 중심 지표',
  },
  fundamental: {
    label: '펀더멘털형',
    enabledFactors: ['agencyFundamental', 'musicAlbum', 'awards', 'fanPlatform'],
    description: '소속사 규모와 장기 안정성 중심 지표',
  },
};

const syntheticFloatByTier: Record<Artist['trackingTier'], number> = {
  realtime: 120_000_000,
  hot: 80_000_000,
  standard: 45_000_000,
  archive: 15_000_000,
};

const tierBoost: Record<Artist['trackingTier'], number> = {
  realtime: 7,
  hot: 4,
  standard: 1,
  archive: -3,
};

const agencyBoost: Record<string, number> = {
  HYBE: 7,
  SM: 6,
  JYP: 5,
  YG: 5,
  STARSHIP: 4,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function hashString(input: string) {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function seededRandom(input: string) {
  const x = Math.sin(hashString(input)) * 10000;
  return x - Math.floor(x);
}

function getMinuteSeed(now: Date) {
  return Math.floor(now.getTime() / 60_000);
}

function getArtistBaseScore(artist: Artist) {
  const agencyScore = agencyBoost[artist.agencyTicker] ?? 0;
  const trackingScore = tierBoost[artist.trackingTier] ?? 0;
  const rookiePenalty = artist.generation === 'rookie' ? -2 : 0;

  return 52 + agencyScore + trackingScore + rookiePenalty;
}

function getFactorBias(artist: Artist, factorKey: FactorKey) {
  const isGirlGroup = artist.gender === 'girl_group';
  const isBoyGroup = artist.gender === 'boy_group';
  const isRookie = artist.generation === 'rookie';

  const factorBiasMap: Record<FactorKey, number> = {
    musicAlbum: isGirlGroup ? 3 : 1,
    officialContent: isRookie ? 5 : 2,
    officialSns: isGirlGroup ? 5 : 2,
    searchNews: artist.trackingTier === 'realtime' ? 5 : 1,
    globalReaction: artist.countryFocus.includes('GLOBAL') ? 5 : 1,
    agencyFundamental: agencyBoost[artist.agencyTicker] ?? 1,
    awards: isRookie ? -2 : 2,
    fanPlatform: isBoyGroup ? 4 : 2,
    fanViral: isRookie ? 5 : 2,
  };

  return factorBiasMap[factorKey];
}

function generateFactorScore(
  artist: Artist,
  factorKey: FactorKey,
  minuteSeed: number
) {
  const baseScore = getArtistBaseScore(artist);
  const factorBias = getFactorBias(artist, factorKey);

  const randomNoise =
    (seededRandom(`${artist.id}-${factorKey}-${minuteSeed}`) - 0.5) * 12;

  const wave =
    Math.sin((minuteSeed + hashString(`${artist.id}-${factorKey}`)) / 18) * 6;

  const score = baseScore + factorBias + randomNoise + wave;

  return round(clamp(score, 10, 98), 1);
}

function getFactorScores(artist: Artist, minuteSeed: number): FactorScores {
  return allFactorKeys.reduce((acc, factorKey) => {
    acc[factorKey] = generateFactorScore(artist, factorKey, minuteSeed);
    return acc;
  }, {} as FactorScores);
}

function getNormalizedWeights(options: MockPriceOptions): FactorWeights {
  const enabledFactors = options.enabledFactors ?? allFactorKeys;
  const customWeights = options.weights ?? {};

  const activeWeights = enabledFactors.reduce((acc, factorKey) => {
    acc[factorKey] = customWeights[factorKey] ?? defaultFactorWeights[factorKey];
    return acc;
  }, {} as Partial<FactorWeights>);

  const totalWeight = Object.values(activeWeights).reduce(
    (sum, weight) => sum + (weight ?? 0),
    0
  );

  return allFactorKeys.reduce((acc, factorKey) => {
    const rawWeight = activeWeights[factorKey] ?? 0;
    acc[factorKey] = totalWeight > 0 ? rawWeight / totalWeight : 0;
    return acc;
  }, {} as FactorWeights);
}

function calculateScore(scores: FactorScores, weights: FactorWeights) {
  const score = allFactorKeys.reduce((sum, factorKey) => {
    return sum + scores[factorKey] * weights[factorKey];
  }, 0);

  return round(score, 2);
}

function calculatePrice(score: number, momentum: number) {
  const basePrice = 100 * Math.exp((score - 50) / 50);
  const momentumBoost = 1 + momentum / 100;
  return round(clamp(basePrice * momentumBoost, 20, 500), 2);
}

function getSignal(changeRate: number, volume: number): SignalType {
  if (changeRate >= 8) return 'surging';
  if (changeRate >= 2.5) return 'rising';
  if (changeRate <= -8) return 'plunging';
  if (changeRate <= -2.5) return 'falling';
  if (volume >= 12_000) return 'volume_spike';
  return 'neutral';
}

export function getMockArtistPrice(
  artist: Artist,
  options: MockPriceOptions = {}
): ArtistPrice {
  const now = options.now ?? new Date();
  const minuteSeed = getMinuteSeed(now);
  const previousMinuteSeed = minuteSeed - 1;

  const weights = getNormalizedWeights(options);

  const factorScores = getFactorScores(artist, minuteSeed);
  const previousFactorScores = getFactorScores(artist, previousMinuteSeed);

  const customScore = calculateScore(factorScores, weights);
  const previousScore = calculateScore(previousFactorScores, weights);

  const momentum = round(customScore - previousScore, 2);

  const price = calculatePrice(customScore, momentum);
  const previousPrice = calculatePrice(previousScore, 0);

  const change = round(price - previousPrice, 2);
  const changeRate = round((change / previousPrice) * 100, 2);

  const volumeBase = customScore * 90;
  const volatilityVolume = Math.abs(momentum) * 900;
  const randomVolume =
    seededRandom(`${artist.id}-volume-${minuteSeed}`) * 3500;

  const volume = Math.round(volumeBase + volatilityVolume + randomVolume);

  const syntheticFloat = syntheticFloatByTier[artist.trackingTier];
  const fanCap = Math.round(price * syntheticFloat);

  const enabledFactorCount = options.enabledFactors?.length ?? allFactorKeys.length;

  const confidence = round(
    clamp(
      58 +
        enabledFactorCount * 3 +
        tierBoost[artist.trackingTier] +
        seededRandom(`${artist.id}-confidence-${minuteSeed}`) * 12 -
        Math.abs(momentum) * 1.5,
      35,
      98
    ),
    1
  );

  return {
    artistId: artist.id,
    ticker: artist.ticker,
    nameKo: artist.nameKo,
    nameEn: artist.nameEn,
    agency: artist.agency,
    trackingTier: artist.trackingTier,
    price,
    previousPrice,
    change,
    changeRate,
    volume,
    fanCap,
    momentum,
    signal: getSignal(changeRate, volume),
    confidence,
    factorScores,
    customScore,
    updatedAt: now.toISOString(),
  };
}

export function getMockArtistPrices(options: MockPriceOptions = {}) {
  return artists
    .map((artist) => getMockArtistPrice(artist, options))
    .sort((a, b) => b.fanCap - a.fanCap);
}

export function getMockArtistPriceById(
  artistId: string,
  options: MockPriceOptions = {}
) {
  const artist = artists.find((item) => item.id === artistId);

  if (!artist) {
    return undefined;
  }

  return getMockArtistPrice(artist, options);
}

export function getMockMarketSummary(options: MockPriceOptions = {}) {
  const prices = getMockArtistPrices(options);

  const risingCount = prices.filter((item) => item.changeRate > 0).length;
  const fallingCount = prices.filter((item) => item.changeRate < 0).length;
  const totalVolume = prices.reduce((sum, item) => sum + item.volume, 0);
  const totalFanCap = prices.reduce((sum, item) => sum + item.fanCap, 0);

  const kmiComposite = round(totalFanCap / 1_000_000_000, 2);

  const topGainer = [...prices].sort((a, b) => b.changeRate - a.changeRate)[0];
  const topVolume = [...prices].sort((a, b) => b.volume - a.volume)[0];

  return {
    kmiComposite,
    risingCount,
    fallingCount,
    totalVolume,
    totalFanCap,
    topGainer,
    topVolume,
    updatedAt: options.now?.toISOString() ?? new Date().toISOString(),
  };
}