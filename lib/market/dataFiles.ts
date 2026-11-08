// market-data 브랜치에 저장되는 파일 형식. 수집기와 사이트가 함께 쓴다.

export const MARKET_DATA_VERSION = 'market-data-v1';

export type NewsHeadline = {
  title: string;
  url: string;
  publishedAt: number;
};

export type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  artistId: string | null;
};

/**
 * 한 시점의 기록.
 * t: 15분 슬롯 시작 시각(ms), k: KMI,
 * r: ids 순서대로 그룹마다 7개 원점수×10 정수(VARIABLE_ORDER 순). 값이 없으면 -1.
 */
export type HistoryEntry = {
  t: number;
  k: number;
  r: number[];
  /**
   * 하루 기록(daily)에만: 원점수의 근거가 된 실제 숫자. ids 순서대로 그룹마다 METRIC_ORDER 개수만큼 정수, 없으면 -1.
   * 청취자·구독자는 천 명 단위.
   */
  m?: number[];
  /** 과거 복원으로 만든 기록이면 1(음원은 벅스 일간 차트, 청취자·구독자는 복원 당시 값) */
  b?: 1;
};

/** 변수별 근거 숫자 순서(HistoryEntry.m) */
export const METRIC_ORDER = [
  'chartPoints',
  'news7d',
  'brand30d',
  'comeback14d',
  'risk7d',
  'listenersK',
  'subscribersK',
] as const;
export type MetricId = (typeof METRIC_ORDER)[number];

export type HistoryFile = {
  version: string;
  ids: string[];
  startedAt: number;
  /** 15분 간격, 최근 49시간 */
  recent: HistoryEntry[];
  /** 1시간 간격(그 시간의 마지막 값), 최근 36일 */
  hourly: HistoryEntry[];
  /** 하루 간격(한국 시간 기준 그날의 마지막 값), 전체 */
  daily: HistoryEntry[];
};

export type LatestGroup = {
  raw: number[];
  float: number;
  listeners: number | null;
  subscribers: number | null;
  news24h: number;
  /** 최근 7일 관련 기사 수(뉴스/이슈 점수는 이 수의 하루 평균으로 계산) */
  news7d?: number;
  chartPoints: number;
  brand30d: number;
  comeback14d: number;
  risk7d: number;
  headlines: NewsHeadline[];
  /** 브랜드·활동·조정 점수에 잡힌 최근 기사 예시(최대 3건씩) */
  examples?: { brand: NewsHeadline[]; comeback: NewsHeadline[]; risk: NewsHeadline[] };
};

export type LatestFile = {
  version: string;
  asOf: number;
  generatedAt: number;
  kmi: number;
  startedAt: number;
  groups: Record<string, LatestGroup>;
  chart: ChartEntry[];
  sourceTimes: {
    naver: number | null;
    /** 멜론 TOP100 수집 시각 */
    chart: number | null;
    lastfm: string | null;
    youtube: string | null;
  };
};

export type SourceReport = {
  status: 'ok' | 'partial' | 'cached' | 'skipped' | 'failed';
  at?: number;
  detail?: string;
  [key: string]: unknown;
};

export type RunReport = {
  runAt: number;
  slotTime: number;
  sources: Record<string, SourceReport>;
  notes: string[];
  summary?: Record<string, unknown>;
  backfill?: Record<string, unknown>;
};
