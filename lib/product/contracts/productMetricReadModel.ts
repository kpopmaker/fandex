import type {
  MetricCoverageLevel,
  MetricValueStatus,
} from '../../../app/data/v4/metrics/metricDataCoverage';
import type {
  ManualMetricDataSourceType,
  ManualMetricValueStatus,
} from '../../../app/data/v4/metrics/manualMetricDataTypes';
import type {
  MetricPipelineStage,
  MetricScoreOrigin,
  MetricScoreStatus,
} from '../../../app/data/v4/metrics/metricScoringPipelineTypes';
import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import type { ProductNumericFact } from './productNumericFact';
import type { ProductPresentation } from './productState';
import type { ProductUnknownObservation } from './productTime';

export type ProductMetricSourceIdentity = Readonly<{
  sourceArtistId: string;
  sourceMetricKey: FandexVariableKey;
  sourceMonth: string;
}>;

export type ProductMetricSourceProvenance = Readonly<{
  origin: MetricScoreOrigin;
  sourceLabel: string | null;
  sourceStatus: MetricScoreStatus;
  availabilitySourceStatus: MetricValueStatus;
  stage: MetricPipelineStage;
}>;

export type ProductMetricSourceScoring = Readonly<{
  value: number | null;
  score: number | null;
  weight: number;
  weightedScore: number | null;
}>;

export type ProductMetricSourceCoverage = Readonly<{
  totalMonths: number;
  availableMonths: number;
  zeroMonths: number;
  missingMonths: number;
  coverageRate: number;
  coverageLevel: MetricCoverageLevel;
  missingMonthsMayIncludeNotTracked: true;
}>;

export type ProductMetricManualSourceMetadata = Readonly<{
  value: number | null;
  valueStatus: ManualMetricValueStatus;
  sourceType: ManualMetricDataSourceType;
  sourceLabel: string | null;
}>;

export type ProductMetricReadModelSourceMetadata = Readonly<{
  identity: ProductMetricSourceIdentity;
  provenance: ProductMetricSourceProvenance;
  scoring: ProductMetricSourceScoring;
  coverageSource: ProductMetricSourceCoverage;
  manualSource: ProductMetricManualSourceMetadata | null;
}>;

export type ProductMetricReadModel = Readonly<{
  identity: ProductMetricSourceIdentity;
  fact: ProductNumericFact;
  presentation: ProductPresentation;
  observationTime: ProductUnknownObservation;
  provenance: ProductMetricSourceProvenance;
  scoring: ProductMetricSourceScoring;
  coverageSource: ProductMetricSourceCoverage;
}>;

export type ProductMetricInvalidIdentityIssue = Readonly<{
  code: 'invalid-metric-identity';
  rawMetricKey: string;
}>;

export type ProductMetricInvalidSourceValueIssue = Readonly<{
  code: 'invalid-source-value';
  detectedBy: 'manual-validation' | 'metric-scoring-pipeline';
}>;

export type ProductMetricFallbackSourceIssue = Readonly<{
  code: 'fallback-source';
}>;

export type ProductMetricUnsupportedSourceIssue = Readonly<{
  code: 'unsupported-source';
  reason:
    | 'non-finite-value'
    | 'invalid-source-status'
    | 'unsupported-source-status'
    | 'source-status-value-mismatch';
}>;

export type ProductMetricSourceStateConflictIssue = Readonly<{
  code: 'source-state-conflict';
  reason:
    | 'source-identity-mismatch'
    | 'preview-availability-mismatch'
    | 'preview-value-mismatch'
    | 'not-tracked-pipeline-mismatch';
}>;

export type ProductMetricDataIssue =
  | ProductMetricInvalidIdentityIssue
  | ProductMetricInvalidSourceValueIssue
  | ProductMetricFallbackSourceIssue
  | ProductMetricUnsupportedSourceIssue
  | ProductMetricSourceStateConflictIssue;

export type ProductMetricInvalidIdentitySourceMetadata = Readonly<{
  sourceArtistId: string;
  rawMetricKey: string;
  sourceMonth: string;
}>;

export type ProductMetricReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductMetricReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly [ProductMetricDataIssue, ...ProductMetricDataIssue[]];
      sourceMetadata:
        | ProductMetricInvalidIdentitySourceMetadata
        | ProductMetricReadModelSourceMetadata;
    }>;
