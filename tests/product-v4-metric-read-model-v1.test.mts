import assert from 'node:assert/strict';
import test from 'node:test';

import { artistMonthlyMetricSeed } from '../app/data/v4/metrics/artistMonthlyMetricSeed';
import { MANUAL_METRIC_DATA_POINTS } from '../app/data/v4/metrics/manualMetricSeed';
import type { ManualMetricDataPoint } from '../app/data/v4/metrics/manualMetricDataTypes';
import {
  getArtistMetricCoverageSummary,
  getMetricValueCoverage,
} from '../app/data/v4/metrics/metricDataCoverage';
import { getManualMetricPoint } from '../app/data/v4/metrics/manualMetricHelpers';
import { getManualMetricValueStatus } from '../app/data/v4/metrics/manualMetricValidators';
import { getResolvedMetricScore } from '../app/data/v4/metrics/metricScoringPipeline';
import type { FandexVariableKey } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  getV4ProductMetricReadModel,
  validateV4MetricSourceKey,
  type V4ProductMetricRuntime,
} from '../lib/product/adapters/v4ProductMetricReadModel';
import type {
  ProductMetricDataIssue,
  ProductMetricReadModelResult,
} from '../lib/product/contracts/productMetricReadModel';

const ARTIST_ID = 'aespa';
const MONTH = '2026-07';
const METRIC_KEY: FandexVariableKey = 'music';

function requireModel(result: ProductMetricReadModelResult) {
  if (result.status !== 'ok') {
    assert.fail(
      `Expected a Product metric model, received ${result.issues
        .map((issue) => issue.code)
        .join(', ')}.`,
    );
  }

  return result.model;
}

function requireIssues(result: ProductMetricReadModelResult) {
  return requireDataIssue(result).issues;
}

function requireDataIssue(
  result: ProductMetricReadModelResult,
): Extract<ProductMetricReadModelResult, { status: 'data-issue' }> {
  if (result.status !== 'data-issue') {
    assert.fail('Expected a Product metric data issue.');
  }

  return result;
}

function findIssue(
  issues: readonly ProductMetricDataIssue[],
  code: ProductMetricDataIssue['code'],
) {
  return issues.find((issue) => issue.code === code);
}

function withTemporarySeedValue(value: number, run: () => void) {
  const point = artistMonthlyMetricSeed.find(
    (candidate) =>
      candidate.artistId === ARTIST_ID && candidate.month === MONTH,
  );

  assert.ok(point, 'Expected the runtime seed point used by both helpers.');

  const previousValue = point.variables[METRIC_KEY];
  const hadPreviousValue = Object.hasOwn(point.variables, METRIC_KEY);
  point.variables[METRIC_KEY] = value;

  try {
    run();
  } finally {
    if (hadPreviousValue) {
      point.variables[METRIC_KEY] = previousValue;
    } else {
      delete point.variables[METRIC_KEY];
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

test('valid source metric identity is registry-backed and reaches runtime', () => {
  assert.deepEqual(validateV4MetricSourceKey(` ${METRIC_KEY} `), {
    status: 'valid',
    sourceMetricKey: METRIC_KEY,
  });

  const model = requireModel(
    getV4ProductMetricReadModel({
      artistId: ARTIST_ID,
      metricKey: METRIC_KEY,
      month: MONTH,
    }),
  );

  assert.equal(model.identity.sourceMetricKey, METRIC_KEY);
  assert.equal(model.fact.availability, 'available');
});

test('invalid identity fails before any runtime helper can substitute music', () => {
  let runtimeCallCount = 0;
  const failBeforeRuntime = () => {
    runtimeCallCount += 1;
    throw new Error('Runtime must not be called for an invalid metric key.');
  };
  const runtime: V4ProductMetricRuntime = {
    getMetricValueCoverage: failBeforeRuntime,
    getResolvedMetricScore: failBeforeRuntime,
    getArtistMetricCoverageSummary: failBeforeRuntime,
    getManualMetricPoint: failBeforeRuntime,
    getManualMetricValueStatus: failBeforeRuntime,
  };
  const rawMetricKey = '__invalid-product-metric__';
  const result = getV4ProductMetricReadModel(
    { artistId: ARTIST_ID, metricKey: rawMetricKey, month: MONTH },
    runtime,
  );
  const issues = requireIssues(result);

  assert.equal(runtimeCallCount, 0);
  assert.deepEqual(issues, [
    { code: 'invalid-metric-identity', rawMetricKey },
  ]);
  assert.equal('model' in result, false);
  assert.equal(JSON.stringify(result).includes('"sourceMetricKey":"music"'), false);
});

test('usable finite manual source becomes an exact standard fact with provenance', () => {
  const manualValue = 432.5;

  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: manualValue,
        sourceType: 'manual',
        sourceLabel: 'verified manual input',
      },
    ],
    () => {
      const model = requireModel(
        getV4ProductMetricReadModel({
          artistId: ARTIST_ID,
          metricKey: METRIC_KEY,
          month: MONTH,
        }),
      );

      assert.deepEqual(model.fact, {
        availability: 'available',
        value: manualValue,
      });
      assert.equal(model.presentation, 'standard');
      assert.deepEqual(model.provenance, {
        origin: 'manual-input',
        sourceLabel: 'verified manual input',
        sourceStatus: 'ready',
        availabilitySourceStatus: 'available',
        stage: 'display-ready',
      });
      assert.deepEqual(model.observationTime, { kind: 'unknown' });
      assert.equal(model.identity.sourceMonth, MONTH);
    },
  );
});

