import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  BRAND_FIT_POINT_CONTRACT_VERSION,
  BRAND_FIT_POINT_CONSTRUCT,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  adaptBrandFitPointToFandexVariableProduct,
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  buildBrandFitPointRiskQualityMetadata,
} from '../lib/product/adapters/brandFitPointRiskQualityMetadata';
import {
  authorizeBrandFitProductionActivation,
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  type BrandFitProductionActivationApproval,
} from '../lib/product/activation/brandFitProductionActivationAuthorization';
import {
  evaluateBrandFitProductionReadiness,
} from '../lib/product/activation/brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
} from '../lib/product/activation/brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
} from '../lib/product/activation/brandFitProductionRuntimeVerification';
import {
  createBrandFitProductionLifecycleCutoverCandidate,
} from '../lib/product/activation/brandFitProductionLifecycleCutoverCandidate';

function observation(): BrandFitPartnershipObservationInput {
  return {
    eventId: 'brand-fit:youtube:39CUlBDuRSo',
    eventType: 'campaign-appearance',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId:
        'estee-lauder-korea-new-night-campaign-2025-iu',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-youtube-video',
      reliability: 'primary-official',
      sourceUrl: 'https://www.youtube.com/watch?v=39CUlBDuRSo',
      sourcePublishedAt: '2025-08-04T02:30:02Z',
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: null,
      activityEndAt: null,
      collectedAt: '2026-10-06T12:57:34Z',
    },
    revision: {
      revisionId:
        'd597ee9e419cb8c5cd71a2206cc2b33b11652caa20bea3ff1f0fed3b68f91f96',
      supersedesRevisionId: null,
    },
  };
}

function currentRecord() {
  const evidence = adaptBrandFitPartnershipEvidence(observation());
  assert.equal(evidence.status, 'ok');
  if (evidence.status !== 'ok') {
    throw new Error('brand_fit_cutover_test_evidence_invalid');
  }

  const product = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence.evidence],
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') {
    throw new Error('brand_fit_cutover_test_product_invalid');
  }

  return product.record;
}

function authorizedActivation() {
  const record = currentRecord();
  const readiness = evaluateBrandFitProductionReadiness({
    record,
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  assert.equal(
    readiness.status,
    'ready-for-activation-authorization',
  );

  const approval: BrandFitProductionActivationApproval = Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-production-lifecycle-cutover' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'test-brand-fit-activation-authorization-v1',
    authorizedAt: '2026-10-07T00:46:57.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'brandFitPoint' as const,
      constructId: BRAND_FIT_POINT_CONSTRUCT.constructId,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        BRAND_FIT_PRODUCTION_READINESS_CONTRACT_VERSION,
      productAdapterVersion:
        BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
      evidenceContractVersion:
        BRAND_FIT_POINT_CONTRACT_VERSION,
      riskQualityMetadataContractVersion:
        BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
      runtimeVerificationContractVersion:
        BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
      verifiedRuntimeCommitSha:
        BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION
          .verifiedRuntimeCommitSha,
      runtimeServiceId:
        BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION.serviceId,
      sourceLifecycle: 'research' as const,
      targetLifecycle: 'production' as const,
      claimScope:
        'verified-commercial-partnership-event-only-no-numeric-score' as const,
      restrictedRightsPublicationAllowed: false as const,
    }),
  });

  const authorization = authorizeBrandFitProductionActivation({
    readiness,
    approval,
  });
  assert.equal(
    authorization.status,
    'authorized-for-lifecycle-cutover',
  );

  return { record, authorization };
}

test('authorized Brand Fit cutover candidate proposes production lifecycle without executing it', () => {
  const { record, authorization } = authorizedActivation();
  const candidate = createBrandFitProductionLifecycleCutoverCandidate({
    sourceRecord: record,
    authorization,
  });

  assert.equal(
    candidate.status,
    'ready-for-explicit-lifecycle-cutover-execution',
  );
  if (
    candidate.status
      !== 'ready-for-explicit-lifecycle-cutover-execution'
  ) {
    return;
  }

  assert.equal(candidate.sourceRecord.lifecycleState, 'research');
  assert.equal(candidate.candidateRecord.lifecycleState, 'production');
  assert.equal(candidate.candidateRecord.materialClass, 'real');
  assert.equal(candidate.candidateRecord.readinessState, 'production');
  assert.equal(candidate.candidateRecord.availability, 'available');
  assert.deepEqual(
    candidate.candidateRecord.valueRepresentation,
    candidate.sourceRecord.valueRepresentation,
  );
  assert.equal(
    candidate.candidateRecord.productVersion,
    BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );

  assert.equal(candidate.executionBoundary.lifecycleCutoverExecuted, false);
  assert.equal(candidate.executionBoundary.renderRedeployExecuted, false);
  assert.equal(candidate.executionBoundary.publicationAuthorized, false);
  assert.equal(
    candidate.executionBoundary.publicRouteCutoverAuthorized,
    false,
  );
  assert.equal(candidate.executionBoundary.riskInventoryUpdated, false);
  assert.equal(
    candidate.executionBoundary.riskConsumptionAuthorized,
    false,
  );
  assert.equal(
    candidate.requiredNextGate,
    'explicit-brand-fit-production-lifecycle-cutover-execution',
  );
});

