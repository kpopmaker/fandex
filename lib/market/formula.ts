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

/**
 * 모든 변수의 최소 점수(2026-11-12 사용자 요청: 0점인 그룹이 없게).
 * 기준을 넓혀도 기록이 하나도 없으면 이 점수를 준다. 조정 신호는 모든 그룹이 같이 1점씩 깎여 순위에는 영향이 없다.
 */
export const MIN_RAW = 1;

/**
 * 두 기준점 로그 눈금(2026-11-12 사용자 요청: 점수가 전체적으로 낮고 좁아서 폭넓고 세분화되게).
 * low(실제 분포의 아래쪽) → lowScore점, high(위쪽) → highScore점. 그 사이를 로그로 잇고,
 * high보다 크면 100점을 넘는다. 기준점은 실제 K-pop 그룹 분포의 10~90% 지점에서 잡았다.
 */
export function band(
  value: number | null,
  low: number,
  high: number,
  lowScore = 15,
  highScore = 88,
): number {
  if (!value || value <= 0 || !Number.isFinite(value)) return 0;
  const ratio = (Math.log10(1 + value) - Math.log10(1 + low)) / (Math.log10(1 + high) - Math.log10(1 + low));
  return nonNegative(lowScore + (highScore - lowScore) * ratio);
}

/** 각 변수의 기준점 [아래쪽 값, 위쪽 값]. 아래쪽이 15점, 위쪽이 88점(차트·팬덤은 따로). */
export const SCORE_BAND = {
  /** 하루 평균 관련 기사 수 */
  newsDaily: [0.2, 18],
  /** 광고·모델·협업·패션·뷰티 기사 수(30일 환산) */
  brand: [1, 120],
  /** 컴백·발매·공연·방송 출연 기사 수(30일 환산) */
  comeback: [3, 600],
  /** 부정 키워드 기사 수(30일 환산) */
  risk: [1, 60],
  /** 멜론 TOP100 점수 합(1위 100점 … 100위 1점) */
  chartPoints: [5, 900],
  /** Last.fm 누적 재생 */
  playcount: [100_000, 500_000_000],
  /** 유튜브 공식 채널 누적 조회 */
  views: [10_000_000, 10_000_000_000],
  /** Last.fm 청취자 */
  listeners: [3_000, 5_000_000],
  /** 유튜브 구독자 */
  subscribers: [10_000, 20_000_000],
} as const;

/** 멜론 TOP100에 든 만큼 더해지는 점수의 비중. 차트 밖 그룹은 누적 소비만으로 점수가 매겨진다. */
export const CHART_WEIGHT = 0.6;

/** 최근 7일·30일·90일 기사 수를 섞은 하루 평균. 최근 소식을 크게 보되 한동안 조용한 그룹도 과거 기사가 반영된다. */
export function newsDailyAverage(week: number, month: number, quarter: number): number {
  return 0.45 * (week / 7) + 0.35 * (month / 30) + 0.2 * (quarter / 90);
}

/** 30일 집계와 90일 집계를 섞은 30일 환산값. 30일 안에 기사가 없어도 90일 기록으로 구분된다. */
export function windowBlend(month: number, quarter: number): number {
  return 0.6 * month + 0.4 * (quarter / 3);
}

/** 멜론 TOP100 차트 점수(5점 → 20점, 900점 → 100점) */
export function chartScore(chartPoints: number): number {
  return band(chartPoints, SCORE_BAND.chartPoints[0], SCORE_BAND.chartPoints[1], 20, 100);
}

/** Last.fm 누적 재생 점수 */
export function playcountScore(playcount: number | null): number {
  return band(playcount, SCORE_BAND.playcount[0], SCORE_BAND.playcount[1], 10, 95);
}

/** 유튜브 공식 채널 누적 조회 점수 */
export function viewsScore(views: number | null): number {
  return band(views, SCORE_BAND.views[0], SCORE_BAND.views[1], 10, 95);
}

function meanOfPresent(values: Array<number | null>): number {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : 0;
}

/** 누적 소비 점수: Last.fm 누적 재생과 유튜브 누적 조회 점수의 평균(한쪽만 있으면 그 점수) */
export function consumptionScore(playcount: number | null, views: number | null): number {
  return meanOfPresent([playcount ? playcountScore(playcount) : null, views ? viewsScore(views) : null]);
}

/** 음원/음반: 누적 소비 점수 + 멜론 TOP100 차트 점수×0.6 */
export function musicScore(chartPoints: number, playcount: number | null, views: number | null): number {
  return consumptionScore(playcount, views) + CHART_WEIGHT * chartScore(chartPoints);
}

/** 뉴스/이슈: 7일·30일·90일을 섞은 하루 평균 기사 수 */
export function newsScore(week: number, month: number, quarter: number): number {
  const [low, high] = SCORE_BAND.newsDaily;
  return band(newsDailyAverage(week, month, quarter), low, high);
}

/** 브랜드·활동·조정: 30일과 90일을 섞은 기사 수 */
export function articleScore(key: 'brand' | 'comeback' | 'risk', month: number, quarter: number): number {
  const [low, high] = SCORE_BAND[key];
  return band(windowBlend(month, quarter), low, high);
}

/** Last.fm 청취자 3천 명 → 5점, 500만 명 → 100점(더 많으면 100점 이상) */
export function listenerScore(listeners: number | null): number {
  return band(listeners, SCORE_BAND.listeners[0], SCORE_BAND.listeners[1], 5, 100);
}

/** 유튜브 구독자 1만 명 → 5점, 2,000만 명 → 100점(더 많으면 100점 이상) */
export function subscriberScore(subscribers: number | null): number {
  return band(subscribers, SCORE_BAND.subscribers[0], SCORE_BAND.subscribers[1], 5, 100);
}

/** SNS/팬덤: Last.fm 청취자와 유튜브 구독자 점수의 평균(한쪽만 있으면 그 점수) */
export function fandomScore(listeners: number | null, subscribers: number | null): number {
  return meanOfPresent([listeners ? listenerScore(listeners) : null, subscribers ? subscriberScore(subscribers) : null]);
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

/** 모멘텀이 1주 변화에 반응하는 폭(클수록 넓게 퍼진다) */
export const MOMENTUM_GAIN = 3;

/** 7일 전 대비 상승 속도(뉴스는 이미 7일 평균이라 하루 기사 몇 건에 흔들리지 않는다). 비교할 과거 값이 없으면 50(중립). */
export function momentumScore(now: RawScores, before: RawScores | null): number {
  if (!before) return 50;
  const avg = (scores: RawScores) =>
    MOMENTUM_SOURCES.reduce((sum, id) => sum + scores[id], 0) / MOMENTUM_SOURCES.length;
  return nonNegative(50 + (avg(now) - avg(before)) * MOMENTUM_GAIN);
}

/** 모든 변수에 최소 점수(MIN_RAW)를 적용한다. */
export function withMinimum(raw: RawScores): RawScores {
  const result = { ...raw };
  for (const id of VARIABLE_ORDER) result[id] = Math.max(MIN_RAW, Number.isFinite(raw[id]) ? raw[id] : 0);
  return result;
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