test('manual zero remains available zero with standard provenance', () => {
  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: 0,
        sourceType: 'manual',
        sourceLabel: 'verified manual zero',
      },
    ],
    () => {
      const model = requireModel(
        getV4ProductMetricReadModel({
          artistId: ARTIST_ID,
          metricKey: METRIC_KEY,
          month: MONTH,
        }),
      );

      assert.deepEqual(model.fact, { availability: 'available', value: 0 });
      assert.equal(model.presentation, 'standard');
      assert.equal(model.provenance.origin, 'manual-input');
      assert.equal(model.provenance.sourceStatus, 'zero');
      assert.equal(model.scoring.value, 0);
      assert.equal(model.scoring.score, 0);
      assert.equal(model.scoring.weightedScore, 0);
    },
  );
});

test('true missing remains missing instead of becoming an issue or zero', () => {
  const model = requireModel(
    getV4ProductMetricReadModel({
      artistId: ARTIST_ID,
      metricKey: 'youtube',
      month: MONTH,
    }),
  );

  assert.deepEqual(model.fact, { availability: 'missing', value: null });
  assert.equal(model.scoring.value, null);
  assert.equal(model.scoring.score, null);
  assert.equal(model.scoring.weightedScore, null);
});

test('coverage not-tracked takes precedence over pipeline missing', () => {
  const artistId = '__untracked-product-artist__';
  const model = requireModel(
    getV4ProductMetricReadModel({
      artistId,
      metricKey: METRIC_KEY,
      month: MONTH,
    }),
  );

  assert.deepEqual(model.fact, {
    availability: 'not-tracked',
    value: null,
  });
  assert.equal(model.provenance.availabilitySourceStatus, 'not-tracked');
  assert.equal(model.provenance.sourceStatus, 'missing');
});

test('non-finite runtime source values remain data issues after coverage flattens them', () => {
  for (const invalidValue of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    withTemporarySeedValue(invalidValue, () => {
      const result = getV4ProductMetricReadModel({
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
      });
      const dataIssue = requireDataIssue(result);
      const issues = dataIssue.issues;
      const invalidIssue = findIssue(issues, 'invalid-source-value');

      assert.deepEqual(invalidIssue, {
        code: 'invalid-source-value',
        detectedBy: 'metric-scoring-pipeline',
      });
      assert.equal('model' in result, false);
      assert.equal(
        'provenance' in dataIssue.sourceMetadata &&
          dataIssue.sourceMetadata.provenance.availabilitySourceStatus,
        'missing',
      );
    });
  }
});

