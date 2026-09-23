import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizeNewsIssuePointPublicRouteCutover,
  type NewsIssuePointPublicRouteCutoverApproval,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import type {
  NewsIssuePointRealProductActivationAuthorizationResult,
} from '../lib/product/activation/newsIssuePointRealProductActivationAuthorization';

function activationAuthorization(): Extract<
  NewsIssuePointRealProductActivationAuthorizationResult,
  { status: 'authorized-for-cutover' }
> {
  return {
    contractVersion:
      'v1_news_issue_point_real_product_activation_authorization',
    status: 'authorized-for-cutover',
    activationAuthorized: true,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow',
    requiredNextGate: 'explicit-public-route-cutover',
    approval: NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  };
}

function approval(
  overrides: Partial<NewsIssuePointPublicRouteCutoverApproval> = {},
): NewsIssuePointPublicRouteCutoverApproval {
  return {
    contractVersion:
      'v1_news_issue_point_public_route_cutover_approval',
    action: 'authorize-public-route-cutover',
    authority: 'product-operations-owner',
    cutoverAuthorizationId:
      'ops-cutover-newsissuepoint-candidate-v1',
    authorizedAt: '2026-09-23T01:00:00.000Z',
    target: {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    },
    binding: {
      activationAuthorizationId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
          .activationAuthorizationId,
      activationApprovalContractVersion:
        'v1_news_issue_point_real_product_activation_approval',
      activationAuthorizationContractVersion:
        'v1_news_issue_point_real_product_activation_authorization',
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology',
      protocolStart: '2026-09-15T16:00:00.000Z',
      selectedWindowSlotCount: 8,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
      claimScope:
        'protocol-conditioned-first-seen-only',
    },
    ...overrides,
  };
}

test('absent explicit cutover approval stays not-authorized', () => {
  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: activationAuthorization(),
    approval: null,
  });

  assert.deepEqual(result, {
    contractVersion:
      'v1_news_issue_point_public_route_cutover_authorization',
    status: 'not-authorized',
    activationAuthorized: true,
    cutoverAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow',
    reason: 'cutover-approval-absent',
  });
});

test('exact-bound approval authorizes cutover permission but does not execute route activation', () => {
  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: activationAuthorization(),
    approval: approval(),
  });

  assert.equal(result.status, 'authorized-for-route-cutover');
  if (result.status !== 'authorized-for-route-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.cutoverAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.strictPublicationIntervalClaimAllowed, false);
  assert.equal(result.lifecycleState, 'shadow');
  assert.equal(
    result.requiredNextGate,
    'explicit-public-route-cutover-execution',
  );
});

test('cutover approval bound to another activation authorization fails closed', () => {
  const value = approval();
  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: activationAuthorization(),
    approval: approval({
      binding: {
        ...value.binding,
        activationAuthorizationId:
          'ops-activation-other-newsissuepoint-v1',
      },
    }),
  });

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(
      result.reason,
      'cutover-approval-binding-mismatch',
    );
  }
});

test('cutover approval cannot predate activation approval', () => {
  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: activationAuthorization(),
    approval: approval({
      authorizedAt: '2026-09-22T08:00:00.000Z',
    }),
  });

  assert.equal(result.status, 'data-issue');
});

test('non-authorized activation state cannot authorize cutover', () => {
  const blocked: NewsIssuePointRealProductActivationAuthorizationResult = {
    contractVersion:
      'v1_news_issue_point_real_product_activation_authorization',
    status: 'not-authorized',
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow',
    reason: 'activation-approval-absent',
  };

  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: blocked,
    approval: approval(),
  });

  assert.equal(result.status, 'not-authorized');
  if (result.status === 'not-authorized') {
    assert.equal(
      result.reason,
      'activation-authorization-not-ready',
    );
  }
});

test('cutover authorization contract cannot itself wire route, publish Product, or change registry lifecycle', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization.ts',
      import.meta.url,
    ),
    'utf8',
  );

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
  assert.doesNotMatch(source, /lifecycleState:\s*'production'/);
  assert.doesNotMatch(source, /getArtistProductVariable/);
  assert.doesNotMatch(source, /variableRegistry/);
});
