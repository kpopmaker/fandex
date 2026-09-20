import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointProductCandidate,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import {
  authorizeNewsIssuePointRealPromotion,
  type NewsIssuePointRealPromotionApproval,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';
import {
  buildNewsIssuePointRealProductReadModel,
} from '../lib/product/readModels/newsIssuePointRealProductReadModel';

const CURRENT_START = '2026-09-19T02:00:00.000Z';
const CURRENT_END = '2026-09-19T09:00:00.000Z';
const SCORE = 41.975308641975;

function candidate(): NaverNewsIssuePointProductCandidate {
  const slots = Array.from({ length: 8 }, (_, index) => Object.freeze({
    slotStart: new Date(
      Date.parse(CURRENT_START) + index * 60 * 60 * 1_000,
    ).toISOString(),
    jobId: `job-${index}`,
    observedObservationCount: 100,
    firstSeenObservationCount: index === 7 ? 2 : 0,
    firstSeenObservationIds: Object.freeze(
      index === 7 ? ['obs-1', 'obs-2'] : [],
    ),
    bootstrap: false,
  }));

  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_product_candidate',
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    fact: Object.freeze({
      availability: 'available' as const,
      value: SCORE,
    }),
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: CURRENT_START,
      end: CURRENT_END,
    }),
    sourceMetadata: Object.freeze({
      sourceKind: 'naver-news-issue-point-frozen-methodology' as const,
      methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
      protocolStart: '2026-09-15T16:00:00.000Z',
      throughSlotStart: CURRENT_END,
      selectedWindowSlotCount: 8 as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      baselineReadinessStatus: 'replicated_cycle_history' as const,
      priorDefinedWindowCount: 81,
      priorLessThanLatestCount: 34,
      priorEqualToLatestCount: 10,
      priorGreaterThanLatestCount: 37,
    }),
    evidenceTrace: Object.freeze({
      currentWindow: Object.freeze({
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        canonicalArtistId: 'iu',
        protocolStart: '2026-09-15T16:00:00.000Z',
        windowSlotCount: 8,
        startSlotStart: CURRENT_START,
        endSlotStart: CURRENT_END,
        firstSeenObservationCount: 2,
        observedObservationCount: 800,
        activityRate: 0.0025,
        slotEvidence: Object.freeze(slots),
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
  return Object.freeze({
    contractVersion: 'v1_news_issue_point_real_promotion_gate',
    status: 'eligible',
    targetScope: true,
    promotionAuthorized: false,
    claimScope: 'protocol-conditioned-first-seen-only',
    strictPublicationIntervalClaimAllowed: false,
    candidate: candidate(),
  });
}

function approval(
  overrides: Partial<NewsIssuePointRealPromotionApproval> = {},
): NewsIssuePointRealPromotionApproval {
  const value = candidate();

  return Object.freeze({
    contractVersion: 'v1_news_issue_point_real_promotion_approval',
    action: 'authorize-real-variable-promotion',
    authority: 'product-operations-owner',
    authorizationId: 'ops-approval-newsissuepoint-0001',
    authorizedAt: '2026-09-20T05:30:00.000Z',
    target: Object.freeze({
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    }),
    binding: Object.freeze({
      candidateContractVersion:
        'v1_naver_news_issue_point_product_candidate',
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology',
      throughSlotStart: CURRENT_END,
      score: SCORE,
      storedEvidenceJobIds: Object.freeze([
        ...value.evidenceTrace.storedEvidenceJobIds,
      ]),
    }),
    ...overrides,
  });
}

test('promotion remains not-authorized when no explicit approval record exists', () => {
  const result = authorizeNewsIssuePointRealPromotion(eligible(), null);

  assert.deepEqual(result, {
    contractVersion: 'v1_news_issue_point_real_promotion_authorization',
    status: 'not-authorized',
    promotionAuthorized: false,
    publicRouteActivated: false,
    strictPublicationIntervalClaimAllowed: false,
    reason: 'approval-absent',
  });
});

test('explicit approval authorizes only the exact evidence-bound promotion snapshot', () => {
  const eligibility = eligible();
  const result = authorizeNewsIssuePointRealPromotion(
    eligibility,
    approval(),
  );

  assert.equal(result.status, 'authorized');
  if (result.status !== 'authorized') return;

  assert.equal(result.promotionAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publicationTarget, 'production');
  assert.equal(
    result.claimScope,
    'protocol-conditioned-first-seen-only',
  );
  assert.equal(result.strictPublicationIntervalClaimAllowed, false);
  assert.equal(
    result.approval.binding.throughSlotStart,
    eligibility.candidate.sourceMetadata.throughSlotStart,
  );
  assert.deepEqual(
    result.approval.binding.storedEvidenceJobIds,
    eligibility.candidate.evidenceTrace.storedEvidenceJobIds,
  );
});

test('approval cannot be reused for a different score, through-slot, or evidence trace', () => {
  const base = approval();

  const wrongScore = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        score: SCORE + 1,
      }),
    }),
  );
  assert.equal(wrongScore.status, 'data-issue');

  const wrongSlot = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        throughSlotStart: '2026-09-19T10:00:00.000Z',
      }),
    }),
  );
  assert.equal(wrongSlot.status, 'data-issue');

  const wrongTrace = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        storedEvidenceJobIds: Object.freeze([
          ...base.binding.storedEvidenceJobIds.slice(0, -1),
          'different-job',
        ]),
      }),
    }),
  );
  assert.equal(wrongTrace.status, 'data-issue');
});