test('Brand Fit cutover candidate is blocked without activation authorization', () => {
  const record = currentRecord();
  const readiness = evaluateBrandFitProductionReadiness({
    record,
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  const notAuthorized = authorizeBrandFitProductionActivation({
    readiness,
    approval: null,
  });

  const candidate = createBrandFitProductionLifecycleCutoverCandidate({
    sourceRecord: record,
    authorization: notAuthorized,
  });

  assert.deepEqual(candidate, {
    contractVersion:
      'brand-fit-production-lifecycle-cutover-candidate-v1',
    status: 'blocked',
    reason: 'activation-authorization-not-granted',
    executionBoundary: {
      lifecycleCutoverExecuted: false,
      renderRedeployExecuted: false,
      publicationAuthorized: false,
      publicRouteCutoverAuthorized: false,
      riskInventoryUpdated: false,
      riskConsumptionAuthorized: false,
    },
  });
});

test('production-shaped candidate is generically Risk-compatible while current Risk inventory stays locked', () => {
  const { record, authorization } = authorizedActivation();
  const candidate = createBrandFitProductionLifecycleCutoverCandidate({
    sourceRecord: record,
    authorization,
  });

  assert.equal(
    candidate.status,
    'ready-for-explicit-lifecycle-cutover-execution',
  );
  if (
    candidate.status
      !== 'ready-for-explicit-lifecycle-cutover-execution'
  ) {
    return;
  }

  const metadata = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record: candidate.candidateRecord,
  });
  assert.equal(metadata.status, 'ok');
  if (metadata.status !== 'ok') return;

  const risk = adaptRiskAdjustmentProducerQualityMetadata(
    metadata.metadata,
  );
  assert.equal(risk.status, 'ok');
  if (risk.status !== 'ok') return;
  assert.equal(risk.assessment.status, 'accepted');
  assert.equal(
    risk.assessment.handoff.acceptedForRiskConsumption,
    true,
  );

  const currentInventory =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'brandFitPoint',
    );
  assert.ok(currentInventory);
  assert.equal(
    currentInventory?.eligibilityState,
    'not-current-real-production',
  );
  assert.equal(
    currentInventory?.acceptedForRiskConsumption,
    false,
  );
  assert.equal(
    currentInventory?.exclusionReason,
    'brand-fit-product-activation-not-authorized',
  );
  assert.equal(
    candidate.executionBoundary.riskInventoryUpdated,
    false,
  );
  assert.equal(
    candidate.executionBoundary.riskConsumptionAuthorized,
    false,
  );
});

test('restricted rights and non-numeric boundaries survive the proposed cutover', () => {
  const { record, authorization } = authorizedActivation();
  const candidate = createBrandFitProductionLifecycleCutoverCandidate({
    sourceRecord: record,
    authorization,
  });

  assert.equal(
    candidate.status,
    'ready-for-explicit-lifecycle-cutover-execution',
  );
  if (
    candidate.status
      !== 'ready-for-explicit-lifecycle-cutover-execution'
  ) {
    return;
  }

  assert.equal(
    candidate.candidateRecord.evidenceRefs.includes(
      'brand-fit-limitation:rights-restricted',
    ),
    true,
  );
  assert.equal(
    candidate.candidateRecord.evidenceRefs.includes(
      'brand-fit-publication-authorized:false',
    ),
    true,
  );
  assert.equal(
    candidate.candidateRecord.evidenceRefs.includes(
      'brand-fit-risk-consumption-authorized:false',
    ),
    true,
  );

  const serialized = JSON.stringify(candidate);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"value":0'), false);
});
