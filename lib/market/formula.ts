// 수집기(scripts/market/collect.ts)와 사이트가 함께 쓰는 계산식.
// 여기 숫자를 바꾸면 수집기와 화면이 같이 바뀐다.

import { ENABLED_VARIABLES, type VariableId } from './variables';

export type RawScores = Record<VariableId, number>;

export const VARIABLE_ORDER: readonly VariableId[] = [
  'musicAlbum',
  'newsIssue',
  'snsFandom',
  'brandFit',
  'comebackActivity',
  'growthMomentum',
  'riskAdjustment',
  // 뒤에 붙인다 — 앞 순서를 바꾸면 저장된 기록을 못 읽는다.
  'albumSales',
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
  /** 부정 키워드 기사 수(30일 환산). 2026-11-21부터 조정 신호는 riskRate를 쓴다 */
  risk: [1, 60],
  /** 전체 기사 중 부정 기사 비율(%) */
  riskRate: [1, 20],
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
  /** 써클차트 초동판매량(버전 합산) */
  firstWeek: [1_000, 1_000_000],
} as const;

/**
 * 차트 밖 그룹의 음원 점수 바닥(2026-11-21 새 방정식).
 * 예전에는 누적 재생·조회를 음원에 그대로 더해서 음원과 팬덤의 상관이 +0.87이었다 — 사실상 같은 변수였다.
 * 이제 음원은 멜론 차트가 중심이고, 차트에 없는 그룹만 누적 소비 점수의 일부를 바닥으로 받는다.
 * 상한이 있어서 '차트에 없다'는 사실 자체가 점수에 남는다.
 */
export const OFF_CHART_CAP = 35;
export const OFF_CHART_SHARE = 0.45;

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

/** 음원: 멜론 차트 점수. 차트 밖 그룹은 누적 소비 점수의 45%를 바닥으로 받되 35점을 넘지 않는다. */
export function musicScore(chartPoints: number, playcount: number | null, views: number | null): number {
  const consumption = consumptionScore(playcount, views);
  const floor = consumption > 0 ? Math.min(OFF_CHART_CAP, OFF_CHART_SHARE * consumption) : 0;
  return Math.max(chartScore(chartPoints), floor);
}

/**
 * 음반 점수가 반으로 줄어드는 데 걸리는 시간을 정하는 값(망각곡선).
 * 1개월 후 0.85, 3개월 후 0.61, 6개월 후 0.37, 1년 후 0.13이 된다.
 * 공백기가 길어질수록 앨범 효과가 옅어지는 것을 그대로 담는다.
 */
export const ALBUM_DECAY_DAYS = 180;

/** 음반: 초동판매량(버전 합산)에 발매 후 지난 날수만큼 망각계수를 곱한다. */
export function albumScore(firstWeek: number | null, daysSinceRelease: number): number {
  const [low, high] = SCORE_BAND.firstWeek;
  const base = band(firstWeek, low, high);
  if (base <= 0) return 0;
  return base * Math.exp(-Math.max(0, daysSinceRelease) / ALBUM_DECAY_DAYS);
}

/** 화제성이 활동·브랜드 기사 비중만큼 더 받는 폭(최대 1.25배) */
export const NEWS_ACTIVITY_GAIN = 0.15;
export const NEWS_BRAND_GAIN = 0.1;
/** 비중을 낼 때 기사 수가 이보다 적으면 이 값으로 나눈다(기사 몇 건으로 비중이 1이 되는 것을 막는다) */
export const NEWS_SHARE_FLOOR = 30;

/**
 * 화제성: 7일·30일·90일을 섞은 하루 평균 기사 수에, 그중 활동·브랜드 기사 비중만큼 가중한다.
 * 기사 수만 세면 컴백 기사와 시상식 명단 언급이 같은 가치가 되므로,
 * 예전에 변수 하나씩 차지하던 브랜드·활동을 여기로 흡수했다(둘 다 뉴스와 상관 +0.9).
 */
export function newsScore(
  week: number,
  month: number,
  quarter: number,
  comebackMonth = 0,
  brandMonth = 0,
): number {
  const [low, high] = SCORE_BAND.newsDaily;
  const base = band(newsDailyAverage(week, month, quarter), low, high);
  if (base <= 0) return 0;
  const denominator = Math.max(NEWS_SHARE_FLOOR, month);
  const activity = Math.min(1, comebackMonth / denominator);
  const brand = Math.min(1, brandMonth / denominator);
  return base * (1 + NEWS_ACTIVITY_GAIN * activity + NEWS_BRAND_GAIN * brand);
}

/** 기사가 적은 그룹을 전체 평균 쪽으로 끌어당기는 보정(평균이 2%인 가상의 기사 30건) */
export const RISK_PRIOR_RATE = 0.02;
export const RISK_PRIOR_ARTICLES = 30;

