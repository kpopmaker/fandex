import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
} from '../lib/intelligence/variableRegistry';
import {
  applyNewsIssuePointRealPromotionControl,
  authorizeNewsIssuePointRealPromotion,
  type NewsIssuePointRealPromotionRevocationReason,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import {
  evaluateNewsIssuePointRealProductActivationReadiness,
} from '../lib/product/activation/newsIssuePointRealProductActivationGate';
import {
  buildNewsIssuePointRealProductReadModel,
} from '../lib/product/readModels/newsIssuePointRealProductReadModel';
import {
  evaluateNewsIssuePointRealPromotionEligibility,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';
import {
  selectNewsIssuePointRealProductSource,
} from '../lib/product/selectors/newsIssuePointRealProductSelector';
import {
  getArtistProductVariable,
} from '../lib/product/queries/getArtistProductVariable';
import {
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE,
} from '../lib/product/promotion/newsIssuePointRealProductOperationsApproval';
import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';

const PROTOCOL_START = '2026-09-15T16:00:00.000Z';

function currentCandidate() {
  const evidence =
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE;
  const startMs = Date.parse(evidence.currentWindow.startSlotStart);
  const slots = Object.freeze(
    Array.from({ length: 8 }, (_, index) => {
      const slotStart = new Date(
        startMs + index * 60 * 60 * 1_000,
      ).toISOString();
      const plan = buildNaverNewsSchedulerPlan({
        query: evidence.protocol.query,
        at: slotStart,
        display: evidence.protocol.display,
      });
      const identity = buildNaverNewsJobIdentity(plan.command);

      return Object.freeze({
        slotStart,
        jobId: identity.jobId,
        observedObservationCount: 100,
        firstSeenObservationCount: 0,
        firstSeenObservationIds: Object.freeze([]),
        bootstrap: false,
      });
    }),
  );

  assert.equal(
    slots.at(-1)?.jobId,
    evidence.latestJobId,
    'current-window deterministic scheduler identity must match audited latest job',
  );

  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_product_candidate' as const,
    variableId: 'newsIssuePoint' as const,
    canonicalArtistId: 'iu' as const,
    fact: Object.freeze({
      availability: 'available' as const,
      value: evidence.normalization.score,
    }),
    dataOrigin: 'observed' as const,
    publication: 'shadow' as const,
    presentation: 'standard' as const,
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: evidence.currentWindow.startSlotStart,
      end: evidence.currentWindow.endSlotStart,
    }),
    sourceMetadata: Object.freeze({
      sourceKind:
        'naver-news-issue-point-frozen-methodology' as const,
      methodologyVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
          .binding.methodologyVersion,
      protocolStart:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
          .binding.protocolStart,
      throughSlotStart: evidence.throughSlotStart,
      selectedWindowSlotCount: 8 as const,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      baselineReadinessStatus:
        'replicated_cycle_history' as const,
      priorDefinedWindowCount:
        evidence.normalization.priorDefinedWindowCount,
      priorLessThanLatestCount:
        evidence.normalization.priorLessThanLatestCount,
      priorEqualToLatestCount:
        evidence.normalization.priorEqualToLatestCount,
      priorGreaterThanLatestCount:
        evidence.normalization.priorGreaterThanLatestCount,
    }),
    evidenceTrace: Object.freeze({
      currentWindow: Object.freeze({
        methodologyVersion:
          NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
            .binding.methodologyVersion,
        canonicalArtistId: 'iu' as const,
        protocolStart:
          NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
            .binding.protocolStart,
        windowSlotCount: 8 as const,
        startSlotStart: evidence.currentWindow.startSlotStart,
        endSlotStart: evidence.currentWindow.endSlotStart,
        firstSeenObservationCount:
          evidence.currentWindow.firstSeenObservationCount,
        observedObservationCount:
          evidence.currentWindow.observedObservationCount,
        activityRate: evidence.currentWindow.activityRate,
        slotEvidence: slots,
      }),
      storedEvidenceJobIds: Object.freeze(
        slots.map((slot) => slot.jobId),
      ),
    }),
    productPolicy: Object.freeze({
      directProductContributionEligible: false as const,
      productScorePublished: false as const,
      realVariablePromotionEligible: false as const,
    }),
  });
}

function eligible(): Extract<
  NewsIssuePointRealPromotionEligibilityResult,
  { status: 'eligible' }
