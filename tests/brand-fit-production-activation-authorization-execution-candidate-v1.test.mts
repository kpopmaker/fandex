import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  createBrandFitProductionActivationAuthorizationExecutionCandidate,
} from '../lib/product/activation/brandFitProductionActivationAuthorizationExecutionCandidate';
import {
  evaluateBrandFitProductionReadiness,
} from '../lib/product/activation/brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
} from '../lib/product/activation/brandFitProductionRuntimeVerification';

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

function readiness() {
  const evidence = adaptBrandFitPartnershipEvidence(observation());
  assert.equal(evidence.status, 'ok');
  if (evidence.status !== 'ok') {
    throw new Error('brand_fit_execution_candidate_evidence_invalid');
  }

  const product = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence.evidence],
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') {
    throw new Error('brand_fit_execution_candidate_product_invalid');
  }

  const result = evaluateBrandFitProductionReadiness({
    record: product.record,
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  assert.equal(result.status, 'ready-for-activation-authorization');
  return result;
}

test('Brand Fit execution candidate is ready for explicit authorization only', () => {
  const result =
    createBrandFitProductionActivationAuthorizationExecutionCandidate(
      readiness(),
    );

  assert.equal(result.status, 'ready-for-explicit-authorization');
  if (result.status !== 'ready-for-explicit-authorization') return;

  assert.deepEqual(result.checks, {
    'activation-readiness-current': true,
    'owner-attestation-candidate-current': true,
    'approval-fields-unmaterialized': true,
    'authorization-fails-closed-without-approval': true,
    'restricted-rights-publication-remains-locked': true,
    'risk-consumption-remains-locked': true,
  });
  assert.equal(result.approvalInputTemplate.activationAuthorizationId, null);
  assert.equal(result.approvalInputTemplate.authorizedAt, null);
  assert.equal(result.executionBoundary.ownerApprovalRecorded, false);
  assert.equal(result.executionBoundary.approvalMaterialized, false);
  assert.equal(result.executionBoundary.authorizationExecuted, false);
  assert.equal(result.executionBoundary.lifecycleCutoverExecuted, false);
  assert.equal(result.executionBoundary.renderRedeployExecuted, false);
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.lifecycleState, 'research');
  assert.equal(result.targetLifecycleState, 'production');
  assert.equal(result.publicationAuthorized, false);
  assert.equal(result.publicRouteCutoverAuthorized, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.riskConsumptionAuthorized, false);
  assert.equal(result.numericEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-brand-fit-production-activation-authorization',
  );
});

test('Brand Fit execution candidate proves authorization is fail-closed without approval', () => {
  const result =
    createBrandFitProductionActivationAuthorizationExecutionCandidate(
      readiness(),
    );

  assert.equal(result.status, 'ready-for-explicit-authorization');
  if (result.status !== 'ready-for-explicit-authorization') return;

  assert.deepEqual(result.authorizationWithoutApproval, {
    contractVersion:
      'brand-fit-production-activation-authorization-v1',
    status: 'not-authorized',
    activationAuthorized: false,
    lifecycleState: 'research',
    publicationAuthorized: false,
    publicRouteCutoverAuthorized: false,
    directProductionContributionEligible: false,
    riskConsumptionAuthorized: false,
    numericEligible: false,
    reason: 'activation-approval-absent',
  });
});

test('Brand Fit execution candidate blocks when readiness is no longer current', () => {
  const current = readiness();
  const blocked =
    createBrandFitProductionActivationAuthorizationExecutionCandidate({
      ...current,
      status: 'blocked',
      blockers: ['readiness-check-failed:durable-runtime-verification'],
      checks: {
        ...current.checks,
        'durable-runtime-verification': false,
      },
    });

  assert.equal(blocked.status, 'blocked');
  if (blocked.status !== 'blocked') return;

  assert.equal(blocked.reason, 'activation-readiness-not-ready');
  assert.equal(blocked.activationAuthorized, false);
  assert.equal(blocked.lifecycleState, 'research');
  assert.equal(blocked.publicationAuthorized, false);
  assert.equal(blocked.publicRouteCutoverAuthorized, false);
  assert.equal(blocked.riskConsumptionAuthorized, false);
  assert.equal(blocked.numericEligible, false);
});

test('Brand Fit execution candidate contains no numeric Product or Risk value', () => {
  const result =
    createBrandFitProductionActivationAuthorizationExecutionCandidate(
      readiness(),
    );

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"value":0'), false);
});
