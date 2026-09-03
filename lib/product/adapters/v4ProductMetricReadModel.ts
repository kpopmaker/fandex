import { FANDEX_METRIC_DEFINITIONS } from '../../../app/data/v4/metrics/fandexMetricDefinitions';
import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import {
  getArtistMetricCoverageSummary,
  getMetricValueCoverage,
  type MetricValueCoverage,
} from '../../../app/data/v4/metrics/metricDataCoverage';
import {
  getManualMetricPoint,
} from '../../../app/data/v4/metrics/manualMetricHelpers';
import {
  getManualMetricValueStatus,
} from '../../../app/data/v4/metrics/manualMetricValidators';
import {
  getResolvedMetricScore,
} from '../../../app/data/v4/metrics/metricScoringPipeline';
import type { ResolvedMetricScore } from '../../../app/data/v4/metrics/metricScoringPipelineTypes';
import type {
  ProductMetricDataIssue,
  ProductMetricManualSourceMetadata,
  ProductMetricReadModel,
  ProductMetricReadModelResult,
  ProductMetricReadModelSourceMetadata,
  ProductMetricSourceCoverage,
  ProductMetricSourceIdentity,
  ProductMetricSourceProvenance,
  ProductMetricSourceScoring,
} from '../contracts/productMetricReadModel';
import type { ProductPresentation } from '../contracts/productState';
import type { ProductUnknownObservation } from '../contracts/productTime';
import {
  adaptMetricValueCoverage,
  adaptResolvedMetricScoreValue,
} from './v4MetricFactAdapter';

export type V4ProductMetricReadModelInput = Readonly<{
  artistId: string;
  metricKey: string;
  month: string;
}>;

export type V4MetricSourceKeyValidation =
  | Readonly<{
      status: 'valid';
      sourceMetricKey: FandexVariableKey;
    }>
  | Readonly<{
      status: 'invalid-metric-identity';
      rawMetricKey: string;
    }>;

export type V4ProductMetricRuntime = Readonly<{
  getMetricValueCoverage: typeof getMetricValueCoverage;
  getResolvedMetricScore: typeof getResolvedMetricScore;
  getArtistMetricCoverageSummary: typeof getArtistMetricCoverageSummary;
  getManualMetricPoint: typeof getManualMetricPoint;
  getManualMetricValueStatus: typeof getManualMetricValueStatus;
}>;

const SOURCE_METRIC_KEYS = new Set<FandexVariableKey>(
  FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
);

const UNKNOWN_OBSERVATION = Object.freeze({
  kind: 'unknown',
} as const satisfies ProductUnknownObservation);

const DEFAULT_RUNTIME = Object.freeze({
  getMetricValueCoverage,
  getResolvedMetricScore,
  getArtistMetricCoverageSummary,
  getManualMetricPoint,
  getManualMetricValueStatus,
} satisfies V4ProductMetricRuntime);

export function validateV4MetricSourceKey(
  rawMetricKey: string,
): V4MetricSourceKeyValidation {
  const normalizedMetricKey = rawMetricKey.trim();

  if (SOURCE_METRIC_KEYS.has(normalizedMetricKey as FandexVariableKey)) {
    return Object.freeze({
      status: 'valid',
      sourceMetricKey: normalizedMetricKey as FandexVariableKey,
    });
  }

  return Object.freeze({
    status: 'invalid-metric-identity',
    rawMetricKey,
  });
}

function presentationForOrigin(
  origin: ResolvedMetricScore['origin'],
): ProductPresentation {
  return origin === 'preview-seed' ? 'preview' : 'standard';
}

function createIdentity(
  artistId: string,
  metricKey: FandexVariableKey,
  month: string,
): ProductMetricSourceIdentity {
  return Object.freeze({
    sourceArtistId: artistId,
    sourceMetricKey: metricKey,
    sourceMonth: month,
  });
}

