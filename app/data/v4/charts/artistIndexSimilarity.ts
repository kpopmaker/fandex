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
  { key: 'musicAlbumPoint', label: 'Music/album response' },
  { key: 'newsIssuePoint', label: 'News exposure' },
  { key: 'snsFandomPoint', label: 'SNS/fandom response' },
  { key: 'brandFitPoint', label: 'Brand-fit signal' },
  { key: 'comebackActivityPoint', label: 'Activity momentum' },
  { key: 'growthMomentumPoint', label: 'Growth momentum' },
];

export function ensureComparableHistory(history: ArtistIndexHistoryPoint[]) {
  return history.filter(
    (point) =>
      typeof point.fandexPoint === 'number' &&
      Number.isFinite(point.fandexPoint),
  );
}

export function getComparableHistoryWindow(
  baseHistory: ArtistIndexHistoryPoint[],
  comparedHistory: ArtistIndexHistoryPoint[],
) {
  const safeBaseHistory = ensureComparableHistory(baseHistory);
  const safeComparedHistory = ensureComparableHistory(comparedHistory);
  const pointCount = Math.min(safeBaseHistory.length, safeComparedHistory.length);

  if (pointCount < 3) {
    return {
      baseWindow: [],
      comparedWindow: [],
    };
  }

  return {
    baseWindow: safeBaseHistory.slice(-pointCount),
    comparedWindow: safeComparedHistory.slice(-pointCount),
  };
}

export function normalizeIndexSeries(history: ArtistIndexHistoryPoint[]) {
  const values = ensureComparableHistory(history).map((point) => point.fandexPoint);

  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value) => (value - min) / range);
}

function getDeltaSeries(values: number[]) {
  return values.slice(1).map((value, index) => value - values[index]);
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 1);
}

export function getSafeSimilarityBand(score: number): ArtistIndexSimilarityBand {
  const safeScore = clampScore(score);

  if (safeScore >= 0.82) {
    return 'very_high';
  }

  if (safeScore >= 0.68) {
    return 'high';
  }

  if (safeScore >= 0.52) {
    return 'medium';
  }

  return 'low';
}

export function calculateSeriesSimilarity(
  baseHistory: ArtistIndexHistoryPoint[],
  comparedHistory: ArtistIndexHistoryPoint[],
) {
  const { baseWindow, comparedWindow } = getComparableHistoryWindow(
    baseHistory,
    comparedHistory,
  );

  if (baseWindow.length < 3 || comparedWindow.length < 3) {
    return 0;
  }

  const baseNormalized = normalizeIndexSeries(baseWindow);
  const comparedNormalized = normalizeIndexSeries(comparedWindow);
  const baseDeltas = getDeltaSeries(baseNormalized);
  const comparedDeltas = getDeltaSeries(comparedNormalized);
  const deltaCount = Math.min(baseDeltas.length, comparedDeltas.length);

  if (deltaCount === 0) {
    return 0;
  }

  const directionMatches = baseDeltas
    .slice(0, deltaCount)
    .filter((delta, index) => {
      const comparedDelta = comparedDeltas[index];
      return Math.sign(delta) === Math.sign(comparedDelta);
    }).length;
  const directionScore = directionMatches / deltaCount;
  const averageDifference =
    baseDeltas
      .slice(0, deltaCount)
      .reduce(
        (total, delta, index) => total + Math.abs(delta - comparedDeltas[index]),
        0,
      ) / deltaCount;
  const shapeScore = clampScore(1 - averageDifference * 1.8);
  const trendScore =
    getIndexTrendBand(baseWindow) === getIndexTrendBand(comparedWindow)
      ? 1
      : 0.62;
  const scaleScore =
    Math.sign(calculateIndexDelta(baseWindow)) ===
    Math.sign(calculateIndexDelta(comparedWindow))
      ? 1
      : 0.55;
  const score =
    directionScore * 0.42 +
    shapeScore * 0.34 +
    trendScore * 0.16 +
    scaleScore * 0.08;

  return Number(clampScore(score).toFixed(4));
}

export function calculateDominantSignals(history: ArtistIndexHistoryPoint[]) {
  const safeHistory = ensureComparableHistory(history);
  const totals = signalLabels
    .map((signal) => ({
      label: signal.label,
      value: safeHistory.reduce((total, point) => total + point[signal.key], 0),
    }))
    .sort((a, b) => b.value - a.value);

  return totals.slice(0, 3).map((signal) => signal.label);
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
      ? 'teams with similar upward index flow'
      : result.sharedTrendBand === 'stable'
        ? 'teams with steady index flow'
        : result.sharedTrendBand === 'volatile'
          ? 'teams with wider weekly movement'
          : 'teams to re-check through index flow';

  return [
    `${trendCopy}: ${primarySignal ?? 'SNS/fandom response'} comparison`,
    `${result.baseArtistName} and ${result.comparedArtistName}: shared ${secondarySignal ?? 'content response'} signals`,
    'SNS response moving before wider news exposure',
    'activity momentum building before the next content cycle',
    'similar cumulative point flow after broader public exposure',
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
    very_high: 'very high',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };

  return `${result.baseArtistName} and ${result.comparedArtistName} show ${bandCopy[result.similarityBand]} flow similarity across the recent window. Shared signals: ${result.sharedDominantSignals.join(', ')}.`;
}

export function sortSimilarityResults(results: ArtistIndexSimilarityResult[]) {
  return [...results].sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }

    return a.comparedArtistName.localeCompare(b.comparedArtistName);
  });
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
  const results = profiles
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
      const similarityBand = getSafeSimilarityBand(similarityScore);
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
          'Beta editorial seed comparison. Re-check public signals before content publication.',
      } satisfies ArtistIndexSimilarityResult;

      return {
        ...draftResult,
        commonThemeCandidates: createCommonThemeCandidates(draftResult),
        editorialSummary: createEditorialSummary(draftResult),
      };
    });

  return sortSimilarityResults(results);
}

export function runArtistIndexSimilarityShapeCheck(
  profiles: ArtistIndexChartProfile[],
) {
  const sampleProfiles = profiles.slice(0, Math.min(profiles.length, 10));
  const sampleResults = sampleProfiles.map((profile) =>
    findSimilarIndexMovements(profile.artistId, profiles),
  );
  const allScoresFinite = sampleResults.every((results) =>
    results.every((result) => Number.isFinite(result.similarityScore)),
  );
  const noSelfMatches = sampleResults.every((results, index) =>
    results.every(
      (result) => result.comparedArtistId !== sampleProfiles[index]?.artistId,
    ),
  );
  const everySampleHasThreeResults = sampleResults.every(
    (results) => results.length >= 3,
  );
  const everyResultHasContentShape = sampleResults.every((results) =>
    results.every(
      (result) =>
        result.commonThemeCandidates.length >= 3 &&
        result.sharedDominantSignals.length > 0 &&
        ['very_high', 'high', 'medium', 'low'].includes(result.similarityBand),
    ),
  );

  return {
    ok:
      profiles.length >= 4 &&
      allScoresFinite &&
      noSelfMatches &&
      everySampleHasThreeResults &&
      everyResultHasContentShape,
    sampledBaseCount: sampleProfiles.length,
    allScoresFinite,
    noSelfMatches,
    everySampleHasThreeResults,
    everyResultHasContentShape,
  };
}
