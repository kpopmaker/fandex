import { artistMetadata } from '../charts/artistMetadata';
import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import { FANDEX_METRIC_MONTHS } from './fandexMetricMonths';
import type { FandexVariableKey } from './fandexMetricTypes';
import type {
  ManualMetricDataPoint,
  ManualMetricDuplicatePoint,
  ManualMetricValidationIssue,
  ManualMetricValidationResult,
  ManualMetricValueStatus,
} from './manualMetricDataTypes';

const knownArtistIds = new Set(artistMetadata.map((artist) => artist.artistId));
const knownMetricKeys = new Set(
  FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
);
const knownMetricMonths = new Set(
  FANDEX_METRIC_MONTHS.map((month) => month.month),
);

function getDuplicateKey({
  artistId,
  metricKey,
  month,
}: Pick<ManualMetricDataPoint, 'artistId' | 'metricKey' | 'month'>) {
  return `${artistId.trim()}::${metricKey}::${month.trim()}`;
}

export function isKnownArtistId(artistId: string) {
  return knownArtistIds.has(artistId.trim());
}

export function isKnownMetricKey(metricKey: string): metricKey is FandexVariableKey {
  return knownMetricKeys.has(metricKey.trim() as FandexVariableKey);
}

export function isKnownMetricMonth(month: string) {
  return knownMetricMonths.has(month.trim());
}

export function isValidManualMetricValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function getManualMetricValueStatus(
  value: unknown,
): ManualMetricValueStatus {
  if (value === null || value === undefined) {
    return 'missing';
  }

  if (!isValidManualMetricValue(value)) {
    return 'invalid';
  }

  return value === 0 ? 'zero' : 'valid';
}

export function validateManualMetricDataPoint(
  point: ManualMetricDataPoint,
): ManualMetricValidationResult {
  const issues: ManualMetricValidationIssue[] = [];
  const artistId = point.artistId.trim();
  const metricKey = point.metricKey.trim();
  const month = point.month.trim();
  const valueStatus = getManualMetricValueStatus(point.value);

  if (!isKnownArtistId(artistId)) {
    issues.push({
      severity: 'error',
      code: 'unknown-artist',
      message: `Unknown artistId: ${artistId}`,
      artistId,
      metricKey,
      month,
    });
  }

  if (!isKnownMetricKey(metricKey)) {
    issues.push({
      severity: 'error',
      code: 'unknown-metric',
      message: `Unknown metricKey: ${metricKey}`,
      artistId,
      metricKey,
      month,
    });
  }

  if (!isKnownMetricMonth(month)) {
    issues.push({
      severity: 'error',
      code: 'unknown-month',
      message: `Unknown metric month: ${month}`,
      artistId,
      metricKey,
      month,
    });
  }

  if (valueStatus === 'invalid') {
    issues.push({
      severity: 'error',
      code: 'invalid-value',
      message: 'Manual metric value must be a finite number, null, or undefined.',
      artistId,
      metricKey,
      month,
    });
  }

  if (valueStatus === 'missing') {
    issues.push({
      severity: 'warning',
      code: 'missing-value',
      message: 'Manual metric value is missing and will not count as a value.',
      artistId,
      metricKey,
      month,
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

export function findDuplicateManualMetricPoints(
  points: ManualMetricDataPoint[],
): ManualMetricDuplicatePoint[] {
  const counts = new Map<string, ManualMetricDuplicatePoint>();

  points.forEach((point) => {
    const artistId = point.artistId.trim();
    const metricKey = point.metricKey;
    const month = point.month.trim();
    const key = getDuplicateKey({ artistId, metricKey, month });
    const current = counts.get(key);

    counts.set(key, {
      artistId,
      metricKey,
      month,
      count: (current?.count ?? 0) + 1,
    });
  });

  return Array.from(counts.values()).filter((item) => item.count > 1);
}

export function validateManualMetricDataPoints(
  points: ManualMetricDataPoint[],
): ManualMetricValidationResult {
  const pointIssues = points.flatMap(
    (point) => validateManualMetricDataPoint(point).issues,
  );
  const duplicateIssues: ManualMetricValidationIssue[] =
    findDuplicateManualMetricPoints(points).map((duplicate) => ({
      severity: 'error',
      code: 'duplicate-point',
      message: `Duplicate manual metric point: ${duplicate.artistId}/${duplicate.metricKey}/${duplicate.month}`,
      artistId: duplicate.artistId,
      metricKey: duplicate.metricKey,
      month: duplicate.month,
    }));
  const issues = [...pointIssues, ...duplicateIssues];

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}
