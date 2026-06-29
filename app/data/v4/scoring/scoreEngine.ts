import type {
  CareerStage,
  IssueScoreBreakdown,
  RawSignalSnapshot,
  ReleaseCyclePhase,
  ScoreBreakdown,
  V4ScoreKey,
} from './types';
import { getIssueScoreBreakdownForArtist } from './issueScoreEngine';

export const defaultV4ScoreWeights: Record<V4ScoreKey, number> = {
  releaseCycleScore: 18,
  newsImpactScore: 22,
  searchMomentumScore: 20,
  videoMomentumScore: 24,
  agencyFinancialScore: 16,
};

function clamp(value: number, min = 0, max = 100) {
  const safeValue = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(safeValue, min), max);
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.round(safeValue * multiplier) / multiplier;
}

function safeNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeIssueScoreBreakdown(
  breakdown: IssueScoreBreakdown,
): IssueScoreBreakdown {
  return {
    issueScore: round(clamp(safeNumber(breakdown.issueScore, 50)), 1),
    newsSentimentScore: round(clamp(safeNumber(breakdown.newsSentimentScore, 50)), 1),
    issueMomentumScore: round(clamp(safeNumber(breakdown.issueMomentumScore)), 1),
    controversyRiskScore: round(clamp(safeNumber(breakdown.controversyRiskScore)), 1),
    confidenceScore: round(clamp(safeNumber(breakdown.confidenceScore, 50)), 1),
    volatilityScore: round(clamp(safeNumber(breakdown.volatilityScore)), 1),
    activeIssueCount: Math.max(Math.round(safeNumber(breakdown.activeIssueCount)), 0),
    positiveIssueCount: Math.max(Math.round(safeNumber(breakdown.positiveIssueCount)), 0),
    negativeIssueCount: Math.max(Math.round(safeNumber(breakdown.negativeIssueCount)), 0),
  };
}

function logarithmicScore(value: number, baseline: number, maxScore = 100) {
  if (value <= 0) {
    return 0;
  }

  return clamp((Math.log10(value + 1) / Math.log10(baseline + 1)) * maxScore);
}

function normalizeReleasePhase(phase?: ReleaseCyclePhase): ReleaseCyclePhase {
  const phaseMap: Partial<Record<ReleaseCyclePhase, ReleaseCyclePhase>> = {
    pre_release: 'pre_comeback',
    launch: 'comeback_peak',
    catalog: 'normal',
  };

  return phaseMap[phase ?? 'normal'] ?? phase ?? 'normal';
}

function getReleasePhaseBaseScore(phase: ReleaseCyclePhase) {
  const baseScores: Record<ReleaseCyclePhase, number> = {
    pre_comeback: 82,
    comeback_peak: 94,
    active_promotion: 86,
    post_promotion: 68,
    normal: 56,
    hiatus: 42,
    predebut: 58,
    pre_release: 82,
    launch: 94,
    catalog: 56,
  };

  return baseScores[phase];
}

function calculateReleaseRecencyScore(daysSinceLastRelease: number) {
  if (daysSinceLastRelease < 0) {
    return clamp(74 + Math.min(Math.abs(daysSinceLastRelease), 30) * 0.5, 35, 94);
  }

  if (daysSinceLastRelease <= 14) {
    return clamp(98 - daysSinceLastRelease * 1.1, 35, 100);
  }

  if (daysSinceLastRelease <= 60) {
    return clamp(84 - (daysSinceLastRelease - 14) * 0.42, 35, 100);
  }

  if (daysSinceLastRelease <= 180) {
    return clamp(64 - (daysSinceLastRelease - 60) * 0.12, 35, 100);
  }

  return clamp(50 - Math.min((daysSinceLastRelease - 180) * 0.04, 18), 32, 100);
}

function getCareerStageAdjustment(careerStage?: CareerStage) {
  const adjustments: Record<CareerStage, number> = {
    rookie: 3,
    growth: 2,
    established: 0,
    mature: -1,
    legacy: -2,
  };

  return careerStage ? adjustments[careerStage] : 0;
}

