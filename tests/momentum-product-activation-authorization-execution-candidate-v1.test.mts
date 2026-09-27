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
  createMomentumProductActivationAuthorizationExecutionCandidate,
} from '../lib/product/activation/momentumProductActivationAuthorizationExecutionCandidate';
import {
  getMomentumProductActivationAuthorizationExecutionCandidateForIU,
} from '../lib/server/product/momentumProductActivationAuthorizationExecutionCandidate';
import {
  getMomentumProductActivationReadinessForIU,
} from '../lib/server/product/momentumProductActivationReadiness';

test('current IU Momentum is ready for explicit authorization without executing it', async () => {
  const result =
    await getMomentumProductActivationAuthorizationExecutionCandidateForIU();

  assert.equal(result.status, 'ready-for-explicit-authorization');
  if (result.status !== 'ready-for-explicit-authorization') return;

  assert.equal(Object.values(result.checks).every(Boolean), true);
  assert.equal(result.approvalInputTemplate.activationAuthorizationId, null);
  assert.equal(result.approvalInputTemplate.authorizedAt, null);
  assert.equal(
    result.approvalInputTemplate.binding.evaluatedAlignmentCutoffAt,
    '2026-09-27T02:10:05.000Z',
  );
  assert.equal(
    result.approvalInputTemplate.binding.currentEvaluationAttestationDigest,
    'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
  );
  assert.equal(result.authorizationWithoutApproval.status, 'not-authorized');
  assert.equal(result.executionBoundary.ownerApprovalRecorded, false);
  assert.equal(result.executionBoundary.approvalMaterialized, false);
  assert.equal(result.executionBoundary.authorizationExecuted, false);
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

test('stale owner-attestation binding blocks the execution candidate', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const candidate = createMomentumProductActivationApprovalCandidate(readiness);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  const staleCandidate = Object.freeze({
    ...candidate,
    approval: Object.freeze({
      ...candidate.approval,
      binding: Object.freeze({
        ...candidate.approval.binding,
        currentEvaluationAttestationDigest: 'f'.repeat(64),
      }),
    }),
  });

  const result =
    createMomentumProductActivationAuthorizationExecutionCandidate(
      readiness,
      staleCandidate,
    );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'approval-binding-mismatch');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
});

test('an in-memory test approval proves the authorization path without persisting approval', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const executionCandidate =
    createMomentumProductActivationAuthorizationExecutionCandidate(readiness);

  assert.equal(
    executionCandidate.status,
    'ready-for-explicit-authorization',
  );
  if (
    executionCandidate.status !== 'ready-for-explicit-authorization'
  ) return;

  const approval: MomentumProductActivationApproval = Object.freeze({
    ...executionCandidate.approvalInputTemplate,
    activationAuthorizationId:
      'unit-test-momentum-activation-authorization-v1',
    authorizedAt: '2026-09-27T15:45:00.000Z',
  });

  const result = authorizeMomentumProductActivation({
    readiness,
    approval,
  });

  assert.equal(result.status, 'authorized-for-publication-review');
  if (result.status !== 'authorized-for-publication-review') return;

  assert.equal(result.activationAuthorized, true);
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
    'explicit-momentum-product-publication-authorization',
  );
});

test('blocked readiness cannot become an execution candidate', async () => {
  const readiness = await getMomentumProductActivationReadinessForIU();
  const blockedReadiness = Object.freeze({
    ...readiness,
    status: 'blocked' as const,
    requiredNextGate: null,
  });

  const result =
    createMomentumProductActivationAuthorizationExecutionCandidate(
      blockedReadiness,
    );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.reason, 'activation-readiness-not-eligible');
  assert.equal(result.executionBoundary.authorizationExecuted, false);
});