test('blocked eligibility cannot be authorized even with a syntactically valid approval', () => {
  const result = authorizeNewsIssuePointRealPromotion(
    Object.freeze({
      contractVersion: 'v1_news_issue_point_real_promotion_gate',
      status: 'blocked' as const,
      targetScope: true,
      promotionAuthorized: false,
      strictPublicationIntervalClaimAllowed: false,
      reason: 'real-value-unavailable' as const,
    }),
    approval(),
  );

  assert.equal(result.status, 'not-authorized');
  if (result.status === 'not-authorized') {
    assert.equal(result.reason, 'eligibility-blocked');
  }
});

test('authorized promotion builds an Evidence-traceable inactive production-target read model', () => {
  const auth = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval(),
  );
  const result = buildNewsIssuePointRealProductReadModel(auth);

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(result.model.identity, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.deepEqual(result.model.fact, {
    availability: 'available',
    value: SCORE,
  });
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.sourcePublication, 'shadow');
  assert.equal(result.model.publicationTarget, 'production');
  assert.equal(result.model.activation, 'inactive');
  assert.equal(result.model.promotionAuthorized, true);
  assert.equal(
    result.model.definition.evidenceRelation.kind,
    'stored-evidence-job-trace',
  );
  assert.equal(
    result.model.strictPublicationIntervalClaimAllowed,
    false,
  );
  assert.deepEqual(
    result.model.evidenceTrace.storedEvidenceJobIds,
    candidate().evidenceTrace.storedEvidenceJobIds,
  );
  assert.equal(
    result.model.authorization.authorizationId,
    'ops-approval-newsissuepoint-0001',
  );
});

test('read model is blocked until promotion authorization exists', () => {
  const auth = authorizeNewsIssuePointRealPromotion(eligible(), null);
  const result = buildNewsIssuePointRealProductReadModel(auth);

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'promotion-not-authorized',
  });
});

test('authorization/read-model layers do not wire public query, mutate source safety flags, or permit strict interval claims', async () => {
  const [authorizationSource, readModelSource] = await Promise.all([
    readFile(
      new URL(
        '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../lib/product/readModels/newsIssuePointRealProductReadModel.ts',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const combined = authorizationSource + readModelSource;

  assert.doesNotMatch(combined, /getArtistProductVariable\s*\(/);
  assert.doesNotMatch(
    combined,
    /directProductContributionEligible:\s*true/,
  );
  assert.doesNotMatch(combined, /productScorePublished:\s*true/);
  assert.doesNotMatch(
    combined,
    /realVariablePromotionEligible:\s*true/,
  );
  assert.doesNotMatch(
    combined,
    /strictPublicationIntervalClaimAllowed:\s*true/,
  );
  assert.doesNotMatch(combined, /publicRouteActivated:\s*true/);
});
