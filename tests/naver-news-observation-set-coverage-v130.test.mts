import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateCanonicalObservationSetCoverage, type CanonicalObservationSetCoverageInput } from '../lib/server/ingestion/naverNewsObservationSetCoverage';
import type { NaverNewsArtistRelevanceVerification } from '../lib/server/ingestion/naverNewsArtistRelevance';
import type { CanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';
import type { CanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import { NAVER_NEWS_PROVIDER } from '../lib/server/ingestion/naverNewsContracts';

const jobId = 'a'.repeat(64);
const ids = ['b', 'c', 'd', 'e'].map((value) => value.repeat(64));
const evidenceIds = ['f', '1', '2', '3'].map((value) => value.repeat(64));

function candidate(index: number, recordIndexes: readonly number[]): CanonicalNaverNewsObservationCandidate {
  return {
    candidateId: String(index + 4).repeat(64), canonicalArtistId: 'iu', provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article',
    canonicalSourceUrl: `https://news.example.test/${index}`, publishedAt: '2026-09-01T00:00:00.000Z', collectedAt: '2026-09-01T01:00:00.000Z',
    currentRecordId: ids[recordIndexes[0]], currentRawEvidenceId: evidenceIds[recordIndexes[0]], title: '아이유 기사', summary: '요약',
    sourceRecordIds: recordIndexes.map((recordIndex) => ids[recordIndex]), rawEvidenceIds: recordIndexes.map((recordIndex) => evidenceIds[recordIndex]),
  };
}

function verification(value: CanonicalNaverNewsObservationCandidate, status: NaverNewsArtistRelevanceVerification['status']): NaverNewsArtistRelevanceVerification {
  return { candidateId: value.candidateId, canonicalArtistId: value.canonicalArtistId, status, reason: status === 'unknown' ? 'insufficient_identity_evidence' : 'canonical_korean_alias_in_title', matchedEvidence: status === 'unknown' ? null : { field: 'title', alias: '아이유' } };
}

function observation(value: CanonicalNaverNewsObservationCandidate): CanonicalNaverNewsObservation {
  return { observationId: '9'.repeat(63) + value.candidateId[0], candidateId: value.candidateId, canonicalArtistId: 'iu', provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article', canonicalSourceUrl: value.canonicalSourceUrl, observedAt: value.publishedAt, collectedAt: value.collectedAt, title: value.title, summary: value.summary, sourceRecordIds: value.sourceRecordIds, rawEvidenceIds: value.rawEvidenceIds, relevanceVerification: { status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: '아이유' } } };
}

function input(overrides: Partial<CanonicalObservationSetCoverageInput> = {}): CanonicalObservationSetCoverageInput {
  const first = candidate(0, [0, 1]);
  const second = candidate(1, [2]);
  const third = candidate(2, [3]);
  return { canonicalArtistId: 'iu', jobId, eligibleNormalizedRecords: { status: 'available', records: ids.map((recordId, index) => ({ recordId, rawEvidenceId: evidenceIds[index], jobId, provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article' })) }, candidates: [first, second, third], verifications: [verification(first, 'accepted'), verification(second, 'unknown'), verification(third, 'rejected')], observations: [observation(first)], ...overrides };
}

test('mixed accepted, unknown, and rejected dispositions prove coverage by record lineage', () => {
  const result = evaluateCanonicalObservationSetCoverage(input());
  assert.deepEqual([result.status, result.eligibleRecordCount, result.coveredRecordCount, result.acceptedCandidateCount, result.unknownCandidateCount, result.rejectedCandidateCount], ['proven', 4, 4, 1, 1, 1]);
});

test('a missing eligible record produces incomplete coverage and its deterministic diagnostic', () => {
  const value = input();
  const result = evaluateCanonicalObservationSetCoverage({ ...value, candidates: value.candidates.slice(0, 2), verifications: value.verifications.slice(0, 2) });
  assert.deepEqual([result.status, result.missingRecordIds], ['incomplete', [ids[3]]]);
});

test('one collapsed candidate covers all of its eligible revisions', () => {
  const collapsed = candidate(0, [0, 1]);
  const result = evaluateCanonicalObservationSetCoverage(input({ eligibleNormalizedRecords: { status: 'available', records: [0, 1].map((index) => ({ recordId: ids[index], rawEvidenceId: evidenceIds[index], jobId, provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article' })) }, candidates: [collapsed], verifications: [verification(collapsed, 'accepted')], observations: [observation(collapsed)] }));
  assert.equal(result.status, 'proven');
});

test('accepted requires exactly one final observation, while unknown and rejected are terminal non-promotion dispositions', () => {
  const value = input();
  const missingAccepted = evaluateCanonicalObservationSetCoverage({ ...value, observations: [] });
  assert.equal(missingAccepted.status, 'incomplete');
  const nonPromoted = input({ candidates: value.candidates.slice(1), verifications: value.verifications.slice(1), observations: [] });
  assert.equal(evaluateCanonicalObservationSetCoverage({ ...nonPromoted, eligibleNormalizedRecords: { status: 'available', records: [2, 3].map((index) => ({ recordId: ids[index], rawEvidenceId: evidenceIds[index], jobId, provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article' })) } }).status, 'proven');
});

test('non-promotion observations, mismatched verifications, cross-artist, cross-job, and contradictory candidate lineage fail closed', () => {
  const value = input();
  assert.throws(() => evaluateCanonicalObservationSetCoverage({ ...value, observations: [...value.observations, observation(value.candidates[1])] }), /naver_news_observation_set_coverage_disposition_conflict/);
  assert.throws(() => evaluateCanonicalObservationSetCoverage({ ...value, verifications: [{ ...value.verifications[0], candidateId: '8'.repeat(64) }] }), /naver_news_observation_set_coverage_verification_conflict/);
  assert.throws(() => evaluateCanonicalObservationSetCoverage({ ...value, candidates: [{ ...value.candidates[0], canonicalArtistId: 'blackpink' }] }), /naver_news_observation_set_coverage_candidate_lineage_invalid/);
  assert.throws(() => evaluateCanonicalObservationSetCoverage({ ...value, eligibleNormalizedRecords: { status: 'available', records: [{ recordId: ids[0], rawEvidenceId: evidenceIds[0], jobId: '7'.repeat(64), provider: NAVER_NEWS_PROVIDER, sourceType: 'news_article' }] } }), /naver_news_observation_set_coverage_eligible_lineage_invalid/);
  assert.throws(() => evaluateCanonicalObservationSetCoverage({ ...value, candidates: [value.candidates[0], { ...value.candidates[1], sourceRecordIds: [ids[0]], rawEvidenceIds: [evidenceIds[0]] }] }), /naver_news_observation_set_coverage_candidate_lineage_invalid/);
});

test('only an explicitly available empty eligible set can be proven empty', () => {
  const empty = evaluateCanonicalObservationSetCoverage(input({ eligibleNormalizedRecords: { status: 'available', records: [] }, candidates: [], verifications: [], observations: [] }));
  assert.deepEqual([empty.status, empty.eligibleRecordCount], ['proven', 0]);
  const unavailable = evaluateCanonicalObservationSetCoverage(input({ eligibleNormalizedRecords: { status: 'unavailable' } }));
  assert.deepEqual([unavailable.status, unavailable.eligibleRecordCount], ['unknown', 0]);
});
