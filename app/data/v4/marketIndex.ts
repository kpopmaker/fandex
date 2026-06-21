import type { ChartPoint } from '../v3/types';
import { artistUniverseV4 } from './artistUniverse';
import { getArtistPriceHistoryV4 } from './artistPriceHistory';

export type KpopMarketIndexPointV4 = {
  date: string;
  timestamp: string;
  time: string;
  indexValue: number;
  change: number;
  changeRate: number;
  volume: number;
  totalVolume: number;
  marketCap: number;
  fanCap: number;
  artistCount: number;
};

export type KpopMarketIndexSummaryV4 = KpopMarketIndexPointV4 & {
  highValue: number;
  lowValue: number;
};

function safeNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safePositiveNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return Math.max(safeNumber(value, fallback), 0);
}

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;
  return Math.round(safeNumber(value) * multiplier) / multiplier;
}

function getChangeRate(previousValue: number, currentValue: number) {
  const safePreviousValue = safeNumber(previousValue);
  const safeCurrentValue = safeNumber(currentValue);

  if (safePreviousValue === 0) {
    return 0;
  }

  return ((safeCurrentValue - safePreviousValue) / safePreviousValue) * 100;
}

export function getKpopMarketIndexHistoryV4(): KpopMarketIndexPointV4[] {
  const histories = artistUniverseV4
    .map((artist) => getArtistPriceHistoryV4(artist.id))
    .filter((history) => history.length > 0);
  const maxLength = Math.max(...histories.map((history) => history.length), 0);
  let previousIndexValue: number | undefined;

  if (maxLength === 0) {
    return [];
  }

  return Array.from({ length: maxLength }, (_, pointIndex) => {
    const points = histories
      .map((history) => history[pointIndex])
      .filter((point): point is NonNullable<typeof point> => Boolean(point));
    const validPoints = points.filter((point) => Number.isFinite(point.price));
    const totalWeight = validPoints.reduce(
      (sum, point) => sum + safePositiveNumber(point.fanSizeValue),
      0
    );
    const averagePrice =
      totalWeight > 0
        ? validPoints.reduce((sum, point) => {
            const weight = safePositiveNumber(point.fanSizeValue);
            return sum + safePositiveNumber(point.price) * (weight / totalWeight);
          }, 0)
        : validPoints.reduce(
            (sum, point) => sum + safePositiveNumber(point.price),
            0
          ) / Math.max(validPoints.length, 1);
    const indexValue = round(averagePrice * 10, 2);
    const previousValue = previousIndexValue ?? indexValue;
    const change = round(indexValue - previousValue, 2);
    const changeRate = round(getChangeRate(previousValue, indexValue), 2);
    const volume = Math.round(
      validPoints.reduce(
        (sum, point) => sum + safePositiveNumber(point.volume),
        0
      )
    );
    const fanCap = Math.round(
      validPoints.reduce(
        (sum, point) => sum + safePositiveNumber(point.fanSizeValue),
        0
      )
    );
    const referencePoint = points[0];

    previousIndexValue = indexValue;

    return {
      date: referencePoint?.date ?? '-',
      timestamp: referencePoint?.timestamp ?? '',
      time: referencePoint?.time ?? '-',
      indexValue: safePositiveNumber(indexValue),
      change,
      changeRate,
      volume,
      totalVolume: volume,
      marketCap: fanCap,
      fanCap,
      artistCount: validPoints.length,
    };
  });
}

export function getKpopMarketChartPointsV4(): ChartPoint[] {
  return getKpopMarketIndexHistoryV4().map((point) => ({
    time: point.time,
    value: point.indexValue,
  }));
}

export function getKpopMarketIndexSummaryV4(): KpopMarketIndexSummaryV4 {
  const history = getKpopMarketIndexHistoryV4();
  const latest = history[history.length - 1];
  const values = history.map((point) => point.indexValue);

  return {
    ...(latest ?? {
      date: '-',
      timestamp: '',
      time: '-',
      indexValue: 0,
      change: 0,
      changeRate: 0,
      volume: 0,
      totalVolume: 0,
      marketCap: 0,
      fanCap: 0,
      artistCount: 0,
    }),
    highValue: values.length > 0 ? Math.max(...values) : 0,
    lowValue: values.length > 0 ? Math.min(...values) : 0,
  };
}
