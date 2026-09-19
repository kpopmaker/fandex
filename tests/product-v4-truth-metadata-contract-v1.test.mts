import assert from 'node:assert/strict';
import test from 'node:test';

import { createV4ProductTruthMetadata } from '../lib/product/adapters/v4ProductMetricReadModel';

test('V4 Product read model metadata fails closed when source key and time are unknown', () => {
  const metadata = createV4ProductTruthMetadata(null);

  assert.equal(metadata.freshness, 'unknown');

  assert.deepEqual(metadata.dataTime, {
    dataAsOf: { kind: 'unknown' },
    updatedAt: null,
  });

  assert.deepEqual(metadata.sourceAttribution, {
    sourceKey: null,
    sourceLabel: null,
  });
});

test('existing source label is preserved without guessing a source key', () => {
  const metadata = createV4ProductTruthMetadata('existing-source-label');

  assert.deepEqual(metadata.sourceAttribution, {
    sourceKey: null,
    sourceLabel: 'existing-source-label',
  });
});

test('V4 Product Truth metadata is deterministic and never invents current time', () => {
  const first = createV4ProductTruthMetadata(null);
  const second = createV4ProductTruthMetadata(null);

  assert.deepEqual(first, second);
  assert.equal(first.dataTime.updatedAt, null);
  assert.deepEqual(first.dataTime.dataAsOf, { kind: 'unknown' });
});