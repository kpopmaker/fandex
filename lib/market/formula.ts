// 수집기(scripts/market/collect.ts)와 사이트가 함께 쓰는 계산식.
// 여기 숫자를 바꾸면 수집기와 화면이 같이 바뀐다.

import { ENABLED_VARIABLES, POSITIVE_COEFFICIENT_SUM, type VariableId } from './variables';

export type RawScores = Record<VariableId, number>;

export const VARIABLE_ORDER: readonly VariableId[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
  'comebackActivity',
  'growthMomentum',
  'riskAdjustment',
];

export function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** 절대 규모 로그 점수: 0 → 0점, ref 이상 → 100점 */
export function logScore(value: number, ref: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clamp100((100 * Math.log10(1 + value)) / Math.log10(1 + ref));
}

/** 원점수 환산 기준. 이 값 이상이면 100점. */
export const SCORE_REF = {
  /** 최근 24시간 관련 기사 수 */
  news24h: 300,
  /** 최근 30일 광고·모델·협업 기사 수 */
  brand30d: 60,
  /** 최근 14일 컴백·발매·무대 기사 수 */
  comeback14d: 150,
  /** 최근 7일 부정 키워드 기사 수 */
  risk7d: 40,
  /** 벅스 실시간 TOP100 점수 합(1위 100점 … 100위 1점) */
  chartPoints: 600,
} as const;

/** Last.fm 청취자 1만 명 → 0점, 500만 명 → 100점 */
export function listenerScore(listeners: number | null): number {
  if (!listeners || listeners <= 0) return 0;
  return clamp100((100 * (Math.log10(listeners) - 4)) / (Math.log10(5_000_000) - 4));
}

/** 팬캡에 쓰는 팬덤 규모(유통 물량). Last.fm 청취자 10만 명 = 1. */
export function fanFloat(listeners: number | null): number {
  return Math.max(listeners ?? 0, 10_000) / 100_000;
}

export const MOMENTUM_SOURCES: readonly VariableId[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
];

/** 7일 전 대비 상승 속도. 비교할 과거 값이 없으면 50(중립). */
export function momentumScore(now: RawScores, before: RawScores | null): number {
  if (!before) return 50;
  const avg = (scores: RawScores) =>
    MOMENTUM_SOURCES.reduce((sum, id) => sum + scores[id], 0) / MOMENTUM_SOURCES.length;
  return clamp100(50 + (avg(now) - avg(before)) * 2.2);
}

export function scoreFromRaw(raw: RawScores): number {
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

export function priceFromRaw(raw: RawScores): number {
  return priceFromScore(scoreFromRaw(raw));
}

/** 저장용: 원점수를 0~1000 정수로 */
export function packRaw(raw: RawScores): number[] {
  return VARIABLE_ORDER.map((id) => Math.round(clamp100(raw[id]) * 10));
}

export function unpackRaw(packed: readonly number[], offset = 0): RawScores {
  const raw = {} as RawScores;
  VARIABLE_ORDER.forEach((id, index) => {
    raw[id] = (packed[offset + index] ?? 0) / 10;
  });
  return raw;
}
