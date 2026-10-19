import type { VariableId } from './variables';

export type RawVariablePoints = Record<VariableId, number>;

/** 가격 계산에 필요한 원천 데이터. mock 과 실데이터 소스가 같은 모양을 구현한다. */
export interface MarketDataSource {
  kind: 'mock' | 'live';
  /** 특정 15분 슬롯의 변수별 원점수(0~100) */
  getRaw(artistId: string, slot: number): RawVariablePoints;
  /** 시가총액식 지수에 쓰는 유통 물량(팬덤 규모) */
  getFloat(artistId: string): number;
  /** 특정 슬롯까지 24시간 기사 수 */
  getNewsCount(artistId: string, slot: number): number;
}

export type PeriodId = '1D' | '1W' | '1M' | '3M' | '1Y';

export type ArtistSnapshot = {
  slot: number;
  raw: RawVariablePoints;
  score: number;
  price: number;
};

export type SeriesPoint = {
  time: number;
  value: number;
};

export type VariableSeriesPoint = {
  time: number;
} & RawVariablePoints;
