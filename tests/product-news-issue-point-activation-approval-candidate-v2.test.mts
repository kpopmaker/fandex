import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createNewsIssuePointRealProductActivationApprovalCandidate,
} from '../lib/product/activation/newsIssuePointRealProductActivationApprovalCandidate';
import type {
  NewsIssuePointRealProductActivationGateResult,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
} from '../lib/product/promotion/newsIssuePointRealProductOperationsApproval';

const PROMOTION_AUTHORIZATION_ID =
  'ops-approval-newsissuepoint-20260921t001840z-v1';

function ready(): Extract<
  NewsIssuePointRealProductActivationGateResult,
  { status: 'eligible-for-activation-review' }
> {
  return {
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
    authorizationId: PROMOTION_AUTHORIZATION_ID,
  };
}

test('activation approval candidate derives the authoritative activation approval shape without granting activation', () => {
  const result =
    createNewsIssuePointRealProductActivationApprovalCandidate({
      readiness: ready(),
      promotionApproval:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
    });

  assert.deepEqual(result, {
    status: 'ready-for-owner-attestation',
    contractVersion:
      'v2_news_issue_point_real_product_activation_approval_candidate',
    approval: {
      contractVersion:
        'v1_news_issue_point_real_product_activation_approval',
      action: 'authorize-production-activation',
      authority: 'product-operations-owner',
      activationAuthorizationId: null,
      authorizedAt: null,
      target: {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      binding: {
        promotionAuthorizationId: PROMOTION_AUTHORIZATION_ID,
        promotionApprovalContractVersion:
          'v1_news_issue_point_real_promotion_approval',
        activationGateContractVersion:
          'v1_news_issue_point_real_product_activation_gate',
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        protocolStart: '2026-09-15T16:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        claimScope:
          'protocol-conditioned-first-seen-only',
      },
    },
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
  });
});

test('blocked activation readiness cannot create an owner-attestation candidate', () => {
  const blockedReadiness: NewsIssuePointRealProductActivationGateResult = {
    contractVersion:
      'v1_news_issue_point_real_product_activation_gate',
    status: 'blocked',
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    reason: 'promotion-control-not-authorized',
  };

  const result =
    createNewsIssuePointRealProductActivationApprovalCandidate({
      readiness: blockedReadiness,
      promotionApproval:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
    });

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'activation-readiness-not-met');
  }
});

test('candidate fails closed when readiness does not bind to the authoritative promotion authorization', () => {
  const result =
    createNewsIssuePointRealProductActivationApprovalCandidate({
      readiness: {
        ...ready(),
        authorizationId: 'different-authorization-id',
      },
      promotionApproval:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
    });

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(
      result.reason,
      'promotion-authorization-binding-mismatch',
    );
  }
});

test('activation approval candidate layer cannot grant activation, publish Product, or enable direct Production contribution', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/activation/newsIssuePointRealProductActivationApprovalCandidate.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /activationAuthorized:\\s*true/);
  assert.doesNotMatch(source, /publicRouteActivated:\\s*true/);
  assert.doesNotMatch(source, /productScorePublished:\\s*true/);
  assert.doesNotMatch(
    source,
    /directProductionContributionEligible:\\s*true/,
  );
  assert.doesNotMatch(
    source,
    /strictPublicationIntervalClaimAllowed:\\s*true/,
  );
  assert.doesNotMatch(source, /getArtistProductVariable\\s*\\(/);
});
