import type {
  ProductDataOrigin,
  ProductPresentation,
} from './productState';
import type { ProductObservationTime } from './productTime';
import type { ProductVariableId } from './productVariable';

export type ProductEvidenceSourceType =
  | 'editorial_seed'
  | 'preview_signal';

export type ProductEvidenceReadModel = Readonly<{
  identity: Readonly<{
    evidenceId: string;
    artistId: string;
  }>;
  artist: Readonly<{
    artistId: string;
    displayName: string;
  }>;
  relation: Readonly<{
    relatedVariableId: ProductVariableId;
    relatedSourceVariableKey: ProductVariableId;
    relatedVariableName: string;
  }>;
  title: string;
  summary: string;
  dataOrigin: ProductDataOrigin;
  presentation: ProductPresentation;
  source: Readonly<{
    sourceType: ProductEvidenceSourceType;
    sourceLabel: string;
  }>;
  time: Readonly<{
    observationTime: ProductObservationTime;
    sourceTimeLabel: string;
  }>;
}>;

export type ProductEvidenceDataIssue = Readonly<{
  code:
    | 'invalid-evidence-identity'
    | 'invalid-variable-identity'
    | 'artist-not-found'
    | 'evidence-not-found'
    | 'artist-evidence-mismatch'
    | 'source-state-conflict';
}>;

export type ProductEvidenceReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductEvidenceReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly ProductEvidenceDataIssue[];
    }>;

export type ProductVariableEvidenceCollectionResult =
  | Readonly<{
      status: 'ok';
      artistId: string;
      variableId: ProductVariableId;
      items: readonly ProductEvidenceReadModel[];
    }>
  | Readonly<{
      status: 'data-issue';
      artistId: string;
      rawVariableId: string;
      issues: readonly ProductEvidenceDataIssue[];
    }>;


export type ProductStoredEvidenceWindowMembership = Readonly<{
  role: 'current' | 'eligible-prior';
  startSlotStart: string;
  endSlotStart: string;
}>;

export type ProductStoredEvidenceCanonicalObservation = Readonly<{
  observationId: string;
  canonicalSourceUrl: string;
  observedAt: string;
  collectedAt: string;
  title: string;
  summary: string;
  sourceRecordIds: readonly string[];
  rawEvidenceIds: readonly string[];
}>;

export type ProductStoredEvidenceJobReadModel = Readonly<{
  identity: Readonly<{
    artistId: string;
    variableId: ProductVariableId;
    jobId: string;
  }>;
  dataOrigin: ProductDataOrigin;
  presentation: ProductPresentation;
  lineage: Readonly<{
    collectionLifecycle: 'shadow';
    methodologyVersion: string;
    officialShadowEpoch: string;
    throughSlotStart: string;
    slotStart: string;
    windowMemberships: readonly ProductStoredEvidenceWindowMembership[];
  }>;
  storedEvidence: Readonly<{
    eligibleNormalizedRecordIds: readonly string[];
    canonicalObservations: readonly ProductStoredEvidenceCanonicalObservation[];
  }>;
}>;

export type ProductStoredEvidenceJobDataIssue = Readonly<{
  code:
    | 'variable-read-model-unavailable'
    | 'real-stored-evidence-trace-required'
    | 'job-not-in-variable-evidence-trace'
    | 'stored-evidence-read-failed'
    | 'stored-evidence-trace-inconsistent'
    | 'stored-evidence-source-mismatch';
}>;

export type ProductStoredEvidenceJobReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductStoredEvidenceJobReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly ProductStoredEvidenceJobDataIssue[];
    }>;
