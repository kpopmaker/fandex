import type { ChartPoint, FactorScores } from '../../v3/types';
import { getMockRawSignalHistory } from './mockSignals';
import { calculateArtistPrice } from './priceEngine';
import { calculateScoreBreakdown } from './scoreEngine';
import type { ArtistPriceHistoryPointV4 } from './types';

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

function toLegacyFactorScores(point: ArtistPriceHistoryPointV4): FactorScores {
  const breakdown = point.v4ScoreBreakdown;
  const metrics = point.rawSignal.metrics;

  return {
    music: Math.min(100, safeNumber(breakdown.videoMomentumScore) * 0.35 + safeNumber(breakdown.searchMomentumScore) * 0.25 + 28),
    album: Math.min(100, safeNumber(breakdown.releaseCycleScore) * 0.55 + safeNumber(metrics.albumSales) / 30000),
    youtube: safeNumber(breakdown.videoMomentumScore),
    sns: Math.min(100, safeNumber(breakdown.videoMomentumScore) * 0.5 + safeNumber(metrics.snsReactions) / 18000),
    search: safeNumber(breakdown.searchMomentumScore),
    news: safeNumber(breakdown.newsImpactScore),
    global: Math.min(100, safeNumber(breakdown.agencyFinancialScore) * 0.38 + safeNumber(metrics.overseasResponse) / 14000),
    fandom: Math.min(100, safeNumber(breakdown.releaseCycleScore) * 0.28 + safeNumber(metrics.fandomResponse) / 12000),
    company: safeNumber(breakdown.agencyFinancialScore),
  };
}

function roundLegacyScores(scores: FactorScores): FactorScores {
  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, round(value, 1)]),
  ) as FactorScores;
}

export function getArtistPriceHistoryV4Compatible(
  artistId: string,
): ArtistPriceHistoryPointV4[] {
  let previousPrice: number | undefined;

  return getMockRawSignalHistory(artistId).map((signal) => {
    const scoreBreakdown = calculateScoreBreakdown(signal);
    const priceResult = calculateArtistPrice({
      artistId,
      collectedAt: signal.collectedAt,
      signal,
      scoreBreakdown,
      previousPrice,
    });
    previousPrice = priceResult.price;

    const point: ArtistPriceHistoryPointV4 = {
      artistId,
      date: signal.collectedAt.slice(0, 10),
      timestamp: signal.collectedAt,
      time: signal.collectedAt.slice(11, 16),
      price: priceResult.price,
      change: priceResult.change,
      changeRate: priceResult.changeRate,
      volume: priceResult.volume,
      fandomSize: safePositiveNumber(priceResult.fanSizeValue),
      fanSizeValue: priceResult.fanSizeValue,
      scores: {
        music: 0,
        album: 0,
        youtube: 0,
        sns: 0,
        search: 0,
        news: 0,
        global: 0,
        fandom: 0,
        company: 0,
      },
      absoluteMetrics: {
        music: safePositiveNumber(signal.metrics.musicPerformance),
        album: safePositiveNumber(signal.metrics.albumSales),
        youtube: safePositiveNumber(signal.metrics.youtubeViews),
        sns: safePositiveNumber(signal.metrics.snsReactions),
        search: safePositiveNumber(signal.metrics.searchVolume),
        news: safePositiveNumber(signal.metrics.newsVolume),
        global: safePositiveNumber(signal.metrics.overseasResponse),
        fandom: safePositiveNumber(signal.metrics.fandomResponse),
        company: safePositiveNumber(signal.metrics.agencyFinancialScale),
      },
      lifecycleAdjustment: {
        albumReleaseCycle: round(scoreBreakdown.releaseCycleScore / 100, 4),
        comebackPeriod: safeNumber(signal.lifecycle.comebackPeriod, 1),
        activityPeriod: safeNumber(signal.lifecycle.activityPeriod, 1),
        hiatusRetention: round(safeNumber(signal.lifecycle.hiatusRetention, 100) / 100, 4),
      },
      sourceStatus: priceResult.sourceStatus,
      scoreBreakdown,
      v4ScoreBreakdown: scoreBreakdown,
      rawSignal: signal,
    };

    return {
      ...point,
      scores: roundLegacyScores(toLegacyFactorScores(point)),
    };
  });
}

export function getArtistChartPointsV4Compatible(artistId: string): ChartPoint[] {
  return getArtistPriceHistoryV4Compatible(artistId).map((point) => ({
    time: point.time,
    value: point.price,
  }));
}
