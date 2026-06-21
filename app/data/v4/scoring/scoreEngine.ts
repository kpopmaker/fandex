import type { RawSignalSnapshot, ScoreBreakdown, V4ScoreKey } from './types';

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

function logarithmicScore(value: number, baseline: number, maxScore = 100) {
  if (value <= 0) {
    return 0;
  }

  return clamp((Math.log10(value + 1) / Math.log10(baseline + 1)) * maxScore);
}

export function calculateReleaseCycleScore(signal: RawSignalSnapshot) {
  const lifecycle = signal.lifecycle;
  const phaseBonus = {
    pre_release: 12,
    launch: 18,
    active_promotion: 10,
    catalog: -2,
    hiatus: -12,
    predebut: 4,
  }[lifecycle.releasePhase];
  const recencyScore = clamp(100 - Math.max(lifecycle.daysFromLatestRelease, 0) * 1.15);
  const lifecycleStrength =
    lifecycle.comebackReactionStrength * 0.42 +
    lifecycle.activityEffect * 0.36 +
    lifecycle.hiatusRetention * 0.22;

  return round(clamp(recencyScore * 0.42 + lifecycleStrength * 0.58 + phaseBonus), 1);
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

  return {
    ...scores,
    totalScore: round(totalScore, 2),
    weights,
  };
}