> {
  const candidate = currentCandidate();
  const legacyResult = getArtistProductVariable({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  const selection = selectNewsIssuePointRealProductSource({
    artistId: 'iu',
    variableId: 'newsIssuePoint',
    legacyResult,
    realCandidateResult: Object.freeze({
      status: 'ok' as const,
      candidate,
    }),
  });

  assert.equal(selection.selection, 'real-shadow-candidate');

  const result = evaluateNewsIssuePointRealPromotionEligibility(selection);
  assert.equal(result.status, 'eligible');
  if (result.status !== 'eligible') {
    throw new Error('current newsIssuePoint promotion eligibility unexpectedly blocked');
  }
  return result;
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

test('approval record remains immutable while registry integration advances only to activation authorization', () => {
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

test('approval evidence points to registry integration as the next gate', () => {
  assert.equal(
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
      .productDecision.requiredNextGate,
    'promotion-approval-registry-integration',
  );
});

test('actual approval drives current candidate through authorization, control, inactive read model, and activation review eligibility only', () => {
  const eligibility = eligible();
  assert.equal(eligibility.status, 'eligible');
  assert.equal(eligibility.candidate.fact.availability, 'available');
  if (eligibility.candidate.fact.availability === 'available') {
    assert.equal(eligibility.candidate.fact.value, 0);
  }
  assert.equal(
    eligibility.strictPublicationIntervalClaimAllowed,
    false,
  );

  const authorization = authorizeNewsIssuePointRealPromotion(
    eligibility,
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  );
  assert.equal(authorization.status, 'authorized');
  if (authorization.status !== 'authorized') return;
  assert.equal(authorization.promotionAuthorized, true);
  assert.equal(authorization.publicRouteActivated, false);
  assert.equal(
    authorization.strictPublicationIntervalClaimAllowed,
    false,
  );

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

  const readModel = buildNewsIssuePointRealProductReadModel(control);
  assert.equal(readModel.status, 'ok');
  if (readModel.status !== 'ok') return;
  assert.equal(readModel.model.sourcePublication, 'shadow');
  assert.equal(readModel.model.publicationTarget, 'production');
  assert.equal(readModel.model.activation, 'inactive');
  assert.equal(readModel.model.promotionAuthorized, true);
  assert.equal(readModel.model.fact.availability, 'available');
  if (readModel.model.fact.availability === 'available') {
    assert.equal(readModel.model.fact.value, 0);
  }
  assert.equal(
    readModel.model.strictPublicationIntervalClaimAllowed,
    false,
  );

  const activation = evaluateNewsIssuePointRealProductActivationReadiness({
    control,
    readModel,
    registryDefinition: NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
  });
  assert.deepEqual(activation, {
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
    authorizationId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizationId,
  });
});

test('actual approval remains revocable for every supported fail-closed reason', () => {
  const authorization = authorizeNewsIssuePointRealPromotion(
    eligible(),
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  );
  assert.equal(authorization.status, 'authorized');
  if (authorization.status !== 'authorized') return;

  const reasons: readonly NewsIssuePointRealPromotionRevocationReason[] = [
    'operator-disable',
    'evidence-lineage-failure',
    'semantic-drift',
    'data-corruption',
    'emergency-stop',
  ];

  for (const [index, reason] of reasons.entries()) {
    const control = applyNewsIssuePointRealPromotionControl(
      authorization,
      Object.freeze({
        contractVersion:
          'v1_news_issue_point_real_promotion_revocation' as const,
        action: 'revoke-real-variable-promotion' as const,
        authority: 'product-operations-owner' as const,
        revocationId:
          `ops-revocation-newsissuepoint-${String(index + 1).padStart(4, '0')}`,
        revokedAt: '2026-09-21T00:19:00.000Z',
        authorizationId:
          NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
            .authorizationId,
        target: Object.freeze({
          artistId: 'iu' as const,
          variableId: 'newsIssuePoint' as const,
        }),
        reason,
      }),
    );

    assert.equal(control.status, 'disabled');
    if (control.status !== 'disabled') continue;
    assert.equal(control.reason, reason);
    assert.equal(control.promotionAuthorized, false);
    assert.equal(control.publicRouteActivated, false);
    assert.equal(control.productScorePublished, false);
    assert.equal(control.directProductionContributionEligible, false);
  }
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
