import {
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
} from '../../intelligence/fandexMomentumCrossFamilyCombinationResearch';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  type ProductMomentumEvidenceConsensusReadModelResult,
} from '../contracts/productMomentumEvidenceConsensus';
import {
  MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
  type MomentumLiveShadowProductReadinessResult,
} from '../readiness/momentumLiveShadowProductReadiness';

export const MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'momentum-fandex-variable-product-adapter-v1' as const;

export type MomentumFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-product-contract-mismatch'
        | 'upstream-readiness-blocked'
        | 'upstream-readiness-contract-mismatch'
        | 'upstream-carrier-readiness-mismatch';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function freshness(
  readiness: MomentumLiveShadowProductReadinessResult,
): 'current' | 'stale' | 'unknown' {
  if (readiness.currentEvaluation.satisfiesFreshness) {
    return 'current';
  }

  if (readiness.sourceCurrentness.sourceAdvancementObserved) {
    return 'stale';
  }

  return 'unknown';
}

export function adaptMomentumToFandexVariableProduct(input: Readonly<{
  runtimeShadow: ProductMomentumEvidenceConsensusReadModelResult;
  readiness: MomentumLiveShadowProductReadinessResult;
}>): MomentumFandexVariableProductAdapterResult {
  if (input.runtimeShadow.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-read-not-ok' as const,
    });
  }

  const model = input.runtimeShadow.model;
  if (
    model.contractVersion
      !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION
    || model.identity.constructId !== 'momentumEvidenceConsensus'
    || model.sourceCarrier.lifecycleState !== 'research'
    || model.sourceCarrier.materialClass !== 'real'
    || model.dataOrigin !== 'observed'
    || model.publication !== 'shadow'
    || model.presentation !== 'standard'
    || model.previewFallbackUsed !== false
    || model.productMetricReadPerformed !== false
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-product-contract-mismatch' as const,
    });
  }

  const readiness = input.readiness;
  if (
    readiness.contractVersion
      !== MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION
    || readiness.productActivationReady !== false
    || readiness.productPublicationReady !== false
    || readiness.productMomentumScore !== null
    || readiness.numericProductEligible !== false
    || readiness.previewFallbackAllowed !== false
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-readiness-contract-mismatch' as const,
    });
  }

  if (readiness.state === 'blocked') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-readiness-blocked' as const,
    });
  }

  if (
    readiness.currentCarrier.carrierRecordId
      !== model.storedEvidenceTrace.carrierRecordId
    || readiness.currentCarrier.alignmentCutoffAt
      !== model.evidence.alignmentCutoffAt
    || readiness.currentCarrier.directionalConsensus
      !== model.evidence.directionalConsensus
    || readiness.currentCarrier.persistenceConsensus
      !== model.evidence.persistenceConsensus
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-carrier-readiness-mismatch' as const,
    });
  }

  const trace = model.storedEvidenceTrace;
  const sourceEvidence =
    trace.sourceV143Digest === null
      ? [
          `momentum-source-attestation:${trace.sourceAttestationContractVersion}:${trace.sourceAttestationDigest}`,
        ]
      : [
          `momentum-source-v143-digest:${trace.sourceV143Digest}`,
        ];

  const record = createFandexVariableProductRecord({
    variableId: 'growthMomentumPoint',
    canonicalArtistId: model.identity.sourceArtistId,
    lifecycleState: 'shadow',
    materialClass: 'real',
    readinessState: 'research-only',
    availability: 'available',
    valueRepresentation: {
      kind: 'categorical',
      state: model.evidence.directionalConsensus,
    },
    asOf: model.evidence.alignmentCutoffAt,
    observationTime: {
      kind: 'instant',
      observedAt: model.evidence.alignmentCutoffAt,
    },
    collectionTime: null,
    confidence: 'insufficient',
    coverage: 'unknown',
    freshness: freshness(readiness),
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: orderedUnique([
      `contract:${model.contractVersion}`,
      `readiness:${readiness.contractVersion}`,
      `momentum-carrier:${trace.carrierRecordId}`,
      `momentum-observation:${trace.observationId}`,
      `momentum-observation-digest:${trace.observationDigest}`,
      ...sourceEvidence,
    ]),
    methodologyVersion:
      FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
    sourceVersion: model.contractVersion,
    productVersion: MOMENTUM_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
