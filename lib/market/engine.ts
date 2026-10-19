// FANDEX 가격·지수 계산.
//   FANDEX 점수 = (Σ 원점수 × 계수 − 조정 신호 × 계수) ÷ Σ 양(+)의 계수     → 대략 0~100
//   FANDEX 가격 = 100 × exp((점수 − 50) ÷ 50)
//   팬캡(시가총액) = 가격 × 유통 물량(팬덤 규모)
//   KMI 종합지수 = Σ 팬캡 ÷ 제수(기준 시점 2026-01-01 = 1,000pt)

import { MARKET_ARTISTS } from './artists';
import { mockMarketDataSource } from './mockSource';
import {
  INDEX_BASE_SLOT,
  INDEX_BASE_VALUE,
  slotRange,
  slotTime,
  getPeriod,
} from './time';
import type {
  ArtistSnapshot,
  MarketDataSource,
  PeriodId,
  RawVariablePoints,
  SeriesPoint,
  VariableSeriesPoint,
} from './types';
import { ENABLED_VARIABLES, POSITIVE_COEFFICIENT_SUM } from './variables';

/** 실데이터가 연결되면 이 한 줄만 live 소스로 바꾼다. */
export const dataSource: MarketDataSource = mockMarketDataSource;

const snapshotCache = new Map<string, ArtistSnapshot>();
const MAX_CACHE = 400_000;

export function scoreFromRaw(raw: RawVariablePoints): number {
  let total = 0;
  for (const variable of ENABLED_VARIABLES) {
    const contribution = raw[variable.id] * variable.coefficient;
    total += variable.penalty ? -contribution : contribution;
  }
  return total / POSITIVE_COEFFICIENT_SUM;
}

export function priceFromScore(score: number): number {
  return 100 * Math.exp((score - 50) / 50);
}

export function getSnapshot(artistId: string, slot: number): ArtistSnapshot {
  const key = `${artistId}:${slot}`;
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const raw = dataSource.getRaw(artistId, slot);
  const score = scoreFromRaw(raw);
  const snapshot: ArtistSnapshot = { slot, raw, score, price: priceFromScore(score) };

  if (snapshotCache.size > MAX_CACHE) snapshotCache.clear();
  snapshotCache.set(key, snapshot);
  return snapshot;
}

export function fanCap(artistId: string, slot: number): number {
  return getSnapshot(artistId, slot).price * dataSource.getFloat(artistId);
}

let divisorCache: number | null = null;

function indexDivisor(): number {
  if (divisorCache !== null) return divisorCache;
  const baseCap = MARKET_ARTISTS.reduce(
    (sum, artist) => sum + fanCap(artist.id, INDEX_BASE_SLOT),
    0,
  );
  divisorCache = baseCap / INDEX_BASE_VALUE;
  return divisorCache;
}

export function indexValue(slot: number): number {
  const totalCap = MARKET_ARTISTS.reduce((sum, artist) => sum + fanCap(artist.id, slot), 0);
  return totalCap / indexDivisor();
}

export function changeRate(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) return 0;
  return current / previous - 1;
}

export function priceSeries(artistId: string, endSlot: number, period: PeriodId): SeriesPoint[] {
  const { span, step } = getPeriod(period);
  return slotRange(endSlot, span, step).map((slot) => ({
    time: slotTime(slot),
    value: getSnapshot(artistId, slot).price,
  }));
}

export function variableSeries(
  artistId: string,
  endSlot: number,
  period: PeriodId,
): VariableSeriesPoint[] {
  const { span, step } = getPeriod(period);
  return slotRange(endSlot, span, step).map((slot) => ({
    time: slotTime(slot),
    ...getSnapshot(artistId, slot).raw,
  }));
}

export function indexSeries(endSlot: number, period: PeriodId): SeriesPoint[] {
  const { span, step } = getPeriod(period);
  return slotRange(endSlot, span, step).map((slot) => ({
    time: slotTime(slot),
    value: indexValue(slot),
  }));
}
