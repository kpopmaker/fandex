import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptExplicitUnavailableTruth,
  adaptLastFmRollingPreviewTruth,
  adaptMusicPlatformTruth,
  adaptNaverFrozenCutoverTruth,
  adaptYouTubeFrozenCutoverTruth,
} from '../lib/product/adapters/cloudV10ProductTruthAdapter';
import {
  makeAvailableProductNumericFact,
  makeMissingProductNumericFact,
  makeUnavailableProductNumericFact,
} from '../lib/product/contracts/productNumericFact';

function requireTruth<T extends { status: string }>(
  result: T,
): Extract<T, { status: 'ok' }> {
  if (result.status !== 'ok') {
    assert.fail('Expected Product Truth result to be ok.');
  }

  return result as Extract<T, { status: 'ok' }>;
}

test('AVAILABLE positive remains unchanged', () => {
  const result = requireTruth(
    adaptMusicPlatformTruth({
      status: 'RANKED',
      point: 24,
      snapshotDate: '2026-09-03',
      createdAt: '2026-09-03T10:46:16',
      version: 'fandex_music_chart_v2_current_presence_parallel_v1',
      usage: 'parallel_candidate_only',
    }),
  );

  assert.deepEqual(result.truth.fact, {
    availability: 'available',
    value: 24,
  });
});

test('AVAILABLE zero remains a real zero', () => {
  const fact = makeAvailableProductNumericFact(0);

  assert.equal(fact.availability, 'available');
  assert.equal(fact.value, 0);
});

test('Music NOT_RANKED zero remains NOT_RANKED instead of zero', () => {
  const result = requireTruth(
    adaptMusicPlatformTruth({
      status: 'NOT_RANKED',
      point: 0,
      snapshotDate: '2026-09-03',
      createdAt: '2026-09-03T10:46:16',
      version: 'fandex_music_chart_v2_current_presence_parallel_v1',
      usage: 'parallel_candidate_only',
    }),
  );

  assert.deepEqual(result.truth.fact, {
    availability: 'not-ranked',
    value: null,
  });

  assert.notEqual(result.truth.fact.availability, 'available');
});

test('Music NOT_RANKED with a non-zero point fails closed', () => {
  const result = adaptMusicPlatformTruth({
    status: 'NOT_RANKED',
    point: 1,
    snapshotDate: '2026-09-03',
    createdAt: '2026-09-03T10:46:16',
    version: 'fandex_music_chart_v2_current_presence_parallel_v1',
    usage: 'parallel_candidate_only',
  });

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'source-status-value-mismatch',
  });
});

test('MISSING remains distinct from zero and NOT_RANKED', () => {
  const missing = makeMissingProductNumericFact();

  assert.deepEqual(missing, {
    availability: 'missing',
    value: null,
  });

  assert.notEqual(missing.availability, 'available');
  assert.notEqual(missing.availability, 'not-ranked');
});

test('UNAVAILABLE remains its own Product state', () => {
  const unavailable = makeUnavailableProductNumericFact();

  assert.deepEqual(unavailable, {
    availability: 'unavailable',
    value: null,
  });

  assert.notEqual(unavailable.availability, 'missing');
});

test('explicit UNAVAILABLE source becomes unavailable without inventing a value', () => {
  const result = requireTruth(
    adaptExplicitUnavailableTruth({
      availability: 'UNAVAILABLE',
      sourceKey: 'music',
      sourceLabel: null,
      updatedAt: null,
    }),
  );

  assert.deepEqual(result.truth.fact, {
    availability: 'unavailable',
    value: null,
  });

  assert.equal(result.truth.freshness, 'unknown');
  assert.deepEqual(result.truth.dataTime, {
    dataAsOf: { kind: 'unknown' },
    updatedAt: null,
  });

  assert.deepEqual(result.truth.sourceAttribution, {
    sourceKey: 'music',
    sourceLabel: null,
  });
});

test('Last.fm rolling output remains PREVIEW with explicit data as-of', () => {
  const result = requireTruth(
    adaptLastFmRollingPreviewTruth({
      version: 'lastfm_global_interest_rolling_score_preview_v1',
      latestDate: '2026-09-03',
      status: 'ok',
      rollingCombinedPreviewPoint: 92.3883,
    }),
  );

  assert.equal(result.truth.presentation, 'preview');
  assert.equal(result.truth.freshness, 'unknown');

  assert.deepEqual(result.truth.dataTime, {
    dataAsOf: {
      kind: 'instant',
      observedAt: '2026-09-03',
    },
    updatedAt: null,
  });

  assert.deepEqual(result.truth.sourceAttribution, {
    sourceKey: 'lastfm',
    sourceLabel: 'lastfm_global_interest_rolling_score_preview_v1',
  });
});

test('Naver cutover snapshot remains FROZEN and does not invent dataAsOf', () => {
  const result = requireTruth(
    adaptNaverFrozenCutoverTruth({
      source: 'production_v10_status_snapshot',
      note: 'Cloud migration seed. Preserves the Naver v3 points used by production v10 at cutover.',
      createdAt: '2026-08-31T18:08:01+09:00',
      value: 214.28,
    }),
  );

  assert.equal(result.truth.freshness, 'frozen');
  assert.deepEqual(result.truth.dataTime, {
    dataAsOf: { kind: 'unknown' },
    updatedAt: '2026-08-31T18:08:01+09:00',
  });

  assert.deepEqual(result.truth.sourceAttribution, {
    sourceKey: 'naver',
    sourceLabel: 'production_v10_status_snapshot',
  });
});

test('YouTube cutover snapshot remains FROZEN', () => {
  const result = requireTruth(
    adaptYouTubeFrozenCutoverTruth({
      source: 'production_v10_status_snapshot',
      note: 'Cloud migration seed. Preserves the YouTube v3 points used by production v10 at cutover.',
      createdAt: '2026-08-31T18:08:01+09:00',
      value: 79.04,
    }),
  );

  assert.equal(result.truth.freshness, 'frozen');
  assert.equal(result.truth.presentation, 'standard');

  assert.deepEqual(result.truth.sourceAttribution, {
    sourceKey: 'youtube',
    sourceLabel: 'production_v10_status_snapshot',
  });
});

test('missing timestamp never becomes current time', () => {
  const result = requireTruth(
    adaptNaverFrozenCutoverTruth({
      source: 'production_v10_status_snapshot',
      note: 'Cloud migration seed at cutover.',
      createdAt: null,
      value: 10,
    }),
  );

  assert.deepEqual(result.truth.dataTime, {
    dataAsOf: { kind: 'unknown' },
    updatedAt: null,
  });
});

test('missing Music source metadata stays null instead of being guessed', () => {
  const result = requireTruth(
    adaptMusicPlatformTruth({
      status: 'RANKED',
      point: 10,
      snapshotDate: null,
      createdAt: null,
      version: null,
      usage: 'parallel_candidate_only',
    }),
  );

  assert.deepEqual(result.truth.sourceAttribution, {
    sourceKey: 'music',
    sourceLabel: null,
  });

  assert.deepEqual(result.truth.dataTime, {
    dataAsOf: { kind: 'unknown' },
    updatedAt: null,
  });
});

test('unknown Music source status fails closed', () => {
  const result = adaptMusicPlatformTruth({
    status: 'UNKNOWN',
    point: 0,
    snapshotDate: '2026-09-03',
    createdAt: '2026-09-03T10:46:16',
    version: 'fandex_music_chart_v2_current_presence_parallel_v1',
    usage: 'parallel_candidate_only',
  });

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'unsupported-source-status',
  });
});