import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
  authorizeBrandFitProductionActivationWithApproval,
} from '../lib/product/activation/brandFitProductionActivationApproval';
import {
  evaluateBrandFitProductionReadiness,
} from '../lib/product/activation/brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
} from '../lib/product/activation/brandFitProductionRuntimeVerification';
import {
  createBrandFitProductionLifecycleCutoverCandidate,
} from '../lib/product/activation/brandFitProductionLifecycleCutoverCandidate';

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
    throw new Error('brand_fit_approval_test_evidence_invalid');
  }

  const product = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence.evidence],
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') {
    throw new Error('brand_fit_approval_test_product_invalid');
  }

  return product.record;
}

function readiness() {
  const result = evaluateBrandFitProductionReadiness({
    record: currentRecord(),
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });
  assert.equal(
    result.status,
    'ready-for-activation-authorization',
  );
  return result;
}

test('Brand Fit owner approval evidence is canonically bound to the approved scope', () => {
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.activationAuthorizationId,
    'ops-activation-brand-fit-20261007t014520z-v1',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.authorizedAt,
    '2026-10-07T01:45:20.000Z',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    6029102277,
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE.authorizedMain,
    'e8a2fb2969a09dde4b9a149e759f9b9e31e600bd',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.binding
      .verifiedRuntimeCommitSha,
    '2a0daebd129ef1015b3197f014bf15d77ee19dce',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL.binding
      .restrictedRightsPublicationAllowed,
    false,
  );
});

test('explicit owner approval authorizes lifecycle cutover without executing it', () => {
  const authorization =
    authorizeBrandFitProductionActivationWithApproval(readiness());

  assert.equal(
    authorization.status,
    'authorized-for-lifecycle-cutover',
  );
  if (authorization.status !== 'authorized-for-lifecycle-cutover') {
    return;
  }

  assert.equal(authorization.activationAuthorized, true);
  assert.equal(authorization.lifecycleState, 'research');
  assert.equal(authorization.targetLifecycleState, 'production');
  assert.equal(authorization.publicationAuthorized, false);
  assert.equal(authorization.publicRouteCutoverAuthorized, false);
  assert.equal(
    authorization.directProductionContributionEligible,
    false,
  );
  assert.equal(authorization.riskConsumptionAuthorized, false);
  assert.equal(authorization.numericEligible, false);
  assert.equal(
    authorization.requiredNextGate,
    'explicit-production-lifecycle-cutover',
  );
});

test('authorized cutover remains a candidate and performs no lifecycle mutation', () => {
  const sourceRecord = currentRecord();
  const authorization =
    authorizeBrandFitProductionActivationWithApproval(readiness());

  const candidate = createBrandFitProductionLifecycleCutoverCandidate({
    sourceRecord,
    authorization,
  });

  assert.equal(
    candidate.status,
    'ready-for-explicit-lifecycle-cutover-execution',
  );
  if (
    candidate.status
      !== 'ready-for-explicit-lifecycle-cutover-execution'
  ) {
    return;
  }

  assert.equal(candidate.sourceRecord.lifecycleState, 'research');
  assert.equal(candidate.candidateRecord.lifecycleState, 'production');
  assert.equal(candidate.executionBoundary.lifecycleCutoverExecuted, false);
  assert.equal(candidate.executionBoundary.renderRedeployExecuted, false);
  assert.equal(candidate.executionBoundary.publicationAuthorized, false);
  assert.equal(
    candidate.executionBoundary.publicRouteCutoverAuthorized,
    false,
  );
  assert.equal(candidate.executionBoundary.riskInventoryUpdated, false);
  assert.equal(
    candidate.executionBoundary.riskConsumptionAuthorized,
    false,
  );
});

test('Brand Fit Risk inventory remains locked after activation authorization', () => {
  const current =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'brandFitPoint',
    );

  assert.ok(current);
  assert.equal(
    current?.eligibilityState,
    'not-current-real-production',
  );
  assert.equal(current?.acceptedForRiskConsumption, false);
  assert.equal(
    current?.exclusionReason,
    'brand-fit-product-activation-not-authorized',
  );

  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .decision.riskInventoryUpdated,
    false,
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .decision.riskConsumptionAuthorized,
    false,
  );
});

test('Brand Fit activation approval remains non-numeric and publication-locked', () => {
  const authorization =
    authorizeBrandFitProductionActivationWithApproval(readiness());

  const serialized = JSON.stringify({
    approval: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
    evidence: BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE,
    authorization,
  });

  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"value":0'), false);
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .decision.publicationAuthorized,
    false,
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL_EVIDENCE
      .decision.publicRouteCutoverAuthorized,
    false,
  );
});
