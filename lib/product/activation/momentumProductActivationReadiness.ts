import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  type ProductMomentumEvidenceConsensusReadModelResult,
} from '../contracts/productMomentumEvidenceConsensus';
import type {
  MomentumLiveShadowProductReadinessResult,
} from '../readiness/momentumLiveShadowProductReadiness';
import {
  MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION,
  type MomentumPublicRouteDesignCandidate,
} from '../readiness/momentumPublicRouteDesignCandidate';

export const MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION =
  'momentum-product-activation-readiness-v1' as const;

export type MomentumProductActivationReadinessCheck =
  | 'route-design-ready'
  | 'target-identity'
  | 'current-freshness'
  | 'current-attestation-binding'
  | 'categorical-product-contract'
  | 'shadow-publication-boundary'
  | 'stored-evidence-binding'
  | 'non-numeric-contract'
  | 'no-preview-fallback';

export type MomentumProductActivationReadiness =
  Readonly<{
    contractVersion:
      typeof MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION;
    target: Readonly<{
      artistId: 'iu';
      legacyVariableId: 'growthMomentumPoint';
      constructId:
        typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID;
    }>;
    status: 'eligible-for-activation-review' | 'blocked';
    checks: Readonly<Record<MomentumProductActivationReadinessCheck, boolean>>;
    currentCarrierRecordId: string | null;
    alignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    freshnessAttestation: Readonly<{
      currentNoOpEvaluationAttested: boolean;
      evaluatedAlignmentCutoffAt: string | null;
      directionalConsensus: string | null;
      persistenceConsensus: string | null;
      attestationPath: string | null;
      attestationDigest: string | null;
    }>;
    productActivationAuthorized: false;
    productPublicationAuthorized: false;
    publicRouteActivated: false;
    publication: 'shadow';
    productMomentumScore: null;
    numericProductEligible: false;
    legacyGrowthMomentumPointReuseAllowed: false;
    previewFallbackAllowed: false;
    directProductionContributionEligible: false;
    requiredNextGate:
      | 'explicit-momentum-product-activation-authorization'
      | null;
  }>;

function defaultChecks():
  Record<MomentumProductActivationReadinessCheck, boolean> {
  return {
    'route-design-ready': false,
    'target-identity': false,
    'current-freshness': false,
    'current-attestation-binding': false,
    'categorical-product-contract': false,
    'shadow-publication-boundary': false,
    'stored-evidence-binding': false,
    'non-numeric-contract': false,
    'no-preview-fallback': false,
  };
}

function noNumericContract(model: object): boolean {
  return !('score' in model)
    && !('value' in model)
    && !('productMomentumScore' in model);
}

