import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_ATTESTATION_SOURCE_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  type ProductMomentumEvidenceConsensusReadModelResult,
  type ProductMomentumEvidenceConsensusStoredEvidenceTrace,
} from '../contracts/productMomentumEvidenceConsensus';
import type {
  MomentumLiveShadowProductReadinessResult,
} from './momentumLiveShadowProductReadiness';

export const MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION =
  'momentum-public-route-design-candidate-v1' as const;

export type MomentumPublicRouteDesignCandidate =
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION;
      status: 'blocked';
      reason:
        | 'live-shadow-readiness-not-ready'
        | 'source-read-not-ok'
        | 'source-contract-invalid'
        | 'source-shadow-boundary-invalid'
        | 'source-currentness-mismatch'
        | 'stored-evidence-trace-invalid';
      productActivationAuthorized: false;
      productPublicationAuthorized: false;
      publicRouteActivated: false;
      publication: 'shadow';
      productMomentumScore: null;
      numericProductEligible: false;
      legacyGrowthMomentumPointReuseAllowed: false;
      previewFallbackAllowed: false;
    }>
  | Readonly<{
      contractVersion:
        typeof MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION;
      status: 'ready-for-owner-review';
      target: Readonly<{
        artistId: 'iu';
        legacyVariableId: 'growthMomentumPoint';
        constructId:
          typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID;
      }>;
      sourceContractVersion:
        typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION;
      sourceVariableId:
        typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID;
      claimScope:
        'structured-categorical-evidence-only-no-numeric-score';
      routeShape: Readonly<{
        alignmentCutoffAt: true;
        directionalConsensus: true;
        persistenceConsensus: true;
        conflictState: true;
        storedEvidenceTrace: true;
        numericScore: false;
      }>;
      sourceBoundary: Readonly<{
        dataOrigin: 'observed';
        publication: 'shadow';
        presentation: 'standard';
        previewFallbackUsed: false;
        productMetricReadPerformed: false;
      }>;
      currentCarrier: Readonly<{
        carrierRecordId: string;
        alignmentCutoffAt: string;
        directionalConsensus: string;
        persistenceConsensus: string;
      }>;
      decision: Readonly<{
        productActivationAuthorized: false;
        productPublicationAuthorized: false;
        publicRouteActivated: false;
        publication: 'shadow';
        productMomentumScore: null;
        numericProductEligible: false;
        legacyGrowthMomentumPointReuseAllowed: false;
        previewFallbackAllowed: false;
        requiredNextGate: 'explicit-momentum-product-activation-readiness';
      }>;
    }>;

function blocked(
  reason: Extract<MomentumPublicRouteDesignCandidate, { status: 'blocked' }>['reason'],
): MomentumPublicRouteDesignCandidate {
  return Object.freeze({
    contractVersion: MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
    status: 'blocked' as const,
    reason,
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
  });
}

function validTrace(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function validSourceLineageTrace(
  trace: ProductMomentumEvidenceConsensusStoredEvidenceTrace,
): boolean {
  if (trace.sourceV143Digest !== null) {
    return validTrace(trace.sourceV143Digest);
  }

  return (
    trace.sourceAttestationContractVersion
      === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_ATTESTATION_SOURCE_VERSION
    && validTrace(trace.sourceAttestationDigest)
  );
}

export function createMomentumPublicRouteDesignCandidate(
  readiness: MomentumLiveShadowProductReadinessResult,
  source: ProductMomentumEvidenceConsensusReadModelResult,
): MomentumPublicRouteDesignCandidate {
  if (
    readiness.state !== 'public-route-candidate'
    || readiness.publicRouteDesignReady !== true
    || readiness.productActivationReady !== false
    || readiness.productPublicationReady !== false
    || readiness.productMomentumScore !== null
    || readiness.numericProductEligible !== false
    || readiness.previewFallbackAllowed !== false
    || readiness.blockers.length !== 0
  ) {
    return blocked('live-shadow-readiness-not-ready');
  }

  if (source.status !== 'ok') {
    return blocked('source-read-not-ok');
  }

  const model = source.model;

  if (
    model.contractVersion
      !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION
    || model.identity.sourceArtistId !== 'iu'
    || model.identity.constructId
      !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID
    || model.construct !== 'Momentum Evidence Consensus'
    || model.requiredFamilies.length !== 2
    || model.requiredFamilies[0] !== 'audience-consumption'
    || model.requiredFamilies[1] !== 'media-attention'
    || model.sourceCarrier.variableId
      !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID
    || model.sourceCarrier.lifecycleState !== 'research'
    || model.sourceCarrier.materialClass !== 'real'
  ) {
    return blocked('source-contract-invalid');
  }

  if (
    model.dataOrigin !== 'observed'
    || model.publication !== 'shadow'
    || model.presentation !== 'standard'
    || model.previewFallbackUsed !== false
    || model.productMetricReadPerformed !== false
  ) {
    return blocked('source-shadow-boundary-invalid');
  }

  if (
    readiness.currentCarrier.carrierRecordId === null
    || readiness.currentCarrier.alignmentCutoffAt === null
    || readiness.currentCarrier.directionalConsensus === null
    || readiness.currentCarrier.persistenceConsensus === null
    || model.storedEvidenceTrace.carrierRecordId
      !== readiness.currentCarrier.carrierRecordId
    || model.evidence.alignmentCutoffAt
      !== readiness.currentCarrier.alignmentCutoffAt
    || model.evidence.directionalConsensus
      !== readiness.currentCarrier.directionalConsensus
    || model.evidence.persistenceConsensus
      !== readiness.currentCarrier.persistenceConsensus
  ) {
    return blocked('source-currentness-mismatch');
  }

  if (
    !validTrace(model.storedEvidenceTrace.carrierRecordId)
    || !validTrace(model.storedEvidenceTrace.observationId)
    || !validSourceLineageTrace(model.storedEvidenceTrace)
    || !validTrace(model.storedEvidenceTrace.observationDigest)
  ) {
    return blocked('stored-evidence-trace-invalid');
  }

  return Object.freeze({
    contractVersion: MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
    status: 'ready-for-owner-review' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'growthMomentumPoint' as const,
      constructId:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
    }),
    sourceContractVersion:
      PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
    sourceVariableId:
      PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
    claimScope:
      'structured-categorical-evidence-only-no-numeric-score' as const,
    routeShape: Object.freeze({
      alignmentCutoffAt: true as const,
      directionalConsensus: true as const,
      persistenceConsensus: true as const,
      conflictState: true as const,
      storedEvidenceTrace: true as const,
      numericScore: false as const,
    }),
    sourceBoundary: Object.freeze({
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    }),
    currentCarrier: Object.freeze({
      carrierRecordId: readiness.currentCarrier.carrierRecordId,
      alignmentCutoffAt: readiness.currentCarrier.alignmentCutoffAt,
      directionalConsensus: readiness.currentCarrier.directionalConsensus,
      persistenceConsensus: readiness.currentCarrier.persistenceConsensus,
    }),
    decision: Object.freeze({
      productActivationAuthorized: false as const,
      productPublicationAuthorized: false as const,
      publicRouteActivated: false as const,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false as const,
      legacyGrowthMomentumPointReuseAllowed: false as const,
      previewFallbackAllowed: false as const,
      requiredNextGate:
        'explicit-momentum-product-activation-readiness' as const,
    }),
  });
}
