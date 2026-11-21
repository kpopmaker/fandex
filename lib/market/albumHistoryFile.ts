// 써클차트 주간 앨범 차트에서 만든 그룹별 초동판매량 기록.
// scripts/market/circle-archive.ts 가 만들고, 수집기(scripts/market/collect.ts)가 읽는다.

/** 한 번의 발매: [그 주 시작일 YYYY-MM-DD, 첫 주 판매량(버전 합산), 앨범명, 버전 수] */
export type AlbumRelease = [string, number, string, number];

export type AlbumHistoryGroup = {
  /** 최근 발매부터. 그룹당 최대 RELEASES_PER_GROUP개 */
  releases: AlbumRelease[];
};

export type AlbumHistoryFile = {
  version: 'album-history-v1';
  generatedAt: number;
  source: string;
  /** 모은 구간의 첫 주·마지막 주 시작일(YYYY-MM-DD) */
  from: string | null;
  to: string | null;
  weekCount: number;
  groups: Record<string, AlbumHistoryGroup>;
};

/** 그룹당 보관하는 발매 수. 망각계수가 180일이라 3년치면 충분히 덮인다. */
export const RELEASES_PER_GROUP = 16;
