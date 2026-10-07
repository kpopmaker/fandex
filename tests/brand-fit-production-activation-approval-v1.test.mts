import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
  authorizeBrandFitProductionActivationWithApproval,
} from '../lib/product/activation/brandFitProductionActivationApproval';
import type {
  BrandFitProductionReadiness,
} from '../lib/product/activation/brandFitProductionReadiness';

function readiness(): BrandFitProductionReadiness {
  return Object.freeze({
    contractVersion: 'brand-fit-production-readiness-v1' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'brandFitPoint' as const,
      constructId: 'verified-commercial-partnership-activity' as const,
    }),
    status: 'ready-for-activation-authorization' as const,
    checks: Object.freeze({
      'target-identity': true,
      'pre-activation-lifecycle': true,
      'real-material': true,
      'research-only-readiness': true,
      'categorical-event-available': true,
      'evidence-lineage': true,
      'restricted-rights-boundary': true,
      'risk-metadata-handoff': true,
      'durable-runtime-verification': true,
      'non-numeric-contract': true,
    }),
    blockers: Object.freeze([]),
    activationAuthorized: false as const,
    publicationAuthorized: false as const,
    publicRouteCutoverAuthorized: false as const,
    riskConsumptionAuthorized: false as const,
    numericEligible: false as const,
    runtimeDeploymentState:
      'verified-prior-live-runtime-redeploy-required-after-activation-merge' as const,
  });
}

test('Brand Fit owner approval is durably bound to the verified runtime evidence', () => {
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.activationAuthorizationId,
    'ops-activation-brand-fit-iu-20261007-v1',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.authorizedAt,
    '2026-10-07T01:45:37.000Z',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.binding
      .verifiedRuntimeCommitSha,
    '2a0daebd129ef1015b3197f014bf15d77ee19dce',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    6029106452,
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    'e8a2fb2969a09dde4b9a149e759f9b9e31e600bd',
  );
});

test('Brand Fit activation authorization is granted but lifecycle cutover remains separate', () => {
  const result =
    authorizeBrandFitProductionActivationWithApproval(readiness());

  assert.equal(result.status, 'authorized-for-lifecycle-cutover');
  if (result.status !== 'authorized-for-lifecycle-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.lifecycleState, 'research');
  assert.equal(result.targetLifecycleState, 'production');
  assert.equal(result.publicationAuthorized, false);
  assert.equal(result.publicRouteCutoverAuthorized, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.riskConsumptionAuthorized, false);
  assert.equal(result.numericEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-production-lifecycle-cutover',
  );
});

test('Brand Fit approval evidence keeps all post-authorization mutations locked', () => {
  const decision =
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE.decision;

  assert.equal(decision.activationAuthorized, true);
  assert.equal(decision.lifecycleState, 'research');
  assert.equal(decision.targetLifecycleState, 'production');
  assert.equal(decision.lifecycleCutoverExecuted, false);
  assert.equal(decision.renderRedeployExecuted, false);
  assert.equal(decision.publicationAuthorized, false);
  assert.equal(decision.publicRouteCutoverAuthorized, false);
  assert.equal(decision.directProductionContributionEligible, false);
  assert.equal(decision.riskInventoryUpdated, false);
  assert.equal(decision.riskConsumptionAuthorized, false);
  assert.equal(decision.numericEligible, false);
});

test('Brand Fit activation approval contains no numeric score or publication grant', () => {
  const serialized = JSON.stringify({
    approval: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
    evidence: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
  });

  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"publicationAuthorized":true'), false);
  assert.equal(serialized.includes('"riskConsumptionAuthorized":true'), false);
});
