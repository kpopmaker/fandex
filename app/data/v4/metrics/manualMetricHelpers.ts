import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import { FANDEX_METRIC_MONTHS } from './fandexMetricMonths';
import { MANUAL_METRIC_DATA_POINTS } from './manualMetricSeed';
import type { FandexVariableKey } from './fandexMetricTypes';
import type { MetricDataReadiness } from './manualMetricDataTypes';
import {
  getManualMetricValueStatus,
  validateManualMetricDataPoints,
} from './manualMetricValidators';

export type ManualMetricCoverageSummary = {
  pointCount: number;
  validValueCount: number;
  zeroValueCount: number;
  missingValueCount: number;
  invalidValueCount: number;
  artistScopeCount: number;
  metricScopeCount: number;
  monthScopeCount: number;
  readiness: MetricDataReadiness;
};

export type ManualMetricValidationSummary = {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  readiness: MetricDataReadiness;
};

function getManualMetricReadiness({
  errorCount,
  pointCount,
  warningCount,
}: {
  errorCount: number;
  pointCount: number;
  warningCount: number;
}): MetricDataReadiness {
  if (errorCount > 0) {
    return 'invalid';
  }

  if (pointCount === 0) {
    return 'empty';
  }

  return warningCount > 0 ? 'partial' : 'ready';
}

export function getManualMetricDataPoints() {
  return MANUAL_METRIC_DATA_POINTS;
}

export function getManualMetricPoint(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
) {
  const normalizedArtistId = artistId.trim();
  const normalizedMonth = month.trim();

  return (
    getManualMetricDataPoints().find(
      (point) =>
        point.artistId.trim() === normalizedArtistId &&
        point.metricKey === metricKey &&
        point.month.trim() === normalizedMonth,
    ) ?? null
  );
}

export function getManualMetricSeries(
  artistId: string,
  metricKey: FandexVariableKey,
) {
  const normalizedArtistId = artistId.trim();
  const monthOrder = new Map(
    FANDEX_METRIC_MONTHS.map((month, index) => [month.month, index]),
  );

  return getManualMetricDataPoints()
    .filter(
      (point) =>
        point.artistId.trim() === normalizedArtistId &&
        point.metricKey === metricKey,
    )
    .sort(
      (a, b) =>
        (monthOrder.get(a.month.trim()) ?? Number.MAX_SAFE_INTEGER) -
        (monthOrder.get(b.month.trim()) ?? Number.MAX_SAFE_INTEGER),
    );
}

export function getManualMetricCoverageSummary(): ManualMetricCoverageSummary {
  const points = getManualMetricDataPoints();
  const statuses = points.map((point) => getManualMetricValueStatus(point.value));
  const validationSummary = getManualMetricValidationSummary();

  return {
    pointCount: points.length,
    validValueCount: statuses.filter((status) => status === 'valid').length,
    zeroValueCount: statuses.filter((status) => status === 'zero').length,
    missingValueCount: statuses.filter((status) => status === 'missing').length,
    invalidValueCount: statuses.filter((status) => status === 'invalid').length,
    artistScopeCount: new Set(points.map((point) => point.artistId.trim())).size,
    metricScopeCount: FANDEX_METRIC_DEFINITIONS.length,
    monthScopeCount: FANDEX_METRIC_MONTHS.length,
    readiness: validationSummary.readiness,
  };
}

export function getManualMetricValidationSummary(): ManualMetricValidationSummary {
  const points = getManualMetricDataPoints();
  const validation = validateManualMetricDataPoints(points);
  const errorCount = validation.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = validation.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;

  return {
    isValid: validation.isValid,
    errorCount,
    warningCount,
    readiness: getManualMetricReadiness({
      errorCount,
      pointCount: points.length,
      warningCount,
    }),
  };
}
