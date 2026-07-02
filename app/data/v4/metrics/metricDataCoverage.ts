import { artistMetadata } from '../charts/artistMetadata';
import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import { FANDEX_METRIC_MONTHS } from './fandexMetricMonths';
import { getArtistMonthlyMetrics } from './artistMonthlyMetricHelpers';
import type { FandexVariableKey } from './fandexMetricTypes';

export type MetricValueStatus =
  | 'available'
  | 'zero'
  | 'missing'
  | 'not-tracked';

export type MetricCoverageLevel = 'high' | 'medium' | 'low' | 'empty';

export type MetricValueCoverage = {
  artistId: string;
  metricKey: FandexVariableKey;
  month: string;
  status: MetricValueStatus;
  value: number | null;
};

export type ArtistMetricCoverageSummary = {
  artistId: string;
  metricKey: FandexVariableKey;
  totalMonths: number;
  availableMonths: number;
  zeroMonths: number;
  missingMonths: number;
  coverageRate: number;
  coverageLevel: MetricCoverageLevel;
};

export type MetricCoverageSummaryByMetric = {
  metricKey: FandexVariableKey;
  totalArtists: number;
  trackedArtists: number;
  highCoverageArtists: number;
  mediumCoverageArtists: number;
  lowCoverageArtists: number;
  emptyArtists: number;
  totalPoints: number;
  availablePoints: number;
  zeroPoints: number;
  missingPoints: number;
  coverageRate: number;
  coverageLevel: MetricCoverageLevel;
};

const metricKeys = new Set(
  FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
);

const trackedArtistIds = new Set(
  artistMetadata.map((artist) => artist.artistId),
);

export function isValidMetricScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeMetricKeyForCoverage(metricKey: string) {
  const normalizedMetricKey = metricKey.trim() === 'social' ? 'sns' : metricKey.trim();

  return metricKeys.has(normalizedMetricKey as FandexVariableKey)
    ? (normalizedMetricKey as FandexVariableKey)
    : null;
}

export function getMetricCoverageLevel(
  coverageRate: number,
): MetricCoverageLevel {
  if (coverageRate >= 0.8) {
    return 'high';
  }

  if (coverageRate >= 0.5) {
    return 'medium';
  }

  if (coverageRate > 0) {
    return 'low';
  }

  return 'empty';
}

export function getMetricValueCoverage(
  artistId: string,
  metricKey: string,
  month: string,
): MetricValueCoverage {
  const normalizedMetricKey =
    normalizeMetricKeyForCoverage(metricKey) ?? FANDEX_METRIC_DEFINITIONS[0].key;
  const normalizedArtistId = artistId.trim();
  const normalizedMonth = month.trim();

  if (!trackedArtistIds.has(normalizedArtistId)) {
    return {
      artistId: normalizedArtistId,
      metricKey: normalizedMetricKey,
      month: normalizedMonth,
      status: 'not-tracked',
      value: null,
    };
  }

  const point =
    getArtistMonthlyMetrics(normalizedArtistId).find(
      (item) => item.month === normalizedMonth || item.label === normalizedMonth,
    ) ?? null;

  if (!point) {
    return {
      artistId: normalizedArtistId,
      metricKey: normalizedMetricKey,
      month: normalizedMonth,
      status: 'missing',
      value: null,
    };
  }

  const value = point.variables[normalizedMetricKey];

  if (!isValidMetricScore(value)) {
    return {
      artistId: normalizedArtistId,
      metricKey: normalizedMetricKey,
      month: point.month,
      status: 'missing',
      value: null,
    };
  }

  return {
    artistId: normalizedArtistId,
    metricKey: normalizedMetricKey,
    month: point.month,
    status: value === 0 ? 'zero' : 'available',
    value,
  };
}

export function getArtistMetricCoverageSummary(
  artistId: string,
  metricKey: string,
): ArtistMetricCoverageSummary {
  const normalizedMetricKey =
    normalizeMetricKeyForCoverage(metricKey) ?? FANDEX_METRIC_DEFINITIONS[0].key;
  const monthlyCoverage = FANDEX_METRIC_MONTHS.map((month) =>
    getMetricValueCoverage(artistId, normalizedMetricKey, month.month),
  );
  const availableMonths = monthlyCoverage.filter((item) =>
    item.status === 'available' || item.status === 'zero',
  ).length;
  const zeroMonths = monthlyCoverage.filter((item) => item.status === 'zero')
    .length;
  const missingMonths = monthlyCoverage.filter((item) =>
    item.status === 'missing' || item.status === 'not-tracked',
  ).length;
  const totalMonths = FANDEX_METRIC_MONTHS.length;
  const coverageRate = totalMonths > 0 ? availableMonths / totalMonths : 0;

  return {
    artistId: artistId.trim(),
    metricKey: normalizedMetricKey,
    totalMonths,
    availableMonths,
    zeroMonths,
    missingMonths,
    coverageRate,
    coverageLevel: getMetricCoverageLevel(coverageRate),
  };
}

export function getAllArtistMetricCoverageSummaries() {
  return artistMetadata.flatMap((artist) =>
    FANDEX_METRIC_DEFINITIONS.map((definition) =>
      getArtistMetricCoverageSummary(artist.artistId, definition.key),
    ),
  );
}

export function getMetricCoverageSummaryByMetric(
  metricKey: string,
): MetricCoverageSummaryByMetric {
  const normalizedMetricKey =
    normalizeMetricKeyForCoverage(metricKey) ?? FANDEX_METRIC_DEFINITIONS[0].key;
  const artistSummaries = artistMetadata.map((artist) =>
    getArtistMetricCoverageSummary(artist.artistId, normalizedMetricKey),
  );
  const totalArtists = artistSummaries.length;
  const totalPoints = artistSummaries.reduce(
    (sum, summary) => sum + summary.totalMonths,
    0,
  );
  const availablePoints = artistSummaries.reduce(
    (sum, summary) => sum + summary.availableMonths,
    0,
  );
  const zeroPoints = artistSummaries.reduce(
    (sum, summary) => sum + summary.zeroMonths,
    0,
  );
  const missingPoints = artistSummaries.reduce(
    (sum, summary) => sum + summary.missingMonths,
    0,
  );
  const coverageRate = totalPoints > 0 ? availablePoints / totalPoints : 0;

  return {
    metricKey: normalizedMetricKey,
    totalArtists,
    trackedArtists: artistSummaries.filter(
      (summary) => summary.coverageRate > 0,
    ).length,
    highCoverageArtists: artistSummaries.filter(
      (summary) => summary.coverageLevel === 'high',
    ).length,
    mediumCoverageArtists: artistSummaries.filter(
      (summary) => summary.coverageLevel === 'medium',
    ).length,
    lowCoverageArtists: artistSummaries.filter(
      (summary) => summary.coverageLevel === 'low',
    ).length,
    emptyArtists: artistSummaries.filter(
      (summary) => summary.coverageLevel === 'empty',
    ).length,
    totalPoints,
    availablePoints,
    zeroPoints,
    missingPoints,
    coverageRate,
    coverageLevel: getMetricCoverageLevel(coverageRate),
  };
}

export function getAllMetricCoverageSummariesByMetric() {
  return FANDEX_METRIC_DEFINITIONS.map((definition) =>
    getMetricCoverageSummaryByMetric(definition.key),
  );
}
