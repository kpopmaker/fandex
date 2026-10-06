import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
  MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
  authorizeMomentumProductActivationWithApproval,
} from '../lib/product/activation/momentumProductActivationApproval';
import {
  authorizeMomentumProductActivation,
  type MomentumProductActivationApproval,
} from '../lib/product/activation/momentumProductActivationAuthorization';
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
      evaluatedAlignmentCutoffAt: '2026-10-06T03:33:21.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      attestationPath: null,
      attestationDigest:
        'f87a72d11c38cbbf17058c625d13847b2eca25f4152e909cf2d8b7d3d59566ce',
      attestationWorkflow: Object.freeze({
        kind: 'github-actions-read-only-current-evaluation' as const,
        workflowRunId: 37477927827,
        workflowJobId: 112319410564,
        workflowHeadSha:
          '027d77a4ac6a2a7afd4ca09861b58d4bd3e4ac34',
      }),
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

test('explicit owner approval is exact-bound to Momentum current evidence', () => {
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
    'ops-activation-momentum-evidence-consensus-20261006t142454z-v2',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
    '2026-10-06T14:24:54.000Z',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    6018395684,
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    '027d77a4ac6a2a7afd4ca09861b58d4bd3e4ac34',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
      .currentEvaluationAttestationDigest,
    'f87a72d11c38cbbf17058c625d13847b2eca25f4152e909cf2d8b7d3d59566ce',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
      .currentEvaluationAttestationPath,
    null,
  );
  assert.deepEqual(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
      .currentEvaluationAttestationWorkflow,
    {
      kind: 'github-actions-read-only-current-evaluation',
      workflowRunId: 37477927827,
      workflowJobId: 112319410564,
      workflowHeadSha:
        '027d77a4ac6a2a7afd4ca09861b58d4bd3e4ac34',
    },
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.productionBindingCurrent,
    false,
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.productionRevalidationRequired,
    true,
  );
});

test('approved Momentum activation authorizes publication review only', () => {
  const result = authorizeMomentumProductActivationWithApproval(readiness());

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

test('stale approval binding fails closed after owner approval', () => {
  const staleApproval: MomentumProductActivationApproval = Object.freeze({
    ...MOMENTUM_PRODUCT_ACTIVATION_APPROVAL,
    binding: Object.freeze({
      ...MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding,
      currentEvaluationAttestationDigest:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    }),
  });

  const result = authorizeMomentumProductActivation({
    readiness: readiness(),
    approval: staleApproval,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'activation-approval-binding-mismatch');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
});

test('activation approval evidence preserves publication and route boundaries', () => {
  assert.deepEqual(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.decision,
    {
      activationAuthorized: true,
      productPublicationAuthorized: false,
      publicRouteActivated: false,
      publication: 'shadow',
      productMomentumScore: null,
      numericProductEligible: false,
      legacyGrowthMomentumPointReuseAllowed: false,
      previewFallbackAllowed: false,
      directProductionContributionEligible: false,
      requiredNextGate:
        'explicit-momentum-product-publication-authorization',
    },
  );
});

test('activation approval is not wired directly into the public Product query', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /momentumProductActivationApproval/,
  );
});
