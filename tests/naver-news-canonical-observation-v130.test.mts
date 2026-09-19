import assert from 'node:assert/strict';
import test from 'node:test';

import {
  promoteCanonicalNaverNewsObservation,
  type CanonicalNaverNewsObservation,
} from '../lib/server/ingestion/naverNewsCanonicalObservation';
import type { NaverNewsArtistRelevanceVerification } from '../lib/server/ingestion/naverNewsArtistRelevance';
import type { CanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import { NAVER_NEWS_PROVIDER } from '../lib/server/ingestion/naverNewsContracts';

function candidate(overrides: Partial<CanonicalNaverNewsObservationCandidate> = {}): CanonicalNaverNewsObservationCandidate {
  return {
    candidateId: 'a'.repeat(64),
    canonicalArtistId: 'iu',
    provider: NAVER_NEWS_PROVIDER,
    sourceType: 'news_article',
    canonicalSourceUrl: 'https://news.example.test/articles/iu-1',
    publishedAt: '2026-09-01T00:00:00.000Z',
    collectedAt: '2026-09-01T01:00:00.000Z',
    currentRecordId: 'b'.repeat(64),
    currentRawEvidenceId: 'c'.repeat(64),
    title: '아이유, 새 앨범 발표',
    summary: '새 앨범 소식',
    sourceRecordIds: ['b'.repeat(64)],
    rawEvidenceIds: ['c'.repeat(64)],
    ...overrides,
  };
}

function verification(
  value: CanonicalNaverNewsObservationCandidate,
  overrides: Partial<NaverNewsArtistRelevanceVerification> = {},
): NaverNewsArtistRelevanceVerification {
  return {
    candidateId: value.candidateId,
    canonicalArtistId: value.canonicalArtistId,
    status: 'accepted',
    reason: 'canonical_korean_alias_in_title',
    matchedEvidence: { field: 'title', alias: '아이유' },
    ...overrides,
  };
}

function promote(value = candidate()): CanonicalNaverNewsObservation {
  return promoteCanonicalNaverNewsObservation(value, verification(value));
}

test('an accepted IU candidate promotes with canonical source and verification lineage', () => {
  const value = candidate();
  const observation = promote(value);
  assert.equal(observation.candidateId, value.candidateId);
  assert.equal(observation.canonicalArtistId, 'iu');
  assert.equal(observation.observedAt, value.publishedAt);
  assert.equal(observation.collectedAt, value.collectedAt);
  assert.deepEqual(observation.sourceRecordIds, value.sourceRecordIds);
  assert.deepEqual(observation.rawEvidenceIds, value.rawEvidenceIds);
  assert.deepEqual(observation.relevanceVerification, {
    status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: '아이유' },
  });
});

test('unknown and rejected verification cannot promote', () => {
  const value = candidate();
  assert.throws(
    () => promoteCanonicalNaverNewsObservation(value, verification(value, { status: 'unknown', reason: 'insufficient_identity_evidence', matchedEvidence: null })),
    /naver_news_canonical_observation_verification_not_accepted/,
  );
  assert.throws(
    () => promoteCanonicalNaverNewsObservation(value, verification(value, { status: 'rejected' })),
    /naver_news_canonical_observation_verification_not_accepted/,
  );
});

test('candidate and artist verification mismatches fail closed', () => {
  const value = candidate();
  assert.throws(
    () => promoteCanonicalNaverNewsObservation(value, verification(value, { candidateId: 'd'.repeat(64) })),
    /naver_news_canonical_observation_candidate_mismatch/,
  );
  assert.throws(
    () => promoteCanonicalNaverNewsObservation(value, verification(value, { canonicalArtistId: 'blackpink' })),
    /naver_news_canonical_observation_artist_mismatch/,
  );
});

test('promotion has no candidate-only public shortcut', () => {
  assert.equal(promoteCanonicalNaverNewsObservation.length, 2);
});

test('observation identity is deterministic, candidate-based, and revision-stable', () => {
  const original = candidate();
  const repeated = promote(original);
  assert.equal(repeated.observationId, promote(original).observationId);

  const revision = candidate({
    currentRecordId: 'd'.repeat(64), currentRawEvidenceId: 'e'.repeat(64), title: '아이유, 수정된 제목', summary: '수정된 요약',
    publishedAt: '2026-09-01T00:05:00.000Z', collectedAt: '2026-09-01T02:00:00.000Z',
    sourceRecordIds: ['b'.repeat(64), 'd'.repeat(64)], rawEvidenceIds: ['c'.repeat(64), 'e'.repeat(64)],
  });
  assert.equal(repeated.observationId, promote(revision).observationId);
  assert.notEqual(repeated.observationId, promote(candidate({ candidateId: 'f'.repeat(64) })).observationId);
});
