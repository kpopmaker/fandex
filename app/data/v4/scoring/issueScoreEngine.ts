import { mockIssueSignals } from './mockIssueSignals';
import type {
  IssueDecaySpeed,
  IssueLifecycleStage,
  IssueScoreBreakdown,
  IssueSignal,
  IssueSourceType,
} from './types';

const DEFAULT_AS_OF = '2026-06-15T16:00:00.000Z';

const neutralIssueScore: IssueScoreBreakdown = {
  issueScore: 50,
  newsSentimentScore: 50,
  issueMomentumScore: 0,
  controversyRiskScore: 0,
  confidenceScore: 50,
  volatilityScore: 0,
  activeIssueCount: 0,
  positiveIssueCount: 0,
  negativeIssueCount: 0,
};

const sourceReliabilityDefaults: Record<IssueSourceType, number> = {
  official_agency: 1,
  artist_official: 0.95,
  major_media: 0.85,
  entertainment_media: 0.72,
  chart_platform: 0.88,
  social_trend: 0.55,
  community_rumor: 0.28,
  unknown_source: 0.18,
};

const lifecycleImpactMultipliers: Record<IssueLifecycleStage, number> = {
  breaking: 0.7,
  confirmed: 1,
  amplified: 1.12,
  cooling: 0.55,
  resolved: 0.24,
  archived: 0.05,
};

const lifecycleVolatilityMultipliers: Record<IssueLifecycleStage, number> = {
  breaking: 1.18,
  confirmed: 0.92,
  amplified: 1.24,
  cooling: 0.5,
  resolved: 0.22,
  archived: 0.05,
};

const decayHalfLifeHours: Record<IssueDecaySpeed, number> = {
  fast: 24,
  medium: 72,
  slow: 168,
};

function clamp(value: number, min: number, max: number) {
  const safeValue = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(safeValue, min), max);
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  const safeValue = Number.isFinite(value) ? value : 0;

  return Math.round(safeValue * multiplier) / multiplier;
}

function safeTimestamp(value: string, fallback: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  return new Date(fallback).getTime();
}

function getHoursSince(issue: IssueSignal, asOf: string) {
  const asOfTime = safeTimestamp(asOf, DEFAULT_AS_OF);
  const detectedTime = safeTimestamp(issue.detectedAt || issue.publishedAt, DEFAULT_AS_OF);
  const elapsedMs = asOfTime - detectedTime;

  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return 0;
  }

  return elapsedMs / (60 * 60 * 1000);
}

function getDecayMultiplier(issue: IssueSignal, asOf: string) {
  const asOfTime = safeTimestamp(asOf, DEFAULT_AS_OF);
  const expiresAt = safeTimestamp(issue.expiresAt, DEFAULT_AS_OF);

  if (expiresAt < asOfTime || issue.lifecycleStage === 'archived') {
    return 0;
  }

  const decaySpeed = issue.decaySpeed ?? 'medium';
  const halfLife = decayHalfLifeHours[decaySpeed];
  const hoursSinceDetected = getHoursSince(issue, asOf);
  const multiplier = Math.exp((-Math.LN2 * hoursSinceDetected) / halfLife);

  return clamp(multiplier, 0.08, 1);
}

function getReliabilityWeight(issue: IssueSignal) {
  return clamp(
    issue.reliabilityWeight ?? sourceReliabilityDefaults[issue.sourceType],
    0,
    1,
  );
}

function getRumorDampening(issue: IssueSignal) {
  const isRumorSource =
    issue.sourceType === 'community_rumor' || issue.sourceType === 'unknown_source';
  const isNegative = issue.sentimentScore < 0 || issue.impactScore < 0;

  if (isRumorSource && isNegative && !issue.officiallyConfirmed) {
    return 0.42;
  }

  if (isRumorSource) {
    return 0.68;
  }

  return 1;
}

function sentimentToScore(sentimentScore: number) {
  return clamp(50 + clamp(sentimentScore, -100, 100) * 0.5, 0, 100);
}

export function getIssueSignalsForArtist(artistId: string): IssueSignal[] {
  return mockIssueSignals.filter((issue) => issue.artistId === artistId);
}

