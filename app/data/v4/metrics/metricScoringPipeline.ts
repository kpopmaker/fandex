import { artistMetadata } from '../charts/artistMetadata';
import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import { FANDEX_METRIC_MONTHS } from './fandexMetricMonths';
import { getMetricPointForMonth } from './artistMonthlyMetricHelpers';
import type { FandexVariableKey } from './fandexMetricTypes';
import type { MetricDataReadiness } from './manualMetricDataTypes';
import {
  getManualMetricDataPoints,
  getManualMetricPoint,
} from './manualMetricHelpers';
import {
  getManualMetricValueStatus,
  validateManualMetricDataPoint,
} from './manualMetricValidators';
import type {
  ArtistMonthlyResolvedMetricScores,
  MetricScoreOrigin,
  MetricScoringPipelineSummary,
  MetricScoreStatus,
  ResolvedMetricScore,
} from './metricScoringPipelineTypes';

const metricDefinitionsByKey = new Map(
  FANDEX_METRIC_DEFINITIONS.map((definition) => [definition.key, definition]),
);

function isFiniteScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getScoreStatus(value: unknown): MetricScoreStatus {
  if (value === null || value === undefined) {
    return 'missing';
  }

  if (!isFiniteScore(value)) {
    return 'invalid';
  }

  return value === 0 ? 'zero' : 'ready';
}

function createResolvedMetricScore({
  artistId,
  metricKey,
  month,
  origin,
  sourceLabel,
  status,
  value,
}: {
  artistId: string;
  metricKey: FandexVariableKey;
  month: string;
  origin: MetricScoreOrigin;
  sourceLabel?: string;
  status?: MetricScoreStatus;
  value: unknown;
}): ResolvedMetricScore {
  const resolvedStatus = status ?? getScoreStatus(value);
  const score = isFiniteScore(value) ? value : null;
  const weight = getMetricWeight(metricKey);

  return {
    artistId,
    metricKey,
    month,
    value: score,
    score,
    weight,
    weightedScore: score === null ? null : score * (weight / 100),
    origin,
    status: resolvedStatus,
    stage: 'display-ready',
    sourceLabel,
  };
}

function getPreviewSeedValue(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
) {
  const previewPoint = getMetricPointForMonth(artistId, month);

  return previewPoint?.variables[metricKey] ?? null;
}

function hasUsableManualMetricValue(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
) {
  const manualPoint = getManualMetricPoint(artistId, metricKey, month);

  if (!manualPoint) {
    return false;
  }

  const validation = validateManualMetricDataPoint(manualPoint);
  const valueStatus = getManualMetricValueStatus(manualPoint.value);

  return (
    validation.isValid &&
    (valueStatus === 'valid' || valueStatus === 'zero')
  );
}

export function getMetricWeight(metricKey: FandexVariableKey) {
  return metricDefinitionsByKey.get(metricKey)?.defaultWeight ?? 0;
}

export function resolveMetricScoreOrigin(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
): MetricScoreOrigin {
  if (hasUsableManualMetricValue(artistId, metricKey, month)) {
    return 'manual-input';
  }

  return 'preview-seed';
}

export function getResolvedMetricScore(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
): ResolvedMetricScore {
  const normalizedArtistId = artistId.trim();
  const normalizedMonth = month.trim();
  const manualPoint = getManualMetricPoint(
    normalizedArtistId,
    metricKey,
    normalizedMonth,
  );

  if (manualPoint && hasUsableManualMetricValue(normalizedArtistId, metricKey, normalizedMonth)) {
    return createResolvedMetricScore({
      artistId: normalizedArtistId,
      metricKey,
      month: normalizedMonth,
      origin: 'manual-input',
      sourceLabel: manualPoint.sourceLabel ?? 'manual input',
      value: manualPoint.value,
    });
  }

  const previewValue = getPreviewSeedValue(
    normalizedArtistId,
    metricKey,
    normalizedMonth,
  );
  const fallbackStatus =
    manualPoint && getManualMetricValueStatus(manualPoint.value) !== 'missing'
      ? 'fallback'
      : undefined;

  return createResolvedMetricScore({
    artistId: normalizedArtistId,
    metricKey,
    month: normalizedMonth,
    origin: 'preview-seed',
    sourceLabel: manualPoint ? 'preview seed fallback' : 'preview seed',
    status: fallbackStatus,
    value: previewValue,
  });
}

export function getArtistMonthlyResolvedMetricScores(
  artistId: string,
  month: string,
): ArtistMonthlyResolvedMetricScores {
  const scores = FANDEX_METRIC_DEFINITIONS.map((definition) =>
    getResolvedMetricScore(artistId, definition.key, month),
  );

  return {
    artistId: artistId.trim(),
    month: month.trim(),
    scores,
    totalWeightedScore: scores.reduce(
      (sum, score) => sum + (score.weightedScore ?? 0),
      0,
    ),
    availableScoreCount: scores.filter(
      (score) => score.status === 'ready' || score.status === 'zero',
    ).length,
    missingScoreCount: scores.filter((score) => score.status === 'missing')
      .length,
    zeroScoreCount: scores.filter((score) => score.status === 'zero').length,
  };
}

export function getArtistResolvedMetricSeries(
  artistId: string,
  metricKey: FandexVariableKey,
) {
  return FANDEX_METRIC_MONTHS.map((month) =>
    getResolvedMetricScore(artistId, metricKey, month.month),
  );
}

export function getMetricScoringPipelineSummary(): MetricScoringPipelineSummary {
  const resolvedScores = artistMetadata.flatMap((artist) =>
    FANDEX_METRIC_MONTHS.flatMap((month) =>
      FANDEX_METRIC_DEFINITIONS.map((definition) =>
        getResolvedMetricScore(artist.artistId, definition.key, month.month),
      ),
    ),
  );

  return {
    totalPoints: resolvedScores.length,
    previewSeedPoints: resolvedScores.filter(
      (score) => score.origin === 'preview-seed',
    ).length,
    manualInputPoints: resolvedScores.filter(
      (score) => score.origin === 'manual-input',
    ).length,
    externalSourcePoints: resolvedScores.filter(
      (score) => score.origin === 'external-source',
    ).length,
    readyPoints: resolvedScores.filter((score) => score.status === 'ready')
      .length,
    zeroPoints: resolvedScores.filter((score) => score.status === 'zero')
      .length,
    missingPoints: resolvedScores.filter((score) => score.status === 'missing')
      .length,
    invalidPoints: resolvedScores.filter((score) => score.status === 'invalid')
      .length,
  };
}

export function getScoringPipelineReadiness(): MetricDataReadiness {
  const summary = getMetricScoringPipelineSummary();

  if (summary.invalidPoints > 0) {
    return 'invalid';
  }

  if (summary.readyPoints + summary.zeroPoints === 0) {
    return 'empty';
  }

  if (summary.missingPoints > 0 || getManualMetricDataPoints().length === 0) {
    return 'partial';
  }

  return 'ready';
}