test('explicit numeric fallback is retained as invalid and fallback issues', () => {
  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: Number.NaN,
        sourceType: 'manual',
        sourceLabel: 'invalid manual input',
      },
    ],
    () => {
      const result = getV4ProductMetricReadModel({
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
      });
      const dataIssue = requireDataIssue(result);
      const issues = dataIssue.issues;

      assert.deepEqual(findIssue(issues, 'invalid-source-value'), {
        code: 'invalid-source-value',
        detectedBy: 'manual-validation',
      });
      assert.deepEqual(findIssue(issues, 'fallback-source'), {
        code: 'fallback-source',
      });
      assert.equal('model' in result, false);
      assert.equal(
        'provenance' in dataIssue.sourceMetadata &&
          dataIssue.sourceMetadata.provenance.sourceStatus,
        'fallback',
      );
      assert.equal(
        'scoring' in dataIssue.sourceMetadata &&
          typeof dataIssue.sourceMetadata.scoring.value,
        'number',
      );
    },
  );
});

test('missing manual with ready preview remains an explicitly preview fact', () => {
  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: null,
        sourceType: 'manual',
        sourceLabel: 'missing manual input',
      },
    ],
    () => {
      const model = requireModel(
        getV4ProductMetricReadModel({
          artistId: ARTIST_ID,
          metricKey: METRIC_KEY,
          month: MONTH,
        }),
      );

      assert.equal(model.fact.availability, 'available');
      assert.equal(model.presentation, 'preview');
      assert.equal(model.provenance.origin, 'preview-seed');
      assert.equal(model.provenance.sourceLabel, 'preview seed fallback');
      assert.equal(model.provenance.sourceStatus, 'ready');
      assert.equal('dataOrigin' in model, false);
    },
  );
});

test('value, score, and weightedScore stay in separate source fields', () => {
  const manualValue = 500;

  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: manualValue,
        sourceType: 'manual',
      },
    ],
    () => {
      const model = requireModel(
        getV4ProductMetricReadModel({
          artistId: ARTIST_ID,
          metricKey: METRIC_KEY,
          month: MONTH,
        }),
      );

      assert.equal(model.fact.value, model.scoring.value);
      assert.equal(model.scoring.value, manualValue);
      assert.equal(model.scoring.score, manualValue);
      assert.equal(model.scoring.weight, 12);
      assert.equal(model.scoring.weightedScore, 60);
      assert.notEqual(model.fact.value, model.scoring.weightedScore);
    },
  );
});

test('coverage metadata remains separate from Product availability', () => {
  const model = requireModel(
    getV4ProductMetricReadModel({
      artistId: ARTIST_ID,
      metricKey: METRIC_KEY,
      month: MONTH,
    }),
  );

  assert.equal(model.fact.availability, 'available');
  assert.deepEqual(model.coverageSource, {
    totalMonths: 13,
    availableMonths: 13,
    zeroMonths: 0,
    missingMonths: 0,
    coverageRate: 1,
    coverageLevel: 'high',
    missingMonthsMayIncludeNotTracked: true,
  });
  assert.equal('coverage' in model.fact, false);
  assert.equal(model.fact.availability === ('partial' as never), false);
});

test('unexpected preview value disagreement fails closed as a source conflict', () => {
  const runtime: V4ProductMetricRuntime = {
    getMetricValueCoverage,
    getArtistMetricCoverageSummary,
    getManualMetricPoint,
    getManualMetricValueStatus,
    getResolvedMetricScore(artistId, metricKey, month) {
      const resolved = getResolvedMetricScore(artistId, metricKey, month);

      if (resolved.value === null) {
        assert.fail('Expected a finite preview value for the conflict test.');
      }

      return {
        ...resolved,
        value: resolved.value + 1,
        score: resolved.score === null ? null : resolved.score + 1,
      };
    },
  };
  const result = getV4ProductMetricReadModel(
    { artistId: ARTIST_ID, metricKey: METRIC_KEY, month: MONTH },
    runtime,
  );

  assert.deepEqual(requireIssues(result), [
    {
      code: 'source-state-conflict',
      reason: 'preview-value-mismatch',
    },
  ]);
  assert.equal('model' in result, false);
});
