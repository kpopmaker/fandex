import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointProductCandidate,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import {
  applyNewsIssuePointRealPromotionControl,
  authorizeNewsIssuePointRealPromotion,
  type NewsIssuePointRealPromotionApproval,
  type NewsIssuePointRealPromotionRevocation,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionAuthorization';
import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';
import {
  buildNewsIssuePointRealProductReadModel,
} from '../lib/product/readModels/newsIssuePointRealProductReadModel';

const PROTOCOL_START = '2026-09-15T16:00:00.000Z';
const CURRENT_START = '2026-09-19T02:00:00.000Z';
const CURRENT_END = '2026-09-19T09:00:00.000Z';
const SCORE = 41.975308641975;

function candidate(
  overrides: Readonly<{
    score?: number;
    currentStart?: string;
    currentEnd?: string;
    jobPrefix?: string;
  }> = {},
): NaverNewsIssuePointProductCandidate {
  const currentStart = overrides.currentStart ?? CURRENT_START;
  const currentEnd = overrides.currentEnd ?? CURRENT_END;
  const score = overrides.score ?? SCORE;
  const jobPrefix = overrides.jobPrefix ?? 'job';

  const slots = Array.from({ length: 8 }, (_, index) => Object.freeze({
    slotStart: new Date(
      Date.parse(currentStart) + index * 60 * 60 * 1_000,
    ).toISOString(),
    jobId: `${jobPrefix}-${index}`,
    observedObservationCount: 100,
    firstSeenObservationCount: index === 7 ? 2 : 0,
    firstSeenObservationIds: Object.freeze(
      index === 7 ? [`${jobPrefix}-obs-1`, `${jobPrefix}-obs-2`] : [],
    ),
    bootstrap: false,
  }));

  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_product_candidate',
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    fact: Object.freeze({
      availability: 'available' as const,
      value: score,
    }),
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: currentStart,
      end: currentEnd,
    }),
    sourceMetadata: Object.freeze({
      sourceKind: 'naver-news-issue-point-frozen-methodology' as const,
      methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
      protocolStart: PROTOCOL_START,
      throughSlotStart: currentEnd,
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
        protocolStart: PROTOCOL_START,
        windowSlotCount: 8,
        startSlotStart: currentStart,
        endSlotStart: currentEnd,
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

function eligible(
  value: NaverNewsIssuePointProductCandidate = candidate(),
): Extract<
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
    candidate: value,
  });
}

function approval(
  overrides: Partial<NewsIssuePointRealPromotionApproval> = {},
): NewsIssuePointRealPromotionApproval {
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
      protocolStart: PROTOCOL_START,
      selectedWindowSlotCount: 8 as const,
      normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      claimScope: 'protocol-conditioned-first-seen-only' as const,
    }),
    ...overrides,
  });
}

function revocation(
  overrides: Partial<NewsIssuePointRealPromotionRevocation> = {},
): NewsIssuePointRealPromotionRevocation {
  return Object.freeze({
    contractVersion: 'v1_news_issue_point_real_promotion_revocation',
    action: 'revoke-real-variable-promotion',
    authority: 'product-operations-owner',
    revocationId: 'ops-revocation-newsissuepoint-0001',
    revokedAt: '2026-09-20T05:45:00.000Z',
    authorizationId: 'ops-approval-newsissuepoint-0001',
    target: Object.freeze({
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    }),
    reason: 'operator-disable',
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

test('explicit approval authorizes the frozen methodology and official epoch, not a single score snapshot', () => {
  const result = authorizeNewsIssuePointRealPromotion(
    eligible(),
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
  assert.equal(result.approval.binding.protocolStart, PROTOCOL_START);
  assert.equal(
    result.approval.binding.methodologyVersion,
    'v1_naver_news_issue_point_real_methodology',
  );
});

test('same approval remains valid for newer eligible evidence snapshots under the same frozen epoch and methodology', () => {
  const newer = candidate({
    score: 62.5,
    currentStart: '2026-09-20T02:00:00.000Z',
    currentEnd: '2026-09-20T09:00:00.000Z',
    jobPrefix: 'new-job',
  });

  const result = authorizeNewsIssuePointRealPromotion(
    eligible(newer),
    approval(),
  );

  assert.equal(result.status, 'authorized');
  if (result.status !== 'authorized') return;
  assert.equal(result.eligibility.candidate.fact.availability, 'available');
  if (result.eligibility.candidate.fact.availability === 'available') {
    assert.equal(result.eligibility.candidate.fact.value, 62.5);
  }
  assert.equal(
    result.eligibility.candidate.sourceMetadata.throughSlotStart,
    '2026-09-20T09:00:00.000Z',
  );
});

test('approval cannot cross epoch, methodology, window, normalization, or claim-scope boundaries', () => {
  const base = approval();

  const wrongEpoch = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        protocolStart: '2026-09-16T16:00:00.000Z',
      }),
    }),
  );
  assert.equal(wrongEpoch.status, 'data-issue');

  const wrongWindow = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        selectedWindowSlotCount: 12 as unknown as 8,
      }),
    }),
  );
  assert.equal(wrongWindow.status, 'data-issue');

  const wrongMethodology = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      binding: Object.freeze({
        ...base.binding,
        methodologyVersion:
          'unexpected-methodology' as unknown as
            'v1_naver_news_issue_point_real_methodology',
      }),
    }),
  );
  assert.equal(wrongMethodology.status, 'data-issue');
});

