import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL,
  ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
  authorizeActivityExposureProductionActivationWithApproval,
} from '../lib/product/activation/activityExposureProductionActivationApproval';
import {
  createActivityExposurePublicRouteCutoverCandidate,
} from '../lib/product/activation/activityExposurePublicRouteCutoverCandidate';
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

test('owner activation approval is bound to the authorized main/evidence', () => {
  assert.equal(
    ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL
      .activationAuthorizationId,
    'ops-activation-activity-exposure-20260926t010041z-v1',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL.authorizedAt,
    '2026-09-26T01:00:41.000Z',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    5841756452,
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    '2696208d01e64d207d40817bb6068969820a83f2',
  );
});

test('activation approval authorizes cutover review but keeps publication shadow', () => {
  const result =
    authorizeActivityExposureProductionActivationWithApproval(readiness());

  assert.equal(result.status, 'authorized-for-cutover');
  if (result.status !== 'authorized-for-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.lifecycleState, 'shadow');
  assert.equal(result.requiredNextGate, 'explicit-public-route-cutover');
});

test('activation approval fails closed if live readiness no longer passes', () => {
  const blocked: ActivityExposureProductionReadiness = Object.freeze({
    ...readiness(),
    status: 'blocked' as const,
    checks: Object.freeze({
      ...readiness().checks,
      'provider-availability': false,
    }),
  });

  const result =
    authorizeActivityExposureProductionActivationWithApproval(blocked);

  assert.equal(result.status, 'not-authorized');
  if (result.status !== 'not-authorized') return;

  assert.equal(result.activationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.reason, 'activation-readiness-not-ready');
});

test('post-activation cutover candidate is still not cut over', () => {
  const candidate =
    createActivityExposurePublicRouteCutoverCandidate(readiness());

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(candidate.pendingApproval.cutoverAuthorizationId, null);
  assert.equal(candidate.pendingApproval.authorizedAt, null);
  assert.equal(candidate.decision.activationAuthorized, true);
  assert.equal(candidate.decision.cutoverAuthorized, false);
  assert.equal(candidate.decision.publicRouteActivated, false);
  assert.equal(candidate.decision.publication, 'shadow');
  assert.equal(
    candidate.decision.requiredNextGate,
    'explicit-public-route-cutover',
  );
  assert.equal(
    candidate.authorizationWithoutApproval.status,
    'not-authorized',
  );
  if (candidate.authorizationWithoutApproval.status !== 'not-authorized') {
    return;
  }
  assert.equal(
    candidate.authorizationWithoutApproval.reason,
    'cutover-approval-absent',
  );
});
