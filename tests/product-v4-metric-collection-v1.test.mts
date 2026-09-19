import assert from 'node:assert/strict';
import test from 'node:test';

import { artistMonthlyMetricSeed } from '../app/data/v4/metrics/artistMonthlyMetricSeed';
import { FANDEX_METRIC_DEFINITIONS } from '../app/data/v4/metrics/fandexMetricDefinitions';
import type { FandexVariableKey } from '../app/data/v4/metrics/fandexMetricTypes';
import { MANUAL_METRIC_DATA_POINTS } from '../app/data/v4/metrics/manualMetricSeed';
import type { ManualMetricDataPoint } from '../app/data/v4/metrics/manualMetricDataTypes';
import { getV4ProductMetricReadModel } from '../lib/product/adapters/v4ProductMetricReadModel';
import type { ProductMetricCollectionEntry } from '../lib/product/contracts/productMetricCollection';
import {
  getArtistProductMetricCollection,
  type ProductMetricReadModelQuery,
} from '../lib/product/queries/getArtistProductMetricCollection';

const ARTIST_ID = 'aespa';
const MONTH = '2026-07';
const METRIC_KEY: FandexVariableKey = 'music';

function requireEntry(
  entries: readonly ProductMetricCollectionEntry[],
  sourceMetricKey: FandexVariableKey,
) {
  const entry = entries.find(
    (candidate) => candidate.sourceMetricKey === sourceMetricKey,
  );

  assert.ok(entry, `Expected collection entry for ${sourceMetricKey}.`);
  return entry;
}

function requireOkEntry(entry: ProductMetricCollectionEntry) {
  if (entry.status !== 'ok') {
    assert.fail(
      `Expected an ok entry, received ${entry.issues
        .map((issue) => issue.code)
        .join(', ')}.`,
    );
  }

  return entry;
}

function requireDataIssueEntry(entry: ProductMetricCollectionEntry) {
  if (entry.status !== 'data-issue') {
    assert.fail('Expected a data-issue collection entry.');
  }

  return entry;
}

function withTemporarySeedValue(value: number, run: () => void) {
  const point = artistMonthlyMetricSeed.find(
    (candidate) =>
      candidate.artistId === ARTIST_ID && candidate.month === MONTH,
  );

  assert.ok(point, 'Expected the runtime seed point used by the Product boundary.');

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

test('collection contains every canonical registry metric exactly once in registry order', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const registryKeys = FANDEX_METRIC_DEFINITIONS.map(
    (definition) => definition.key,
  );
  const collectionKeys = collection.entries.map(
    (entry) => entry.sourceMetricKey,
  );

  assert.deepEqual(collectionKeys, registryKeys);
  assert.equal(collection.entries.length, registryKeys.length);
  assert.equal(new Set(collectionKeys).size, registryKeys.length);
});

test('query delegates each registry metric to the RUN 02D Product boundary', () => {
  const calls: Array<{
    artistId: string;
    metricKey: string;
    month: string;
  }> = [];
  const readMetric: ProductMetricReadModelQuery = (input) => {
    calls.push(input);
    return getV4ProductMetricReadModel(input);
  };

  const collection = getArtistProductMetricCollection(
    { artistId: ARTIST_ID, month: MONTH },
    readMetric,
  );

  assert.deepEqual(
    calls.map((call) => call.metricKey),
    FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
  );
  assert.equal(calls.length, collection.entries.length);
  assert.ok(calls.every((call) => call.artistId === ARTIST_ID));
  assert.ok(calls.every((call) => call.month === MONTH));
});

test('finite runtime metric remains an exact available entry', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const direct = getV4ProductMetricReadModel({
    artistId: ARTIST_ID,
    metricKey: METRIC_KEY,
    month: MONTH,
  });
  const entry = requireOkEntry(
    requireEntry(collection.entries, METRIC_KEY),
  );

  assert.equal(direct.status, 'ok');
  assert.deepEqual(entry.model.fact, direct.model.fact);
  assert.equal(entry.model.fact.availability, 'available');
  assert.equal(entry.model.fact.value, direct.model.fact.value);
});

test('runtime zero survives collection without falsy filtering', () => {
  withTemporarySeedValue(0, () => {
    const collection = getArtistProductMetricCollection({
      artistId: ARTIST_ID,
      month: MONTH,
    });
    const entry = requireOkEntry(
      requireEntry(collection.entries, METRIC_KEY),
    );

    assert.deepEqual(entry.model.fact, {
      availability: 'available',
      value: 0,
    });
    assert.equal(collection.entries.length, FANDEX_METRIC_DEFINITIONS.length);
  });
});

