// music-archive 브랜치의 music-history.json.gz 형식. 수집 스크립트와 사이트가 함께 쓴다.

export type MusicHistoryGroup = {
  /** 주(월요일, 한국 시간 기준 1970-01-01부터 센 날짜 번호)마다 [주 시작, 차트 점수×10, 그 주 최고 순위] */
  w: Array<[number, number, number]>;
  /** 처음 차트에 든 날(YYYYMMDD) */
  first: string;
  /** 차트에 든 날(unit이 week면 주) 수 */
  chartDays: number;
  best: { rank: number; title: string; date: string };
};

export type MusicHistoryFile = {
  version: 'music-history-v1';
  generatedAt: number;
  source: string;
  /** 차트 단위: 멜론 주간 차트면 week(차트 점수 = 그 주 차트 점수), 예전 벅스 일간이면 day(주마다 하루 평균) */
  unit?: 'day' | 'week';
  /** 받은 차트의 첫날·마지막 날(YYYYMMDD) */
  from: string | null;
  to: string | null;
  dayCount: number;
  missingDays: number;
  /** 차트를 하루라도 받은 주(주 시작 날짜 번호) */
  weeks: number[];
  groups: Record<string, MusicHistoryGroup>;
};
