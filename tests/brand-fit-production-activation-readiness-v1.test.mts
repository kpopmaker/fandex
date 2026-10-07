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
  createBrandFitProductionActivationApprovalCandidate,
} from '../lib/product/activation/brandFitProductionActivationApprovalCandidate';
import {
  authorizeBrandFitProductionActivation,
} from '../lib/product/activation/brandFitProductionActivationAuthorization';
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

function currentRecord() {
  const evidence = adaptBrandFitPartnershipEvidence(observation());
  assert.equal(evidence.status, 'ok');
  if (evidence.status !== 'ok') {
    throw new Error('brand_fit_activation_test_evidence_invalid');
  }

  const product = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence.evidence],
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') {
    throw new Error('brand_fit_activation_test_product_invalid');
  }
  return product.record;
}

test('current durable Brand Fit truth is ready for owner activation attestation without being activated', () => {
  const readiness = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });

  assert.equal(
    readiness.status,
    'ready-for-activation-authorization',
  );
  assert.equal(Object.values(readiness.checks).every(Boolean), true);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.activationAuthorized, false);
  assert.equal(readiness.publicationAuthorized, false);
  assert.equal(readiness.publicRouteCutoverAuthorized, false);
  assert.equal(readiness.riskConsumptionAuthorized, false);
  assert.equal(readiness.numericEligible, false);
  assert.equal(
    readiness.runtimeDeploymentState,
    'verified-prior-live-runtime-redeploy-required-after-activation-merge',
  );
});

test('approval candidate remains fail-closed until explicit owner attestation', () => {
  const readiness = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  const candidate =
    createBrandFitProductionActivationApprovalCandidate(readiness);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(candidate.approval.activationAuthorizationId, null);
  assert.equal(candidate.approval.authorizedAt, null);
  assert.equal(candidate.activationAuthorized, false);
  assert.equal(candidate.lifecycleState, 'research');
  assert.equal(candidate.targetLifecycleState, 'production');
  assert.equal(candidate.publicationAuthorized, false);
  assert.equal(candidate.publicRouteCutoverAuthorized, false);
  assert.equal(candidate.riskConsumptionAuthorized, false);
  assert.equal(candidate.numericEligible, false);
  assert.equal(
    candidate.renderRedeployRequiredAfterActivationMerge,
    true,
  );
  assert.deepEqual(candidate.authorizationWithoutApproval, {
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

test('authorization cannot occur without explicit approval', () => {
  const readiness = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });

  assert.deepEqual(
    authorizeBrandFitProductionActivation({
      readiness,
      approval: null,
    }),
    {
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
    },
  );
});

test('runtime verification mismatch blocks activation readiness', () => {
  const readiness = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification: {
      ...BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
      verified: false,
    },
  });

  assert.equal(readiness.status, 'blocked');
  assert.equal(
    readiness.checks['durable-runtime-verification'],
    false,
  );
  assert.deepEqual(
    readiness.blockers,
    ['readiness-check-failed:durable-runtime-verification'],
  );
  assert.equal(readiness.activationAuthorized, false);
});

test('Brand Fit activation readiness never creates numeric Product or Risk state', () => {
  const readiness = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  const candidate =
    createBrandFitProductionActivationApprovalCandidate(readiness);

  const serialized = JSON.stringify({ readiness, candidate });
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"value":0'), false);
});
