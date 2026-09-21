import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
  type FandexVariableDefinitionV1,
} from '../lib/intelligence/variableRegistry';
import {
  createNewsIssuePointRealPromotionApprovalCandidate,
} from '../lib/product/promotion/newsIssuePointRealPromotionApprovalCandidate';
import {
  evaluateNewsIssuePointRealProductActivationReadiness,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';
import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';
import type {
  NewsIssuePointRealPromotionControlResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import type {
  NewsIssuePointRealProductReadModelResult,
} from '../lib/product/readModels/newsIssuePointRealProductReadModel';

const PROTOCOL_START = '2026-09-15T16:00:00.000Z';
const AUTHORIZED_AT = '2026-09-21T00:00:00.000Z';
const AUTHORIZATION_ID = 'ops-approval-newsissuepoint-candidate';

function eligible(): Extract<
  NewsIssuePointRealPromotionEligibilityResult,
  { status: 'eligible' }
> {
  return {
    contractVersion: 'v1_news_issue_point_real_promotion_gate',
    status: 'eligible',
    targetScope: true,
    promotionAuthorized: false,
    claimScope: 'protocol-conditioned-first-seen-only',
    strictPublicationIntervalClaimAllowed: false,
    candidate: {
      contractVersion: 'v1_naver_news_issue_point_product_candidate',
      variableId: 'newsIssuePoint',
      canonicalArtistId: 'iu',
      fact: { availability: 'available', value: 42 },
      dataOrigin: 'observed',
      publication: 'shadow',
      presentation: 'standard',
      observationTime: {
        kind: 'period',
        start: '2026-09-20T17:00:00.000Z',
        end: '2026-09-21T00:00:00.000Z',
      },
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        protocolStart: PROTOCOL_START,
        throughSlotStart: '2026-09-21T00:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        priorDefinedWindowCount: 10,
        priorLessThanLatestCount: 4,
        priorEqualToLatestCount: 2,
        priorGreaterThanLatestCount: 4,
      },
      evidenceTrace: {
        currentWindow: null,
        storedEvidenceJobIds: [],
      },
      productPolicy: {
        directProductContributionEligible: false,
        productScorePublished: false,
        realVariablePromotionEligible: false,
      },
    },
  };
}

function authorizedControl(): Extract<
  NewsIssuePointRealPromotionControlResult,
  { status: 'authorized' }
> {
  return {
    contractVersion: 'v1_news_issue_point_real_promotion_control',
    status: 'authorized',
    promotionAuthorized: true,
    publicRouteActivated: false,
    directProductionContributionEligible: false,
    productScorePublished: false,
    lifecycleState: 'shadow',
    authorization: {
      contractVersion: 'v1_news_issue_point_real_promotion_authorization',
      status: 'authorized',
      promotionAuthorized: true,
      publicRouteActivated: false,
      publicationTarget: 'production',
      strictPublicationIntervalClaimAllowed: false,
      claimScope: 'protocol-conditioned-first-seen-only',
      approval: {
        contractVersion: 'v1_news_issue_point_real_promotion_approval',
        action: 'authorize-real-variable-promotion',
        authority: 'product-operations-owner',
        authorizationId: AUTHORIZATION_ID,
        authorizedAt: AUTHORIZED_AT,
        target: {
          artistId: 'iu',
          variableId: 'newsIssuePoint',
        },
        binding: {
          candidateContractVersion:
            'v1_naver_news_issue_point_product_candidate',
          methodologyVersion:
            'v1_naver_news_issue_point_real_methodology',
          protocolStart: PROTOCOL_START,
          selectedWindowSlotCount: 8,
          normalizationType:
            'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
          claimScope:
            'protocol-conditioned-first-seen-only',
        },
      },
      eligibility: eligible(),
    },
  };
}

function readyReadModel(): Extract<
  NewsIssuePointRealProductReadModelResult,
  { status: 'ok' }
> {
  return {
    status: 'ok',
    model: {
      contractVersion: 'v1_news_issue_point_real_product_read_model',
      identity: {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      definition: {
        variableId: 'newsIssuePoint',
        displayName: 'News / Issue Point',
        description: 'Real media activity',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'stored-evidence-job-trace',
          sourceMetric: 'naverNewsShadowFirstSeenActivity',
        },
      },
      fact: {
        availability: 'available',
        value: 42,
      },
      observationTime: {
        kind: 'period',
        start: '2026-09-20T17:00:00.000Z',
        end: '2026-09-21T00:00:00.000Z',
      },
      dataOrigin: 'observed',
      presentation: 'standard',
      sourcePublication: 'shadow',
      publicationTarget: 'production',
      activation: 'inactive',
      promotionAuthorized: true,
      claimScope: 'protocol-conditioned-first-seen-only',
      strictPublicationIntervalClaimAllowed: false,
      methodology: {
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        selectedWindowSlotCount: 8,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        protocolStart: PROTOCOL_START,
        throughSlotStart: '2026-09-21T00:00:00.000Z',
        priorDefinedWindowCount: 10,
        priorLessThanLatestCount: 4,
        priorEqualToLatestCount: 2,
        priorGreaterThanLatestCount: 4,
      },
      evidenceTrace: {
        currentWindow: {
          methodologyVersion:
            'v1_naver_news_issue_point_real_methodology',
          canonicalArtistId: 'iu',
          protocolStart: PROTOCOL_START,
          windowSlotCount: 8,
          startSlotStart: '2026-09-20T17:00:00.000Z',
          endSlotStart: '2026-09-21T00:00:00.000Z',
          firstSeenObservationCount: 1,
          observedObservationCount: 800,
          activityRate: 0.00125,
          slotEvidence: [],
        },
        storedEvidenceJobIds: ['job-1'],
      },
      authorization: {
        authorizationId: AUTHORIZATION_ID,
        authorizedAt: AUTHORIZED_AT,
        authority: 'product-operations-owner',
        approvalContractVersion:
          'v1_news_issue_point_real_promotion_approval',
      },
    },
  };
}

test('approval candidate fills frozen binding but never creates an approval record', () => {
  const result = createNewsIssuePointRealPromotionApprovalCandidate(
    eligible(),
  );

  assert.equal(result.status, 'ready-for-owner-attestation');
  if (result.status !== 'ready-for-owner-attestation') return;

  assert.equal(result.authorizationId, null);
  assert.equal(result.authorizedAt, null);
  assert.equal(result.promotionAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.strictPublicationIntervalClaimAllowed, false);
  assert.deepEqual(result.binding, {
    candidateContractVersion:
      'v1_naver_news_issue_point_product_candidate',
    methodologyVersion:
      'v1_naver_news_issue_point_real_methodology',
    protocolStart: PROTOCOL_START,
    selectedWindowSlotCount: 8,
    normalizationType:
      'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
    claimScope:
      'protocol-conditioned-first-seen-only',
  });
});

test('blocked promotion eligibility cannot create an owner-attestation candidate', () => {
  const result = createNewsIssuePointRealPromotionApprovalCandidate({
    contractVersion: 'v1_news_issue_point_real_promotion_gate',
    status: 'blocked',
    targetScope: true,
    promotionAuthorized: false,
    strictPublicationIntervalClaimAllowed: false,
    reason: 'real-value-unavailable',
  });

  assert.equal(result.status, 'blocked');
});

test('promotion-approved canonical registry is eligible only for activation review, never activation', () => {
  const result = evaluateNewsIssuePointRealProductActivationReadiness({
    control: authorizedControl(),
    readModel: readyReadModel(),
    registryDefinition: NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
  });

  assert.deepEqual(result, {
    contractVersion:
      'v1_news_issue_point_real_product_activation_gate',
    status: 'eligible-for-activation-review',
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    requiredNextGate:
      'explicit-production-activation-authorization',
    authorizationId: AUTHORIZATION_ID,
  });
});

test('registry without the explicit activation blocker fails closed', () => {
  const registry: FandexVariableDefinitionV1 = {
    ...NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
    blockers: [],
  };

  const result = evaluateNewsIssuePointRealProductActivationReadiness({
    control: authorizedControl(),
    readModel: readyReadModel(),
    registryDefinition: registry,
  });

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'registry-state-invalid');
  }
});

