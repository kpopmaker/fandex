import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeMomentumProductActivationWithApproval,
} from '../lib/product/activation/momentumProductActivationApproval';
import {
  createMomentumProductPublicationApprovalCandidate,
} from '../lib/product/activation/momentumProductPublicationApprovalCandidate';
import {
  authorizeMomentumProductPublication,
  type MomentumProductPublicationApproval,
} from '../lib/product/activation/momentumProductPublicationAuthorization';
import type {
  MomentumProductActivationReadiness,
} from '../lib/product/activation/momentumProductActivationReadiness';

function readiness(): MomentumProductActivationReadiness {
  return Object.freeze({
    contractVersion: 'momentum-product-activation-readiness-v1' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'growthMomentumPoint' as const,
      constructId: 'momentumEvidenceConsensus' as const,
    }),
    status: 'eligible-for-activation-review' as const,
    checks: Object.freeze({
      'route-design-ready': true,
      'target-identity': true,
      'current-freshness': true,
      'current-attestation-binding': true,
      'categorical-product-contract': true,
      'shadow-publication-boundary': true,
      'stored-evidence-binding': true,
      'non-numeric-contract': true,
      'no-preview-fallback': true,
    }),
    currentCarrierRecordId:
      '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
    alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    freshnessAttestation: Object.freeze({
      currentNoOpEvaluationAttested: true,
      evaluatedAlignmentCutoffAt: '2026-09-27T02:10:05.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      attestationPath:
        'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
      attestationDigest:
        'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
    }),
    productActivationAuthorized: false,
    productPublicationAuthorized: false,
    publicRouteActivated: false,
    publication: 'shadow',
    productMomentumScore: null,
    numericProductEligible: false,
    legacyGrowthMomentumPointReuseAllowed: false,
    previewFallbackAllowed: false,
    directProductionContributionEligible: false,
    requiredNextGate:
      'explicit-momentum-product-activation-authorization',
  });
}

test('Production-ready activated Momentum creates a fail-closed publication approval candidate', () => {
  const activation =
    authorizeMomentumProductActivationWithApproval(readiness());
  const candidate =
    createMomentumProductPublicationApprovalCandidate(activation);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(candidate.approval.publicationAuthorizationId, null);
  assert.equal(candidate.approval.authorizedAt, null);
  assert.equal(candidate.productionBinding.deploymentState, 'READY');
  assert.equal(candidate.productionBinding.deploymentTarget, 'production');
  assert.equal(
    candidate.productionBinding.deploymentCommitSha,
    'a3d5db92206f027be6a015baddb0ac0ce2044348',
  );
  assert.equal(candidate.activationAuthorized, true);
  assert.equal(candidate.productPublicationAuthorized, false);
  assert.equal(candidate.publicRouteActivated, false);
  assert.equal(candidate.publication, 'shadow');
  assert.equal(candidate.productMomentumScore, null);
  assert.equal(
    candidate.requiredNextGate,
    'explicit-momentum-product-publication-authorization',
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
    'publication-approval-absent',
  );
});

test('test-only exact publication approval reaches public-route review but does not cut over', () => {
  const activation =
    authorizeMomentumProductActivationWithApproval(readiness());
  const candidate =
    createMomentumProductPublicationApprovalCandidate(activation);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  const approval: MomentumProductPublicationApproval = Object.freeze({
    ...candidate.approval,
    publicationAuthorizationId:
      'ops-publication-momentum-evidence-consensus-test-v1',
    authorizedAt: '2026-09-28T02:00:00.000Z',
  });

  const result = authorizeMomentumProductPublication({
    activationAuthorization: activation,
    approval,
  });

  assert.equal(result.status, 'authorized-for-public-route-review');
  if (result.status !== 'authorized-for-public-route-review') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.productPublicationAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.productMomentumScore, null);
  assert.equal(
    result.requiredNextGate,
    'explicit-momentum-public-route-cutover',
  );
});

test('publication authorization fails closed if activation is not ready', () => {
  const blocked = authorizeMomentumProductPublication({
    activationAuthorization: Object.freeze({
      contractVersion: 'momentum-product-activation-authorization-v1',
      status: 'not-authorized' as const,
      reason: 'activation-approval-absent' as const,
      activationAuthorized: false,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow' as const,
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
    }),
    approval: null,
  });

  assert.equal(blocked.status, 'not-authorized');
  if (blocked.status !== 'not-authorized') return;
  assert.equal(blocked.reason, 'activation-authorization-not-ready');
  assert.equal(blocked.productPublicationAuthorized, false);
  assert.equal(blocked.publicRouteActivated, false);
});
