import {
  FANDEX_CONFIDENCE_CONTRACT_VERSION,
  FANDEX_CONFIDENCE_POLICY,
  type FandexConfidenceState,
} from '../../intelligence/confidence';
import type {
  FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from './brandFitPointFandexVariableProduct';

export const BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION =
  'brand-fit-point-risk-quality-metadata-v1' as const;

export type BrandFitPointRiskAvailabilityState =
  | 'available'
  | 'source-missing'
  | 'upstream-unavailable-ambiguous'
  | 'unsupported';

export type BrandFitPointRiskQualitySemantic = Readonly<{
  semanticId: string;
  semanticVersion:
    typeof BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  stateValue: string;
  reason: string;
  evidenceRefs: readonly string[];
}>;

export type BrandFitPointRiskQualityMetadata = Readonly<{
  contractVersion:
    typeof BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  producerContractVersion:
    typeof BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION;
  variableId: 'brandFitPoint';
  lifecycleState: FandexVariableProductRecord['lifecycleState'];
  materialClass: FandexVariableProductRecord['materialClass'];
  confidenceContractVersion: typeof FANDEX_CONFIDENCE_CONTRACT_VERSION;
  confidencePolicy: typeof FANDEX_CONFIDENCE_POLICY;
  availabilityState: BrandFitPointRiskAvailabilityState;
  identityState: 'resolved';
  confidenceState: FandexConfidenceState;
  coverageState: FandexVariableProductRecord['coverage'];
  freshnessState: FandexVariableProductRecord['freshness'];
  conflictState: 'unknown';
  revisionState: 'unknown';
  historyState: 'unknown';
  evidenceRefs: readonly string[];
  requiredDimensionSemantics: Readonly<{
    availability: BrandFitPointRiskQualitySemantic;
    identity: BrandFitPointRiskQualitySemantic;
    confidence: BrandFitPointRiskQualitySemantic;
    coverage: BrandFitPointRiskQualitySemantic;
    freshness: BrandFitPointRiskQualitySemantic;
    conflict: BrandFitPointRiskQualitySemantic;
    revision: BrandFitPointRiskQualitySemantic;
    history: BrandFitPointRiskQualitySemantic;
  }>;
}>;

export type BrandFitPointRiskQualityMetadataResult =
  | Readonly<{
      status: 'ok';
      metadata: BrandFitPointRiskQualityMetadata;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-variable-mismatch'
        | 'upstream-identity-mismatch'
        | 'upstream-source-contract-mismatch'
        | 'upstream-numeric-boundary-violated';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function availabilityState(
  record: FandexVariableProductRecord,
): BrandFitPointRiskAvailabilityState {
  if (record.availability === 'available') return 'available';
  if (record.availability === 'missing') return 'source-missing';
  if (record.availability === 'unsupported') return 'unsupported';
  return 'upstream-unavailable-ambiguous';
}

function semantic(
  dimension: string,
  stateValue: string,
  reason: string,
  evidenceRefs: readonly string[],
): BrandFitPointRiskQualitySemantic {
  return Object.freeze({
    semanticId: `brand-fit-point:${dimension}`,
    semanticVersion:
      BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    stateValue,
    reason,
    evidenceRefs: orderedUnique(evidenceRefs),
  });
}

export function buildBrandFitPointRiskQualityMetadata(input: Readonly<{
  canonicalArtistId: string;
  record: FandexVariableProductRecord;
}>): BrandFitPointRiskQualityMetadataResult {
  const { record } = input;

  if (record.variableId !== 'brandFitPoint') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-variable-mismatch' as const,
    });
  }

  if (
    record.canonicalArtistId !== input.canonicalArtistId
    || input.canonicalArtistId.trim().length === 0
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-identity-mismatch' as const,
    });
  }

  if (
    record.productVersion
      !== BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-source-contract-mismatch' as const,
    });
  }

  if (record.valueRepresentation.kind === 'numeric') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-numeric-boundary-violated' as const,
    });
  }

  const availability = availabilityState(record);
  const identity = 'resolved' as const;
  const confidence = record.confidence;
  const coverage = record.coverage;
  const freshness = record.freshness;
  const conflict = 'unknown' as const;
  const revision = 'unknown' as const;
  const history = 'unknown' as const;

  const evidenceRefs = orderedUnique([
    ...record.evidenceRefs,
    `brand-fit-product-lifecycle:${record.lifecycleState}`,
    `brand-fit-product-readiness:${record.readinessState}`,
  ]);
  const contractEvidence = Object.freeze([
    ...evidenceRefs,
    `contract:${BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION}`,
  ]);

  return Object.freeze({
    status: 'ok' as const,
    metadata: Object.freeze({
      contractVersion:
        BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
      producerContractVersion:
        BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
      variableId: 'brandFitPoint' as const,
      lifecycleState: record.lifecycleState,
      materialClass: record.materialClass,
      confidenceContractVersion: FANDEX_CONFIDENCE_CONTRACT_VERSION,
      confidencePolicy: FANDEX_CONFIDENCE_POLICY,
      availabilityState: availability,
      identityState: identity,
      confidenceState: confidence,
      coverageState: coverage,
      freshnessState: freshness,
      conflictState: conflict,
      revisionState: revision,
      historyState: history,
      evidenceRefs,
      requiredDimensionSemantics: Object.freeze({
        availability: semantic(
          'availability',
          availability,
          'common-product-record-availability',
          contractEvidence,
        ),
        identity: semantic(
          'identity',
          identity,
          'canonical-artist-bound-common-product-record',
          contractEvidence,
        ),
        confidence: semantic(
          'confidence',
          confidence,
          'common-product-record-confidence',
          contractEvidence,
        ),
        coverage: semantic(
          'coverage',
          coverage,
          'common-product-record-coverage',
          contractEvidence,
        ),
        freshness: semantic(
          'freshness',
          freshness,
          'common-product-record-freshness',
          contractEvidence,
        ),
        conflict: semantic(
          'conflict',
          conflict,
          'no-validated-brand-fit-product-conflict-assessment',
          contractEvidence,
        ),
        revision: semantic(
          'revision',
          revision,
          'revision-lineage-exists-without-stability-assessment',
          contractEvidence,
        ),
        history: semantic(
          'history',
          history,
          'no-validated-brand-fit-history-sufficiency-rule',
          contractEvidence,
        ),
      }),
    }),
  });
}
