import type { ChartPoint, FactorScores } from '../../v3/types';
import { getMockRawSignalHistory } from './mockSignals';
import { calculateArtistPrice } from './priceEngine';
import { calculateScoreBreakdown } from './scoreEngine';
import type { ArtistPriceHistoryPointV4 } from './types';

function toLegacyFactorScores(point: ArtistPriceHistoryPointV4): FactorScores {
  const breakdown = point.v4ScoreBreakdown;
  const metrics = point.rawSignal.metrics;

  return {
    music: Math.min(100, breakdown.videoMomentumScore * 0.35 + breakdown.searchMomentumScore * 0.25 + 28),
    album: Math.min(100, breakdown.releaseCycleScore * 0.55 + metrics.albumSales / 30000),
    youtube: breakdown.videoMomentumScore,
    sns: Math.min(100, breakdown.videoMomentumScore * 0.5 + metrics.snsReactions / 18000),
    search: breakdown.searchMomentumScore,
    news: breakdown.newsImpactScore,
    global: Math.min(100, breakdown.agencyFinancialScore * 0.38 + metrics.overseasResponse / 14000),
    fandom: Math.min(100, breakdown.releaseCycleScore * 0.28 + metrics.fandomResponse / 12000),
    company: breakdown.agencyFinancialScore,
  };
}

function roundLegacyScores(scores: FactorScores): FactorScores {
  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, Number(value.toFixed(1))]),
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
      time: signal.collectedAt.slice(11, 16),
      price: priceResult.price,
      changeRate: priceResult.changeRate,
      volume: priceResult.volume,
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
        music: signal.metrics.musicPerformance,
        album: signal.metrics.albumSales,
        youtube: signal.metrics.youtubeViews,
        sns: signal.metrics.snsReactions,
        search: signal.metrics.searchVolume,
        news: signal.metrics.newsVolume,
        global: signal.metrics.overseasResponse,
        fandom: signal.metrics.fandomResponse,
        company: signal.metrics.agencyFinancialScale,
      },
      lifecycleAdjustment: {
        albumReleaseCycle: scoreBreakdown.releaseCycleScore / 100,
        comebackPeriod: signal.lifecycle.comebackPeriod,
        activityPeriod: signal.lifecycle.activityPeriod,
        hiatusRetention: signal.lifecycle.hiatusRetention / 100,
      },
      sourceStatus: priceResult.sourceStatus,
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

