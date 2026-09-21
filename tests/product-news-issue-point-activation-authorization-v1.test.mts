import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizeNewsIssuePointRealProductActivation,
  type NewsIssuePointRealProductActivationApproval,
} from '../lib/product/activation/newsIssuePointRealProductActivationAuthorization';
import type {
  NewsIssuePointRealProductActivationGateResult,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';
import type {
  NewsIssuePointRealPromotionControlResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';

const PROMOTION_AUTHORIZATION_ID =
  'ops-approval-newsissuepoint-20260921t001840z-v1';

function readiness(): Extract<
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

function control(): Extract<
  NewsIssuePointRealPromotionControlResult,
  { status: 'authorized' }
> {
  return {
    contractVersion:
      'v1_news_issue_point_real_promotion_control',
    status: 'authorized',
    promotionAuthorized: true,
    publicRouteActivated: false,
    directProductionContributionEligible: false,
    productScorePublished: false,
    lifecycleState: 'shadow',
    authorization: {
      contractVersion:
        'v1_news_issue_point_real_promotion_authorization',
      status: 'authorized',
      promotionAuthorized: true,
      publicRouteActivated: false,
      publicationTarget: 'production',
      strictPublicationIntervalClaimAllowed: false,
      claimScope: 'protocol-conditioned-first-seen-only',
      approval: {
        contractVersion:
          'v1_news_issue_point_real_promotion_approval',
        action: 'authorize-real-variable-promotion',
        authority: 'product-operations-owner',
        authorizationId: PROMOTION_AUTHORIZATION_ID,
        authorizedAt: '2026-09-21T00:18:40.114Z',
        target: {
          artistId: 'iu',
          variableId: 'newsIssuePoint',
        },
        binding: {
          candidateContractVersion:
            'v1_naver_news_issue_point_product_candidate',
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
      eligibility: {
        contractVersion:
          'v1_news_issue_point_real_promotion_gate',
        status: 'eligible',
        targetScope: true,
        promotionAuthorized: false,
        claimScope:
          'protocol-conditioned-first-seen-only',
        strictPublicationIntervalClaimAllowed: false,
        candidate: {
          contractVersion:
            'v1_naver_news_issue_point_product_candidate',
          variableId: 'newsIssuePoint',
          canonicalArtistId: 'iu',
          fact: {
            availability: 'available',
            value: 0,
          },
          dataOrigin: 'observed',
          publication: 'shadow',
          presentation: 'standard',
          observationTime: {
            kind: 'period',
            start: '2026-09-20T17:00:00.000Z',
            end: '2026-09-21T00:00:00.000Z',
          },
          sourceMetadata: {
            sourceKind:
              'naver-news-issue-point-frozen-methodology',
            methodologyVersion:
              'v1_naver_news_issue_point_real_methodology',
            protocolStart:
              '2026-09-15T16:00:00.000Z',
            throughSlotStart:
              '2026-09-21T00:00:00.000Z',
            selectedWindowSlotCount: 8,
            normalizationType:
              'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
            baselineReadinessStatus:
              'replicated_cycle_history',
            priorDefinedWindowCount: 120,
            priorLessThanLatestCount: 0,
            priorEqualToLatestCount: 39,
            priorGreaterThanLatestCount: 81,
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
      },
    },
  };
}

function approval(
  overrides: Partial<NewsIssuePointRealProductActivationApproval> = {},
): NewsIssuePointRealProductActivationApproval {
  return {
    contractVersion:
      'v1_news_issue_point_real_product_activation_approval',
    action: 'authorize-production-activation',
    authority: 'product-operations-owner',
    activationAuthorizationId:
      'ops-activation-newsissuepoint-candidate-v1',
    authorizedAt: '2026-09-21T01:00:00.000Z',
    target: {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    },
    binding: {
      promotionAuthorizationId:
        PROMOTION_AUTHORIZATION_ID,
      promotionApprovalContractVersion:
        'v1_news_issue_point_real_promotion_approval',
      activationGateContractVersion:
        'v1_news_issue_point_real_product_activation_gate',
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology',
      protocolStart:
        '2026-09-15T16:00:00.000Z',
      selectedWindowSlotCount: 8,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
      claimScope:
        'protocol-conditioned-first-seen-only',
    },
    ...overrides,
  };
}

test('no explicit activation approval stays not-authorized', () => {
  const result =
    authorizeNewsIssuePointRealProductActivation({
      readiness: readiness(),
      promotionControl: control(),
      approval: null,
    });

  assert.deepEqual(result, {
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
  });
});

test('explicit exact-bound activation approval authorizes cutover permission only', () => {
  const result =
    authorizeNewsIssuePointRealProductActivation({
      readiness: readiness(),
      promotionControl: control(),
      approval: approval(),
    });

  assert.equal(result.status, 'authorized-for-cutover');
  if (result.status !== 'authorized-for-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(
    result.directProductionContributionEligible,
    false,
  );
  assert.equal(
    result.strictPublicationIntervalClaimAllowed,
    false,
  );
  assert.equal(result.lifecycleState, 'shadow');
  assert.equal(
    result.requiredNextGate,
    'explicit-public-route-cutover',
  );
});

test('approval bound to another promotion authorization fails closed', () => {
  const value = approval();
  const result =
    authorizeNewsIssuePointRealProductActivation({
      readiness: readiness(),
      promotionControl: control(),
      approval: approval({
        binding: {
          ...value.binding,
          promotionAuthorizationId:
            'ops-approval-other-newsissuepoint-v1',
        },
      }),
    });

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(
      result.reason,
      'activation-approval-binding-mismatch',
    );
  }
});

test('activation approval cannot predate promotion approval', () => {
  const result =
    authorizeNewsIssuePointRealProductActivation({
      readiness: readiness(),
      promotionControl: control(),
      approval: approval({
        authorizedAt: '2026-09-21T00:00:00.000Z',
      }),
    });

  assert.equal(result.status, 'data-issue');
});

test('blocked activation readiness can never be authorized', () => {
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
    authorizeNewsIssuePointRealProductActivation({
      readiness: blocked,
      promotionControl: control(),
      approval: approval(),
    });

  assert.equal(result.status, 'not-authorized');
  if (result.status === 'not-authorized') {
    assert.equal(
      result.reason,
      'activation-readiness-not-eligible',
    );
  }
});

test('activation authorization layer does not wire or activate the public Product query', async () => {
  const [source, query] = await Promise.all([
    readFile(
      new URL(
        '../lib/product/activation/newsIssuePointRealProductActivationAuthorization.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/queries/getArtistProductVariable.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

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
  assert.doesNotMatch(
    query,
    /newsIssuePointRealProductActivationAuthorization/,
  );
  assert.match(query, /dataOrigin:\s*'synthetic'/);
  assert.match(query, /presentation:\s*'preview'/);
});