function createProvenance(
  coverage: MetricValueCoverage,
  resolved: ResolvedMetricScore,
): ProductMetricSourceProvenance {
  return Object.freeze({
    origin: resolved.origin,
    sourceLabel: resolved.sourceLabel ?? null,
    sourceStatus: resolved.status,
    availabilitySourceStatus: coverage.status,
    stage: resolved.stage,
  });
}

function createScoring(
  resolved: ResolvedMetricScore,
): ProductMetricSourceScoring {
  return Object.freeze({
    value: resolved.value,
    score: resolved.score,
    weight: resolved.weight,
    weightedScore: resolved.weightedScore,
  });
}

function createCoverageSource(
  summary: ReturnType<typeof getArtistMetricCoverageSummary>,
): ProductMetricSourceCoverage {
  return Object.freeze({
    totalMonths: summary.totalMonths,
    availableMonths: summary.availableMonths,
    zeroMonths: summary.zeroMonths,
    missingMonths: summary.missingMonths,
    coverageRate: summary.coverageRate,
    coverageLevel: summary.coverageLevel,
    missingMonthsMayIncludeNotTracked: true,
  });
}

function createManualSource(
  manualPoint: ReturnType<typeof getManualMetricPoint>,
  runtime: V4ProductMetricRuntime,
): ProductMetricManualSourceMetadata | null {
  if (!manualPoint) {
    return null;
  }

  return Object.freeze({
    value: manualPoint.value,
    valueStatus: runtime.getManualMetricValueStatus(manualPoint.value),
    sourceType: manualPoint.sourceType,
    sourceLabel: manualPoint.sourceLabel ?? null,
  });
}

function dataIssue(
  issues: readonly [ProductMetricDataIssue, ...ProductMetricDataIssue[]],
  sourceMetadata: ProductMetricReadModelSourceMetadata,
): ProductMetricReadModelResult {
  return Object.freeze({
    status: 'data-issue',
    issues: Object.freeze([...issues]) as unknown as readonly [
      ProductMetricDataIssue,
      ...ProductMetricDataIssue[],
    ],
    sourceMetadata,
  });
}

function sourceIdentityMatches(
  identity: ProductMetricSourceIdentity,
  coverage: MetricValueCoverage,
  resolved: ResolvedMetricScore,
) {
  return (
    coverage.artistId === identity.sourceArtistId &&
    coverage.metricKey === identity.sourceMetricKey &&
    coverage.month === identity.sourceMonth &&
    resolved.artistId === identity.sourceArtistId &&
    resolved.metricKey === identity.sourceMetricKey &&
    resolved.month === identity.sourceMonth
  );
}

function previewConflict(
  coverage: MetricValueCoverage,
  resolved: ResolvedMetricScore,
): ProductMetricDataIssue | null {
  const expectedPipelineStatus =
    coverage.status === 'available'
      ? 'ready'
      : coverage.status === 'zero'
        ? 'zero'
        : coverage.status;

  if (resolved.status !== expectedPipelineStatus) {
    return Object.freeze({
      code: 'source-state-conflict',
      reason: 'preview-availability-mismatch',
    });
  }

  if (resolved.value !== coverage.value) {
    return Object.freeze({
      code: 'source-state-conflict',
      reason: 'preview-value-mismatch',
    });
  }

  return null;
}

function success(
  fact: ProductMetricReadModel['fact'],
  sourceMetadata: ProductMetricReadModelSourceMetadata,
): ProductMetricReadModelResult {
  return Object.freeze({
    status: 'ok',
    model: Object.freeze({
      identity: sourceMetadata.identity,
      fact,
      presentation: presentationForOrigin(sourceMetadata.provenance.origin),
      observationTime: UNKNOWN_OBSERVATION,
      provenance: sourceMetadata.provenance,
      scoring: sourceMetadata.scoring,
      coverageSource: sourceMetadata.coverageSource,
    }),
  });
}

