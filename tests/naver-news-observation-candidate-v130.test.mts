import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCanonicalNaverNewsObservationCandidate,
  collapseCanonicalNaverNewsObservationCandidates,
} from '../lib/server/ingestion/naverNewsObservationCandidate';
import { NAVER_NEWS_PROVIDER, type NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

function record(overrides: Partial<NaverNewsNormalizedRecord> = {}): NaverNewsNormalizedRecord {
  const recordId = overrides.recordId ?? 'a'.repeat(64);
  const rawEvidenceId = overrides.rawEvidenceId ?? 'b'.repeat(64);
  const sourceUrl = overrides.sourceUrl ?? 'https://news.example.test/articles/iu-1';
  return {
    recordId,
    rawEvidenceId,
    provider: NAVER_NEWS_PROVIDER,
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: 'https://search.naver.example.test/iu-1',
    sourceHost: 'news.example.test',
    title: 'IU article',
    summary: 'Original summary',
    publishedAt: '2026-09-01T00:00:00.000Z',
    collectedAt: '2026-09-01T01:00:00.000Z',
    contentSha256: 'c'.repeat(64),
    recordSha256: 'd'.repeat(64),
    normalizedPayload: {
      provider: NAVER_NEWS_PROVIDER,
      sourceType: 'news_article',
      sourceUrl,
      naverUrl: 'https://search.naver.example.test/iu-1',
      sourceHost: 'news.example.test',
      title: 'IU article',
      summary: 'Original summary',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

test('an IU normalized record produces an artist-scoped candidate with source lineage', () => {
  const value = record();
  const candidate = buildCanonicalNaverNewsObservationCandidate('iu', value);
  assert.equal(candidate.canonicalArtistId, 'iu');
  assert.equal(candidate.provider, NAVER_NEWS_PROVIDER);
  assert.equal(candidate.canonicalSourceUrl, value.sourceUrl);
  assert.equal(candidate.currentRecordId, value.recordId);
  assert.equal(candidate.currentRawEvidenceId, value.rawEvidenceId);
  assert.deepEqual(candidate.sourceRecordIds, [value.recordId]);
  assert.deepEqual(candidate.rawEvidenceIds, [value.rawEvidenceId]);
  assert.equal(candidate.candidateId, buildCanonicalNaverNewsObservationCandidate('iu', value).candidateId);
});

test('revised title, summary, and record hashes do not create a new candidate for the same article URL', () => {
  const original = record();
  const revision = record({
    recordId: 'e'.repeat(64), rawEvidenceId: 'f'.repeat(64), title: 'IU article revised', summary: 'Revised summary',
    contentSha256: '1'.repeat(64), recordSha256: '2'.repeat(64), publishedAt: '2026-09-01T00:05:00.000Z',
    collectedAt: '2026-09-01T02:00:00.000Z',
  });
  assert.equal(
    buildCanonicalNaverNewsObservationCandidate('iu', original).candidateId,
    buildCanonicalNaverNewsObservationCandidate('iu', revision).candidateId,
  );
});

test('different article URLs and artists do not collapse into the same candidate identity', () => {
  const original = record();
  assert.notEqual(
    buildCanonicalNaverNewsObservationCandidate('iu', original).candidateId,
    buildCanonicalNaverNewsObservationCandidate('iu', record({ sourceUrl: 'https://news.example.test/articles/iu-2' })).candidateId,
  );
  assert.notEqual(
    buildCanonicalNaverNewsObservationCandidate('iu', original).candidateId,
    buildCanonicalNaverNewsObservationCandidate('blackpink', original).candidateId,
  );
});

test('unknown artists and provider mismatches fail closed', () => {
  assert.throws(() => buildCanonicalNaverNewsObservationCandidate('unknown-artist', record()), /naver_news_artist_not_found/);
  assert.throws(
    () => buildCanonicalNaverNewsObservationCandidate('iu', record({ provider: 'other-provider' as typeof NAVER_NEWS_PROVIDER })),
    /naver_news_observation_candidate_provider_mismatch/,
  );
});

test('revisions collapse by candidate identity, retain lineage, and select the latest collection', () => {
  const first = record();
  const latest = record({
    recordId: 'e'.repeat(64), rawEvidenceId: 'f'.repeat(64), title: 'IU article revised',
    collectedAt: '2026-09-01T02:00:00.000Z',
  });
  const collapsed = collapseCanonicalNaverNewsObservationCandidates('iu', [first, latest]);
  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].currentRecordId, latest.recordId);
  assert.deepEqual(collapsed[0].sourceRecordIds, [first.recordId, latest.recordId]);
  assert.deepEqual(collapsed[0].rawEvidenceIds, [first.rawEvidenceId, latest.rawEvidenceId]);
});

test('representative ties use recordId deterministically', () => {
  const lower = record({ recordId: 'a'.repeat(63) + '1', rawEvidenceId: 'e'.repeat(64) });
  const higher = record({ recordId: 'a'.repeat(63) + '2', rawEvidenceId: 'f'.repeat(64) });
  const collapsed = collapseCanonicalNaverNewsObservationCandidates('iu', [higher, lower]);
  assert.equal(collapsed[0].currentRecordId, higher.recordId);
});