export function calculateReleaseCycleScore(signal: RawSignalSnapshot) {
  const lifecycle = signal.lifecycle;
  const daysSinceLastRelease = clamp(
    safeNumber(lifecycle.daysSinceLastRelease ?? lifecycle.daysFromLatestRelease, 120),
    -60,
    900,
  );
  const releaseCyclePhase = normalizeReleasePhase(
    lifecycle.releaseCyclePhase ?? lifecycle.releasePhase,
  );
  const phaseScore = getReleasePhaseBaseScore(releaseCyclePhase);
  const recencyScore = calculateReleaseRecencyScore(daysSinceLastRelease);
  const comebackMomentum = clamp(
    safeNumber(lifecycle.comebackMomentum ?? lifecycle.comebackReactionStrength, 55),
    0,
    100,
  );
  const activityFreshness = clamp(
    safeNumber(lifecycle.activityFreshness ?? lifecycle.activityEffect, 55),
    0,
    100,
  );
  const hiatusRetention = clamp(safeNumber(lifecycle.hiatusRetention, 70), 0, 100);
  const hiatusRisk = clamp(
    safeNumber(
      lifecycle.hiatusRisk,
      releaseCyclePhase === 'hiatus' ? 65 : Math.max(daysSinceLastRelease - 180, 0) * 0.25,
    ),
    0,
    100,
  );
  const careerAdjustment =
    getCareerStageAdjustment(lifecycle.careerStage) +
    (safeNumber(lifecycle.debutAgeFactor, 1) - 1) * 10;
  const lifecycleStrength =
    comebackMomentum * 0.42 +
    activityFreshness * 0.36 +
    hiatusRetention * 0.22;
  const hiatusPenalty = Math.min(hiatusRisk * 0.18, 18);
  const releaseCycleScore =
    phaseScore * 0.28 +
    recencyScore * 0.3 +
    lifecycleStrength * 0.42 -
    hiatusPenalty +
    careerAdjustment;

  return round(clamp(releaseCycleScore), 1);
}

export function calculateNewsImpactScore(signal: RawSignalSnapshot) {
  const metrics = signal.metrics;
  const volumeScore = logarithmicScore(metrics.newsVolume, 80);
  const recencyScore = clamp(100 - metrics.newsRecencyHours * 4.5);
  const confidenceScore = signal.sourceConfidence;

  return round(
    clamp(volumeScore * 0.48 + recencyScore * 0.28 + confidenceScore * 0.24),
    1,
  );
}

export function calculateSearchMomentumScore(signal: RawSignalSnapshot) {
  const metrics = signal.metrics;
  const volumeScore = logarithmicScore(metrics.searchVolume, 800000);
  const growthScore = clamp(50 + metrics.searchGrowthRate * 0.7);

  return round(clamp(volumeScore * 0.58 + growthScore * 0.42), 1);
}

export function calculateVideoMomentumScore(signal: RawSignalSnapshot) {
  const metrics = signal.metrics;
  const viewScore = logarithmicScore(metrics.youtubeViews, 12000000);
  const velocityScore = logarithmicScore(metrics.videoViewVelocity, 1000000);
  const snsAssistScore = logarithmicScore(metrics.snsReactions, 800000);

  return round(
    clamp(viewScore * 0.48 + velocityScore * 0.34 + snsAssistScore * 0.18),
    1,
  );
}

export function calculateAgencyFinancialScore(signal: RawSignalSnapshot) {
  const agencyScaleScore = signal.metrics.agencyFinancialScale;
  const overseasScore = logarithmicScore(signal.metrics.overseasResponse, 700000);
  const fandomScore = logarithmicScore(signal.metrics.fandomResponse, 700000);

  return round(
    clamp(agencyScaleScore * 0.58 + overseasScore * 0.22 + fandomScore * 0.2),
    1,
  );
}

export function calculateScoreBreakdown(
  signal: RawSignalSnapshot,
  weights = defaultV4ScoreWeights,
): ScoreBreakdown {
  const scores: Record<V4ScoreKey, number> = {
    releaseCycleScore: calculateReleaseCycleScore(signal),
    newsImpactScore: calculateNewsImpactScore(signal),
    searchMomentumScore: calculateSearchMomentumScore(signal),
    videoMomentumScore: calculateVideoMomentumScore(signal),
    agencyFinancialScore: calculateAgencyFinancialScore(signal),
  };
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const totalScore =
    totalWeight > 0
      ? Object.entries(scores).reduce((sum, [key, score]) => {
          return sum + score * (weights[key as V4ScoreKey] / totalWeight);
        }, 0)
      : 0;
  const issueScoreBreakdown = normalizeIssueScoreBreakdown(
    getIssueScoreBreakdownForArtist(signal.artistId, signal.collectedAt),
  );

  return {
    ...scores,
    totalScore: round(totalScore, 2),
    weights,
    issueScore: issueScoreBreakdown.issueScore,
    newsSentimentScore: issueScoreBreakdown.newsSentimentScore,
    issueMomentumScore: issueScoreBreakdown.issueMomentumScore,
    controversyRiskScore: issueScoreBreakdown.controversyRiskScore,
    confidenceScore: issueScoreBreakdown.confidenceScore,
    volatilityScore: issueScoreBreakdown.volatilityScore,
    issueScoreBreakdown,
  };
}
