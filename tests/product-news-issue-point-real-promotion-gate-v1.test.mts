import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  NaverNewsIssuePointProductCandidate,
} from '../lib/product/adapters/naverNewsIssuePointProductCandidateAdapter';
import {
  evaluateNewsIssuePointRealPromotionEligibility,
} from '../lib/product/promotion/newsIssuePointRealProductPromotionGate';
import type {
  NewsIssuePointRealSelectorResult,
} from '../lib/product/selectors/newsIssuePointRealProductSelector';

const CURRENT_START = '2026-09-19T02:00:00.000Z';
const CURRENT_END = '2026-09-19T09:00:00.000Z';

function candidate(): NaverNewsIssuePointProductCandidate {
  const slots = Array.from({ length: 8 }, (_, index) => Object.freeze({
    slotStart: new Date(Date.parse(CURRENT_START) + index * 60 * 60 * 1_000).toISOString(),
    jobId: `job-${index}`,
    observedObservationCount: 100,
    firstSeenObservationCount: index === 7 ? 2 : 0,
    firstSeenObservationIds: Object.freeze(
      index === 7 ? ['obs-1', 'obs-2'] : [],
    ),
    bootstrap: false,
  }));

  const currentWindow = Object.freeze({
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
  });

  return Object.freeze({
    contractVersion: 'v1_naver_news_issue_point_product_candidate',
    variableId: 'newsIssuePoint',
    canonicalArtistId: 'iu',
    fact: Object.freeze({
      availability: 'available' as const,
      value: 41.975308641975,
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
      currentWindow,
      storedEvidenceJobIds: Object.freeze(slots.map((slot) => slot.jobId)),
    }),
    productPolicy: Object.freeze({
      directProductContributionEligible: false as const,
      productScorePublished: false as const,
      realVariablePromotionEligible: false as const,
    }),
  });
}

function selected(
  value: NaverNewsIssuePointProductCandidate = candidate(),
): NewsIssuePointRealSelectorResult {
  return Object.freeze({
    contractVersion: 'v1_news_issue_point_real_selector',
    selection: 'real-shadow-candidate' as const,
    targetScope: true as const,
    publishable: false as const,
    candidate: value,
  });
}

test('valid IU newsIssuePoint shadow candidate is promotion-eligible but never self-authorized', () => {
  const result = evaluateNewsIssuePointRealPromotionEligibility(selected());

  assert.equal(result.status, 'eligible');
  if (result.status !== 'eligible') return;

  assert.equal(result.targetScope, true);
  assert.equal(result.promotionAuthorized, false);
  assert.equal(result.claimScope, 'protocol-conditioned-first-seen-only');
  assert.equal(result.strictPublicationIntervalClaimAllowed, false);
  assert.equal(result.candidate.fact.availability, 'available');
  assert.equal(result.candidate.publication, 'shadow');
  assert.equal(
    result.candidate.productPolicy.realVariablePromotionEligible,
    false,
  );
});

test('unavailable Real candidate remains blocked and cannot be promoted as zero', () => {
  const value = candidate();
  const unavailable = Object.freeze({
    ...value,
    fact: Object.freeze({ availability: 'unavailable' as const, value: null }),
    observationTime: Object.freeze({ kind: 'unknown' as const }),
    evidenceTrace: Object.freeze({
      currentWindow: null,
      storedEvidenceJobIds: Object.freeze([]),
    }),
  });

  const result = evaluateNewsIssuePointRealPromotionEligibility(
    Object.freeze({
      contractVersion: 'v1_news_issue_point_real_selector',
      selection: 'real-unavailable' as const,
      targetScope: true as const,
      publishable: false as const,
      candidate: unavailable,
    }),
  );

  assert.deepEqual(result, {
    contractVersion: 'v1_news_issue_point_real_promotion_gate',
    status: 'blocked',
    targetScope: true,
    promotionAuthorized: false,
    strictPublicationIntervalClaimAllowed: false,
    reason: 'real-value-unavailable',
  });
});

test('selector data issue and non-target legacy path remain blocked', () => {
  const dataIssue = evaluateNewsIssuePointRealPromotionEligibility(
    Object.freeze({
      contractVersion: 'v1_news_issue_point_real_selector',
      selection: 'data-issue' as const,
      targetScope: true as const,
      publishable: false as const,
      reason: 'real-candidate-data-issue' as const,
    }),
  );
  assert.equal(dataIssue.status, 'blocked');
  if (dataIssue.status === 'blocked') {
    assert.equal(dataIssue.reason, 'selector-data-issue');
  }

  const legacy = evaluateNewsIssuePointRealPromotionEligibility(
    Object.freeze({
      contractVersion: 'v1_news_issue_point_real_selector',
      selection: 'legacy-preview' as const,
      targetScope: false as const,
      legacyResult: Object.freeze({
        status: 'data-issue' as const,
        issues: Object.freeze([
          Object.freeze({
            code: 'invalid-variable-identity' as const,
            rawVariableId: 'legacy',
          }),
        ]),
        sourceMetadata: Object.freeze({
          sourceArtistId: 'aespa',
          rawVariableId: 'legacy',
          sourceTimeLabel: null,
        }),
      }),
    }),
  );
  assert.equal(legacy.status, 'blocked');
  if (legacy.status === 'blocked') {
    assert.equal(legacy.reason, 'target-scope-not-selected');
    assert.equal(legacy.targetScope, false);
  }
});

test('promotion gate independently rejects evidence trace mismatch', () => {
  const value = candidate();
  const broken = Object.freeze({
    ...value,
    evidenceTrace: Object.freeze({
      ...value.evidenceTrace,
      storedEvidenceJobIds: Object.freeze(
        value.evidenceTrace.storedEvidenceJobIds.slice(0, -1),
      ),
    }),
  });

  const result = evaluateNewsIssuePointRealPromotionEligibility(
    selected(broken as NaverNewsIssuePointProductCandidate),
  );

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'candidate-evidence-mismatch');
  }
});

test('promotion gate rejects any attempt by the shadow candidate to self-authorize promotion', () => {
  const value = candidate();
  const selfAuthorized = Object.freeze({
    ...value,
    productPolicy: Object.freeze({
      directProductContributionEligible: false as const,
      productScorePublished: false as const,
      realVariablePromotionEligible: true as const,
    }),
  });

  const result = evaluateNewsIssuePointRealPromotionEligibility(
    selected(selfAuthorized as unknown as NaverNewsIssuePointProductCandidate),
  );

  assert.equal(result.status, 'blocked');
  if (result.status === 'blocked') {
    assert.equal(result.reason, 'candidate-policy-mismatch');
  }
});

test('promotion gate never uses providerTotal, legacy transforms, Product routing, or a production publication mutation', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/promotion/newsIssuePointRealProductPromotionGate.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /providerTotal/);
  assert.doesNotMatch(source, /legacy-derived-index-point/);
  assert.doesNotMatch(source, /getArtistProductVariable\s*\(/);
  assert.doesNotMatch(source, /publication:\s*['"]production['"]/);
  assert.doesNotMatch(source, /promotionAuthorized:\s*true/);
  assert.match(source, /strictPublicationIntervalClaimAllowed:\s*false/);
});
