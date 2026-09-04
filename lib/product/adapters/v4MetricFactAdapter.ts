import type {
  MetricValueCoverage,
  MetricValueStatus,
} from '../../../app/data/v4/metrics/metricDataCoverage';
import type {
  MetricScoreStatus,
  ResolvedMetricScore,
} from '../../../app/data/v4/metrics/metricScoringPipelineTypes';
import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import {
  makeAvailableProductNumericFact,
  makeMissingProductNumericFact,
  makeNotTrackedProductNumericFact,
} from '../contracts/productNumericFact';
import type { ProductNumericFact } from '../contracts/productNumericFact';
import type { ProductUnknownObservation } from '../contracts/productTime';

export type V4MetricCoverageSourceMetadata = Readonly<{
  sourceKind: 'metric-value-coverage';
  sourceArtistId: string;
  sourceMetricKey: FandexVariableKey;
  sourceMonth: string;
  sourceStatus: MetricValueStatus;
}>;

export type V4MetricPipelineSourceMetadata = Readonly<{
  sourceKind: 'metric-scoring-pipeline';
  sourceArtistId: string;
  sourceMetricKey: FandexVariableKey;
  sourceMonth: string;
  sourceStatus: MetricScoreStatus;
}>;

export type V4MetricFactSourceMetadata =
  | V4MetricCoverageSourceMetadata
  | V4MetricPipelineSourceMetadata;

export type ProductV4MetricNumericFact = Readonly<{
  numeric: ProductNumericFact;
  observationTime: ProductUnknownObservation;
  source: V4MetricFactSourceMetadata;
}>;

export type V4MetricFactUnsupportedReason =
  | 'non-finite-value'
  | 'invalid-source-status'
  | 'unsupported-source-status'
  | 'source-status-value-mismatch';

export type V4MetricFactAdapterResult =
  | Readonly<{
      status: 'ok';
      fact: ProductV4MetricNumericFact;
    }>
  | Readonly<{
      status: 'unsupported-source';
      reason: V4MetricFactUnsupportedReason;
      source: V4MetricFactSourceMetadata;
    }>;

const UNKNOWN_OBSERVATION = Object.freeze({
  kind: 'unknown',
} as const satisfies ProductUnknownObservation);

function unsupported(
  source: V4MetricFactSourceMetadata,
  reason: V4MetricFactUnsupportedReason,
): V4MetricFactAdapterResult {
  return Object.freeze({
    status: 'unsupported-source',
    reason,
    source,
  });
}

function success(
  source: V4MetricFactSourceMetadata,
  numeric: ProductNumericFact,
): V4MetricFactAdapterResult {
  return Object.freeze({
    status: 'ok',
    fact: Object.freeze({
      numeric,
      observationTime: UNKNOWN_OBSERVATION,
      source,
    }),
  });
}

function adaptMetricNumericValue(
  source: V4MetricFactSourceMetadata,
  value: number | null,
): V4MetricFactAdapterResult {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return unsupported(source, 'non-finite-value');
  }

  if (source.sourceStatus === 'invalid') {
    return unsupported(source, 'invalid-source-status');
  }

  if (source.sourceStatus === 'fallback') {
    return unsupported(source, 'unsupported-source-status');
  }

  if (source.sourceStatus === 'missing') {
    return value === null
      ? success(source, makeMissingProductNumericFact())
      : unsupported(source, 'source-status-value-mismatch');
  }

  if (source.sourceStatus === 'not-tracked') {
    return value === null
      ? success(source, makeNotTrackedProductNumericFact())
      : unsupported(source, 'source-status-value-mismatch');
  }

  if (source.sourceStatus === 'zero') {
    return value === 0
      ? success(source, makeAvailableProductNumericFact(value))
      : unsupported(source, 'source-status-value-mismatch');
  }

  return value !== null
    ? success(source, makeAvailableProductNumericFact(value))
    : unsupported(source, 'source-status-value-mismatch');
}

export function adaptMetricValueCoverage(
  source: MetricValueCoverage,
): V4MetricFactAdapterResult {
  const metadata = Object.freeze({
    sourceKind: 'metric-value-coverage',
    sourceArtistId: source.artistId,
    sourceMetricKey: source.metricKey,
    sourceMonth: source.month,
    sourceStatus: source.status,
  } as const satisfies V4MetricCoverageSourceMetadata);

  return adaptMetricNumericValue(metadata, source.value);
}

export function adaptResolvedMetricScoreValue(
  source: ResolvedMetricScore,
): V4MetricFactAdapterResult {
  const metadata = Object.freeze({
    sourceKind: 'metric-scoring-pipeline',
    sourceArtistId: source.artistId,
    sourceMetricKey: source.metricKey,
    sourceMonth: source.month,
    sourceStatus: source.status,
  } as const satisfies V4MetricPipelineSourceMetadata);

  return adaptMetricNumericValue(metadata, source.value);
}