/** 전체 기사 중 부정 기사 비율(0~1) */
export function riskRate(riskMonth: number, newsMonth: number): number {
  const prior = RISK_PRIOR_RATE * RISK_PRIOR_ARTICLES;
  return (Math.max(0, riskMonth) + prior) / (Math.max(0, newsMonth) + RISK_PRIOR_ARTICLES);
}

/**
 * 조정 신호: 부정 기사 '비율'(2026-11-21 변경).
 * 건수로 세면 기사가 많은 팀이 자동으로 불리했다 — 리센느는 부정 8.8%인데 112.9점,
 * 몬스타엑스는 57.3%인데 103.3점이었다.
 */
export function riskScore(riskMonth: number, newsMonth: number): number {
  const [low, high] = SCORE_BAND.riskRate;
  return band(riskRate(riskMonth, newsMonth) * 100, low, high);
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

/**
 * 팬덤: Last.fm 청취자·누적 재생과 유튜브 구독자·누적 조회 점수의 평균(있는 것만).
 * 누적 소비(재생·조회)와 청취자·구독자의 상관이 +0.98이라 따로 변수로 둘 이유가 없어
 * 2026-11-21에 하나로 합쳤다.
 */
export function fandomScore(
  listeners: number | null,
  subscribers: number | null,
  playcount: number | null = null,
  views: number | null = null,
): number {
  return meanOfPresent([
    listeners ? listenerScore(listeners) : null,
    subscribers ? subscriberScore(subscribers) : null,
    playcount ? playcountScore(playcount) : null,
    views ? viewsScore(views) : null,
  ]);
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

export const MOMENTUM_SOURCES: readonly VariableId[] = ['musicAlbum', 'newsIssue', 'snsFandom', 'albumSales'];

/** 모멘텀이 1주 변화에 반응하는 폭(클수록 넓게 퍼진다) */
export const MOMENTUM_GAIN = 3;

/**
 * 7일 전 대비 상승 속도(뉴스는 이미 7일 평균이라 하루 기사 몇 건에 흔들리지 않는다).
 * 비교할 과거 값이 없거나 양쪽에 다 있는 변수가 없으면 50(중립).
 * 한쪽만 0(데이터 없음)인 변수는 빼야 한다 — 값이 생긴 날 모멘텀이 튀기 때문이다.
 */
export function momentumScore(now: RawScores, before: RawScores | null): number {
  if (!before) return 50;
  const ids = MOMENTUM_SOURCES.filter((id) => now[id] > 0 && before[id] > 0);
  if (!ids.length) return 50;
  const avg = (scores: RawScores) => ids.reduce((sum, id) => sum + scores[id], 0) / ids.length;
  return nonNegative(50 + (avg(now) - avg(before)) * MOMENTUM_GAIN);
}

/**
 * 기록이 있는 변수에만 최소 점수(MIN_RAW)를 준다.
 * 0은 '기록 없음'이라 그대로 두고, 종합 점수의 평균에서 빠진다(2026-11-21).
 * 없는 숫자를 0점으로 세면 데이터가 적은 그룹이 벌점을 받는다.
 */
export function withMinimum(raw: RawScores): RawScores {
  const result = { ...raw };
  for (const id of VARIABLE_ORDER) {
    const value = Number.isFinite(raw[id]) ? raw[id] : 0;
    result[id] = value > 0 ? Math.max(MIN_RAW, value) : 0;
  }
  return result;
}

/**
 * 중위 그룹이 50점(가격 100)에 오도록 맞추는 상수. 한 번 정해 박아 두고 매일 다시 계산하지 않는다.
 * 2026-11-22 음반을 넣은 188팀 분포에서 보정 전 중위가 32.4점이었다(양수 계수 합 5.5 기준).
 * 변수를 더하거나 계수를 바꾸면 다시 잡아야 한다.
 */
export const SCORE_CALIBRATION = 17.6;

/** 그 그룹에 기록이 있는 양수 변수들의 계수 합(종합 점수의 분모) */
export function positiveWeight(raw: RawScores): number {
  return ENABLED_VARIABLES.filter((variable) => !variable.penalty && raw[variable.id] > 0).reduce(
    (sum, variable) => sum + variable.coefficient,
    0,
  );
}

export function scoreFromRaw(raw: RawScores): number {
  const weight = positiveWeight(raw);
  if (weight <= 0) return 0;
  let total = 0;
  for (const variable of ENABLED_VARIABLES) {
    if (variable.penalty) {
      total -= raw[variable.id] * variable.coefficient;
    } else if (raw[variable.id] > 0) {
      total += raw[variable.id] * variable.coefficient;
    }
  }
  return total / weight + SCORE_CALIBRATION;
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
