import type { PriceCalculationInput, PriceCalculationResult } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
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
  const score = input.scoreBreakdown.totalScore;
  const signalVolume =
    metrics.newsVolume * 320 +
    metrics.searchVolume * 0.045 +
    metrics.videoViewVelocity * 0.028 +
    metrics.snsReactions * 0.035;

  return Math.round(clamp(signalVolume + score * 95, 1000, 950000));
}

export function calculateArtistPrice(input: PriceCalculationInput): PriceCalculationResult {
  const totalScore = input.scoreBreakdown.totalScore;
  const basePrice = getArtistBasePrice(input.artistId);
  const lifecycleMultiplier =
    input.signal.lifecycle.comebackPeriod *
    input.signal.lifecycle.activityPeriod *
    Math.max(input.signal.lifecycle.hiatusRetention / 100, 0.55);
  const scoreScale = Math.exp((totalScore - 50) / 58);
  const price = round(clamp(basePrice * scoreScale * lifecycleMultiplier, 20, 600), 2);
  const previousPrice =
    input.previousPrice ?? calculateDeterministicPreviousPrice(input.artistId, price);
  const change = round(price - previousPrice, 2);
  const changeRate = previousPrice === 0 ? 0 : round((change / previousPrice) * 100, 2);
  const volume = calculateVolume(input);
  const fanSizeValue = Math.round(price * (650000 + totalScore * 12000));
  const confidence = round(
    clamp(input.signal.sourceConfidence * 0.64 + totalScore * 0.28 + 8, 35, 98),
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

