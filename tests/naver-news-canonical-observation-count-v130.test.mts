import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCanonicalNewsObservationCount,
  type CanonicalNewsObservationCountInput,
} from '../lib/server/ingestion/naverNewsCanonicalObservationCount';
import type { CanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';
import type { NaverNewsCollectionCompleteness } from '../lib/server/ingestion/naverNewsCollectionCompleteness';
import type { CanonicalObservationSetCoverage } from '../lib/server/ingestion/naverNewsObservationSetCoverage';
import { NAVER_NEWS_PROVIDER } from '../lib/server/ingestion/naverNewsContracts';

const complete: NaverNewsCollectionCompleteness = {
  status: 'complete', reason: 'provider_total_covered_by_first_request',
};
const truncated: NaverNewsCollectionCompleteness = {
  status: 'truncated', reason: 'provider_total_exceeds_received',
};
const unknown: NaverNewsCollectionCompleteness = {
  status: 'unknown', reason: 'non_first_page_whole_coverage_unproven',
};

function coverage(status: CanonicalObservationSetCoverage['status']): CanonicalObservationSetCoverage {
  return {
    status,
    reason: status === 'proven' ? 'all_eligible_records_disposed' : status === 'incomplete' ? 'eligible_records_missing_disposition' : 'eligible_input_set_unavailable',
    canonicalArtistId: 'iu', jobId: 'e'.repeat(64), eligibleRecordCount: 0, coveredRecordCount: 0, missingRecordIds: [],
    acceptedCandidateCount: 0, unknownCandidateCount: 0, rejectedCandidateCount: 0,
  };
}

function observation(overrides: Partial<CanonicalNaverNewsObservation> = {}): CanonicalNaverNewsObservation {
  return {
    observationId: 'a'.repeat(64),
    candidateId: 'b'.repeat(64),
    canonicalArtistId: 'iu',
    provider: NAVER_NEWS_PROVIDER,
    sourceType: 'news_article',
    canonicalSourceUrl: 'https://news.example.test/articles/iu-1',
    observedAt: '2026-09-01T12:00:00.000Z',
    collectedAt: '2026-09-03T12:00:00.000Z',
    title: '아이유 기사',
    summary: '요약',
    sourceRecordIds: ['c'.repeat(64)],
    rawEvidenceIds: ['d'.repeat(64)],
    relevanceVerification: {
      status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: '아이유' },
    },
    ...overrides,
  };
}

function input(overrides: Partial<CanonicalNewsObservationCountInput> = {}): CanonicalNewsObservationCountInput {
  return {
    canonicalArtistId: 'iu',
    interval: { startInclusive: '2026-09-01T00:00:00.000Z', endExclusive: '2026-09-02T00:00:00.000Z' },
    observations: [observation()],
    collectionCompleteness: complete,
    observationSetCoverage: coverage('unknown'),
    ...overrides,
  };
}

test('an explicit half-open interval preserves its observed subset count', () => {
  const result = evaluateCanonicalNewsObservationCount(input({ observations: [
    observation(),
    observation({ observationId: 'e'.repeat(64), observedAt: '2026-09-01T23:59:59.999Z' }),
    observation({ observationId: 'f'.repeat(64), observedAt: '2026-09-02T00:00:00.000Z' }),
  ] }));
  assert.equal(result.observedSubsetCount, 2);
  assert.deepEqual([result.value, result.productEligible], [null, false]);
});

test('the start boundary is included and the end boundary is excluded', () => {
  const result = evaluateCanonicalNewsObservationCount(input({ observations: [
    observation({ observedAt: '2026-09-01T00:00:00.000Z' }),
    observation({ observationId: 'e'.repeat(64), observedAt: '2026-09-02T00:00:00.000Z' }),
  ] }));
  assert.equal(result.observedSubsetCount, 1);
});

test('duplicate observation IDs and revisions do not double count', () => {
  const original = observation();
  const revision = observation({ title: '아이유 기사 수정', summary: '수정 요약', collectedAt: '2026-09-04T12:00:00.000Z' });
  assert.equal(evaluateCanonicalNewsObservationCount(input({ observations: [original, revision] })).observedSubsetCount, 1);
});

test('mixed artists and providers fail closed', () => {
  assert.throws(
    () => evaluateCanonicalNewsObservationCount(input({ observations: [observation({ canonicalArtistId: 'blackpink' })] })),
    /naver_news_observation_count_artist_mismatch/,
  );
  assert.throws(
    () => evaluateCanonicalNewsObservationCount(input({ observations: [observation({ provider: 'other-provider' as typeof NAVER_NEWS_PROVIDER })] })),
    /naver_news_observation_count_provider_mismatch/,
  );
});

