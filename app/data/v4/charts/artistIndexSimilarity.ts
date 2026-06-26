import {
  calculateIndexDelta,
  getIndexTrendBand,
  type ArtistIndexChartProfile,
  type ArtistIndexHistoryPoint,
  type ArtistIndexTrendBand,
} from './artistIndexChartData';

export type ArtistIndexSimilarityBand =
  | 'very_high'
  | 'high'
  | 'medium'
  | 'low';

export type ArtistIndexSimilarityResult = {
  baseArtistId: string;
  baseArtistName: string;
  comparedArtistId: string;
  comparedArtistName: string;
  similarityScore: number;
  similarityBand: ArtistIndexSimilarityBand;
  sharedTrendBand: ArtistIndexTrendBand;
  sharedDominantSignals: string[];
  commonThemeCandidates: string[];
  editorialSummary: string;
  cautionNote: string;
};

const signalLabels: Array<{
  key: keyof Pick<
    ArtistIndexHistoryPoint,
    | 'musicAlbumPoint'
    | 'newsIssuePoint'
    | 'snsFandomPoint'
    | 'brandFitPoint'
    | 'comebackActivityPoint'
    | 'growthMomentumPoint'
  >;
  label: string;
}> = [
  { key: 'musicAlbumPoint', label: '음원/앨범 반응' },
  { key: 'newsIssuePoint', label: '뉴스 노출' },
  { key: 'snsFandomPoint', label: 'SNS/팬덤 반응' },
  { key: 'brandFitPoint', label: '브랜드 적합 신호' },
  { key: 'comebackActivityPoint', label: '컴백/활동 모멘텀' },
  { key: 'growthMomentumPoint', label: '성장 모멘텀' },
];

export function normalizeIndexSeries(history: ArtistIndexHistoryPoint[]) {
  const values = history.map((point) => point.fandexPoint);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value) => (value - min) / range);
}

function getDeltaSeries(values: number[]) {
  return values.slice(1).map((value, index) => value - values[index]);
}

