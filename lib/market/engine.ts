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

const KST_OFFSET_MS = 9 * HOUR_MS;

function kstDay(time: number): number {
  return Math.floor((time + KST_OFFSET_MS) / DAY_MS);
}

/**
 * 촘촘한 기록이 시작되기 전 구간은 거친 기록으로 이어 붙인다.
 * 예) 1주 차트 = 복원된 일별 마감 기록 + 수집 시작 뒤 시간별 기록
 */
function stitched(dataset: MarketDataset, tier: 'recent' | 'hourly' | 'daily'): HistoryEntry[] {
  const { daily, hourly, recent } = dataset.history;
  if (tier === 'daily') return daily;
  const fine = tier === 'recent' ? recent : hourly;
  const fineStart = fine[0]?.t ?? Infinity;
  const coarse =
    tier === 'recent'
      ? [...daily.filter((entry) => entry.t < (hourly[0]?.t ?? fineStart)), ...hourly]
      : daily;
  return [...coarse.filter((entry) => entry.t < fineStart), ...fine];
}

/** 차트에 쓸 기록: 기간에 맞는 단위로 고르고, 마지막은 항상 최신 시점 */
export function periodEntries(dataset: MarketDataset, period: PeriodId): HistoryEntry[] {
  const definition = getPeriod(period);
  const latest = latestEntry(dataset);
  const from = latest.t - definition.span;

  const all = stitched(dataset, definition.tier);
  // 기간 바로 앞의 기록 하나를 시작점으로 넣어 '기간 전 대비'가 맞게 한다.
  const firstInside = all.findIndex((entry) => entry.t >= from);
  const entries = firstInside > 0 ? all.slice(firstInside - 1) : firstInside === 0 ? all : [];

  const thinned = entries.filter(
    (_, index) => index === 0 || (entries.length - 1 - index) % definition.every === 0,
  );
  if (thinned[thinned.length - 1]?.t !== latest.t) thinned.push(latest);
  return thinned;
}

/**
 * daysBack일 전 마감 기록(한국 시간 기준 그날의 마지막 값). 없으면 null.
 * 1일 등락률 = 전일 마감 대비(증권 앱의 '전일 대비'와 같다).
 */
export function closeAgo(dataset: MarketDataset, daysBack: number): HistoryEntry | null {
  const latest = latestEntry(dataset);
  const target = kstDay(latest.t) - daysBack;
  let best: HistoryEntry | null = null;
  for (const entry of dataset.history.daily) {
    const day = kstDay(entry.t);
    if (day === target) return entry;
    // 그날 기록이 없으면 그 전날까지 중 가장 가까운 마감
    if (day < target && day >= target - 2 && (!best || entry.t > best.t)) best = entry;
  }
  return best;
}

/** span 전 시점과 가장 가까운 기록(차트 구간 계산용). 없으면 null. */
export function entryAgo(dataset: MarketDataset, span: number): HistoryEntry | null {
  const latest = latestEntry(dataset);
  const target = latest.t - span;
  const tolerance = span <= DAY_MS ? HOUR_MS : DAY_MS;
  let best: HistoryEntry | null = null;
  for (const entry of stitched(dataset, span <= 2 * DAY_MS ? 'recent' : 'hourly')) {
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