test('disable control blocks activation review even with an otherwise ready read model', () => {
  const control: NewsIssuePointRealPromotionControlResult = {
    contractVersion: 'v1_news_issue_point_real_promotion_control',
    status: 'disabled',
    promotionAuthorized: false,
    publicRouteActivated: false,
    directProductionContributionEligible: false,
    productScorePublished: false,
    lifecycleState: 'blocked',
    reason: 'operator-disable',
    revocation: {
      contractVersion:
        'v1_news_issue_point_real_promotion_revocation',
      action: 'revoke-real-variable-promotion',
      authority: 'product-operations-owner',
      revocationId: 'ops-revocation-newsissuepoint-0001',
      revokedAt: '2026-09-21T00:10:00.000Z',
      authorizationId: AUTHORIZATION_ID,
      target: {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      reason: 'operator-disable',
    },
  };

  const result = evaluateNewsIssuePointRealProductActivationReadiness({
    control,
    readModel: readyReadModel(),
    registryDefinition: {
      ...NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
      blockers: [],
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'promotion-disabled');
  }
});

test('authorization and read-model identity mismatch fails closed', () => {
  const model = readyReadModel();
  const mismatched: NewsIssuePointRealProductReadModelResult = {
    status: 'ok',
    model: {
      ...model.model,
      authorization: {
        ...model.model.authorization,
        authorizationId: 'other-authorization',
      },
    },
  };

  const result = evaluateNewsIssuePointRealProductActivationReadiness({
    control: authorizedControl(),
    readModel: mismatched,
    registryDefinition: {
      ...NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
      blockers: [],
    },
  });

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'authorization-read-model-mismatch');
  }
});

test('activation readiness layer never creates approval, route activation, publication, or production contribution', async () => {
  const [candidateSource, activationSource] = await Promise.all([
    readFile(
      new URL(
        '../lib/product/promotion/newsIssuePointRealPromotionApprovalCandidate.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/activation/newsIssuePointRealProductActivationGate.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const combined = candidateSource + activationSource;

  assert.doesNotMatch(combined, /activationAuthorized:\s*true/);
  assert.doesNotMatch(combined, /publicRouteActivated:\s*true/);
  assert.doesNotMatch(combined, /productScorePublished:\s*true/);
  assert.doesNotMatch(
    combined,
    /directProductionContributionEligible:\s*true/,
  );
  assert.doesNotMatch(
    combined,
    /strictPublicationIntervalClaimAllowed:\s*true/,
  );
  assert.doesNotMatch(combined, /getArtistProductVariable\s*\(/);
});
