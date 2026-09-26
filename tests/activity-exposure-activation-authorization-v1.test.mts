import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
  authorizeActivityExposureProductionActivation,
  type ActivityExposureProductionActivationApproval,
} from '../lib/product/activation/activityExposureProductionActivationAuthorization';
import {
  createActivityExposureProductionActivationApprovalCandidate,
} from '../lib/product/activation/activityExposureProductionActivationApprovalCandidate';
import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  authorizeActivityExposurePublicRouteCutover,
  type ActivityExposurePublicRouteCutoverApproval,
} from '../lib/product/activation/activityExposurePublicRouteCutoverAuthorization';
import type {
  ActivityExposureProductionReadiness,
} from '../lib/product/activation/activityExposureProductionReadiness';

function readiness(): ActivityExposureProductionReadiness {
  return Object.freeze({
    contractVersion: 'activity-exposure-production-readiness-v1' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    status: 'ready-for-activation-authorization' as const,
    checks: Object.freeze({
      'target-identity': true,
      'observed-data-origin': true,
      'shadow-publication': true,
      'standard-presentation': true,
      'provider-coverage': true,
      'provider-availability': true,
      'stored-evidence-trace': true,
      'non-numeric-contract': true,
    }),
    eventCount: 656,
    providerCount: 2,
  });
}

function activationApproval(): ActivityExposureProductionActivationApproval {
  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-production-activation' as const,
    authority: 'product-operations-owner' as const,
    activationAuthorizationId:
      'ops-activation-activity-exposure-test-v1',
    authorizedAt: '2026-09-26T00:00:00.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    binding: Object.freeze({
      readinessContractVersion:
        'activity-exposure-production-readiness-v1' as const,
      productContractVersion:
        'product-activity-exposure-v1' as const,
      persistenceContractVersion:
        'activity-exposure-event-v1' as const,
      requiredProviders:
        Object.freeze(['musicbrainz', 'youtube'] as const),
      sourcePublication: 'shadow' as const,
      claimScope: 'event-stream-only-no-numeric-score' as const,
    }),
  });
}

function cutoverApproval(
  activationAuthorizationId: string,
): ActivityExposurePublicRouteCutoverApproval {
  return Object.freeze({
    contractVersion:
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
    action: 'authorize-public-route-cutover' as const,
    authority: 'product-operations-owner' as const,
    cutoverAuthorizationId:
      'ops-cutover-activity-exposure-test-v1',
    authorizedAt: '2026-09-26T00:01:00.000Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    binding: Object.freeze({
      activationAuthorizationId,
      activationApprovalContractVersion:
        'activity-exposure-production-activation-approval-v1' as const,
      activationAuthorizationContractVersion:
        'activity-exposure-production-activation-authorization-v1' as const,
      productContractVersion:
        'product-activity-exposure-v1' as const,
      claimScope:
        'event-stream-only-no-numeric-score' as const,
    }),
  });
}

test('live-ready state creates a fail-closed owner activation candidate', () => {
  const candidate =
    createActivityExposureProductionActivationApprovalCandidate(readiness());

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(candidate.approval.activationAuthorizationId, null);
  assert.equal(candidate.approval.authorizedAt, null);
  assert.equal(candidate.activationAuthorized, false);
  assert.equal(candidate.publicRouteActivated, false);
  assert.equal(candidate.publication, 'shadow');
  assert.equal(candidate.directProductionContributionEligible, false);
  assert.equal(
    candidate.requiredNextGate,
    'explicit-production-activation-authorization',
  );
  assert.deepEqual(candidate.authorizationWithoutApproval, {
    contractVersion:
      'activity-exposure-production-activation-authorization-v1',
    status: 'not-authorized',
    activationAuthorized: false,
    publicRouteActivated: false,
    publication: 'shadow',
    directProductionContributionEligible: false,
    lifecycleState: 'shadow',
    reason: 'activation-approval-absent',
  });
});

test('activation approval authorizes only the next gate and does not publish', () => {
  const result = authorizeActivityExposureProductionActivation({
    readiness: readiness(),
    approval: activationApproval(),
  });

  assert.equal(result.status, 'authorized-for-cutover');
  if (result.status !== 'authorized-for-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.lifecycleState, 'shadow');
  assert.equal(result.requiredNextGate, 'explicit-public-route-cutover');
});

test('blocked readiness cannot be activated even with a structurally valid approval', () => {
  const blocked: ActivityExposureProductionReadiness = Object.freeze({
    ...readiness(),
    status: 'blocked' as const,
    checks: Object.freeze({
      ...readiness().checks,
      'stored-evidence-trace': false,
    }),
  });

  const result = authorizeActivityExposureProductionActivation({
    readiness: blocked,
    approval: activationApproval(),
  });

  assert.equal(result.status, 'not-authorized');
  if (result.status !== 'not-authorized') return;
  assert.equal(result.reason, 'activation-readiness-not-ready');
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
});

test('cutover approval absence remains fail-closed after activation authorization', () => {
  const activation = authorizeActivityExposureProductionActivation({
    readiness: readiness(),
    approval: activationApproval(),
  });

  const result = authorizeActivityExposurePublicRouteCutover({
    activationAuthorization: activation,
    approval: null,
  });

  assert.equal(result.status, 'not-authorized');
  if (result.status !== 'not-authorized') return;
  assert.equal(result.activationAuthorized, true);
  assert.equal(result.cutoverAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.reason, 'cutover-approval-absent');
});

test('cutover approval still does not execute the public route', () => {
  const approval = activationApproval();
  const activation = authorizeActivityExposureProductionActivation({
    readiness: readiness(),
    approval,
  });
  const result = authorizeActivityExposurePublicRouteCutover({
    activationAuthorization: activation,
    approval: cutoverApproval(approval.activationAuthorizationId),
  });

  assert.equal(result.status, 'authorized-for-route-cutover');
  if (result.status !== 'authorized-for-route-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.cutoverAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-public-route-cutover-execution',
  );
});

test('cutover approval binding mismatch is a data issue, never implicit activation', () => {
  const approval = activationApproval();
  const activation = authorizeActivityExposureProductionActivation({
    readiness: readiness(),
    approval,
  });
  const mismatched = {
    ...cutoverApproval(approval.activationAuthorizationId),
    binding: {
      ...cutoverApproval(approval.activationAuthorizationId).binding,
      activationAuthorizationId: 'ops-activation-other-v1',
    },
  } as ActivityExposurePublicRouteCutoverApproval;

  const result = authorizeActivityExposurePublicRouteCutover({
    activationAuthorization: activation,
    approval: mismatched,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'cutover-approval-binding-mismatch');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
});
