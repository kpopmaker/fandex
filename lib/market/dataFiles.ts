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
};

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
  chartPoints: number;
  brand30d: number;
  comeback14d: number;
  risk7d: number;
  headlines: NewsHeadline[];
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
    bugs: number | null;
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
};