export function calculateIssueScore(
  issue: IssueSignal,
  asOf = DEFAULT_AS_OF,
): IssueScoreBreakdown {
  const sentimentScore = clamp(issue.sentimentScore, -100, 100);
  const impactScore = clamp(issue.impactScore, -60, 60);
  const volatilityImpact = clamp(issue.volatilityImpact, 0, 60);
  const confidenceImpact = clamp(issue.confidenceImpact, -40, 40);
  const reliabilityWeight = getReliabilityWeight(issue);
  const decayMultiplier = getDecayMultiplier(issue, asOf);
  const lifecycleImpact = lifecycleImpactMultipliers[issue.lifecycleStage] ?? 0.5;
  const lifecycleVolatility =
    lifecycleVolatilityMultipliers[issue.lifecycleStage] ?? 0.5;
  const rumorDampening = getRumorDampening(issue);
  const weightedImpact =
    impactScore * reliabilityWeight * decayMultiplier * lifecycleImpact * rumorDampening;
  const weightedSentiment =
    sentimentScore * reliabilityWeight * decayMultiplier * rumorDampening;
  const controversyRisk =
    sentimentScore < 0
      ? Math.abs(weightedImpact) + volatilityImpact * reliabilityWeight * decayMultiplier
      : 0;

  return {
    issueScore: round(clamp(50 + weightedImpact * 0.6, 0, 100), 1),
    newsSentimentScore: round(sentimentToScore(weightedSentiment), 1),
    issueMomentumScore: round(
      clamp(Math.abs(weightedImpact) + Math.max(weightedSentiment, 0) * 0.15, 0, 100),
      1,
    ),
    controversyRiskScore: round(clamp(controversyRisk, 0, 100), 1),
    confidenceScore: round(
      clamp(50 + confidenceImpact * reliabilityWeight * decayMultiplier, 0, 100),
      1,
    ),
    volatilityScore: round(
      clamp(volatilityImpact * reliabilityWeight * decayMultiplier * lifecycleVolatility, 0, 100),
      1,
    ),
    activeIssueCount: decayMultiplier > 0 ? 1 : 0,
    positiveIssueCount: weightedSentiment > 5 ? 1 : 0,
    negativeIssueCount: weightedSentiment < -5 ? 1 : 0,
  };
}

export function getIssueScoreBreakdownForArtist(
  artistId: string,
  asOf = DEFAULT_AS_OF,
): IssueScoreBreakdown {
  const issueScores = getIssueSignalsForArtist(artistId)
    .map((issue) => calculateIssueScore(issue, asOf))
    .filter((score) => score.activeIssueCount > 0);

  if (issueScores.length === 0) {
    return neutralIssueScore;
  }

  const activeIssueCount = issueScores.reduce(
    (sum, score) => sum + score.activeIssueCount,
    0,
  );
  const positiveIssueCount = issueScores.reduce(
    (sum, score) => sum + score.positiveIssueCount,
    0,
  );
  const negativeIssueCount = issueScores.reduce(
    (sum, score) => sum + score.negativeIssueCount,
    0,
  );
  const average = (key: keyof IssueScoreBreakdown, fallback = 0) => {
    if (issueScores.length === 0) {
      return fallback;
    }

    return (
      issueScores.reduce((sum, score) => sum + clamp(score[key], 0, 100), 0) /
      issueScores.length
    );
  };
  const positiveBias = Math.max(average('issueScore', 50) - 50, 0);
  const negativeRisk = Math.max(average('controversyRiskScore'), 0);

  return {
    issueScore: round(clamp(average('issueScore', 50) - negativeRisk * 0.1, 0, 100), 1),
    newsSentimentScore: round(average('newsSentimentScore', 50), 1),
    issueMomentumScore: round(
      clamp(average('issueMomentumScore') + positiveBias * 0.12, 0, 100),
      1,
    ),
    controversyRiskScore: round(clamp(negativeRisk, 0, 100), 1),
    confidenceScore: round(average('confidenceScore', 50), 1),
    volatilityScore: round(average('volatilityScore'), 1),
    activeIssueCount,
    positiveIssueCount,
    negativeIssueCount,
  };
}

export function getIssueScoreForArtist(artistId: string, asOf = DEFAULT_AS_OF) {
  return getIssueScoreBreakdownForArtist(artistId, asOf).issueScore;
}
