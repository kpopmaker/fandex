import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNaverNewsIngestionCommandFromCanonicalArtist } from '../lib/server/ingestion/naverNewsArtistIngestionCommand';
import {
  buildNaverNewsPublicationAcquisitionIntent,
  evaluateNaverNewsPublicationAcquisitionProof,
  type NaverNewsPublicationAcquisitionJobEvidence,
} from '../lib/server/ingestion/naverNewsPublicationAcquisitionIntent';

const interval = { startInclusive: '2026-08-01T00:00:00.000Z', endExclusive: '2026-09-01T00:00:00.000Z' };
const intent = buildNaverNewsPublicationAcquisitionIntent({ canonicalArtistId: 'iu', interval });
const command = buildNaverNewsIngestionCommandFromCanonicalArtist({ canonicalArtistId: 'iu', collectionKey: 'run13-fixture', display: 100, start: 1, sort: 'date' });
const request = { contractVersion: 'v121_naver_news_ingestion_v1' as const, ...command };

function job(jobId: string, overrides: Partial<NaverNewsPublicationAcquisitionJobEvidence> = {}): NaverNewsPublicationAcquisitionJobEvidence {
  return { jobId, request, collectionCompleteness: 'complete', snapshotAt: '2026-09-05T00:00:00.000Z', snapshotConsistency: 'proven', ...overrides };
}

test('IU intent reuses canonical binding and preserves explicit interval', () => {
  assert.deepEqual(intent, {
    contractVersion: 'v1_naver_news_publication_acquisition_intent',
    canonicalArtistId: 'iu', provider: 'naver-news', query: '아이유 IU', interval,
  });
});

test('invalid interval and unknown artist fail closed', () => {
  assert.throws(() => buildNaverNewsPublicationAcquisitionIntent({ canonicalArtistId: 'iu', interval: { startInclusive: interval.endExclusive, endExclusive: interval.startInclusive } }), /naver_news_publication_interval_invalid/);
  assert.throws(() => buildNaverNewsPublicationAcquisitionIntent({ canonicalArtistId: 'not-an-artist', interval }), /naver_news_artist_not_found/);
});

test('legacy job evidence is not acquisition proof', () => {
  const result = evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('a'.repeat(64))] });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reason, 'legacy_job_has_no_range_intent');
});

test('no jobs, repeated first pages, and multi-job union remain unproven', () => {
  assert.equal(evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [] }).status, 'unknown');
  const result = evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('a'.repeat(64)), job('b'.repeat(64))] });
  assert.equal(result.status, 'unknown');
  assert.deepEqual(result.contributingJobIds, ['a'.repeat(64), 'b'.repeat(64)]);
});

test('future interval, page gaps, non-first page, and provider limits cannot prove', () => {
  assert.equal(evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('a'.repeat(64), { snapshotAt: '2026-08-15T00:00:00.000Z' })] }).reason, 'future_interval_unobservable');
  assert.equal(evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('b'.repeat(64), { pageWindows: [{ start: 1, display: 100, received: 100 }, { start: 301, display: 100, received: 100 }] })] }).reason, 'page_sequence_incomplete');
  assert.equal(evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('c'.repeat(64), { request: { ...request, start: 101 } })] }).reason, 'publication_start_boundary_unreached');
  assert.equal(evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('d'.repeat(64), { providerTotal: 1_001 })] }).reason, 'provider_result_limit_reached');
});

test('cross artist/provider scope and invalid request evidence fail closed', () => {
  assert.throws(() => evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('a'.repeat(64), { request: { ...request, query: 'other' } })] }), /naver_news_publication_acquisition_scope_invalid/);
  assert.throws(() => evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('b'.repeat(64), { request: { ...request, provider: 'other' as 'naver-news' } })] }), /naver_news_publication_acquisition_scope_invalid/);
});

test('missing immutable snapshot guarantee remains unknown', () => {
  const result = evaluateNaverNewsPublicationAcquisitionProof({ intent, jobs: [job('a'.repeat(64), { snapshotConsistency: 'unproven' })] });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reason, 'snapshot_consistency_unproven');
});
