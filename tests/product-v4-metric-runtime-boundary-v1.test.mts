import assert from 'node:assert/strict';
import test from 'node:test';

import { artistMonthlyMetricSeed } from '../app/data/v4/metrics/artistMonthlyMetricSeed';
import { MANUAL_METRIC_DATA_POINTS } from '../app/data/v4/metrics/manualMetricSeed';
import type { ManualMetricDataPoint } from '../app/data/v4/metrics/manualMetricDataTypes';
import {
  getMetricValueCoverage,
} from '../app/data/v4/metrics/metricDataCoverage';
import {
  getResolvedMetricScore,
} from '../app/data/v4/metrics/metricScoringPipeline';
import type { FandexVariableKey } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  adaptMetricValueCoverage,
  adaptResolvedMetricScoreValue,
  type V4MetricFactAdapterResult,
} from '../lib/product/adapters/v4MetricFactAdapter';

const RUNTIME_ARTIST_ID = 'aespa';
const RUNTIME_MONTH = '2026-07';
const RUNTIME_METRIC_KEY: FandexVariableKey = 'music';

function requireFact(result: V4MetricFactAdapterResult) {
  if (result.status !== 'ok') {
    assert.fail(`Expected an adapted fact, received ${result.reason}.`);
  }

  return result.fact;
}

function withTemporarySeedValue(
  value: number,
  run: () => void,
) {
  const point = artistMonthlyMetricSeed.find(
    (candidate) =>
      candidate.artistId === RUNTIME_ARTIST_ID &&
      candidate.month === RUNTIME_MONTH,
  );

  assert.ok(point, 'Expected the runtime seed point used by both helpers.');

  const previousValue = point.variables[RUNTIME_METRIC_KEY];
  const hadPreviousValue = Object.hasOwn(
    point.variables,
    RUNTIME_METRIC_KEY,
  );

  point.variables[RUNTIME_METRIC_KEY] = value;

  try {
    run();
  } finally {
    if (hadPreviousValue) {
      point.variables[RUNTIME_METRIC_KEY] = previousValue;
    } else {
      delete point.variables[RUNTIME_METRIC_KEY];
    }
  }
}

function withTemporaryManualPoints(
  points: ManualMetricDataPoint[],
  run: () => void,
) {
  const insertionIndex = MANUAL_METRIC_DATA_POINTS.length;
  MANUAL_METRIC_DATA_POINTS.push(...points);

  try {
    run();
  } finally {
    MANUAL_METRIC_DATA_POINTS.splice(insertionIndex, points.length);
  }
}

test('actual finite runtime outputs adapt without changing the numeric value', () => {
  const coverage = getMetricValueCoverage(
    RUNTIME_ARTIST_ID,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );
  const resolved = getResolvedMetricScore(
    RUNTIME_ARTIST_ID,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );

  assert.equal(coverage.status, 'available');
  assert.equal(resolved.status, 'ready');
  assert.equal(resolved.value, coverage.value);
  assert.equal(resolved.score, resolved.value);
  assert.equal(
    resolved.weightedScore,
    resolved.score === null
      ? null
      : resolved.score * (resolved.weight / 100),
  );

  const coverageFact = requireFact(adaptMetricValueCoverage(coverage));
  const pipelineFact = requireFact(adaptResolvedMetricScoreValue(resolved));

  assert.deepEqual(coverageFact.numeric, {
    availability: 'available',
    value: coverage.value,
  });
  assert.deepEqual(pipelineFact.numeric, {
    availability: 'available',
    value: resolved.value,
  });
  assert.equal(coverageFact.source.sourceMonth, RUNTIME_MONTH);
  assert.deepEqual(coverageFact.observationTime, { kind: 'unknown' });
});