function clampScore(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function calculateSeriesSimilarity(
  baseHistory: ArtistIndexHistoryPoint[],
  comparedHistory: ArtistIndexHistoryPoint[],
) {
  const baseNormalized = normalizeIndexSeries(baseHistory);
  const comparedNormalized = normalizeIndexSeries(comparedHistory);
  const pointCount = Math.min(baseNormalized.length, comparedNormalized.length);

  if (pointCount < 3) {
    return 0;
  }

  const baseDeltas = getDeltaSeries(baseNormalized.slice(-pointCount));
  const comparedDeltas = getDeltaSeries(comparedNormalized.slice(-pointCount));
  const directionMatches = baseDeltas.filter((delta, index) => {
    const comparedDelta = comparedDeltas[index];
    return Math.sign(delta) === Math.sign(comparedDelta);
  }).length;
  const directionScore = directionMatches / Math.max(baseDeltas.length, 1);
  const averageDifference =
    baseDeltas.reduce(
      (total, delta, index) => total + Math.abs(delta - comparedDeltas[index]),
      0,
    ) / Math.max(baseDeltas.length, 1);
  const shapeScore = clampScore(1 - averageDifference * 1.8);
  const trendScore =
    getIndexTrendBand(baseHistory) === getIndexTrendBand(comparedHistory)
      ? 1
      : 0.62;
  const scaleScore =
    Math.sign(calculateIndexDelta(baseHistory)) ===
    Math.sign(calculateIndexDelta(comparedHistory))
      ? 1
      : 0.55;

  return Number(
    clampScore(
      directionScore * 0.42 +
        shapeScore * 0.34 +
        trendScore * 0.16 +
        scaleScore * 0.08,
    ).toFixed(4),
  );
}

export function calculateDominantSignals(history: ArtistIndexHistoryPoint[]) {
  const totals = signalLabels
    .map((signal) => ({
      label: signal.label,
      value: history.reduce((total, point) => total + point[signal.key], 0),
    }))
    .sort((a, b) => b.value - a.value);

  return totals.slice(0, 3).map((signal) => signal.label);
}

function toSimilarityBand(score: number): ArtistIndexSimilarityBand {
  if (score >= 0.82) {
    return 'very_high';
  }

  if (score >= 0.68) {
    return 'high';
  }

  if (score >= 0.52) {
    return 'medium';
  }

  return 'low';
}

export function createCommonThemeCandidates(
  result: Pick<
    ArtistIndexSimilarityResult,
    | 'baseArtistName'
    | 'comparedArtistName'
    | 'sharedDominantSignals'
    | 'sharedTrendBand'
  >,
) {
  const [primarySignal, secondarySignal] = result.sharedDominantSignals;
  const trendCopy =
    result.sharedTrendBand === 'rising'
      ? '지표 흐름이 함께 상승한'
      : result.sharedTrendBand === 'stable'
        ? '안정적인 지표 흐름을 보인'
        : result.sharedTrendBand === 'volatile'
          ? '주간 변동 폭이 커진'
          : '지표 흐름을 다시 확인할';

  return [
    `${trendCopy} 팀들의 ${primarySignal ?? '팬덤 반응'} 비교`,
    `${result.baseArtistName}와 ${result.comparedArtistName}의 공통 ${secondarySignal ?? '콘텐츠 반응'} 포인트`,
    '뉴스 노출보다 SNS 반응이 먼저 움직인 흐름',
    '활동 직전 모멘텀이 다시 강해진 구간',
    '브랜드 노출 이후 누적 포인트 흐름이 비슷해진 사례',
  ];
}

export function createEditorialSummary(
  result: Pick<
    ArtistIndexSimilarityResult,
    | 'baseArtistName'
    | 'comparedArtistName'
    | 'similarityBand'
    | 'sharedTrendBand'
    | 'sharedDominantSignals'
  >,
) {
  const bandCopy: Record<ArtistIndexSimilarityBand, string> = {
    very_high: '매우 높은',
    high: '높은',
    medium: '보통 수준의',
    low: '낮은',
  };

  return `${result.baseArtistName}와 ${result.comparedArtistName}는 최근 8개 시점에서 ${bandCopy[result.similarityBand]} 흐름 유사성을 보입니다. 주요 공통 신호는 ${result.sharedDominantSignals.join(', ')}입니다.`;
}

export function findSimilarIndexMovements(
  baseArtistId: string,
  profiles: ArtistIndexChartProfile[],
) {
  const baseProfile = profiles.find((profile) => profile.artistId === baseArtistId);

  if (!baseProfile) {
    return [];
  }

  const baseDominantSignals = calculateDominantSignals(baseProfile.history);
  const baseTrendBand = getIndexTrendBand(baseProfile.history);

  return profiles
    .filter((profile) => profile.artistId !== baseArtistId)
    .map((profile) => {
      const comparedDominantSignals = calculateDominantSignals(profile.history);
      const sharedDominantSignals = baseDominantSignals.filter((signal) =>
        comparedDominantSignals.includes(signal),
      );
      const comparedTrendBand = getIndexTrendBand(profile.history);
      const similarityScore = calculateSeriesSimilarity(
        baseProfile.history,
        profile.history,
      );
      const similarityBand = toSimilarityBand(similarityScore);
      const sharedTrendBand =
        baseTrendBand === comparedTrendBand ? baseTrendBand : comparedTrendBand;
      const draftResult = {
        baseArtistId: baseProfile.artistId,
        baseArtistName: baseProfile.artistName,
        comparedArtistId: profile.artistId,
        comparedArtistName: profile.artistName,
        similarityScore,
        similarityBand,
        sharedTrendBand,
        sharedDominantSignals:
          sharedDominantSignals.length > 0
            ? sharedDominantSignals
            : comparedDominantSignals.slice(0, 2),
        commonThemeCandidates: [],
        editorialSummary: '',
        cautionNote:
          '베타 editorial seed 기반의 흐름 비교입니다. 콘텐츠 발행 전 외부 플랫폼에서 수치를 재확인하세요.',
      } satisfies ArtistIndexSimilarityResult;

      return {
        ...draftResult,
        commonThemeCandidates: createCommonThemeCandidates(draftResult),
        editorialSummary: createEditorialSummary(draftResult),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export function runArtistIndexSimilarityShapeCheck(
  profiles: ArtistIndexChartProfile[],
) {
  const base = profiles[0];
  const results = base ? findSimilarIndexMovements(base.artistId, profiles) : [];

  return {
    ok:
      Boolean(base) &&
      results.length > 0 &&
      results.every(
        (result) =>
          result.commonThemeCandidates.length >= 3 &&
          result.sharedDominantSignals.length > 0,
      ),
    baseArtistId: base?.artistId,
    resultCount: results.length,
  };
}