export function getV4ProductMetricReadModel(
  input: V4ProductMetricReadModelInput,
  runtime: V4ProductMetricRuntime = DEFAULT_RUNTIME,
): ProductMetricReadModelResult {
  const metricKeyValidation = validateV4MetricSourceKey(input.metricKey);
  const artistId = input.artistId.trim();
  const month = input.month.trim();

  if (metricKeyValidation.status === 'invalid-metric-identity') {
    const issues = Object.freeze([
      Object.freeze({
        code: 'invalid-metric-identity',
        rawMetricKey: input.metricKey,
      }),
    ]) as readonly [ProductMetricDataIssue];

    return Object.freeze({
      status: 'data-issue',
      issues,
      sourceMetadata: Object.freeze({
        sourceArtistId: artistId,
        rawMetricKey: input.metricKey,
        sourceMonth: month,
      }),
    });
  }

  const metricKey = metricKeyValidation.sourceMetricKey;
  const manualPoint = runtime.getManualMetricPoint(artistId, metricKey, month);
  const coverage = runtime.getMetricValueCoverage(artistId, metricKey, month);
  const resolved = runtime.getResolvedMetricScore(artistId, metricKey, month);
  const coverageSummary = runtime.getArtistMetricCoverageSummary(
    artistId,
    metricKey,
  );
  const identity = createIdentity(artistId, metricKey, month);
  const sourceMetadata = Object.freeze({
    identity,
    provenance: createProvenance(coverage, resolved),
    scoring: createScoring(resolved),
    coverageSource: createCoverageSource(coverageSummary),
    manualSource: createManualSource(manualPoint, runtime),
  } satisfies ProductMetricReadModelSourceMetadata);
  const issues: ProductMetricDataIssue[] = [];

  if (sourceMetadata.manualSource?.valueStatus === 'invalid') {
    issues.push(Object.freeze({
      code: 'invalid-source-value',
      detectedBy: 'manual-validation',
    }));
  }

  if (resolved.status === 'invalid') {
    issues.push(Object.freeze({
      code: 'invalid-source-value',
      detectedBy: 'metric-scoring-pipeline',
    }));
  }

  if (resolved.status === 'fallback') {
    issues.push(Object.freeze({ code: 'fallback-source' }));
  }

  if (issues.length > 0) {
    return dataIssue(
      issues as [ProductMetricDataIssue, ...ProductMetricDataIssue[]],
      sourceMetadata,
    );
  }

  if (!sourceIdentityMatches(identity, coverage, resolved)) {
    return dataIssue(
      [Object.freeze({
        code: 'source-state-conflict',
        reason: 'source-identity-mismatch',
      })],
      sourceMetadata,
    );
  }

  if (coverage.status === 'not-tracked') {
    if (resolved.status !== 'missing') {
      return dataIssue(
        [Object.freeze({
          code: 'source-state-conflict',
          reason: 'not-tracked-pipeline-mismatch',
        })],
        sourceMetadata,
      );
    }

    const adapted = adaptMetricValueCoverage(coverage);

    if (adapted.status === 'unsupported-source') {
      return dataIssue(
        [Object.freeze({
          code: 'unsupported-source',
          reason: adapted.reason,
        })],
        sourceMetadata,
      );
    }

    return success(adapted.fact.numeric, sourceMetadata);
  }

  if (resolved.origin === 'preview-seed') {
    const conflict = previewConflict(coverage, resolved);

    if (conflict) {
      return dataIssue([conflict], sourceMetadata);
    }
  }

  const adapted = adaptResolvedMetricScoreValue(resolved);

  if (adapted.status === 'unsupported-source') {
    return dataIssue(
      [Object.freeze({
        code: 'unsupported-source',
        reason: adapted.reason,
      })],
      sourceMetadata,
    );
  }

  return success(adapted.fact.numeric, sourceMetadata);
}
