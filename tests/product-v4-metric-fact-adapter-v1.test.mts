import assert from 'node:assert/strict';
import test from 'node:test';

import type { MetricValueCoverage } from '../app/data/v4/metrics/metricDataCoverage';
import type { ResolvedMetricScore } from '../app/data/v4/metrics/metricScoringPipelineTypes';
import {
  adaptMetricValueCoverage,
  adaptResolvedMetricScoreValue,
  type V4MetricFactAdapterResult,
} from '../lib/product/adapters/v4MetricFactAdapter';

function coverage(
  status: MetricValueCoverage['status'],
  value: number | null,
  month = '2026-07',
): MetricValueCoverage {
  return {
    artistId: 'iu',
    metricKey: 'search',
    month,
    status,
    value,
  };
}

function pipelineScore(
  status: ResolvedMetricScore['status'],
  value: number | null,
  month = '2026-07',
): ResolvedMetricScore {
  return {
    artistId: 'iu',
    metricKey: 'search',
    month,
    value,
    score: value,
    weight: 10,
    weightedScore: value,
    origin: 'manual-input',
    status,
    stage: 'validated',
  };
}

function requireFact(result: V4MetricFactAdapterResult) {
  if (result.status !== 'ok') {
    assert.fail(`Expected an adapted fact, received ${result.reason}.`);
  }

  assert.equal(result.status, 'ok');
  return result.fact;
}

test('finite positive and negative source values remain available and unchanged', () => {
  const positive = requireFact(
    adaptMetricValueCoverage(coverage('available', 12.4)),
  );
  const negative = requireFact(
    adaptResolvedMetricScoreValue(pipelineScore('ready', -3.2)),
  );

  assert.deepEqual(positive.numeric, {
    availability: 'available',
    value: 12.4,
  });
  assert.deepEqual(negative.numeric, {
    availability: 'available',
    value: -3.2,
  });
});

test('source zero remains an available Product zero', () => {
  const fact = requireFact(adaptMetricValueCoverage(coverage('zero', 0)));

  assert.equal(fact.numeric.availability, 'available');
  assert.equal(fact.numeric.value, 0);
});

test('source missing remains missing with null', () => {
  const fact = requireFact(adaptMetricValueCoverage(coverage('missing', null)));

  assert.deepEqual(fact.numeric, {
    availability: 'missing',
    value: null,
  });
});

test('source not-tracked remains not-tracked with null', () => {
  const fact = requireFact(
    adaptMetricValueCoverage(coverage('not-tracked', null)),
  );

  assert.deepEqual(fact.numeric, {
    availability: 'not-tracked',
    value: null,
  });
});

test('invalid and non-finite sources produce explicit unsupported results', () => {
  const invalid = adaptResolvedMetricScoreValue(
    pipelineScore('invalid', Number.NaN),
  );
  const positiveInfinity = adaptResolvedMetricScoreValue(
    pipelineScore('ready', Number.POSITIVE_INFINITY),
  );
  const negativeInfinity = adaptMetricValueCoverage(
    coverage('available', Number.NEGATIVE_INFINITY),
  );

  for (const result of [invalid, positiveInfinity, negativeInfinity]) {
    assert.equal(result.status, 'unsupported-source');
    assert.equal('fact' in result, false);
  }
});

test('ambiguous pipeline fallback remains explicit instead of becoming a fact', () => {
  const result = adaptResolvedMetricScoreValue(
    pipelineScore('fallback', 42),
  );

  assert.deepEqual(result, {
    status: 'unsupported-source',
    reason: 'unsupported-source-status',
    source: {
      sourceKind: 'metric-scoring-pipeline',
      sourceArtistId: 'iu',
      sourceMetricKey: 'search',
      sourceMonth: '2026-07',
      sourceStatus: 'fallback',
    },
  });
});

test('source status and value mismatches fail closed', () => {
  const zeroMismatch = adaptMetricValueCoverage(coverage('zero', 3));
  const missingMismatch = adaptMetricValueCoverage(coverage('missing', 3));

  assert.equal(zeroMismatch.status, 'unsupported-source');
  assert.equal(missingMismatch.status, 'unsupported-source');
});

test('source month remains source metadata and observation stays unknown', () => {
  const fact = requireFact(
    adaptMetricValueCoverage(coverage('available', 12.4, '2026-07')),
  );

  assert.equal(fact.source.sourceMonth, '2026-07');
  assert.deepEqual(fact.observationTime, { kind: 'unknown' });
  assert.equal('start' in fact.observationTime, false);
  assert.equal('end' in fact.observationTime, false);
});

test('adapter facts do not infer direction or change from availability', () => {
  const missing = requireFact(
    adaptMetricValueCoverage(coverage('missing', null)),
  );

  assert.equal('direction' in missing, false);
  assert.equal('change' in missing, false);
  assert.equal(missing.numeric.availability, 'missing');
});
