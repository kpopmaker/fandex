import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateNaverNewsCollectionCompleteness,
  type NaverNewsCollectionCompletenessEvidence,
} from '../lib/server/ingestion/naverNewsCollectionCompleteness';

function evidence(
  providerTotal: number,
  received: number,
  start = 1,
  display = 100,
  normalizationCounts: Partial<{ normalizedRecords: number; duplicateRecords: number; rejectedItems: number }> = {},
): NaverNewsCollectionCompletenessEvidence {
  return {
    providerTotal,
    counts: {
      received,
      rawEvidence: received,
      normalizedRecords: normalizationCounts.normalizedRecords ?? received,
      duplicateRecords: normalizationCounts.duplicateRecords ?? 0,
      rejectedItems: normalizationCounts.rejectedItems ?? 0,
    },
    identity: {
      request: { start, display },
    },
  } as NaverNewsCollectionCompletenessEvidence;
}

test('a first-page collection with provider results beyond the received items is truncated', () => {
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(843, 100)), {
    status: 'truncated',
    reason: 'provider_total_exceeds_received',
  });
});

test('a first-page collection is complete only when received items cover the provider total', () => {
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(73, 73)), {
    status: 'complete',
    reason: 'provider_total_covered_by_first_request',
  });
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(100, 100)), {
    status: 'complete',
    reason: 'provider_total_covered_by_first_request',
  });
});

test('a non-first page is truncated when the provider total exceeds its received items', () => {
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(150, 50, 101)), {
    status: 'truncated',
    reason: 'provider_total_exceeds_received',
  });
});

test('a non-first page without omitted-count evidence remains unknown rather than complete', () => {
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(50, 50, 101)), {
    status: 'unknown',
    reason: 'non_first_page_whole_coverage_unproven',
  });
});

test('a zero-result first request is complete because provider total and received items are both zero', () => {
  assert.deepEqual(evaluateNaverNewsCollectionCompleteness(evidence(0, 0)), {
    status: 'complete',
    reason: 'provider_total_covered_by_first_request',
  });
});

test('normalization outcomes do not affect provider result-set completeness', () => {
  const complete = evaluateNaverNewsCollectionCompleteness(evidence(73, 73, 1, 100, {
    normalizedRecords: 60,
    duplicateRecords: 10,
    rejectedItems: 3,
  }));
  assert.deepEqual(complete, {
    status: 'complete',
    reason: 'provider_total_covered_by_first_request',
  });
});

test('impossible provider evidence fails closed', () => {
  assert.throws(
    () => evaluateNaverNewsCollectionCompleteness(evidence(73, 74)),
    /naver_news_completeness_evidence_invalid/,
  );
});
