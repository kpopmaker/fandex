import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizeNewsIssuePointRealProductActivation,
  type NewsIssuePointRealProductActivationApproval,
} from '../lib/product/activation/newsIssuePointRealProductActivationAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import type {
  NewsIssuePointRealProductActivationGateResult,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';
import type {
  NewsIssuePointRealPromotionControlResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
} from '../lib/product/promotion/newsIssuePointRealProductOperationsApproval';

const PROMOTION_AUTHORIZATION_ID =
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizationId;

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

function promotionControl(): Extract<
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
      claimScope:
        'protocol-conditioned-first-seen-only',
      approval:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
      eligibility: {
        contractVersion:
          'v1_news_issue_point_real_promotion_gate',
        status: 'eligible',
        targetScope: true,
        promotionAuthorized: false,
        strictPublicationIntervalClaimAllowed: false,
        claimScope:
          'protocol-conditioned-first-seen-only',
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
            protocolStart: '2026-09-15T16:00:00.000Z',
            throughSlotStart: '2026-09-21T00:00:00.000Z',
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

test('Product Operations activation approval is explicit and fully bound', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
    {
      contractVersion:
        'v1_news_issue_point_real_product_activation_approval',
      action: 'authorize-production-activation',
      authority: 'product-operations-owner',
      activationAuthorizationId:
        'ops-activation-newsissuepoint-20260922t083554z-v2',
      authorizedAt: '2026-09-22T08:35:54.000Z',
      target: {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      binding: {
        promotionAuthorizationId:
          'ops-approval-newsissuepoint-20260921t001840z-v1',
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
  );
});

test('actual activation approval authorizes only the cutover review stage', () => {
  const result = authorizeNewsIssuePointRealProductActivation({
    readiness: readiness(),
    promotionControl: promotionControl(),
    approval:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  });

  assert.deepEqual(result, {
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
    approval:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  });
});

test('approval evidence preserves the public Product fail-closed boundary', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .decision,
    {
      activationAuthorized: true,
      publicRouteActivated: false,
      productScorePublished: false,
      directProductionContributionEligible: false,
      strictPublicationIntervalClaimAllowed: false,
      lifecycleState: 'shadow',
      requiredNextGate: 'explicit-public-route-cutover',
    },
  );
});

test('binding mismatch still fails closed after owner approval', () => {
  const mismatched: NewsIssuePointRealProductActivationApproval = {
    ...NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
    binding: {
      ...NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.binding,
      promotionAuthorizationId: 'different-promotion-authorization',
    },
  };

  const result = authorizeNewsIssuePointRealProductActivation({
    readiness: readiness(),
    promotionControl: promotionControl(),
    approval: mismatched,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(
      result.reason,
      'activation-approval-binding-mismatch',
    );
  }
});

test('activation approval record is not wired into public legacy Product query', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /newsIssuePointRealProductActivationApproval/,
  );
  assert.match(source, /dataOrigin:\s*'synthetic'/);
  assert.match(source, /presentation:\s*'preview'/);
});
