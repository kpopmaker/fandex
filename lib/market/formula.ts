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

/** 0 아래만 막는다. 원점수에는 위쪽 한계(100점)가 없다(2026-11-08 사용자 요청). */
export function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** 절대 규모 로그 점수: 0 → 0점, ref → 100점, ref보다 크면 100점을 넘는다. */
export function logScore(value: number, ref: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return nonNegative((100 * Math.log10(1 + value)) / Math.log10(1 + ref));
}

/** 원점수 환산 기준. 이 값이면 100점(상한 아님, 넘으면 100점 이상). */
export const SCORE_REF = {
  /** 최근 7일 하루 평균 관련 기사 수(하루 한두 건에 가격이 출렁이지 않게 7일 평균을 쓴다) */
  newsDaily: 300,
  /** 최근 30일 광고·모델·협업 기사 수 */
  brand30d: 60,
  /** 최근 14일 컴백·발매·무대 기사 수 */
  comeback14d: 150,
  /** 최근 7일 부정 키워드 기사 수 */
  risk7d: 40,
  /** 멜론 TOP100 점수 합(1위 100점 … 100위 1점). 과거 복원 구간은 벅스 일간 차트 */
  chartPoints: 600,
} as const;

/** Last.fm 청취자 1만 명 → 0점, 500만 명 → 100점(더 많으면 100점 이상) */
export function listenerScore(listeners: number | null): number {
  if (!listeners || listeners <= 0) return 0;
  return nonNegative((100 * (Math.log10(listeners) - 4)) / (Math.log10(5_000_000) - 4));
}

/** 유튜브 구독자 1만 명 → 0점, 2,000만 명 → 100점(더 많으면 100점 이상) */
export function subscriberScore(subscribers: number | null): number {
  if (!subscribers || subscribers <= 0) return 0;
  return nonNegative((100 * (Math.log10(subscribers) - 4)) / (Math.log10(20_000_000) - 4));
}

/** SNS/팬덤: Last.fm 청취자와 유튜브 구독자 점수의 평균(한쪽만 있으면 그 점수) */
export function fandomScore(listeners: number | null, subscribers: number | null): number {
  const scores = [
    listeners ? listenerScore(listeners) : null,
    subscribers ? subscriberScore(subscribers) : null,
  ].filter((score): score is number => score !== null);
  if (!scores.length) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * 팬캡에 쓰는 팬덤 규모(유통 물량). 10만 명 = 1.
 * Last.fm 청취자와 유튜브 구독자가 둘 다 있으면 평균, 한쪽만 있으면 그 값.
 */
export function fanFloat(listeners: number | null, subscribers: number | null = null): number {
  const counts = [listeners, subscribers].filter((count): count is number => !!count && count > 0);
  const people = counts.length ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 0;
  return Math.max(people, 10_000) / 100_000;
}

export const MOMENTUM_SOURCES: readonly VariableId[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
];

/** 7일 전 대비 상승 속도(뉴스는 이미 7일 평균이라 하루 기사 몇 건에 흔들리지 않는다). 비교할 과거 값이 없으면 50(중립). */
export function momentumScore(now: RawScores, before: RawScores | null): number {
  if (!before) return 50;
  const avg = (scores: RawScores) =>
    MOMENTUM_SOURCES.reduce((sum, id) => sum + scores[id], 0) / MOMENTUM_SOURCES.length;
  return nonNegative(50 + (avg(now) - avg(before)) * 2.2);
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

/** 저장용: 원점수×10 정수(0 이상, 상한 없음) */
export function packRaw(raw: RawScores): number[] {
  return VARIABLE_ORDER.map((id) => Math.round(nonNegative(raw[id]) * 10));
}

export function unpackRaw(packed: readonly number[], offset = 0): RawScores {
  const raw = {} as RawScores;
  VARIABLE_ORDER.forEach((id, index) => {
    raw[id] = (packed[offset + index] ?? 0) / 10;
  });
  return raw;
}