test('actual missing runtime outputs remain missing with null', () => {
  const coverage = getMetricValueCoverage(
    RUNTIME_ARTIST_ID,
    'youtube',
    RUNTIME_MONTH,
  );
  const resolved = getResolvedMetricScore(
    RUNTIME_ARTIST_ID,
    'youtube',
    RUNTIME_MONTH,
  );

  assert.deepEqual(
    { status: coverage.status, value: coverage.value },
    { status: 'missing', value: null },
  );
  assert.deepEqual(
    {
      status: resolved.status,
      value: resolved.value,
      score: resolved.score,
      weightedScore: resolved.weightedScore,
    },
    {
      status: 'missing',
      value: null,
      score: null,
      weightedScore: null,
    },
  );
  assert.deepEqual(
    requireFact(adaptMetricValueCoverage(coverage)).numeric,
    { availability: 'missing', value: null },
  );
  assert.deepEqual(
    requireFact(adaptResolvedMetricScoreValue(resolved)).numeric,
    { availability: 'missing', value: null },
  );
});

test('coverage preserves not-tracked but the scoring pipeline flattens it to missing', () => {
  const artistId = '__product-runtime-untracked__';
  const coverage = getMetricValueCoverage(
    artistId,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );
  const resolved = getResolvedMetricScore(
    artistId,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );

  assert.deepEqual(
    { status: coverage.status, value: coverage.value },
    { status: 'not-tracked', value: null },
  );
  assert.deepEqual(
    requireFact(adaptMetricValueCoverage(coverage)).numeric,
    { availability: 'not-tracked', value: null },
  );

  assert.deepEqual(
    { status: resolved.status, value: resolved.value },
    { status: 'missing', value: null },
  );
  assert.deepEqual(
    requireFact(adaptResolvedMetricScoreValue(resolved)).numeric,
    { availability: 'missing', value: null },
  );
});

test('an actual runtime zero stays available zero through both helpers and adapters', () => {
  withTemporarySeedValue(0, () => {
    const coverage = getMetricValueCoverage(
      RUNTIME_ARTIST_ID,
      RUNTIME_METRIC_KEY,
      RUNTIME_MONTH,
    );
    const resolved = getResolvedMetricScore(
      RUNTIME_ARTIST_ID,
      RUNTIME_METRIC_KEY,
      RUNTIME_MONTH,
    );

    assert.deepEqual(
      { status: coverage.status, value: coverage.value },
      { status: 'zero', value: 0 },
    );
    assert.deepEqual(
      {
        status: resolved.status,
        value: resolved.value,
        score: resolved.score,
        weightedScore: resolved.weightedScore,
      },
      {
        status: 'zero',
        value: 0,
        score: 0,
        weightedScore: 0,
      },
    );
    assert.deepEqual(
      requireFact(adaptMetricValueCoverage(coverage)).numeric,
      { availability: 'available', value: 0 },
    );
    assert.deepEqual(
      requireFact(adaptResolvedMetricScoreValue(resolved)).numeric,
      { availability: 'available', value: 0 },
    );
  });
});

test('non-finite runtime values expose the helpers different invalid behavior', () => {
  for (const invalidValue of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    withTemporarySeedValue(invalidValue, () => {
      const coverage = getMetricValueCoverage(
        RUNTIME_ARTIST_ID,
        RUNTIME_METRIC_KEY,
        RUNTIME_MONTH,
      );
      const resolved = getResolvedMetricScore(
        RUNTIME_ARTIST_ID,
        RUNTIME_METRIC_KEY,
        RUNTIME_MONTH,
      );

      assert.deepEqual(
        { status: coverage.status, value: coverage.value },
        { status: 'missing', value: null },
      );
      assert.deepEqual(
        requireFact(adaptMetricValueCoverage(coverage)).numeric,
        { availability: 'missing', value: null },
      );

      assert.deepEqual(
        {
          status: resolved.status,
          value: resolved.value,
          score: resolved.score,
          weightedScore: resolved.weightedScore,
        },
        {
          status: 'invalid',
          value: null,
          score: null,
          weightedScore: null,
        },
      );
      assert.deepEqual(adaptResolvedMetricScoreValue(resolved), {
        status: 'unsupported-source',
        reason: 'invalid-source-status',
        source: {
          sourceKind: 'metric-scoring-pipeline',
          sourceArtistId: RUNTIME_ARTIST_ID,
          sourceMetricKey: RUNTIME_METRIC_KEY,
          sourceMonth: RUNTIME_MONTH,
          sourceStatus: 'invalid',
        },
      });
    });
  }
});

