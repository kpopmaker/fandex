import type {
  PriceCalculationInput,
  PriceCalculationResult,
  ScoreBreakdown,
} from './types';

const ISSUE_NEUTRAL_SCORE = 50;
const MIN_ISSUE_MULTIPLIER = 0.94;
const MAX_ISSUE_MULTIPLIER = 1.06;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safePositiveNumber(value: number, fallback = 0) {
  return Math.max(safeNumber(value, fallback), 0);
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(safeNumber(value) * multiplier) / multiplier;
}

function normalizeIssueScoreInput(
  value: number | null | undefined,
  fallback = ISSUE_NEUTRAL_SCORE,
) {
  return clamp(safeNumber(value ?? Number.NaN, fallback), 0, 100);
}

function hasIssueScoreInput(scoreBreakdown: ScoreBreakdown) {
  return (
    scoreBreakdown.issueScore != null ||
    scoreBreakdown.newsSentimentScore != null ||
    scoreBreakdown.issueMomentumScore != null ||
    scoreBreakdown.controversyRiskScore != null ||
    scoreBreakdown.confidenceScore != null ||
    scoreBreakdown.volatilityScore != null
  );
}

function calculateIssueImpactMultiplier(scoreBreakdown: ScoreBreakdown) {
  if (!hasIssueScoreInput(scoreBreakdown)) {
    return 1;
  }

  const issueScore = normalizeIssueScoreInput(scoreBreakdown.issueScore);
  const newsSentimentScore = normalizeIssueScoreInput(
    scoreBreakdown.newsSentimentScore,
  );
  const confidenceScore = normalizeIssueScoreInput(scoreBreakdown.confidenceScore);
  const controversyRiskScore = normalizeIssueScoreInput(
    scoreBreakdown.controversyRiskScore,
    0,
  );
  const issueMomentumScore = normalizeIssueScoreInput(
    scoreBreakdown.issueMomentumScore,
    0,
  );
  const volatilityScore = normalizeIssueScoreInput(scoreBreakdown.volatilityScore);
  const issueDelta = (issueScore - ISSUE_NEUTRAL_SCORE) / ISSUE_NEUTRAL_SCORE;
  const sentimentDelta =
    (newsSentimentScore - ISSUE_NEUTRAL_SCORE) / ISSUE_NEUTRAL_SCORE;
  const confidenceFactor = confidenceScore / 100;
  const controversyFactor = controversyRiskScore / 100;
  const combinedIssueSignal = issueDelta * 0.6 + sentimentDelta * 0.4;
  const issueMomentumFactor = 0.9 + (issueMomentumScore / 100) * 0.1;
  const volatilityDampening =
    1 -
    (Math.max(volatilityScore - ISSUE_NEUTRAL_SCORE, 0) / ISSUE_NEUTRAL_SCORE) *
      0.05;
  const positiveBoost =
    Math.max(0, combinedIssueSignal) *
    0.045 *
    confidenceFactor *
    issueMomentumFactor *
    volatilityDampening;
  const negativeDrag = Math.min(0, combinedIssueSignal) * 0.04;
  const controversyPenalty = controversyFactor * 0.025;
  const rawIssueMultiplier = 1 + positiveBoost + negativeDrag - controversyPenalty;

  // TODO: Route negative issue risk more strongly into future confidence/volatility
  // outputs once price result types support that without changing existing UI contracts.
  return clamp(rawIssueMultiplier, MIN_ISSUE_MULTIPLIER, MAX_ISSUE_MULTIPLIER);
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getArtistBasePrice(artistId: string) {
  return 78 + (hashString(artistId) % 48);
}

function calculateDeterministicPreviousPrice(artistId: string, price: number) {
  const drift = ((hashString(`${artistId}-previous-price`) % 900) - 420) / 10000;
  return round(clamp(price / (1 + drift), 20, 600), 2);
}

function calculateVolume(input: PriceCalculationInput) {
  const metrics = input.signal.metrics;
  const score = safeNumber(input.scoreBreakdown.totalScore);
  const signalVolume =
    safeNumber(metrics.newsVolume) * 320 +
    safeNumber(metrics.searchVolume) * 0.045 +
    safeNumber(metrics.videoViewVelocity) * 0.028 +
    safeNumber(metrics.snsReactions) * 0.035;

  return Math.round(clamp(signalVolume + score * 95, 1000, 950000));
}

export function calculateArtistPrice(input: PriceCalculationInput): PriceCalculationResult {
  const totalScore = safeNumber(input.scoreBreakdown.totalScore);
  const basePrice = getArtistBasePrice(input.artistId);
  const lifecycleMultiplier = clamp(
    safeNumber(input.signal.lifecycle.comebackPeriod, 1) *
      safeNumber(input.signal.lifecycle.activityPeriod, 1) *
      Math.max(safeNumber(input.signal.lifecycle.hiatusRetention, 100) / 100, 0.55),
    0.68,
    1.18,
  );
  const scoreScale = Math.exp((totalScore - 50) / 58);
  const issueMultiplier = calculateIssueImpactMultiplier(input.scoreBreakdown);
  const rawPrice = basePrice * scoreScale * lifecycleMultiplier * issueMultiplier;
  const price = round(clamp(safePositiveNumber(rawPrice, basePrice), 20, 600), 2);
  const previousPrice =
    input.previousPrice && Number.isFinite(input.previousPrice)
      ? input.previousPrice
      : calculateDeterministicPreviousPrice(input.artistId, price);
  const change = round(price - previousPrice, 2);
  const changeRate = previousPrice === 0 ? 0 : round((change / previousPrice) * 100, 2);
  const volume = calculateVolume(input);
  const fanSizeValue = Math.round(price * (650000 + totalScore * 12000));
  const confidence = round(
    clamp(safeNumber(input.signal.sourceConfidence, 50) * 0.64 + totalScore * 0.28 + 8, 35, 98),
    1,
  );

  return {
    artistId: input.artistId,
    collectedAt: input.collectedAt,
    price,
    previousPrice,
    change,
    changeRate,
    volume,
    fanSizeValue,
    confidence,
    scoreBreakdown: input.scoreBreakdown,
    sourceStatus: input.signal.sourceStatus,
  };
}