export function evaluateMomentumProductActivationReadiness(
  input: Readonly<{
    routeDesign: MomentumPublicRouteDesignCandidate;
    liveReadiness: MomentumLiveShadowProductReadinessResult;
    source: ProductMomentumEvidenceConsensusReadModelResult;
  }>,
): MomentumProductActivationReadiness {
  const checks = defaultChecks();

  if (
    input.routeDesign.status === 'ready-for-owner-review'
    && input.routeDesign.contractVersion
      === MOMENTUM_PUBLIC_ROUTE_DESIGN_CANDIDATE_VERSION
    && input.routeDesign.decision.productActivationAuthorized === false
    && input.routeDesign.decision.productPublicationAuthorized === false
    && input.routeDesign.decision.publicRouteActivated === false
    && input.routeDesign.decision.publication === 'shadow'
    && input.routeDesign.decision.productMomentumScore === null
    && input.routeDesign.decision.numericProductEligible === false
    && input.routeDesign.decision.legacyGrowthMomentumPointReuseAllowed
      === false
    && input.routeDesign.decision.previewFallbackAllowed === false
  ) {
    checks['route-design-ready'] = true;
  }

  if (input.source.status === 'ok') {
    const model = input.source.model;

    checks['target-identity'] =
      model.identity.sourceArtistId === 'iu'
      && model.identity.constructId
        === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID
      && model.construct === 'Momentum Evidence Consensus';

    checks['categorical-product-contract'] =
      model.contractVersion
        === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION
      && model.sourceCarrier.variableId
        === PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID
      && model.sourceCarrier.lifecycleState === 'research'
      && model.sourceCarrier.materialClass === 'real'
      && model.requiredFamilies.length === 2
      && model.requiredFamilies[0] === 'audience-consumption'
      && model.requiredFamilies[1] === 'media-attention';

    checks['shadow-publication-boundary'] =
      model.dataOrigin === 'observed'
      && model.publication === 'shadow'
      && model.presentation === 'standard'
      && model.productMetricReadPerformed === false;

    checks['non-numeric-contract'] =
      noNumericContract(model)
      && !('score' in model.evidence)
      && !('value' in model.evidence);

    checks['no-preview-fallback'] =
      model.previewFallbackUsed === false;

    if (
      input.routeDesign.status === 'ready-for-owner-review'
      && input.liveReadiness.currentCarrier.carrierRecordId !== null
      && input.liveReadiness.currentCarrier.alignmentCutoffAt !== null
      && input.liveReadiness.currentCarrier.directionalConsensus !== null
      && input.liveReadiness.currentCarrier.persistenceConsensus !== null
    ) {
      checks['stored-evidence-binding'] =
        model.storedEvidenceTrace.carrierRecordId
          === input.routeDesign.currentCarrier.carrierRecordId
        && model.storedEvidenceTrace.carrierRecordId
          === input.liveReadiness.currentCarrier.carrierRecordId
        && model.evidence.alignmentCutoffAt
          === input.routeDesign.currentCarrier.alignmentCutoffAt
        && model.evidence.alignmentCutoffAt
          === input.liveReadiness.currentCarrier.alignmentCutoffAt
        && model.evidence.directionalConsensus
          === input.routeDesign.currentCarrier.directionalConsensus
        && model.evidence.directionalConsensus
          === input.liveReadiness.currentCarrier.directionalConsensus
        && model.evidence.persistenceConsensus
          === input.routeDesign.currentCarrier.persistenceConsensus
        && model.evidence.persistenceConsensus
          === input.liveReadiness.currentCarrier.persistenceConsensus;
    }
  }

  checks['current-freshness'] =
    input.liveReadiness.state === 'public-route-candidate'
    && input.liveReadiness.publicRouteDesignReady === true
    && input.liveReadiness.runtimeShadowReadVerified === true
    && input.liveReadiness.currentEvaluation.performed === true
    && input.liveReadiness.currentEvaluation.satisfiesFreshness === true
    && input.liveReadiness.sourceCurrentness
      .naverCurrentStoredEvidenceReproducedForReadiness === true
    && input.liveReadiness.blockers.length === 0;

  const currentEvaluation = input.liveReadiness.currentEvaluation;
  const carrier = input.liveReadiness.currentCarrier;
  const persistedAttestationBound =
    currentEvaluation.attestationPath
      === 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json';
  const verifiedRuntimeAttestationBound =
    currentEvaluation.attestationPath === null
    && input.liveReadiness.state === 'public-route-candidate'
    && input.liveReadiness.currentEvaluation.satisfiesFreshness === true
    && input.liveReadiness.sourceCurrentness
      .naverCurrentStoredEvidenceReproducedForReadiness === true
    && input.liveReadiness.blockers.length === 0;

  checks['current-attestation-binding'] =
    currentEvaluation.currentNoOpEvaluationAttested === true
    && currentEvaluation.currentCarrierProduced === false
    && currentEvaluation.evaluatedAlignmentCutoffAt !== null
    && Number.isFinite(Date.parse(
      currentEvaluation.evaluatedAlignmentCutoffAt,
    ))
    && carrier.alignmentCutoffAt !== null
    && Date.parse(currentEvaluation.evaluatedAlignmentCutoffAt)
      > Date.parse(carrier.alignmentCutoffAt)
    && currentEvaluation.directionalConsensus !== null
    && currentEvaluation.directionalConsensus
      === carrier.directionalConsensus
    && currentEvaluation.persistenceConsensus !== null
    && currentEvaluation.persistenceConsensus
      === carrier.persistenceConsensus
    && (persistedAttestationBound || verifiedRuntimeAttestationBound)
    && typeof currentEvaluation.attestationDigest === 'string'
    && /^[0-9a-f]{64}$/.test(currentEvaluation.attestationDigest);

  const eligible = Object.values(checks).every(Boolean);
  const currentCarrier =
    input.source.status === 'ok'
      ? input.source.model
      : null;

  return Object.freeze({
    contractVersion: MOMENTUM_PRODUCT_ACTIVATION_READINESS_VERSION,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'growthMomentumPoint' as const,
      constructId:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
    }),
    status: eligible
      ? 'eligible-for-activation-review' as const
      : 'blocked' as const,
    checks: Object.freeze(checks),
    currentCarrierRecordId:
      currentCarrier?.storedEvidenceTrace.carrierRecordId ?? null,
    alignmentCutoffAt:
      currentCarrier?.evidence.alignmentCutoffAt ?? null,
    directionalConsensus:
      currentCarrier?.evidence.directionalConsensus ?? null,
    persistenceConsensus:
      currentCarrier?.evidence.persistenceConsensus ?? null,
    freshnessAttestation: Object.freeze({
      currentNoOpEvaluationAttested:
        input.liveReadiness.currentEvaluation.currentNoOpEvaluationAttested,
      evaluatedAlignmentCutoffAt:
        input.liveReadiness.currentEvaluation.evaluatedAlignmentCutoffAt,
      directionalConsensus:
        input.liveReadiness.currentEvaluation.directionalConsensus,
      persistenceConsensus:
        input.liveReadiness.currentEvaluation.persistenceConsensus,
      attestationPath:
        input.liveReadiness.currentEvaluation.attestationPath,
      attestationDigest:
        input.liveReadiness.currentEvaluation.attestationDigest,
    }),
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productMomentumScore: null,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
    requiredNextGate: eligible
      ? 'explicit-momentum-product-activation-authorization' as const
      : null,
  });
}
