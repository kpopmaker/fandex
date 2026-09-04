import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNaverNewsIngestionCommandFromCanonicalArtist } from '../lib/server/ingestion/naverNewsArtistIngestionCommand';
import { evaluateNaverNewsMetricIntervalCoverage, type NaverNewsMetricIntervalCoverageJob } from '../lib/server/ingestion/naverNewsMetricIntervalCoverage';

const command = buildNaverNewsIngestionCommandFromCanonicalArtist({ canonicalArtistId: 'iu', collectionKey: 'run12-fixture', display: 100, start: 1, sort: 'date' });
const complete = { status: 'available' as const, readModel: { completeness: { status: 'complete' as const, reason: 'provider_total_covered_by_first_request' as const } } } as NaverNewsMetricIntervalCoverageJob['completeness'];
const truncated = { status: 'available' as const, readModel: { completeness: { status: 'truncated' as const, reason: 'provider_total_exceeds_received' as const } } } as NaverNewsMetricIntervalCoverageJob['completeness'];
const proven = { status: 'proven' as const };
const incomplete = { status: 'incomplete' as const };

function job(jobId: string, overrides: Partial<NaverNewsMetricIntervalCoverageJob> = {}): NaverNewsMetricIntervalCoverageJob {
  return { jobId, canonicalArtistId: 'iu', provider: 'naver-news', request: { contractVersion: 'v121_naver_news_ingestion_v1', ...command }, completeness: complete, observationSetCoverage: proven, ...overrides };
}

const interval = { startInclusive: '2026-09-01T00:00:00.000Z', endExclusive: '2026-09-05T00:00:00.000Z' };

test('no jobs remain unknown for an explicit interval', () => {
  const result = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [] });
  assert.deepEqual([result.status, result.reason, result.contributingJobIds], ['unknown', 'acquisition_interval_coverage_unproven', []]);
});

test('complete/proven job evidence does not prove an arbitrary publication interval', () => {
  const result = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('a'.repeat(64))] });
  assert.equal(result.status, 'unknown');
  assert.equal(result.evidenceAsOf, null);
});

test('truncated, incomplete, and unknown job evidence cannot prove interval coverage', () => {
  const truncatedResult = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('a'.repeat(64), { completeness: truncated })] });
  const incompleteResult = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('b'.repeat(64), { observationSetCoverage: incomplete })] });
  assert.equal(truncatedResult.status, 'unknown');
  assert.equal(incompleteResult.status, 'unknown');
});

test('repeated first-page snapshots do not strengthen interval truth', () => {
  const result = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('a'.repeat(64)), job('b'.repeat(64))] });
  assert.deepEqual([result.status, result.contributingJobIds.length], ['unknown', 2]);
});

test('a future interval relative to any snapshot remains unproven', () => {
  const result = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval: { startInclusive: '2026-09-05T00:00:00.000Z', endExclusive: '2026-09-10T00:00:00.000Z' }, jobs: [job('a'.repeat(64))] });
  assert.equal(result.status, 'unknown');
});

test('cross-artist, cross-provider, and invalid interval inputs fail closed', () => {
  assert.throws(() => evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'blackpink', interval, jobs: [job('a'.repeat(64))] }), /naver_news_metric_interval_job_scope_invalid/);
  assert.throws(() => evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('a'.repeat(64), { provider: 'other-provider' })] }), /naver_news_metric_interval_job_scope_invalid/);
  assert.throws(() => evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval: { startInclusive: '2026-09-05T00:00:00.000Z', endExclusive: '2026-09-01T00:00:00.000Z' }, jobs: [] }), /naver_news_metric_interval_invalid/);
});

test('duplicate job IDs are counted once and do not strengthen coverage', () => {
  const result = evaluateNaverNewsMetricIntervalCoverage({ canonicalArtistId: 'iu', interval, jobs: [job('a'.repeat(64)), job('a'.repeat(64))] });
  assert.deepEqual([result.status, result.contributingJobIds], ['unknown', ['a'.repeat(64)]]);
});
