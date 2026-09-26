import type {
  ProductDataOrigin,
  ProductPresentation,
  ProductPublication,
} from './productState';

export const PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION =
  'product-momentum-evidence-consensus-v1' as const;

export const PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID =
  'momentumEvidenceConsensus' as const;

export const PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID =
  'momentum.cross-family-evidence-state.research' as const;

export type ProductMomentumDirectionalConsensus =
  | 'direction-corroborated-up'
  | 'direction-corroborated-down'
  | 'flat-corroborated'
  | 'direction-conflicted'
  | 'direction-insufficient';

export type ProductMomentumPersistenceConsensus =
  | 'both-directions-repeated'
  | 'one-direction-repeated'
  | 'neither-direction-repeated'
  | 'persistence-not-applicable';

export type ProductMomentumEvidenceConsensusStoredRecord = Readonly<{
  recordId: string;
  observationId: string;
  canonicalArtistId: string;
  variableId:
    typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID;
  alignmentCutoffAt: string;
  directionalConsensus: ProductMomentumDirectionalConsensus;
  persistenceConsensus: ProductMomentumPersistenceConsensus;
  sourceV143Digest: string;
  observationDigest: string;
  rawValue: ProductMomentumDirectionalConsensus;
  lifecycleState: 'research';
  materialClass: 'real';
}>;

export type ProductMomentumEvidenceConsensusStoredEvidenceTrace = Readonly<{
  carrierRecordId: string;
  observationId: string;
  sourceV143Digest: string;
  observationDigest: string;
}>;

export type ProductMomentumEvidenceConsensusReadModel = Readonly<{
  contractVersion:
    typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION;
  identity: Readonly<{
    sourceArtistId: string;
    constructId:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID;
  }>;
  construct: 'Momentum Evidence Consensus';
  evidence: Readonly<{
    alignmentCutoffAt: string;
    directionalConsensus: ProductMomentumDirectionalConsensus;
    persistenceConsensus: ProductMomentumPersistenceConsensus;
    qualitativeDirectionEvidenceUsable: boolean;
    conflictState: 'none' | 'detected';
  }>;
  requiredFamilies: readonly [
    'audience-consumption',
    'media-attention',
  ];
  sourceCarrier: Readonly<{
    variableId:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID;
    lifecycleState: 'research';
    materialClass: 'real';
  }>;
  storedEvidenceTrace: ProductMomentumEvidenceConsensusStoredEvidenceTrace;
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  presentation: ProductPresentation;
  previewFallbackUsed: false;
  productMetricReadPerformed: false;
}>;

export type ProductMomentumEvidenceConsensusDataIssue = Readonly<{
  code:
    | 'artist-identity-mismatch'
    | 'duplicate-record-id'
    | 'duplicate-observation-id'
    | 'invalid-source-variable'
    | 'invalid-source-lifecycle'
    | 'invalid-alignment-cutoff'
    | 'invalid-directional-consensus'
    | 'invalid-persistence-consensus'
    | 'raw-value-consensus-mismatch'
    | 'invalid-stored-evidence-trace'
    | 'runtime-read-failed';
  recordId?: string;
}>;

export type ProductMomentumEvidenceConsensusReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductMomentumEvidenceConsensusReadModel;
    }>
  | Readonly<{
      status: 'missing';
      reason: 'no-stored-categorical-evidence';
      previewFallbackUsed: false;
      productMetricReadPerformed: false;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly [
        ProductMomentumEvidenceConsensusDataIssue,
        ...ProductMomentumEvidenceConsensusDataIssue[],
      ];
      previewFallbackUsed: false;
      productMetricReadPerformed: false;
    }>;
