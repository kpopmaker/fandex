import type { PeriodId } from './types';

/** 가격은 15분 단위 슬롯으로 계산한다. */
export const SLOT_MS = 15 * 60 * 1000;
export const SLOTS_PER_HOUR = 4;
export const SLOTS_PER_DAY = 96;

/** KMI 기준 시점: 2026-01-01 00:00 KST = 1,000pt */
export const INDEX_BASE_TIME = Date.UTC(2025, 11, 31, 15, 0, 0);
export const INDEX_BASE_SLOT = Math.floor(INDEX_BASE_TIME / SLOT_MS);
export const INDEX_BASE_VALUE = 1000;

export type PeriodDefinition = {
  id: PeriodId;
  label: string;
  /** 비교 기준이 되는 과거 슬롯 수 */
  span: number;
  /** 차트 점 간격(슬롯) */
  step: number;
};

export const PERIODS: readonly PeriodDefinition[] = [
  { id: '1D', label: '1일', span: SLOTS_PER_DAY, step: 1 },
  { id: '1W', label: '1주', span: SLOTS_PER_DAY * 7, step: SLOTS_PER_HOUR },
  { id: '1M', label: '1달', span: SLOTS_PER_DAY * 30, step: SLOTS_PER_HOUR * 4 },
  { id: '3M', label: '3달', span: SLOTS_PER_DAY * 90, step: SLOTS_PER_DAY / 2 },
  { id: '1Y', label: '1년', span: SLOTS_PER_DAY * 365, step: SLOTS_PER_DAY },
];

export const DEFAULT_PERIOD: PeriodId = '1W';

export function getPeriod(id: PeriodId): PeriodDefinition {
  return PERIODS.find((period) => period.id === id) ?? PERIODS[1];
}

export function isPeriodId(value: unknown): value is PeriodId {
  return PERIODS.some((period) => period.id === value);
}

export function currentSlot(now = Date.now()): number {
  return Math.floor(now / SLOT_MS);
}

export function slotTime(slot: number): number {
  return slot * SLOT_MS;
}

/** span 동안 step 간격의 슬롯 목록. 마지막 원소는 항상 현재 슬롯이다. */
export function slotRange(endSlot: number, span: number, step: number): number[] {
  const slots: number[] = [];
  const start = endSlot - span;
  const first = start + ((endSlot - start) % step);
  for (let slot = first; slot <= endSlot; slot += step) slots.push(slot);
  if (slots[slots.length - 1] !== endSlot) slots.push(endSlot);
  return slots;
}
