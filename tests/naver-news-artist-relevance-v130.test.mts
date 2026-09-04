import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyNaverNewsArtistRelevance } from '../lib/server/ingestion/naverNewsArtistRelevance';
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
    title: 'Unrelated title',
    summary: 'Unrelated summary',
    sourceRecordIds: ['b'.repeat(64)],
    rawEvidenceIds: ['c'.repeat(64)],
    ...overrides,
  };
}

test('a canonical Korean alias in title accepts an IU candidate', () => {
  const result = verifyNaverNewsArtistRelevance(candidate({ title: '아이유, 새 앨범 발표' }));
  assert.deepEqual(result, {
    candidateId: 'a'.repeat(64), canonicalArtistId: 'iu', status: 'accepted',
    reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: '아이유' },
  });
});

test('an alternate canonical Korean alias in summary is accepted', () => {
  const result = verifyNaverNewsArtistRelevance(candidate({ summary: '이지은이 출연 소식을 전했다.' }));
  assert.equal(result.status, 'accepted');
  assert.equal(result.reason, 'canonical_korean_alias_in_summary');
  assert.deepEqual(result.matchedEvidence, { field: 'summary', alias: '이지은' });
});

test('candidate scope and query membership alone do not establish relevance', () => {
  const result = verifyNaverNewsArtistRelevance(candidate());
  assert.deepEqual(result, {
    candidateId: 'a'.repeat(64), canonicalArtistId: 'iu', status: 'unknown',
    reason: 'insufficient_identity_evidence', matchedEvidence: null,
  });
});

test('an English substring cannot make IU accepted', () => {
  const result = verifyNaverNewsArtistRelevance(candidate({ title: 'BUILD program opens today' }));
  assert.equal(result.status, 'unknown');
  assert.equal(result.matchedEvidence, null);
});

test('verification is deterministic and preserves candidate identity', () => {
  const value = candidate({ title: '아이유 공연 소식' });
  assert.deepEqual(verifyNaverNewsArtistRelevance(value), verifyNaverNewsArtistRelevance(value));
  assert.equal(verifyNaverNewsArtistRelevance(value).candidateId, value.candidateId);
});

test('unknown artists and provider mismatches fail closed', () => {
  assert.throws(
    () => verifyNaverNewsArtistRelevance(candidate({ canonicalArtistId: 'unknown-artist' })),
    /naver_news_artist_not_found/,
  );
  assert.throws(
    () => verifyNaverNewsArtistRelevance(candidate({ provider: 'other-provider' as typeof NAVER_NEWS_PROVIDER })),
    /naver_news_artist_relevance_provider_mismatch/,
  );
});

test('a revised representative evaluates its current content without changing candidate identity', () => {
  const revision = candidate({ title: '아이유 새 공연', currentRecordId: 'd'.repeat(64) });
  const result = verifyNaverNewsArtistRelevance(revision);
  assert.equal(result.candidateId, revision.candidateId);
  assert.equal(result.status, 'accepted');
});
