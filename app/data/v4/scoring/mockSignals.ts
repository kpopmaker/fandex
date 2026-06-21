import { artistUniverseV4, getArtistV4ById } from '../artistUniverse';
import type { ArtistV4 } from '../types';
import type {
  ArtistSignalMetrics,
  CareerStage,
  LifecycleSignal,
  RawSignalSnapshot,
  ReleaseCyclePhase,
} from './types';

export const V4_COMPATIBLE_HISTORY_TIMES = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
] as const;

const FIXED_HISTORY_DATE = '2026-06-15';

const agencyScale: Record<string, number> = {
  'BIGHIT MUSIC': 98,
  HYBE: 96,
  'SM Entertainment': 92,
  'JYP Entertainment': 88,
  'YG Entertainment': 86,
  'Starship Entertainment': 78,
  'Pledis Entertainment': 84,
  ADOR: 82,
  'Source Music': 80,
  'Belift Lab': 76,
  'KOZ Entertainment': 72,
  'WakeOne': 66,
  'Cube Entertainment': 64,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function seededUnit(input: string) {
  const value = Math.sin(hashString(input)) * 10000;
  return value - Math.floor(value);
}

function seededRange(input: string, min: number, max: number) {
  return min + seededUnit(input) * (max - min);
}

function getFallbackArtist(artistId: string): ArtistV4 {
  return (
    getArtistV4ById(artistId) ??
    artistUniverseV4[0] ?? {
      id: artistId,
      ticker: artistId.toUpperCase(),
      nameKo: artistId,
      nameEn: artistId,
      entityType: 'group',
      agency: 'Manual seed',
      lifecycleStatus: 'active',
      members: [],
      profile: {
        primaryQuery: artistId,
        aliases: [artistId],
        koreanAliases: [],
        englishAliases: [artistId],
        includeKeywords: [artistId],
        disambiguationKeywords: [],
        excludeKeywords: [],
        markets: ['KR', 'GLOBAL'],
      },
      collection: {
        tier: 'standard',
        priorityScore: 50,
        targetSources: ['manual_seed'],
        verificationStatus: 'needs_verification',
        notes: 'Fallback artist for v4 scoring mock signal generation.',
      },
      officialChannels: {},
      shortIntro: 'Fallback artist for v4 scoring mock signal generation.',
    }
  );
}

function getTierMultiplier(artist: ArtistV4) {
  const multipliers: Record<ArtistV4['collection']['tier'], number> = {
    realtime: 1.28,
    high: 1.12,
    standard: 1,
    archive: 0.72,
  };

  return multipliers[artist.collection.tier];
}

function getDebutAgeYears(artist: ArtistV4) {
  if (!artist.debutDate) {
    return 3;
  }

  const debutTime = new Date(artist.debutDate).getTime();
  const referenceTime = new Date(`${FIXED_HISTORY_DATE}T00:00:00.000Z`).getTime();

  if (!Number.isFinite(debutTime)) {
    return 3;
  }

  return Math.max((referenceTime - debutTime) / (365.25 * 24 * 60 * 60 * 1000), 0);
}

function getCareerStage(artist: ArtistV4): CareerStage {
  const debutAgeYears = getDebutAgeYears(artist);

  if (artist.lifecycleStatus === 'predebut' || debutAgeYears < 1) {
    return 'rookie';
  }

  if (debutAgeYears < 3) {
    return 'growth';
  }

  if (debutAgeYears < 7) {
    return 'established';
  }

  if (debutAgeYears < 12) {
    return 'mature';
  }

  return 'legacy';
}

function getDebutAgeFactor(careerStage: CareerStage) {
  const factors: Record<CareerStage, number> = {
    rookie: 1.05,
    growth: 1.04,
    established: 1,
    mature: 0.98,
    legacy: 0.96,
  };

  return factors[careerStage];
}

function getReleaseCyclePhase(daysSinceLastRelease: number): ReleaseCyclePhase {
  if (daysSinceLastRelease < 0) {
    return 'pre_comeback';
  }

  if (daysSinceLastRelease <= 10) {
    return 'comeback_peak';
  }

  if (daysSinceLastRelease <= 45) {
    return 'active_promotion';
  }

  if (daysSinceLastRelease <= 90) {
    return 'post_promotion';
  }

  if (daysSinceLastRelease <= 210) {
    return 'normal';
  }

  return 'hiatus';
}

function getLifecycleSignal(artist: ArtistV4, pointIndex: number): LifecycleSignal {
  const careerStage = getCareerStage(artist);
  const debutAgeFactor = getDebutAgeFactor(careerStage);

  if (artist.lifecycleStatus === 'predebut') {
    const daysSinceLastRelease = -14 + pointIndex;
    const releaseCyclePhase: ReleaseCyclePhase = 'pre_comeback';
    const comebackMomentum = 64 + pointIndex * 2;
    const activityFreshness = 56 + pointIndex;
    const hiatusRisk = 12;

    return {
      daysFromLatestRelease: daysSinceLastRelease,
      daysSinceLastRelease,
      releasePhase: 'predebut',
      releaseCyclePhase,
      comebackMomentum,
      comebackPeriod: 1.08,
      activityFreshness,
      activityPeriod: 0.8,
      hiatusRisk,
      hiatusPeriod: 0,
      debutAgeFactor,
      careerStage,
      comebackReactionStrength: 64,
      activityEffect: 56,
      hiatusRetention: 72,
    };
  }

  if (artist.lifecycleStatus === 'hiatus' || artist.lifecycleStatus === 'military') {
    const daysSinceLastRelease = 240 + pointIndex;
    const releaseCyclePhase: ReleaseCyclePhase = 'hiatus';
    const comebackMomentum = 48;
    const activityFreshness = 42;
    const hiatusRisk = artist.lifecycleStatus === 'military' ? 72 : 64;

    return {
      latestReleaseDate: artist.debutDate,
      daysFromLatestRelease: daysSinceLastRelease,
      daysSinceLastRelease,
      releasePhase: 'hiatus',
      releaseCyclePhase,
      comebackMomentum,
      comebackPeriod: 0.82,
      activityFreshness,
      activityPeriod: 0.72,
      hiatusRisk,
      hiatusPeriod: 1,
      debutAgeFactor,
      careerStage,
      comebackReactionStrength: 48,
      activityEffect: 42,
      hiatusRetention: 78,
    };
  }

  const seed = hashString(`${artist.id}-release-cycle`) % 120;
  const daysFromLatestRelease = Math.max(-10, seed - 20 + pointIndex);
  const releaseCyclePhase = getReleaseCyclePhase(daysFromLatestRelease);
  const releasePhase =
    releaseCyclePhase === 'pre_comeback'
      ? 'pre_release'
      : releaseCyclePhase === 'comeback_peak'
        ? 'launch'
        : releaseCyclePhase === 'normal' || releaseCyclePhase === 'post_promotion'
          ? 'catalog'
          : releaseCyclePhase;
  const comebackMomentum = clamp(
    62 + seededRange(`${artist.id}-comeback`, -12, 18) +
      (releaseCyclePhase === 'pre_comeback' || releaseCyclePhase === 'comeback_peak' ? 8 : 0),
    35,
    98,
  );
  const activityFreshness = clamp(
    58 + seededRange(`${artist.id}-activity`, -10, 16) -
      Math.max(daysFromLatestRelease - 90, 0) * 0.08,
    35,
    98,
  );
  const hiatusRisk = clamp(
    Math.max(daysFromLatestRelease - 150, 0) * 0.28,
    0,
    82,
  );

  return {
    latestReleaseDate: artist.debutDate,
    daysFromLatestRelease,
    daysSinceLastRelease: daysFromLatestRelease,
    releasePhase,
    releaseCyclePhase,
    comebackMomentum,
    comebackPeriod: releaseCyclePhase === 'comeback_peak' ? 1.18 : releaseCyclePhase === 'active_promotion' ? 1.08 : 0.96,
    activityFreshness,
    activityPeriod: releaseCyclePhase === 'normal' || releaseCyclePhase === 'post_promotion' ? 0.94 : 1.05,
    hiatusRisk,
    hiatusPeriod: 0,
    debutAgeFactor,
    careerStage,
    comebackReactionStrength: comebackMomentum,
    activityEffect: activityFreshness,
    hiatusRetention: clamp(66 + seededRange(`${artist.id}-retention`, -8, 12), 35, 98),
  };
}

function getMockMetrics(artist: ArtistV4, pointIndex: number): ArtistSignalMetrics {
  const tierMultiplier = getTierMultiplier(artist);
  const priorityMultiplier = artist.collection.priorityScore / 75;
  const base = tierMultiplier * priorityMultiplier;
  const wave = 1 + Math.sin(pointIndex + hashString(artist.id) / 100) * 0.08;
  const trend = 1 + pointIndex * 0.035;
  const seedKey = `${artist.id}-${pointIndex}`;

  return {
    musicPerformance: Math.round(seededRange(`${seedKey}-music`, 420000, 1800000) * base * wave),
    albumSales: Math.round(seededRange(`${seedKey}-album`, 60000, 720000) * base),
    youtubeViews: Math.round(seededRange(`${seedKey}-youtube`, 900000, 9200000) * base * trend),
    snsReactions: Math.round(seededRange(`${seedKey}-sns`, 45000, 620000) * base * trend),
    searchVolume: Math.round(seededRange(`${seedKey}-search`, 38000, 520000) * base * trend),
    searchGrowthRate: Number(seededRange(`${seedKey}-search-growth`, -8, 86).toFixed(2)),
    newsVolume: Math.round(seededRange(`${seedKey}-news`, 4, 64) * tierMultiplier),
    newsRecencyHours: Number(seededRange(`${seedKey}-news-recency`, 0.5, 18).toFixed(1)),
    overseasResponse: Math.round(seededRange(`${seedKey}-global`, 28000, 460000) * base),
    fandomResponse: Math.round(seededRange(`${seedKey}-fandom`, 32000, 520000) * base),
    videoViewVelocity: Math.round(seededRange(`${seedKey}-video-velocity`, 18000, 880000) * base * wave),
    agencyFinancialScale: agencyScale[artist.agency] ?? clamp(42 + artist.collection.priorityScore * 0.36, 35, 88),
  };
}

export function getMockRawSignalSnapshot(
  artistId: string,
  pointIndex = V4_COMPATIBLE_HISTORY_TIMES.length - 1,
): RawSignalSnapshot {
  const artist = getFallbackArtist(artistId);
  const boundedIndex = clamp(pointIndex, 0, V4_COMPATIBLE_HISTORY_TIMES.length - 1);
  const time = V4_COMPATIBLE_HISTORY_TIMES[boundedIndex] ?? V4_COMPATIBLE_HISTORY_TIMES[0];

  return {
    artistId,
    collectedAt: `${FIXED_HISTORY_DATE}T${time}:00.000Z`,
    sourceName: 'FANDEX v4 deterministic mock signals',
    sourceStatus: 'Mock needs verification',
    sourceConfidence: Number(clamp(54 + artist.collection.priorityScore * 0.32, 45, 88).toFixed(1)),
    metrics: getMockMetrics(artist, boundedIndex),
    lifecycle: getLifecycleSignal(artist, boundedIndex),
  };
}

export function getMockRawSignalHistory(artistId: string): RawSignalSnapshot[] {
  return V4_COMPATIBLE_HISTORY_TIMES.map((_, index) =>
    getMockRawSignalSnapshot(artistId, index),
  );
}