test('truncated and unknown collections retain observed subset counts but withhold values', () => {
  const observations = [observation(), observation({ observationId: 'e'.repeat(64) })];
  const truncatedResult = evaluateCanonicalNewsObservationCount(input({ observations, collectionCompleteness: truncated }));
  assert.deepEqual([truncatedResult.observedSubsetCount, truncatedResult.value, truncatedResult.productEligible, truncatedResult.eligibilityReason], [2, null, false, 'collection_truncated']);
  const unknownResult = evaluateCanonicalNewsObservationCount(input({ observations, collectionCompleteness: unknown }));
  assert.deepEqual([unknownResult.observedSubsetCount, unknownResult.value, unknownResult.productEligible, unknownResult.eligibilityReason], [2, null, false, 'collection_completeness_unknown']);
});

test('complete collection with incomplete or unknown coverage leaves the actual metric withheld', () => {
  const result = evaluateCanonicalNewsObservationCount(input());
  assert.deepEqual([result.value, result.productEligible, result.observationSetCoverage, result.eligibilityReason], [null, false, 'unknown', 'observation_set_unknown']);
  const incomplete = evaluateCanonicalNewsObservationCount(input({ observationSetCoverage: coverage('incomplete') }));
  assert.deepEqual([incomplete.value, incomplete.productEligible, incomplete.eligibilityReason], [null, false, 'observation_set_incomplete']);
});

test('unproven empty input is not converted to a zero metric value', () => {
  const result = evaluateCanonicalNewsObservationCount(input({ observations: [], collectionCompleteness: unknown }));
  assert.deepEqual([result.observedSubsetCount, result.value, result.productEligible], [0, null, false]);
});

test('invalid intervals and observation times fail closed', () => {
  assert.throws(
    () => evaluateCanonicalNewsObservationCount(input({ interval: { startInclusive: '2026-09-02T00:00:00.000Z', endExclusive: '2026-09-02T00:00:00.000Z' } })),
    /naver_news_observation_count_interval_invalid/,
  );
  assert.throws(
    () => evaluateCanonicalNewsObservationCount(input({ interval: { startInclusive: 'invalid', endExclusive: '2026-09-02T00:00:00.000Z' } })),
    /naver_news_observation_count_interval_invalid/,
  );
  assert.throws(
    () => evaluateCanonicalNewsObservationCount(input({ observations: [observation({ observedAt: 'invalid' })] })),
    /naver_news_observation_count_observed_at_invalid/,
  );
});

test('interval membership uses observedAt rather than collectedAt', () => {
  const result = evaluateCanonicalNewsObservationCount(input({
    observations: [observation({ observedAt: '2026-09-01T12:00:00.000Z', collectedAt: '2026-10-01T12:00:00.000Z' })],
  }));
  assert.equal(result.observedSubsetCount, 1);
});

test('complete collection and proven coverage open the actual metric, including a proven zero', () => {
  const actual = evaluateCanonicalNewsObservationCount(input({
    observations: [observation(), observation({ observationId: 'f'.repeat(64) })], observationSetCoverage: coverage('proven'),
  }));
  assert.deepEqual([actual.metricKey, actual.observedSubsetCount, actual.value, actual.productEligible, actual.eligibilityReason], ['canonicalNewsObservationCount', 2, 2, true, 'complete_observation_set']);
  const zero = evaluateCanonicalNewsObservationCount(input({ observations: [], observationSetCoverage: coverage('proven') }));
  assert.deepEqual([zero.observedSubsetCount, zero.value, zero.productEligible], [0, 0, true]);
});

test('collection failure takes precedence over coverage and never converts an unproven zero into a value', () => {
  const truncatedProven = evaluateCanonicalNewsObservationCount(input({ observations: [], collectionCompleteness: truncated, observationSetCoverage: coverage('proven') }));
  assert.deepEqual([truncatedProven.observedSubsetCount, truncatedProven.value, truncatedProven.productEligible, truncatedProven.eligibilityReason], [0, null, false, 'collection_truncated']);
  const unknownIncomplete = evaluateCanonicalNewsObservationCount(input({ observations: [], collectionCompleteness: unknown, observationSetCoverage: coverage('incomplete') }));
  assert.deepEqual([unknownIncomplete.value, unknownIncomplete.productEligible, unknownIncomplete.eligibilityReason], [null, false, 'collection_completeness_unknown']);
});
