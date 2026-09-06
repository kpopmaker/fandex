export type RankingFandexPoint = number | null;

export function normalizeRankingFandexPoint(
  value: unknown,
): RankingFandexPoint {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function compareRankingFandexDesc(
  left: RankingFandexPoint,
  right: RankingFandexPoint,
) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

export function formatRankingFandexPoint(value: RankingFandexPoint) {
  if (value === null) {
    return '\uAD00\uCE21 \uC5C6\uC74C';
  }

  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}