test('invalid manual input creates explicit preview fallback with or without a value', () => {
  const baseline = getResolvedMetricScore(
    RUNTIME_ARTIST_ID,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );
  assert.equal(baseline.status, 'ready');
  assert.notEqual(baseline.value, null);

  withTemporaryManualPoints(
    [
      {
        artistId: RUNTIME_ARTIST_ID,
        metricKey: RUNTIME_METRIC_KEY,
        month: RUNTIME_MONTH,
        value: Number.NaN,
        sourceType: 'manual',
      },
      {
        artistId: RUNTIME_ARTIST_ID,
        metricKey: 'youtube',
        month: RUNTIME_MONTH,
        value: Number.POSITIVE_INFINITY,
        sourceType: 'manual',
      },
    ],
    () => {
      const numericFallback = getResolvedMetricScore(
        RUNTIME_ARTIST_ID,
        RUNTIME_METRIC_KEY,
        RUNTIME_MONTH,
      );
      const nullFallback = getResolvedMetricScore(
        RUNTIME_ARTIST_ID,
        'youtube',
        RUNTIME_MONTH,
      );

      assert.deepEqual(
        {
          status: numericFallback.status,
          origin: numericFallback.origin,
          sourceLabel: numericFallback.sourceLabel,
          value: numericFallback.value,
          score: numericFallback.score,
        },
        {
          status: 'fallback',
          origin: 'preview-seed',
          sourceLabel: 'preview seed fallback',
          value: baseline.value,
          score: baseline.value,
        },
      );
      assert.deepEqual(
        {
          status: nullFallback.status,
          origin: nullFallback.origin,
          sourceLabel: nullFallback.sourceLabel,
          value: nullFallback.value,
          score: nullFallback.score,
          weightedScore: nullFallback.weightedScore,
        },
        {
          status: 'fallback',
          origin: 'preview-seed',
          sourceLabel: 'preview seed fallback',
          value: null,
          score: null,
          weightedScore: null,
        },
      );

      for (const fallback of [numericFallback, nullFallback]) {
        const adapted = adaptResolvedMetricScoreValue(fallback);
        assert.equal(adapted.status, 'unsupported-source');
        assert.equal(adapted.reason, 'unsupported-source-status');
      }
    },
  );
});

test('missing manual input substitutes a ready preview without fallback status', () => {
  const baseline = getResolvedMetricScore(
    RUNTIME_ARTIST_ID,
    RUNTIME_METRIC_KEY,
    RUNTIME_MONTH,
  );

  withTemporaryManualPoints(
    [
      {
        artistId: RUNTIME_ARTIST_ID,
        metricKey: RUNTIME_METRIC_KEY,
        month: RUNTIME_MONTH,
        value: null,
        sourceType: 'manual',
      },
    ],
    () => {
      const resolved = getResolvedMetricScore(
        RUNTIME_ARTIST_ID,
        RUNTIME_METRIC_KEY,
        RUNTIME_MONTH,
      );

      assert.deepEqual(
        {
          status: resolved.status,
          origin: resolved.origin,
          sourceLabel: resolved.sourceLabel,
          value: resolved.value,
        },
        {
          status: 'ready',
          origin: 'preview-seed',
          sourceLabel: 'preview seed fallback',
          value: baseline.value,
        },
      );
      assert.deepEqual(
        requireFact(adaptResolvedMetricScoreValue(resolved)).numeric,
        { availability: 'available', value: baseline.value },
      );
    },
  );
});

test('an invalid metric key is replaced before the adapter can retain the issue', () => {
  const coverage = getMetricValueCoverage(
    RUNTIME_ARTIST_ID,
    '__invalid-metric-key__',
    RUNTIME_MONTH,
  );
  const fact = requireFact(adaptMetricValueCoverage(coverage));

  assert.equal(coverage.metricKey, 'music');
  assert.equal(coverage.status, 'available');
  assert.equal(fact.source.sourceMetricKey, 'music');
  assert.equal(fact.numeric.availability, 'available');
});
