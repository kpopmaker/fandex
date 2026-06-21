import type { FactorKey, FactorScores, SourceStatus } from '../../v3/types';

export type V4ScoreKey =
  | 'releaseCycleScore'
  | 'newsImpactScore'
  | 'searchMomentumScore'
  | 'videoMomentumScore'
  | 'agencyFinancialScore';

export type RawSignalSnapshot = {
  artistId: string;
  collectedAt: string;
  sourceName: string;
  sourceStatus: SourceStatus;
  sourceConfidence: number;
  metrics: ArtistSignalMetrics;
  lifecycle: LifecycleSignal;
};

export type ArtistSignalMetrics = {
  musicPerformance: number;
  albumSales: number;
  youtubeViews: number;
  snsReactions: number;
  searchVolume: number;
  searchGrowthRate: number;
  newsVolume: number;
  newsRecencyHours: number;
  overseasResponse: number;
  fandomResponse: number;
  videoViewVelocity: number;
  agencyFinancialScale: number;
};

export type LifecycleSignal = {
  latestReleaseDate?: string;
  daysFromLatestRelease: number;
  releasePhase:
    | 'pre_release'
    | 'launch'
    | 'active_promotion'
    | 'catalog'
    | 'hiatus'
    | 'predebut';
  comebackPeriod: number;
  activityPeriod: number;
  hiatusPeriod: number;
  comebackReactionStrength: number;
  activityEffect: number;
  hiatusRetention: number;
};

export type ScoreBreakdown = Record<V4ScoreKey, number> & {
  totalScore: number;
  weights: Record<V4ScoreKey, number>;
};

export type PriceCalculationInput = {
  artistId: string;
  collectedAt: string;
  signal: RawSignalSnapshot;
  scoreBreakdown: ScoreBreakdown;
  previousPrice?: number;
};

export type PriceCalculationResult = {
  artistId: string;
  collectedAt: string;
  price: number;
  previousPrice: number;
  change: number;
  changeRate: number;
  volume: number;
  fanSizeValue: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
  sourceStatus: SourceStatus;
};

export type ArtistPriceHistoryPointV4 = {
  artistId: string;
  date: string;
  timestamp: string;
  time: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  fandomSize: number;
  fanSizeValue: number;
  scores: FactorScores;
  scoreBreakdown: ScoreBreakdown;
  absoluteMetrics: Partial<Record<FactorKey, number>>;
  lifecycleAdjustment: {
    albumReleaseCycle: number;
    comebackPeriod: number;
    activityPeriod: number;
    hiatusRetention: number;
  };
  sourceStatus: SourceStatus;
  v4ScoreBreakdown: ScoreBreakdown;
  rawSignal: RawSignalSnapshot;
};
