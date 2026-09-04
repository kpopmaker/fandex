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
} from './productState';

export type ProductVariableId = ArtistStockVariableKey;

export type ProductVariableDefinition = Readonly<{
  variableId: ProductVariableId;
  sourceKey: ArtistStockVariableKey;
  displayName: string;
  description: string;
  relatedSourceMetricKeys: readonly FandexVariableKey[];
  evidenceRelation: Readonly<{
    kind: 'legacy-issue-signal-key';
    sourceKey: ArtistStockVariableKey;
  }>;
}>;

export type ProductVariableSeriesPoint = Readonly<{
  sourceTimeLabel: string;
  fact: ProductNumericFact;
}>;

export type ProductVariableSourceMetadata = Readonly<{
  sourceKind: 'legacy-derived-index-point';
  sourceArtistId: string;
  sourceVariableKey: ArtistStockVariableKey;
  sourceTimeLabel: string | null;
  dataStatus: ArtistIndexDataStatus | null;
  confidenceLevel: ArtistIndexConfidenceLevel | null;
  coverageStatus: ArtistIndexCoverageStatus | null;
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
  sourceMetadata: ProductVariableSourceMetadata;
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