test('approval timestamp must not predate the official epoch it authorizes', () => {
  const result = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval({
      authorizedAt: '2026-09-15T15:59:59.000Z',
    }),
  );

  assert.equal(result.status, 'data-issue');
  if (result.status === 'data-issue') {
    assert.equal(result.reason, 'approval-contract-invalid');
  }
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
  const currentCandidate = candidate();
  const auth = authorizeNewsIssuePointRealPromotion(
    eligible(currentCandidate),
    approval(),
  );
  const control = applyNewsIssuePointRealPromotionControl(auth, null);
  const result = buildNewsIssuePointRealProductReadModel(control);

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
    currentCandidate.evidenceTrace.storedEvidenceJobIds,
  );
  assert.equal(
    result.model.authorization.authorizationId,
    'ops-approval-newsissuepoint-0001',
  );
});

test('read model is blocked until promotion authorization exists', () => {
  const auth = authorizeNewsIssuePointRealPromotion(eligible(), null);
  const control = applyNewsIssuePointRealPromotionControl(auth, null);
  const result = buildNewsIssuePointRealProductReadModel(control);

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'promotion-not-authorized',
  });
});

test('explicit revocation disables an authorized promotion contract fail closed', () => {
  const auth = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval(),
  );
  const control = applyNewsIssuePointRealPromotionControl(
    auth,
    revocation(),
  );

  assert.equal(control.status, 'disabled');
  if (control.status !== 'disabled') return;
  assert.equal(control.promotionAuthorized, false);
  assert.equal(control.publicRouteActivated, false);
  assert.equal(control.directProductionContributionEligible, false);
  assert.equal(control.productScorePublished, false);
  assert.equal(control.lifecycleState, 'blocked');
  assert.equal(control.reason, 'operator-disable');

  assert.deepEqual(buildNewsIssuePointRealProductReadModel(control), {
    status: 'blocked',
    reason: 'promotion-disabled',
  });
});

test('revocation must bind to the exact authorization and cannot predate it', () => {
  const auth = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval(),
  );

  const wrongAuthorization = applyNewsIssuePointRealPromotionControl(
    auth,
    revocation({ authorizationId: 'ops-approval-newsissuepoint-9999' }),
  );
  assert.deepEqual(wrongAuthorization, {
    contractVersion: 'v1_news_issue_point_real_promotion_control',
    status: 'data-issue',
    promotionAuthorized: false,
    publicRouteActivated: false,
    directProductionContributionEligible: false,
    productScorePublished: false,
    lifecycleState: 'blocked',
    reason: 'revocation-binding-mismatch',
  });

  const predatesApproval = applyNewsIssuePointRealPromotionControl(
    auth,
    revocation({ revokedAt: '2026-09-20T05:29:59.000Z' }),
  );
  assert.equal(predatesApproval.status, 'data-issue');
  if (predatesApproval.status === 'data-issue') {
    assert.equal(predatesApproval.reason, 'revocation-binding-mismatch');
    assert.equal(predatesApproval.lifecycleState, 'blocked');
  }
});

test('authorized control remains inactive and non-contributing until a later activation contract exists', () => {
  const auth = authorizeNewsIssuePointRealPromotion(
    eligible(),
    approval(),
  );
  const control = applyNewsIssuePointRealPromotionControl(auth, null);

  assert.equal(control.status, 'authorized');
  if (control.status !== 'authorized') return;
  assert.equal(control.promotionAuthorized, true);
  assert.equal(control.publicRouteActivated, false);
  assert.equal(control.directProductionContributionEligible, false);
  assert.equal(control.productScorePublished, false);
  assert.equal(control.lifecycleState, 'shadow');
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
