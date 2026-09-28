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

test('explicit owner approval is exact-bound to Momentum current evidence', () => {
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
    'ops-activation-momentum-evidence-consensus-20260928t012306z-v1',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
    '2026-09-28T01:23:06.000Z',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    5861676033,
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    '7b9899e3a85f82c4e82cde1d8383f97d62765d49',
  );
  assert.equal(
    MOMENTUM_PRODUCT_ACTIVATION_APPROVAL.binding
      .currentEvaluationAttestationDigest,
    'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
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
