import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createNewsIssuePointRealProductActivationApprovalCandidate,
} from '../lib/product/activation/newsIssuePointRealProductActivationApprovalCandidate';
import type {
  NewsIssuePointRealProductActivationGateResult,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';

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

test('activation approval candidate is owner-attestation ready without granting activation', () => {
  const result =
    createNewsIssuePointRealProductActivationApprovalCandidate(ready());

  assert.deepEqual(result, {
    status: 'ready-for-owner-attestation',
    contractVersion:
      'v1_news_issue_point_real_product_activation_approval_candidate',
    target: {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    },
    authorityRequired: 'product-operations-owner',
    action: 'authorize-real-product-activation',
    activationAuthorizationId: null,
    authorizedAt: null,
    binding: {
      activationGateContractVersion:
        'v1_news_issue_point_real_product_activation_gate',
      promotionAuthorizationId: PROMOTION_AUTHORIZATION_ID,
    },
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
  });
});

test('blocked activation readiness cannot create an owner-attestation candidate', () => {
  const blocked: NewsIssuePointRealProductActivationGateResult = {
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
    createNewsIssuePointRealProductActivationApprovalCandidate(blocked);

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion:
      'v1_news_issue_point_real_product_activation_approval_candidate',
    reason: 'activation-readiness-not-met',
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
  });
});

test('activation approval candidate fails closed on an empty promotion authorization binding', () => {
  const result =
    createNewsIssuePointRealProductActivationApprovalCandidate({
      ...ready(),
      authorizationId: '',
    });

  assert.equal(result.status, 'blocked');
});

test('activation approval candidate layer cannot grant activation, publish Product, or enable direct Production contribution', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/activation/newsIssuePointRealProductActivationApprovalCandidate.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /activationAuthorized:\s*true/);
  assert.doesNotMatch(source, /publicRouteActivated:\s*true/);
  assert.doesNotMatch(source, /productScorePublished:\s*true/);
  assert.doesNotMatch(
    source,
    /directProductionContributionEligible:\s*true/,
  );
  assert.doesNotMatch(
    source,
    /strictPublicationIntervalClaimAllowed:\s*true/,
  );
  assert.doesNotMatch(source, /getArtistProductVariable\s*\(/);
});
