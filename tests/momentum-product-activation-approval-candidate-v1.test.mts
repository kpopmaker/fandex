import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeMomentumProductActivation,
  type MomentumProductActivationApproval,
} from '../lib/product/activation/momentumProductActivationAuthorization';
import {
  createMomentumProductActivationApprovalCandidate,
} from '../lib/product/activation/momentumProductActivationApprovalCandidate';
import {
  getMomentumProductActivationApprovalCandidateForIU,
} from '../lib/server/product/momentumProductActivationApprovalCandidate';
import {
  getMomentumProductActivationReadinessForIU,
} from '../lib/server/product/momentumProductActivationReadiness';

test('current IU Momentum yields an owner-attestation candidate without authorization', async () => {
  const result = await getMomentumProductActivationApprovalCandidateForIU();

  assert.equal(result.status, 'ready-for-owner-attestation');
  if (result.status !== 'ready-for-owner-attestation') return;

  assert.equal(result.approval.activationAuthorizationId, null);
  assert.equal(result.approval.authorizedAt, null);
  assert.deepEqual(result.approval.target, {
    artistId: 'iu',
    legacyVariableId: 'growthMomentumPoint',
    constructId: 'momentumEvidenceConsensus',
  });
  assert.equal(
    result.approval.binding.claimScope,
    'structured-categorical-evidence-only-no-numeric-score',
  );
  assert.equal(result.approval.binding.sourcePublication, 'shadow');
  assert.equal(result.approval.binding.currentEvaluationAttestationPath, null);
  assert.deepEqual(
    result.approval.binding.currentEvaluationAttestationWorkflow,
    {
      kind: 'github-actions-read-only-current-evaluation',
      workflowRunId: 37469812804,
      workflowJobId: 112319410564,
      workflowHeadSha:
        '027d77a4ac6a2a7afd4ca09861b58d4bd3e4ac34',
    },
  );
  assert.equal(
    result.approval.binding.currentEvaluationAttestationDigest,
    'f87a72d11c38cbbf17058c625d13847b2eca25f4152e909cf2d8b7d3d59566ce',
  );
  assert.equal(result.approval.binding.carrierRecordId.length, 64);
  assert.equal(
    result.approval.binding.directionalConsensus,
    'direction-conflicted',
  );
  assert.equal(
    result.approval.binding.persistenceConsensus,
    'persistence-not-applicable',
  );
  assert.equal(result.authorizationWithoutApproval.status, 'not-authorized');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.legacyGrowthMomentumPointReuseAllowed, false);
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );
});

test('authorization without an owner approval fails closed', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const result = authorizeMomentumProductActivation({
    readiness,
    approval: null,
  });

  assert.deepEqual(result, {
    contractVersion: 'momentum-product-activation-authorization-v1',
    status: 'not-authorized',
    reason: 'activation-approval-absent',
    activationAuthorized: false,
    productPublicationAuthorized: false,
    publicRouteActivated: false,
    publication: 'shadow',
    productMomentumScore: null,
    numericProductEligible: false,
    legacyGrowthMomentumPointReuseAllowed: false,
    previewFallbackAllowed: false,
    directProductionContributionEligible: false,
  });
});

test('owner-attestation binding becomes invalid when carrier state changes', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const candidate = createMomentumProductActivationApprovalCandidate(readiness);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  const approval: MomentumProductActivationApproval = Object.freeze({
    ...candidate.approval,
    activationAuthorizationId:
      'ops-activation-momentum-unit-test-v1',
    authorizedAt: '2026-09-27T14:30:00.000Z',
    binding: Object.freeze({
      ...candidate.approval.binding,
      directionalConsensus: 'direction-corroborated-up',
    }),
  });

  const result = authorizeMomentumProductActivation({
    readiness,
    approval,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;

  assert.equal(result.reason, 'activation-approval-binding-mismatch');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productMomentumScore, null);
});

test('blocked readiness cannot produce an owner-attestation candidate', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const blockedReadiness = Object.freeze({
    ...readiness,
    status: 'blocked' as const,
    requiredNextGate: null,
  });

  const result = createMomentumProductActivationApprovalCandidate(
    blockedReadiness,
  );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'activation-readiness-not-eligible');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
});
