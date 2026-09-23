import type {
  ArtistIndexConfidenceLevel,
  ArtistIndexCoverageStatus,
  ArtistIndexDataStatus,
  ArtistStockVariableKey,
} from '../../../app/data/v4/charts/artistIndexChartData';
import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import type { ProductNumericFact } from './productNumericFact';
import type { ProductObservationTime } from './productTime';
import type {
  ProductDataOrigin,
  ProductPresentation,
  ProductPublication,
} from './productState';

export type ProductVariableId = ArtistStockVariableKey;

export type ProductVariableDefinition = Readonly<{
  variableId: ProductVariableId;
  sourceKey: ArtistStockVariableKey;
  displayName: string;
  description: string;
  relatedSourceMetricKeys: readonly FandexVariableKey[];
  evidenceRelation:
    | Readonly<{
        kind: 'legacy-issue-signal-key';
        sourceKey: ArtistStockVariableKey;
      }>
    | Readonly<{
        kind: 'stored-evidence-job-trace';
        sourceMetric: 'naverNewsShadowFirstSeenActivity';
      }>;
}>;

export type ProductVariableSeriesPoint = Readonly<{
  sourceTimeLabel: string;
  fact: ProductNumericFact;
}>;

export type ProductVariableLegacySourceMetadata = Readonly<{
  sourceKind: 'legacy-derived-index-point';
  sourceArtistId: string;
  sourceVariableKey: ArtistStockVariableKey;
  sourceTimeLabel: string | null;
  dataStatus: ArtistIndexDataStatus | null;
  confidenceLevel: ArtistIndexConfidenceLevel | null;
  coverageStatus: ArtistIndexCoverageStatus | null;
}>;

export type ProductVariableRealSourceMetadata = Readonly<{
  sourceKind: 'naver-news-issue-point-frozen-methodology';
  sourceArtistId: string;
  sourceVariableKey: 'newsIssuePoint';
  sourceTimeLabel: string | null;
  methodologyVersion: string;
  officialShadowEpoch: string;
  throughSlotStart: string;
  selectedWindowSlotCount: 8;
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
  baselineReadinessStatus: string;
  currentActivityRate: number | null;
  priorDefinedWindowCount: number;
  priorLessThanLatestCount: number;
  priorEqualToLatestCount: number;
  priorGreaterThanLatestCount: number;
}>;

export type ProductVariableSourceMetadata =
  | ProductVariableLegacySourceMetadata
  | ProductVariableRealSourceMetadata;

export type ProductVariableStoredEvidenceSlotTrace = Readonly<{
  slotStart: string;
  jobId: string;
}>;

export type ProductVariableStoredEvidenceWindowTrace = Readonly<{
  startSlotStart: string;
  endSlotStart: string;
  firstSeenObservationCount: number;
  observedObservationCount: number;
  activityRate: number | null;
  slotEvidence: readonly ProductVariableStoredEvidenceSlotTrace[];
}>;

export type ProductVariableEvidenceTrace =
  | Readonly<{
      kind: 'legacy-issue-signal-key';
      sourceKey: ArtistStockVariableKey;
    }>
  | Readonly<{
      kind: 'naver-news-issue-point-stored-evidence';
      methodologyVersion: string;
      officialShadowEpoch: string;
      throughSlotStart: string;
      currentWindow: ProductVariableStoredEvidenceWindowTrace | null;
      eligiblePriorWindows: readonly ProductVariableStoredEvidenceWindowTrace[];
      storedEvidenceJobIds: readonly string[];
    }>;

export type ProductVariableReadModel = Readonly<{
  identity: Readonly<{
    sourceArtistId: string;
    variableId: ProductVariableId;
    sourceVariableKey: ArtistStockVariableKey;
  }>;
  definition: ProductVariableDefinition;
  fact: ProductNumericFact;
  series: readonly ProductVariableSeriesPoint[];
  observationTime: ProductObservationTime;
  presentation: ProductPresentation;
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  sourceMetadata: ProductVariableSourceMetadata;
  evidenceTrace: ProductVariableEvidenceTrace;
}>;

export type ProductVariableDataIssue =
  | Readonly<{
      code: 'invalid-variable-identity';
      rawVariableId: string;
    }>
  | Readonly<{
      code: 'invalid-source-value';
      sourceTimeLabel: string;
    }>
  | Readonly<{
      code: 'source-state-conflict';
      reason: 'artist-identity-mismatch';
    }>
  | Readonly<{
      code: 'real-source-data-issue';
      reason:
        | 'runtime-read-failed'
        | 'selector-data-issue'
        | 'methodology-candidate-mismatch'
        | 'public-route-cutover-not-authorized'
        | 'public-route-cutover-data-issue'
        | 'public-route-real-read-invalid';
    }>;

export type ProductVariableReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductVariableReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly ProductVariableDataIssue[];
      sourceMetadata: Readonly<{
        sourceArtistId: string;
        rawVariableId: string;
        sourceTimeLabel: string | null;
      }>;
    }>;
