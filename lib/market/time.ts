import type { PeriodId } from './types';

export const SLOT_MS = 15 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export type PeriodDefinition = {
  id: PeriodId;
  label: string;
  /** 차트가 보여주는 기간(ms) */
  span: number;
  /** 사용할 기록 단위 */
  tier: 'recent' | 'hourly' | 'daily';
  /** 기록을 몇 개마다 하나씩 쓸지 */
  every: number;
};

export const PERIODS: readonly PeriodDefinition[] = [
  { id: '1D', label: '1일', span: DAY_MS, tier: 'recent', every: 1 },
  { id: '1W', label: '1주', span: 7 * DAY_MS, tier: 'hourly', every: 1 },
  { id: '1M', label: '1달', span: 30 * DAY_MS, tier: 'hourly', every: 4 },
  { id: '3M', label: '3달', span: 90 * DAY_MS, tier: 'daily', every: 1 },
  { id: '1Y', label: '1년', span: 365 * DAY_MS, tier: 'daily', every: 1 },
];

export const DEFAULT_PERIOD: PeriodId = '1W';

export function getPeriod(id: PeriodId): PeriodDefinition {
  return PERIODS.find((period) => period.id === id) ?? PERIODS[1];
}

export function isPeriodId(value: unknown): value is PeriodId {
  return PERIODS.some((period) => period.id === value);
}
