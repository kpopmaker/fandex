import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
} from '../lib/intelligence/variableRegistry';
import {
  applyNewsIssuePointRealPromotionControl,
  authorizeNewsIssuePointRealPromotion,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE,
} from '../lib/product/promotion/newsIssuePointRealProductOperationsApproval';
import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';

const PROTOCOL_START = '2026-09-15T16:00:00.000Z';

function eligible(): Extract<
  NewsIssuePointRealPromotionEligibilityResult,
  { status: 'eligible' }
> {
  return Object.freeze({
    contractVersion: 'v1_news_issue_point_real_promotion_gate',
    status: 'eligible' as const,
    targetScope: true as const,
    promotionAuthorized: false as const,
    claimScope: 'protocol-conditioned-first-seen-only' as const,
    strictPublicationIntervalClaimAllowed: false as const,
    candidate: Object.freeze({
      contractVersion: 'v1_naver_news_issue_point_product_candidate',
      variableId: 'newsIssuePoint',
      canonicalArtistId: 'iu',
      fact: Object.freeze({
        availability: 'available' as const,
        value: 0,
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      observationTime: Object.freeze({
        kind: 'period' as const,
        start: '2026-09-20T17:00:00.000Z',
        end: '2026-09-21T00:00:00.000Z',
      }),
      sourceMetadata: Object.freeze({
        sourceKind:
          'naver-news-issue-point-frozen-methodology' as const,
        methodologyVersion:
          'v1_naver_news_issue_point_real_methodology',
        protocolStart: PROTOCOL_START,
        throughSlotStart: '2026-09-21T00:00:00.000Z',
        selectedWindowSlotCount: 8 as const,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
        baselineReadinessStatus:
          'replicated_cycle_history' as const,
        priorDefinedWindowCount: 120,
        priorLessThanLatestCount: 0,
        priorEqualToLatestCount: 39,
        priorGreaterThanLatestCount: 81,
      }),
      evidenceTrace: Object.freeze({
        currentWindow: null,
        storedEvidenceJobIds: Object.freeze([
          'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
        ]),
      }),
      productPolicy: Object.freeze({
        directProductContributionEligible: false as const,
        productScorePublished: false as const,
        realVariablePromotionEligible: false as const,
      }),
    }),
  });
}

test('Product Operations approval is explicit and bound to the frozen Real methodology', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
    {
      contractVersion: 'v1_news_issue_point_real_promotion_approval',
      action: 'authorize-real-variable-promotion',
      authority: 'product-operations-owner',
      authorizationId:
        'ops-approval-newsissuepoint-20260921t001840z-v1',
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
        protocolStart: PROTOCOL_START,
        selectedWindowSlotCount: 8,
        normalizationType:
          'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        claimScope:
          'protocol-conditioned-first-seen-only',
      },
    },
  );
});

test('approval evidence records the live gapless Production audit without turning providerTotal into the score', () => {
  const evidence =
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE;

  assert.equal(evidence.evidenceSource, 'neon-production-read-only');
  assert.equal(evidence.throughSlotStart, '2026-09-21T00:00:00.000Z');
  assert.equal(evidence.latestJobId,
    'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d');
  assert.equal(evidence.protocol.expectedSlotCount, 129);
  assert.equal(evidence.protocol.succeededSlotCount, 129);
  assert.equal(evidence.protocol.gapCount, 0);
  assert.equal(evidence.baselineReadiness.analysisSlotCount, 128);
  assert.equal(
    evidence.baselineReadiness.status,
    'replicated_cycle_history',
  );
  assert.equal(evidence.currentWindow.firstSeenObservationCount, 0);
  assert.equal(evidence.currentWindow.observedObservationCount, 800);
  assert.equal(evidence.currentWindow.activityRate, 0);
  assert.equal(evidence.normalization.priorDefinedWindowCount, 120);
  assert.equal(evidence.normalization.priorLessThanLatestCount, 0);
  assert.equal(evidence.normalization.priorEqualToLatestCount, 39);
  assert.equal(evidence.normalization.priorGreaterThanLatestCount, 81);
  assert.equal(evidence.normalization.score, 0);
  assert.equal(evidence.providerAudit.latestProviderTotal, 16281);
  assert.equal(
    evidence.providerAudit.strictPublicationIntervalClaimAllowed,
    false,
  );
});

test('actual approval authorizes promotion control but still cannot activate or publish Product', () => {
  const authorization = authorizeNewsIssuePointRealPromotion(
    eligible(),
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  );
  assert.equal(authorization.status, 'authorized');

  const control = applyNewsIssuePointRealPromotionControl(
    authorization,
    null,
  );
  assert.equal(control.status, 'authorized');
  if (control.status !== 'authorized') return;

  assert.equal(control.promotionAuthorized, true);
  assert.equal(control.publicRouteActivated, false);
  assert.equal(control.directProductionContributionEligible, false);
  assert.equal(control.productScorePublished, false);
  assert.equal(control.lifecycleState, 'shadow');
});

test('canonical registry advances only to activation authorization blocker', () => {
  assert.equal(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE.lifecycle,
    'shadow',
  );
  assert.equal(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE
      .directProductionContributionEligible,
    false,
  );
  assert.deepEqual(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE.blockers,
    ['production-activation-not-authorized'],
  );
});

test('approval evidence explicitly preserves 0 as a valid observed score', () => {
  const evidence =
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE;
  assert.equal(evidence.normalization.score, 0);
  assert.equal(evidence.currentWindow.activityRate, 0);
  assert.notEqual(evidence.currentWindow.observedObservationCount, 0);
});

test('approval record is not wired into the public legacy Product query', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /newsIssuePointRealProductOperationsApproval/,
  );
  assert.match(source, /dataOrigin:\s*'synthetic'/);
  assert.match(source, /presentation:\s*'preview'/);
});