test('normal missing remains an ok missing entry', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const entry = requireOkEntry(
    requireEntry(collection.entries, 'youtube'),
  );

  assert.deepEqual(entry.model.fact, {
    availability: 'missing',
    value: null,
  });
});

test('untracked artist remains not-tracked across every collection entry', () => {
  const collection = getArtistProductMetricCollection({
    artistId: '__untracked-product-artist__',
    month: MONTH,
  });

  assert.equal(collection.entries.length, FANDEX_METRIC_DEFINITIONS.length);

  for (const entry of collection.entries) {
    const okEntry = requireOkEntry(entry);
    assert.deepEqual(okEntry.model.fact, {
      availability: 'not-tracked',
      value: null,
    });
  }
});

test('preview presentation and provenance survive collection', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const entry = requireOkEntry(
    requireEntry(collection.entries, METRIC_KEY),
  );

  assert.equal(entry.model.presentation, 'preview');
  assert.equal(entry.model.provenance.origin, 'preview-seed');
  assert.equal(entry.model.provenance.sourceLabel, 'preview seed');
  assert.equal(entry.model.provenance.sourceStatus, 'ready');
});

test('one explicit fallback remains a data issue without removing other metrics', () => {
  withTemporaryManualPoints(
    [
      {
        artistId: ARTIST_ID,
        metricKey: METRIC_KEY,
        month: MONTH,
        value: Number.NaN,
        sourceType: 'manual',
        sourceLabel: 'invalid collection fixture',
      },
    ],
    () => {
      const collection = getArtistProductMetricCollection({
        artistId: ARTIST_ID,
        month: MONTH,
      });
      const issueEntry = requireDataIssueEntry(
        requireEntry(collection.entries, METRIC_KEY),
      );
      const otherEntry = requireOkEntry(
        requireEntry(collection.entries, 'album'),
      );

      assert.equal(collection.entries.length, FANDEX_METRIC_DEFINITIONS.length);
      assert.deepEqual(
        issueEntry.issues.map((issue) => issue.code),
        ['invalid-source-value', 'fallback-source'],
      );
      assert.equal('model' in issueEntry, false);
      assert.equal('fact' in issueEntry, false);
      assert.equal(otherEntry.status, 'ok');
      assert.equal(otherEntry.model.fact.availability, 'available');
      assert.deepEqual(
        collection.entries.map((entry) => entry.sourceMetricKey),
        FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
      );
    },
  );
});

test('collection and every model preserve source month without observation dates', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });

  assert.equal(collection.sourceMonth, MONTH);

  for (const entry of collection.entries) {
    if (entry.status === 'ok') {
      assert.equal(entry.model.identity.sourceMonth, MONTH);
      assert.deepEqual(entry.model.observationTime, { kind: 'unknown' });
      assert.equal('start' in entry.model.observationTime, false);
      assert.equal('end' in entry.model.observationTime, false);
    } else {
      assert.equal(
        'identity' in entry.sourceMetadata &&
          entry.sourceMetadata.identity.sourceMonth,
        MONTH,
      );
    }
  }
});

test('value, score, and weightedScore remain separate through collection', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const entry = requireOkEntry(
    requireEntry(collection.entries, METRIC_KEY),
  );

  assert.equal(entry.model.fact.value, entry.model.scoring.value);
  assert.equal(entry.model.scoring.value, entry.model.scoring.score);
  assert.equal(
    entry.model.scoring.weightedScore,
    entry.model.scoring.score === null
      ? null
      : entry.model.scoring.score * (entry.model.scoring.weight / 100),
  );
  assert.notEqual(
    entry.model.scoring.value,
    entry.model.scoring.weightedScore,
  );
});

test('coverage remains separate from availability after collection', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });
  const entry = requireOkEntry(
    requireEntry(collection.entries, METRIC_KEY),
  );

  assert.equal(entry.model.fact.availability, 'available');
  assert.equal(entry.model.coverageSource.totalMonths, 13);
  assert.equal(entry.model.coverageSource.coverageLevel, 'high');
  assert.equal(
    entry.model.coverageSource.missingMonthsMayIncludeNotTracked,
    true,
  );
  assert.equal('coverageSource' in entry.model.fact, false);
  assert.equal(entry.model.fact.availability === ('partial' as never), false);
});

test('collection shape adds no ranking, direction, change, or analysis window', () => {
  const collection = getArtistProductMetricCollection({
    artistId: ARTIST_ID,
    month: MONTH,
  });

  for (const forbiddenField of [
    'ranking',
    'contribution',
    'direction',
    'change',
    'stable',
    'analysisWindow',
  ]) {
    assert.equal(forbiddenField in collection, false);
  }
});
