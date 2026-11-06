// market-data 기록에서 가격·등락률·차트 시리즈를 만든다. 계산식은 formula.ts.

import type { HistoryEntry } from './dataFiles';
import type { MarketDataset } from './dataset';
import { VARIABLE_ORDER, priceFromRaw, unpackRaw, type RawScores } from './formula';
import { DAY_MS, HOUR_MS, getPeriod } from './time';
import type { PeriodId, SeriesPoint, VariableSeriesPoint } from './types';

const WIDTH = VARIABLE_ORDER.length;

export function rawFromEntry(dataset: MarketDataset, entry: HistoryEntry, id: string): RawScores | null {
  const position = dataset.index.get(id);
  if (position === undefined) return null;
  const offset = position * WIDTH;
  const first = entry.r[offset];
  if (first === undefined || first < 0) return null;
  return unpackRaw(entry.r, offset);
}

export function latestEntry(dataset: MarketDataset): HistoryEntry {
  const { recent } = dataset.history;
  return recent[recent.length - 1];
}

/** 차트에 쓸 기록: 기간에 맞는 단위로 고르고, 마지막은 항상 최신 시점 */
export function periodEntries(dataset: MarketDataset, period: PeriodId): HistoryEntry[] {
  const definition = getPeriod(period);
  const latest = latestEntry(dataset);
  const from = latest.t - definition.span;

  let entries = dataset.history[definition.tier].filter((entry) => entry.t >= from);
  // 수집 초기에는 긴 기간 단위 기록이 적으니, 더 촘촘한 기록으로 채운다.
  if (entries.length < 3 && definition.tier === 'daily') {
    entries = dataset.history.hourly.filter((entry) => entry.t >= from);
  }
  if (entries.length < 3 && definition.tier !== 'recent') {
    entries = dataset.history.recent.filter((entry) => entry.t >= from);
  }

  const thinned = entries.filter(
    (_, index) => (entries.length - 1 - index) % definition.every === 0,
  );
  if (thinned[thinned.length - 1]?.t !== latest.t) thinned.push(latest);
  return thinned;
}

/**
 * span 전 시점의 기록. 기록이 그만큼 쌓이지 않았으면 null.
 * 허용 오차: 1일은 1시간, 그 이상은 하루.
 */
export function entryAgo(dataset: MarketDataset, span: number): HistoryEntry | null {
  const latest = latestEntry(dataset);
  const target = latest.t - span;
  const tolerance = span <= DAY_MS ? HOUR_MS : DAY_MS;
  const pool =
    span <= 2 * DAY_MS
      ? dataset.history.recent
      : span <= 35 * DAY_MS
        ? dataset.history.hourly
        : dataset.history.daily;
  let best: HistoryEntry | null = null;
  for (const entry of pool) {
    if (Math.abs(entry.t - target) > tolerance) continue;
    if (!best || Math.abs(entry.t - target) < Math.abs(best.t - target)) best = entry;
  }
  return best;
}

export function priceOf(dataset: MarketDataset, entry: HistoryEntry, id: string): number | null {
  const raw = rawFromEntry(dataset, entry, id);
  return raw ? priceFromRaw(raw) : null;
}

export function changeRate(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return current / previous - 1;
}

export function priceSeries(dataset: MarketDataset, id: string, period: PeriodId): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const entry of periodEntries(dataset, period)) {
    const value = priceOf(dataset, entry, id);
    if (value !== null) points.push({ time: entry.t, value });
  }
  return points;
}

export function variableSeries(
  dataset: MarketDataset,
  id: string,
  period: PeriodId,
): VariableSeriesPoint[] {
  const points: VariableSeriesPoint[] = [];
  for (const entry of periodEntries(dataset, period)) {
    const raw = rawFromEntry(dataset, entry, id);
    if (raw) points.push({ time: entry.t, ...raw });
  }
  return points;
}

export function indexSeries(dataset: MarketDataset, period: PeriodId): SeriesPoint[] {
  return periodEntries(dataset, period).map((entry) => ({ time: entry.t, value: entry.k }));
}
